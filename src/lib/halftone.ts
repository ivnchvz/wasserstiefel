import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * >1 lifts midtones toward paper. Tuned by eye against the reference
 * posters: 1.45 renders as mud, 3.2 loses faces entirely.
 */
const GAMMA = 2.6;

export type Halftone = {
  cols: number;
  rows: number;
  /** Row-major darkness per cell, 0 (paper) to 1 (ink). */
  cells: number[];
};

/**
 * Reduces an image to a coarse grid of ink densities, the way a Crouwel
 * poster reduces a photograph to squares. Rendering is left to the caller
 * so the same grid can drive squares, characters or anything else.
 */
/**
 * Site-relative sources ("/gallery/x.jpg") are uploads sitting in public/,
 * which the server can't fetch from itself before it is listening - so they
 * are read from disk. Anything else is fetched and cached like artwork.
 */
async function load(src: string): Promise<Buffer | null> {
  if (src.startsWith("/")) {
    const file = path.join(process.cwd(), "public", path.normalize(src).replace(/^([/\\])+/, ""));
    // normalize() above plus this check keep a crafted path inside public/.
    if (!file.startsWith(path.join(process.cwd(), "public") + path.sep)) return null;
    return readFile(file).catch(() => null);
  }

  const res = await fetch(src, {
    headers: { "User-Agent": "wasserstiefel.dev personal site" },
    next: { revalidate: 60 * 60 * 24 * 7 }, // artwork is effectively immutable
  });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

/** Tallest grid an "auto" height may produce, so a panorama's inverse can't run away. */
const MAX_AUTO_ROWS = 80;

export async function halftone(
  src: string,
  cols: number,
  /**
   * A fixed height, or "auto" to follow the image's own proportions - posters
   * are all 2:3, but a gallery of saved images is anything but.
   */
  rowsOrAuto: number | "auto",
  { gamma = GAMMA, invert = false }: { gamma?: number; invert?: boolean } = {},
): Promise<Halftone | null> {
  try {
    const buf = await load(src);
    if (!buf) return null;

    let rows: number;
    if (rowsOrAuto === "auto") {
      // rotate() applies EXIF orientation, so phone photos keep the shape they
      // were taken in rather than the sensor's.
      const meta = await sharp(buf).rotate().metadata();
      const w = meta.autoOrient?.width ?? meta.width ?? cols;
      const h = meta.autoOrient?.height ?? meta.height ?? cols;
      rows = Math.max(4, Math.min(MAX_AUTO_ROWS, Math.round((cols * h) / w)));
    } else {
      rows = rowsOrAuto;
    }

    const { data } = await sharp(buf)
      .rotate()
      .resize(cols, rows, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const n = cols * rows;

    // Film posters are mastered dark - medians land around 3-67 of 255 - so a
    // plain inversion renders almost every cell as solid ink. Ranking the
    // cells against each other instead spreads any poster, however murky,
    // across the full paper-to-ink range.
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => data[a] - data[b]);
    const cells = new Array<number>(n);
    for (let rank = 0; rank < n; rank++) {
      // Inverted, the mark stands for light rather than dark - needed when the
      // grid is drawn in paper on an ink ground, or the picture comes out as
      // a photographic negative.
      const darkness = invert ? rank / (n - 1) : 1 - rank / (n - 1);
      // Bias toward paper so the grid reads as marks on a ground, not a slab.
      cells[order[rank]] = Math.pow(darkness, gamma);
    }

    return { cols, rows, cells };
  } catch {
    return null; // a missing poster shouldn't take the page down
  }
}

/** Ink density mapped to the ramp used for text-rendered halftones. */
const RAMP = " .:-=+*#%@";

export function toAscii(grid: Halftone): string[] {
  const lines: string[] = [];
  for (let y = 0; y < grid.rows; y++) {
    let line = "";
    for (let x = 0; x < grid.cols; x++) {
      const d = grid.cells[y * grid.cols + x];
      line += RAMP[Math.min(RAMP.length - 1, Math.round(d * (RAMP.length - 1)))];
    }
    lines.push(line);
  }
  return lines;
}
