import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv";
import { findAlbumArt } from "./albumArt";
import type { SectionResult } from "./types";

export const RYM_FILE = path.join(process.cwd(), "src", "data", "rym-ratings.csv");
export const ALBUMS_FILE = path.join(process.cwd(), "src", "data", "albums.json");

export type Album = {
  artist: string;
  title: string;
  year: string | null;
  /** 0.5 - 5, converted from RYM's 1-10 scale. */
  rating: number;
  cover: string | null;
};

/** Header names are matched loosely, since exports vary between versions. */
function pick(headers: string[], ...candidates: string[]): number {
  const norm = headers.map((h) => h.trim().toLowerCase().replace(/[\s_]+/g, ""));
  for (const c of candidates) {
    const at = norm.indexOf(c.toLowerCase().replace(/[\s_]+/g, ""));
    if (at >= 0) return at;
  }
  return -1;
}

/**
 * RateYourMusic prohibits automated access in its robots.txt and puts the site
 * behind a Cloudflare challenge, so ratings can't be read from a profile. They
 * come instead from the export RYM offers its own members, dropped into
 * src/data/rym-ratings.csv.
 */
/** Reads the RYM export, if one has been saved. */
async function fromExport(): Promise<Album[] | null> {
  let text: string;
  try {
    text = await readFile(RYM_FILE, "utf8");
  } catch {
    return null;
  }

  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const [headers, ...body] = rows;
  const iTitle = pick(headers, "title", "album", "release");
  const iRating = pick(headers, "rating", "myrating", "score");
  const iFirst = pick(headers, "firstname", "artistfirstname");
  const iLast = pick(headers, "lastname", "artistlastname");
  const iArtist = pick(headers, "artist", "artistname");
  // RYM carries a Latin transliteration alongside names in other scripts:
  // 파란노을 / Parannoul, Молчат Дома / Molchat Doma. The transliteration is
  // preferred - it sits in the page's typeface, and album art lookups find it.
  const iFirstLoc = pick(headers, "firstnamelocalized");
  const iLastLoc = pick(headers, "lastnamelocalized");
  const iYear = pick(headers, "releasedate", "year", "released");
  if (iTitle < 0 || iRating < 0) return [];

  const albums: Album[] = [];
  for (const row of body) {
    const title = (row[iTitle] ?? "").trim();
    // RYM stores half-stars as 1-10, and 0 for "not rated".
    const raw = Number.parseFloat((row[iRating] ?? "").trim());
    if (!title || !Number.isFinite(raw) || raw <= 0) continue;

    const join = (a: number, b: number) =>
      [row[a] ?? "", row[b] ?? ""].map((v) => v.trim()).filter(Boolean).join(" ");

    const artist =
      iArtist >= 0
        ? (row[iArtist] ?? "").trim()
        : join(iFirstLoc, iLastLoc) || join(iFirst, iLast);

    albums.push({
      artist,
      title,
      year: (row[iYear] ?? "").match(/\d{4}/)?.[0] ?? null,
      rating: raw > 5 ? raw / 2 : raw,
      cover: null,
    });
  }
  return albums;
}

/** Albums logged since, from /admin. These already carry their artwork. */
async function fromAdmin(): Promise<Album[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(ALBUMS_FILE, "utf8"));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((e: Record<string, unknown>) => {
        const title = typeof e.title === "string" ? e.title.trim() : "";
        const rating = typeof e.rating === "number" ? e.rating : NaN;
        if (!title || !Number.isFinite(rating) || rating <= 0) return null;
        return {
          artist: typeof e.artist === "string" ? e.artist.trim() : "",
          title,
          year: typeof e.year === "string" ? e.year : null,
          rating,
          cover: typeof e.cover === "string" ? e.cover : null,
        } satisfies Album;
      })
      .filter((a): a is Album => a !== null);
  } catch {
    return [];
  }
}

const keyOf = (a: Album) => `${a.artist} ${a.title}`.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * RateYourMusic prohibits automated access in its robots.txt and puts the site
 * behind a Cloudflare challenge, so ratings can't be read from a profile.
 * They come from the export RYM offers its own members, plus anything logged
 * since from /admin - which wins on a clash, being the later judgement.
 */
export async function getRatedAlbums(limit = 12): Promise<SectionResult<Album>> {
  const exported = await fromExport();
  const logged = await fromAdmin();

  if (exported === null && logged.length === 0) {
    return {
      status: "unconfigured",
      message:
        "log albums from /admin, or export your ratings from rateyourmusic.com/user_albums_export/ and save them as src/data/rym-ratings.csv",
    };
  }

  const claimed = new Set(logged.map(keyOf));
  const merged = [...logged, ...(exported ?? []).filter((a) => !claimed.has(keyOf(a)))];

  // Highest rated first. There are far more perfect scores than slots, and the
  // export carries no date to break them with, so ties go to the newer record
  // - alphabetical order would just show whichever artists start with an A.
  // Title is the final tiebreak so the result is stable between builds.
  const top = merged
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        Number(b.year ?? 0) - Number(a.year ?? 0) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, limit);
  return {
    status: "ok",
    items: await Promise.all(
      top.map(async (a) => (a.cover ? a : { ...a, cover: await findAlbumArt(a.artist, a.title) })),
    ),
  };
}
