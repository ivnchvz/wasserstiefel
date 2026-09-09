import type { Game, SectionResult } from "./types";
import { getSteamGames } from "./steam";
import raw from "@/data/games.json";

/**
 * Backloggd has no public API or RSS, its robots.txt disallows automated
 * agents outright, and its pages sit behind an Anubis proof-of-work wall.
 * Defeating that would mean working around an access control the operator
 * put there deliberately, so games come from Steam plus a hand-kept file.
 *
 * Steam covers what it knows about automatically; games.json covers Switch,
 * PlayStation and anything else Steam can't see. Manual entries win on a
 * title clash, since those carry a rating and Steam never does.
 */
function coerce(entry: unknown): Game | null {
  if (typeof entry !== "object" || entry === null) return null;
  const e = entry as Record<string, unknown>;
  const title = typeof e.title === "string" ? e.title.trim() : "";
  if (!title) return null;

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    title,
    platform: str(e.platform),
    rating: typeof e.rating === "number" && Number.isFinite(e.rating) ? e.rating : null,
    playedAt: str(e.playedAt),
    url: str(e.url),
    cover: str(e.cover),
  };
}

const norm = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function getRecentGames(limit = 6): Promise<SectionResult<Game>> {
  if (!Array.isArray(raw)) {
    return { status: "error", message: "src/data/games.json must contain an array" };
  }

  const manual = raw.map(coerce).filter((g): g is Game => g !== null);

  let steam: Game[] = [];
  try {
    // Over-fetch so Steam titles displaced by manual duplicates still fill the list.
    steam = (await getSteamGames(limit * 2)) ?? [];
  } catch (err) {
    // A broken Steam key shouldn't blank out the manual entries too.
    if (manual.length === 0) {
      return { status: "error", message: err instanceof Error ? err.message : "Steam fetch failed" };
    }
  }

  const claimed = new Set(manual.map((g) => norm(g.title)));
  const merged = [...manual, ...steam.filter((g) => !claimed.has(norm(g.title)))];

  return {
    status: "ok",
    items: merged
      .sort((a, b) => (b.playedAt ?? "").localeCompare(a.playedAt ?? ""))
      .slice(0, limit),
  };
}
