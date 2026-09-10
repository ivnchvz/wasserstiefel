import { NextResponse } from "next/server";
import { getNowPlayingGame } from "@/lib/steam";
import { halftone } from "@/lib/halftone";

/*
 * GET handlers aren't cached in this version of Next, so this is built per
 * request without forcing it. Forcing it dynamic used to make every fetch
 * underneath uncached too - including the cover image, which was downloaded
 * and re-halftoned on every poll from every open tab. The presence read is
 * cached 15 seconds and shared instead; the cover keeps its long cache.
 */

const COLS = 44;
const ROWS = 21;

export type NowPlayingPayload = {
  title: string;
  url: string;
  cols: number;
  rows: number;
  /** Row-major ink density, rounded - full precision triples the payload. */
  cells: number[];
} | null;

export async function GET() {
  const game = await getNowPlayingGame({ ttl: 15 });
  if (!game) return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });

  // The halftone is computed here rather than in the browser: the client has
  // no image pipeline, and the grid is smaller over the wire than the JPEG.
  const grid = await halftone(game.cover, COLS, ROWS, { invert: true });

  const payload: NowPlayingPayload = {
    title: game.title,
    url: game.url,
    cols: COLS,
    rows: ROWS,
    cells: grid ? grid.cells.map((c) => Math.round(c * 100) / 100) : [],
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
