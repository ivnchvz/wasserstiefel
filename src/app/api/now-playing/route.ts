import { NextResponse } from "next/server";
import { getNowPlayingGame } from "@/lib/steam";
import { halftone } from "@/lib/halftone";

// Presence is the one genuinely live thing here; it must never be cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const game = await getNowPlayingGame();
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
