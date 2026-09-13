import { getRatedAlbums } from "./albums";
import { halftone } from "./halftone";

export const ALBUMS_PER_PAGE = 12;
const COLS = 34;
const ROWS = 34;

export type AlbumCard = {
  artist: string;
  title: string;
  year: string | null;
  rating: number;
  /** The artwork itself, for the reveal on hover; the grid is what's drawn. */
  cover: string | null;
  cols: number;
  rows: number;
  /** Row-major ink density, rounded; empty when there's no artwork. */
  cells: number[];
};

export type AlbumsPayload = {
  page: number;
  pages: number;
  total: number;
  /** Fixed page size: the last page is short, so its length can't stand in. */
  perPage: number;
  items: AlbumCard[];
};

/**
 * One screen of rated albums, with the artwork already reduced to a grid.
 *
 * The halftone is computed here rather than in the browser: it has no image
 * pipeline, and a grid of numbers is smaller over the wire than the covers.
 * Paging matters because there are over a hundred rated albums and each cover
 * is a thousand-odd squares - rendering them all at once would be megabytes of
 * markup for a page most people scroll straight past.
 */
export async function albumsPage(page = 1): Promise<AlbumsPayload | { error: string }> {
  const wanted = Math.max(1, Math.floor(page));
  const result = await getRatedAlbums({ offset: (wanted - 1) * ALBUMS_PER_PAGE, limit: ALBUMS_PER_PAGE });
  if (result.status !== "ok") return { error: result.message };

  const items = await Promise.all(
    result.items.map(async (a) => {
      const grid = a.cover ? await halftone(a.cover, COLS, ROWS) : null;
      return {
        artist: a.artist,
        title: a.title,
        year: a.year,
        rating: a.rating,
        cover: a.cover,
        cols: COLS,
        rows: ROWS,
        cells: grid ? grid.cells.map((c) => Math.round(c * 100) / 100) : [],
      };
    }),
  );

  return {
    page: wanted,
    pages: Math.max(1, Math.ceil(result.total / ALBUMS_PER_PAGE)),
    total: result.total,
    perPage: ALBUMS_PER_PAGE,
    items,
  };
}
