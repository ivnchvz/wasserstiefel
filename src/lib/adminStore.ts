import path from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminGate } from "./adminGate";
import { commitRepoFiles, GitHubError, readRepoFile, storageMode, type FileChange } from "./repoStore";

export type StoreEntry = Record<string, unknown>;

type StoreOptions = {
  /** Names the list in commit messages, e.g. "games". */
  label: string;
  keyOf: (e: StoreEntry) => string;
  sanitise: (body: StoreEntry) => StoreEntry | null;
  /** Repository paths an entry owns, deleted in the same commit that removes it. */
  ownedFiles?: (e: StoreEntry) => string[];
  /** Adds display-only fields to what GET returns; never written back. */
  present?: (e: StoreEntry) => StoreEntry;
};

/**
 * The live site can only save if it can commit. Without a token it would try
 * to write to Vercel's read-only filesystem and fail with a cryptic error, so
 * that case is named plainly instead.
 */
function cannotSave(): string | null {
  const live = process.env.NODE_ENV === "production" && !process.env.ADMIN_STORAGE;
  return live && storageMode() === "local"
    ? "saving on the live site needs GITHUB_TOKEN set in Vercel — see the README"
    : null;
}

function failure(err: unknown) {
  const message = err instanceof Error ? err.message : "save failed";
  return NextResponse.json({ error: message }, { status: err instanceof GitHubError ? 502 : 500 });
}

/**
 * Games, series, albums and the gallery are all "a list of logged things" in a
 * JSON file in the repo, so they share these handlers. Writes are
 * read-modify-write: if the branch moved in between (two saves racing), the
 * commit is refused and the change is re-applied to a fresh read, rather than
 * one save silently undoing the other.
 */
export function createStore(file: string, opts: StoreOptions) {
  const repoPath = path.relative(process.cwd(), file).split(path.sep).join("/");
  const { label, keyOf, sanitise, ownedFiles, present } = opts;

  async function load(): Promise<StoreEntry[]> {
    const buf = await readRepoFile(repoPath);
    if (!buf) return [];
    try {
      const parsed: unknown = JSON.parse(buf.toString("utf8"));
      return Array.isArray(parsed) ? (parsed as StoreEntry[]) : [];
    } catch {
      return [];
    }
  }

  async function mutate(
    change: (entries: StoreEntry[]) => { entries: StoreEntry[]; extra?: FileChange[]; message: string },
  ): Promise<StoreEntry[]> {
    for (let attempt = 0; ; attempt++) {
      const current = await load();
      const next = change(current);

      // Nothing actually changed - a field re-saved with the value it already
      // had. Committing that would rebuild the site for no reason.
      if (!next.extra?.length && JSON.stringify(next.entries) === JSON.stringify(current)) {
        return current;
      }

      try {
        await commitRepoFiles(
          [{ path: repoPath, content: JSON.stringify(next.entries, null, 2) + "\n" }, ...(next.extra ?? [])],
          next.message,
        );
        // Every page reads these files, not just the index - a gallery upload
        // showed up nowhere until this cleared /gallery too. In production the
        // deploy the commit triggers carries the change instead.
        revalidatePath("/", "layout");
        return next.entries;
      } catch (err) {
        if (err instanceof GitHubError && err.status === 409 && attempt < 2) continue;
        throw err;
      }
    }
  }

  /** Merge rather than replace, so fields set earlier survive an update that carries only a status. */
  const upsert = (entry: StoreEntry, extra?: FileChange[]) =>
    mutate((entries) => {
      const at = entries.findIndex((e) => keyOf(e) === keyOf(entry));
      const next = [...entries];
      if (at >= 0) next[at] = { ...next[at], ...entry };
      else next.unshift(entry);
      return { entries: next, extra, message: `admin: save ${keyOf(entry)} in ${label}` };
    });

  const shown = (entries: StoreEntry[]) => (present ? entries.map(present) : entries);

  return {
    upsert,
    shown,

    async GET(request: Request) {
      const denied = adminGate(request);
      if (denied) return denied;
      try {
        return NextResponse.json({ entries: shown(await load()) });
      } catch (err) {
        return failure(err);
      }
    },

    async POST(request: Request) {
      const denied = adminGate(request);
      if (denied) return denied;
      const blocked = cannotSave();
      if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

      const entry = sanitise((await request.json()) as StoreEntry);
      if (!entry) return NextResponse.json({ error: "invalid entry" }, { status: 400 });

      try {
        return NextResponse.json({ entries: shown(await upsert(entry)) });
      } catch (err) {
        return failure(err);
      }
    },

    async DELETE(request: Request) {
      const denied = adminGate(request);
      if (denied) return denied;
      const blocked = cannotSave();
      if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

      const key = new URL(request.url).searchParams.get("key") ?? "";
      try {
        const entries = await mutate((all) => {
          const removed = all.filter((e) => keyOf(e) === key);
          return {
            entries: all.filter((e) => keyOf(e) !== key),
            extra: removed.flatMap((e) => ownedFiles?.(e) ?? []).map((p) => ({ path: p, content: null })),
            message: `admin: remove ${key} from ${label}`,
          };
        });
        return NextResponse.json({ entries: shown(entries) });
      } catch (err) {
        return failure(err);
      }
    },
  };
}

export { cannotSave, failure };
