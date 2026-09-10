import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv";
import { findAlbumArt } from "./albumArt";
import type { SectionResult } from "./types";

export const RYM_FILE = path.join(process.cwd(), "src", "data", "rym-ratings.csv");

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
export async function getRatedAlbums(limit = 12): Promise<SectionResult<Album>> {
  let text: string;
  try {
    text = await readFile(RYM_FILE, "utf8");
  } catch {
    return {
      status: "unconfigured",
      message: "export your ratings from rateyourmusic.com/user_albums_export/ and save them as src/data/rym-ratings.csv",
    };
  }

  const rows = parseCsv(text);
  if (rows.length < 2) return { status: "ok", items: [] };

  const [headers, ...body] = rows;
  const iTitle = pick(headers, "title", "album", "release");
  const iRating = pick(headers, "rating", "myrating", "score");
  const iFirst = pick(headers, "firstname", "artistfirstname");
  const iLast = pick(headers, "lastname", "artistlastname");
  const iArtist = pick(headers, "artist", "artistname");
  const iYear = pick(headers, "releasedate", "year", "released");

  if (iTitle < 0 || iRating < 0) {
    return { status: "error", message: `unrecognised export columns: ${headers.slice(0, 8).join(", ")}` };
  }

  const albums: Album[] = [];
  for (const row of body) {
    const title = (row[iTitle] ?? "").trim();
    // RYM stores half-stars as 1-10, and 0 for "not rated".
    const raw = Number.parseFloat((row[iRating] ?? "").trim());
    if (!title || !Number.isFinite(raw) || raw <= 0) continue;

    const artist =
      iArtist >= 0
        ? (row[iArtist] ?? "").trim()
        : [row[iFirst] ?? "", row[iLast] ?? ""].map((s) => s.trim()).filter(Boolean).join(" ");

    albums.push({
      artist,
      title,
      year: (row[iYear] ?? "").match(/\d{4}/)?.[0] ?? null,
      rating: raw > 5 ? raw / 2 : raw,
      cover: null,
    });
  }

  // Highest rated first, and only look up art for the ones actually shown.
  const top = albums.sort((a, b) => b.rating - a.rating).slice(0, limit);
  const withArt = await Promise.all(
    top.map(async (a) => ({ ...a, cover: await findAlbumArt(a.artist, a.title) })),
  );

  return { status: "ok", items: withArt };
}
