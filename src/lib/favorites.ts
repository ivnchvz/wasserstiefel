import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Favorite, SectionResult } from "./types";
import { getGameBySlug } from "./backloggd";

const FAVOURITES_TTL_SECONDS = 60 * 60 * 24; // favourites change rarely

const UA = "wasserstiefel.dev personal site";

async function getText(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: FAVOURITES_TTL_SECONDS },
  });
  return res.ok ? res.text() : null;
}

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export const FAVORITE_FILMS_FILE = path.join(process.cwd(), "src", "data", "favorite-films.json");

export const FAVORITE_GAMES_FILE = path.join(process.cwd(), "src", "data", "favorite-games.json");

/** A Backloggd slug, as admin's search returns it. */
export function gameSlug(input: string): string | null {
  const slug = input.trim();
  return /^[a-z0-9-]+$/.test(slug) ? slug : null;
}

/** A Letterboxd film address, or the slug on its own. */
export function filmSlug(input: string): string | null {
  const text = input.trim();
  const fromUrl = text.match(/letterboxd\.com\/film\/([a-z0-9-]+)/i)?.[1];
  const slug = fromUrl ?? text.replace(/^\/+|\/+$/g, "");
  return /^[a-z0-9-]+$/.test(slug) ? slug : null;
}

/**
 * Read from a list kept in the repository rather than from the profile.
 *
 * Letterboxd put its member profiles behind Cloudflare's bot challenge - they
 * answer 403 with "Enable JavaScript and cookies to continue" - so the
 * favourites can no longer be read from there, and getting past that is not
 * something to attempt. Individual film pages still answer normally, so each
 * film's title, year and poster come from its own page.
 */
export async function getFavoriteFilms(): Promise<SectionResult<Favorite>> {
  let slugs: string[];
  try {
    const parsed: unknown = JSON.parse(await readFile(FAVORITE_FILMS_FILE, "utf8"));
    slugs = Array.isArray(parsed)
      ? parsed.map((e) => (typeof e === "object" && e !== null ? filmSlug(String((e as Record<string, unknown>).slug ?? "")) : null)).filter((s): s is string => s !== null)
      : [];
  } catch {
    return { status: "ok", items: [] };
  }

  try {
    const films = await Promise.all(
      slugs.map(async (slug) => {
        const url = `https://letterboxd.com/film/${slug}/`;
        const page = await getText(url);
        // og:title reads "Angst (1983)"; the JSON-LD image is the real 2:3
        // poster, where og:image is a landscape crop.
        const heading = page?.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? slug;
        const parts = decode(heading).match(/^(.*)\s+\((\d{4})\)$/);
        const image = page?.match(/"image"\s*:\s*"([^"]+)"/)?.[1] ?? null;

        return {
          title: parts ? parts[1] : decode(heading),
          year: parts ? parts[2] : null,
          url,
          image: image ? image.replace(/\\\//g, "/") : null,
        };
      }),
    );
    return { status: "ok", items: films };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Letterboxd film pages failed" };
  }
}

/**
 * Read from a list kept in the repository, for the same reason as the films:
 * Backloggd's profile page now sits behind the proof-of-work wall too. Picks
 * are made from its search in admin, and each game's title, year and cover
 * come from its own page, which answers normally.
 */
export async function getFavoriteGames(): Promise<SectionResult<Favorite>> {
  let slugs: string[];
  try {
    const parsed: unknown = JSON.parse(await readFile(FAVORITE_GAMES_FILE, "utf8"));
    slugs = Array.isArray(parsed)
      ? parsed.map((e) => (typeof e === "object" && e !== null ? gameSlug(String((e as Record<string, unknown>).slug ?? "")) : null)).filter((s): s is string => s !== null)
      : [];
  } catch {
    return { status: "ok", items: [] };
  }

  const items = await Promise.all(
    slugs.map(async (slug) => {
      const game = await getGameBySlug(slug);
      return {
        title: game ? decode(game.title) : slug,
        year: game?.year ?? null,
        url: game?.url ?? `https://backloggd.com/games/${slug}/`,
        image: game?.cover ?? null,
      };
    }),
  );
  return { status: "ok", items };
}
