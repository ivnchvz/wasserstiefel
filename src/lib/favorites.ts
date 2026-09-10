import type { Favorite, SectionResult } from "./types";
import { BACKLOGGD_USER, LETTERBOXD_USER } from "./config";

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

/**
 * Letterboxd puts the four favourites on the member profile, which the
 * general robots.txt rules leave open - only sorting, genre, tag and friends
 * paths are disallowed. Posters there are lazy-loaded placeholders, so the
 * real 2:3 artwork comes from each film page's JSON-LD `image`.
 */
export async function getFavoriteFilms(): Promise<SectionResult<Favorite>> {
  const user = LETTERBOXD_USER;

  try {
    const html = await getText(`https://letterboxd.com/${encodeURIComponent(user)}/`);
    if (!html) return { status: "error", message: "Could not load the Letterboxd profile" };

    const start = html.indexOf('id="favourites"');
    if (start === -1) return { status: "ok", items: [] };
    // Bound to the real closing tag: a fixed-size window runs straight past
    // the section and picks up the recent-activity posters that follow it.
    const end = html.indexOf("</section>", start);
    const section = html.slice(start, end === -1 ? start + 20000 : end);

    const found = [...section.matchAll(/data-item-name="([^"]+)"[^>]*?data-item-slug="([^"]+)"/g)];

    const films = await Promise.all(
      found.map(async ([, rawName, slug]) => {
        const name = decode(rawName);
        // Letterboxd formats these as "Title (1983)".
        const m = name.match(/^(.*)\s+\((\d{4})\)$/);
        const page = await getText(`https://letterboxd.com/film/${slug}/`);
        // og:image is a landscape crop; the JSON-LD image is the real poster.
        const image = page?.match(/"image"\s*:\s*"([^"]+)"/)?.[1] ?? null;

        return {
          title: m ? m[1] : name,
          year: m ? m[2] : null,
          url: `https://letterboxd.com/film/${slug}/`,
          image: image ? image.replace(/\\\//g, "/") : null,
        };
      }),
    );

    return { status: "ok", items: films };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Letterboxd favourites failed" };
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
