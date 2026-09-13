import MarkdownIt from "markdown-it";
import { listRepoDir, POSTS_DIR, readRepoFile } from "./repoStore";

export type PostMeta = {
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  draft: boolean;
  excerpt: string;
  readingMinutes: number;
};

export type Post = PostMeta & { body: string; html: string };

/**
 * Raw HTML is off: everything is written through this editor, and Markdown
 * covers what the writing needs. Bare links become links.
 */
const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

export const postPath = (slug: string) => `${POSTS_DIR}/${slug}.md`;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents, so "Café" becomes "cafe"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** A small front-matter block: `key: value` lines between --- fences. */
function splitFrontMatter(text: string): { meta: Record<string, string>; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    meta[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: match[2] };
}

export function serializePost(p: { title: string; date: string; draft: boolean; body: string }): string {
  // Quoted so a colon in a title doesn't break the block when it's read back.
  return `---\ntitle: ${JSON.stringify(p.title)}\ndate: ${p.date}\ndraft: ${p.draft}\n---\n\n${p.body.trim()}\n`;
}

/** Markdown stripped back to prose, for the excerpt. */
function plain(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toPost(slug: string, text: string): Post {
  const { meta, body } = splitFrontMatter(text);
  const prose = plain(body);

  return {
    slug,
    title: meta.title?.trim() || slug,
    date: (meta.date ?? "").slice(0, 10),
    draft: meta.draft === "true",
    excerpt: prose.length > 180 ? `${prose.slice(0, 180).trimEnd()}…` : prose,
    // 200 words a minute, and never "0 min".
    readingMinutes: Math.max(1, Math.round(prose.split(" ").filter(Boolean).length / 200)),
    body,
    html: md.render(body),
  };
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const buf = await readRepoFile(postPath(slug));
  return buf ? toPost(slug, buf.toString("utf8")) : null;
}

/**
 * Newest first. Drafts are kept out unless asked for, so something
 * half-written can sit in the folder without appearing on the site.
 */
export async function listPosts({ includeDrafts = false } = {}): Promise<Post[]> {
  const files = (await listRepoDir(POSTS_DIR)).filter((f) => f.endsWith(".md"));
  const posts = await Promise.all(files.map((f) => getPost(f.replace(/\.md$/, ""))));

  return posts
    .filter((p): p is Post => p !== null && (includeDrafts || !p.draft))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
