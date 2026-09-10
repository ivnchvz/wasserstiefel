import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSeriesById } from "./seriesSearch";
import type { SectionResult } from "./types";

export const SERIES_FILE = path.join(process.cwd(), "src", "data", "series.json");

export type SeriesStatus = "watching" | "completed" | "dropped" | "paused";

export type Series = {
  id: number;
  title: string;
  year: string | null;
  poster: string | null;
  network: string | null;
  url: string;
  status: SeriesStatus | null;
  rating: number | null;
  watchedAt: string | null;
};

const STATUSES: SeriesStatus[] = ["watching", "completed", "dropped", "paused"];

async function readEntries(): Promise<Record<string, unknown>[] | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(SERIES_FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : null;
  } catch {
    return null;
  }
}

/**
 * Entries store only a TVmaze id plus what's personal to them; the title,
 * year and artwork are looked up and cached for a week.
 */
async function hydrate(entry: Record<string, unknown>): Promise<Series | null> {
  const id = typeof entry.id === "number" ? entry.id : Number(entry.id);
  if (!Number.isFinite(id)) return null;

  const meta = await getSeriesById(id);
  const status = typeof entry.status === "string" ? entry.status : null;

  return {
    id,
    title: meta?.title ?? (typeof entry.title === "string" ? entry.title : `#${id}`),
    year: meta?.year ?? null,
    poster: meta?.poster ?? null,
    network: meta?.network ?? null,
    url: `https://www.tvmaze.com/shows/${id}`,
    status: STATUSES.includes(status as SeriesStatus) ? (status as SeriesStatus) : null,
    rating: typeof entry.rating === "number" && Number.isFinite(entry.rating) ? entry.rating : null,
    watchedAt: typeof entry.watchedAt === "string" && entry.watchedAt.trim() ? entry.watchedAt.trim() : null,
  };
}

const byNewest = (a: Series, b: Series) => (b.watchedAt ?? "").localeCompare(a.watchedAt ?? "");

async function all(): Promise<Series[] | null> {
  const raw = await readEntries();
  if (!raw) return null;
  const hydrated = await Promise.all(raw.map(hydrate));
  return hydrated.filter((s): s is Series => s !== null);
}

export async function getSeries(status: SeriesStatus, limit = 12): Promise<SectionResult<Series>> {
  const items = await all();
  if (!items) return { status: "error", message: "src/data/series.json must contain an array" };
  return { status: "ok", items: items.filter((s) => s.status === status).sort(byNewest).slice(0, limit) };
}
