import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where admin writes land.
 *
 * Locally they go straight to the working tree, to be committed by hand.
 * In production the filesystem is read-only and discarded between requests,
 * so writes become commits through the GitHub API instead - Vercel deploys
 * every push, which carries the change to the live site and keeps git as the
 * one record of everything.
 *
 * ADMIN_STORAGE forces a mode; it exists so the GitHub path can be exercised
 * locally against a scratch branch (ADMIN_BRANCH) without touching main.
 */
export function storageMode(): "local" | "github" {
  const forced = process.env.ADMIN_STORAGE;
  if (forced === "github" || forced === "local") return forced;
  return process.env.NODE_ENV === "production" && process.env.GITHUB_TOKEN ? "github" : "local";
}

const REPO = process.env.GITHUB_REPO ?? "ivnchvz/wasserstiefel";
const BRANCH = process.env.ADMIN_BRANCH ?? "main";

/** The public, unauthenticated address of a file on the branch admin writes to. */
export function rawUrl(repoPath: string): string {
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${repoPath.replace(/^\/+/, "")}`;
}

/**
 * Admin only ever touches data files and gallery uploads. Resolving through
 * these two fixed folders keeps any other path out of reach, and lets the
 * bundler trace just those folders - a fully dynamic path makes it pull the
 * entire project, public/ included, into every server function.
 */
function localPath(repoPath: string): string {
  const name = path.basename(repoPath);
  if (repoPath === `src/data/${name}`) return path.join(process.cwd(), "src", "data", name);
  if (repoPath === `public/gallery/${name}`) return path.join(process.cwd(), "public", "gallery", name);
  throw new Error(`admin doesn't write to ${repoPath}`);
}

export type FileChange = {
  /** Relative to the repository root, e.g. "src/data/games.json". */
  path: string;
  /** New contents, or null to delete the file. */
  content: Buffer | string | null;
};

async function gh(pathname: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return fetch(`https://api.github.com/repos/${REPO}${pathname}`, {
    ...init,
    cache: "no-store", // admin must always see the branch as it is now
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

async function ghJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await gh(pathname, init);
  if (!res.ok) throw new GitHubError(res.status, `${init?.method ?? "GET"} ${pathname}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readRepoFile(repoPath: string): Promise<Buffer | null> {
  if (storageMode() === "local") {
    return readFile(localPath(repoPath)).catch(() => null);
  }

  // Read from the branch rather than the deployment, which only holds the
  // files as they were at its last build.
  const res = await gh(`/contents/${repoPath}?ref=${encodeURIComponent(BRANCH)}`, {
    headers: { Accept: "application/vnd.github.raw+json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(res.status, `reading ${repoPath}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Applies every change as one commit, so an upload and the list entry that
 * points at it arrive together - never an entry for an image that isn't there.
 * Throws GitHubError(409) if the branch moved underneath it, so the caller can
 * re-read and try again rather than overwrite someone else's change.
 */
export async function commitRepoFiles(changes: FileChange[], message: string): Promise<void> {
  if (storageMode() === "local") {
    for (const c of changes) {
      const file = localPath(c.path);
      if (c.content === null) await unlink(file).catch(() => {});
      else {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, c.content);
      }
    }
    return;
  }

  const ref = await ghJson<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(BRANCH)}`);
  const head = await ghJson<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);

  const tree = await Promise.all(
    changes.map(async (c) => {
      if (c.content === null) return { path: c.path, mode: "100644", type: "blob", sha: null };
      const blob = await ghJson<{ sha: string }>(`/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: Buffer.from(c.content).toString("base64"), encoding: "base64" }),
      });
      return { path: c.path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );

  const newTree = await ghJson<{ sha: string }>(`/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: head.tree.sha, tree }),
  });
  const commit = await ghJson<{ sha: string }>(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }),
  });

  // Not forced: if anything else landed since the read, this is refused.
  const moved = await gh(`/git/refs/heads/${encodeURIComponent(BRANCH)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  if (moved.status === 422) throw new GitHubError(409, "the branch moved during the save");
  if (!moved.ok) throw new GitHubError(moved.status, `updating ${BRANCH}: ${moved.status}`);
}
