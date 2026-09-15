import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Favorite, SectionResult } from "./types";
import { BACKLOGGD_USER } from "./config";

const FAVOURITES_TTL_SECONDS = 60 * 60 * 24; // favourites change rarely

const UA = "wasserstiefel.dev personal site";

async function getText(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: FAVOURITES_TTL_SECONDS },
  });
  return res.ok ? res.text() : null;
}

function attr(tag: string, name: string): string | null {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
}

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export const FAVORITE_FILMS_FILE = path.join(process.cwd(), "src", "data", "favorite-films.json");

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
 * Backloggd's *profile* page serves normally and carries the favourites with
 * IGDB cover art. Only its sub-pages (games, journal, played) sit behind the
 * proof-of-work wall, which is why recently-played still comes from Steam.
 * Nothing here works around that wall; if the profile is ever closed off too,
 * this degrades to an empty section.
 */
export async function getFavoriteGames(): Promise<SectionResult<Favorite>> {
  const user = BACKLOGGD_USER;

  try {
    const html = await getText(`https://backloggd.com/u/${encodeURIComponent(user)}/`);
    if (!html) return { status: "error", message: "Could not load the Backloggd profile" };
    if (/id="anubis|Making sure you&#39;re not a bot/i.test(html)) {
      return { status: "error", message: "Backloggd served a bot challenge" };
    }

    const start = html.indexOf('id="profile-favorites"');
    if (start === -1) return { status: "ok", items: [] };
    const section = html.slice(start, start + 20000);

    const items: Favorite[] = [];
    for (const card of section.matchAll(/<a href="\/games\/([^"]+?)\/?"[\s\S]{0,900}?<img([^>]*)>/g)) {
      const [, slug, imgTag] = card;
      const title = decode(attr(`<img${imgTag}>`, "alt") ?? slug);
      // data-src holds the 2x cover, a better source for the halftone pass.
      const cover = attr(`<img${imgTag}>`, "data-src") ?? attr(`<img${imgTag}>`, "src");

      if (items.some((i) => i.url.endsWith(`/${slug}/`))) continue;
      items.push({
        title,
        year: null,
        url: `https://backloggd.com/games/${slug}/`,
        image: cover ? decode(cover) : null,
      });
    }

    return { status: "ok", items };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Backloggd favourites failed" };
  }
}
