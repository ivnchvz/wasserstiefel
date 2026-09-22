import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SectionResult } from "./types";

export const BOOKS_FILE = path.join(process.cwd(), "src", "data", "books.json");

export type BookStatus = "reading" | "finished" | "abandoned" | "paused";

export type Book = {
  id: string;
  title: string;
  author: string | null;
  year: string | null;
  cover: string | null;
  url: string;
  status: BookStatus | null;
  rating: number | null;
  readAt: string | null;
};

const STATUSES: BookStatus[] = ["reading", "finished", "abandoned", "paused"];

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Unlike series, entries carry their own title, author and cover - saved
 * from the search result - so the page renders without asking Open Library
 * anything.
 */
function parse(entry: Record<string, unknown>): Book | null {
  const id = str(entry.id);
  const title = str(entry.title);
  if (!id || !title) return null;
  const status = str(entry.status);

  return {
    id,
    title,
    author: str(entry.author),
    year: str(entry.year),
    cover: str(entry.cover),
    url: `https://openlibrary.org/works/${id}`,
    status: STATUSES.includes(status as BookStatus) ? (status as BookStatus) : null,
    rating: typeof entry.rating === "number" && Number.isFinite(entry.rating) ? entry.rating : null,
    readAt: str(entry.readAt),
  };
}

const byNewest = (a: Book, b: Book) => (b.readAt ?? "").localeCompare(a.readAt ?? "");

async function readBooks(): Promise<Book[] | null> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(BOOKS_FILE, "utf8"));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return null;
  return raw.map((e) => parse(e as Record<string, unknown>)).filter((b): b is Book => b !== null);
}

export async function getAllBooks(): Promise<Book[]> {
  return (await readBooks()) ?? [];
}

export async function getBooks(status: BookStatus, limit = 12): Promise<SectionResult<Book>> {
  const books = await readBooks();
  if (!books) return { status: "error", message: "src/data/books.json must contain an array" };
  return { status: "ok", items: books.filter((b) => b.status === status).sort(byNewest).slice(0, limit) };
}
