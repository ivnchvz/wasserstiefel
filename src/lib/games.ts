import type { Game, SectionResult } from "./types";
import raw from "@/data/games.json";

/**
 * Backloggd has no public API or RSS, its robots.txt disallows automated
 * agents outright, and its pages sit behind an Anubis proof-of-work wall.
 * Defeating that would mean working around an access control the operator
 * put there deliberately, so this reads a file kept in the repo instead.
 *
 * The shape matches what a Backloggd row shows, so swapping in a real feed
 * later (or a Steam / IGDB source) only means replacing this function.
 */
function coerce(entry: unknown): Game | null {
  if (typeof entry !== "object" || entry === null) return null;
  const e = entry as Record<string, unknown>;
  const title = typeof e.title === "string" ? e.title.trim() : "";
  if (!title) return null;

  const rating = typeof e.rating === "number" && Number.isFinite(e.rating) ? e.rating : null;

  return {
    title,
    platform: typeof e.platform === "string" && e.platform.trim() ? e.platform.trim() : null,
    rating,
    playedAt: typeof e.playedAt === "string" && e.playedAt.trim() ? e.playedAt.trim() : null,
    url: typeof e.url === "string" && e.url.trim() ? e.url.trim() : null,
    cover: typeof e.cover === "string" && e.cover.trim() ? e.cover.trim() : null,
  };
}

export async function getRecentGames(limit = 6): Promise<SectionResult<Game>> {
  if (!Array.isArray(raw)) {
    return { status: "error", message: "src/data/games.json must contain an array" };
  }

  const games = raw
    .map(coerce)
    .filter((g): g is Game => g !== null)
    .sort((a, b) => (b.playedAt ?? "").localeCompare(a.playedAt ?? ""))
    .slice(0, limit);

  return { status: "ok", items: games };
}
