import type { Movie, SectionResult } from "./types";

const FEED_TTL_SECONDS = 60 * 60; // Letterboxd diary updates are not urgent.

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // must run last, or it double-decodes
}

/**
 * Letterboxd fills the description of a plain diary entry with this rather
 * than leaving it empty, so it has to be told apart from an actual review.
 */
const AUTO_TEXT = /^Watched on \w+ \w+ \d+,? \d{4}\.?$/;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/**
 * The description carries the poster in a leading paragraph and then the
 * review body. Tags are stripped to plain paragraphs: it renders as
 * typography here, and member HTML never reaches the page as markup.
 */
function parseReview(description: string): { review: string[] | null; spoilers: boolean } {
  const raw = description.replace(/<!\[CDATA\[|\]\]>/g, "");
  const body = raw.replace(/<p>\s*<img[^>]*>\s*<\/p>/, "");

  const paragraphs = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => decodeEntities(stripTags(m[1])).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Letterboxd prepends this line rather than marking it up; the flag is shown
  // separately, so drop it from the text.
  const spoilers = paragraphs[0]?.startsWith("This review may contain spoilers");
  const text = spoilers ? paragraphs.slice(1) : paragraphs;

  if (text.length === 0 || (text.length === 1 && AUTO_TEXT.test(text[0]))) {
    return { review: null, spoilers: false };
  }

  return { review: text, spoilers: Boolean(spoilers) };
}

function tag(xml: string, name: string): string | null {
  // Tag names here include a namespace colon, which needs escaping in the class.
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1]).trim() : null;
}

/**
 * Letterboxd exposes a member's diary as RSS with `letterboxd:` extension
 * fields, so no scraping is needed. The feed mixes in list entries, which
 * carry no filmTitle - those get dropped.
 */
export function parseLetterboxdFeed(xml: string, limit: number): Movie[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const movies: Movie[] = [];

  for (const item of items) {
    const title = tag(item, "letterboxd:filmTitle");
    const link = tag(item, "link");
    if (!title || !link) continue; // a list entry, not a diary entry

    const rawRating = tag(item, "letterboxd:memberRating");
    const rating = rawRating === null ? null : Number.parseFloat(rawRating);
    const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
    const poster = description.match(/<img src="([^"]+)"/)?.[1] ?? null;
    const { review, spoilers } = parseReview(description);

    movies.push({
      title,
      year: tag(item, "letterboxd:filmYear"),
      rating: rating !== null && Number.isFinite(rating) ? rating : null,
      watchedAt: tag(item, "letterboxd:watchedDate"),
      rewatch: tag(item, "letterboxd:rewatch") === "Yes",
      url: link,
      poster,
      review,
      spoilers,
    });

    if (movies.length >= limit) break;
  }

  return movies;
}

export async function getRecentMovies(limit = 6): Promise<SectionResult<Movie>> {
  const username = process.env.LETTERBOXD_USERNAME;
  if (!username) {
    return { status: "unconfigured", message: "Set LETTERBOXD_USERNAME in .env.local" };
  }

  try {
    const res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, {
      headers: { "User-Agent": "wasserstiefel.dev personal site" },
      next: { revalidate: FEED_TTL_SECONDS },
    });

    if (res.status === 404) {
      return { status: "error", message: `No Letterboxd user "${username}"` };
    }
    if (!res.ok) {
      return { status: "error", message: `Letterboxd returned ${res.status}` };
    }

    return { status: "ok", items: parseLetterboxdFeed(await res.text(), limit) };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Letterboxd fetch failed" };
  }
}

/**
 * Most diary entries carry no writing, so the feed is scanned in full and
 * filtered rather than sliced. This shares the fetch above: same URL and
 * options, so it's deduplicated within a render.
 */
export async function getRecentReviews(limit = 4): Promise<SectionResult<Movie>> {
  const all = await getRecentMovies(Number.MAX_SAFE_INTEGER);
  if (all.status !== "ok") return all;

  return { status: "ok", items: all.items.filter((m) => m.review).slice(0, limit) };
}
