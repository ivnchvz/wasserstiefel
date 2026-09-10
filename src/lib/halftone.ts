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
export async function halftone(
  src: string,
  cols: number,
  rows: number,
  gamma: number = GAMMA,
): Promise<Halftone | null> {
  try {
    const res = await fetch(src, {
      headers: { "User-Agent": "wasserstiefel.dev personal site" },
      next: { revalidate: 60 * 60 * 24 * 7 }, // artwork is effectively immutable
    });
    if (!res.ok) return null;

    const { data } = await sharp(Buffer.from(await res.arrayBuffer()))
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
      const darkness = 1 - rank / (n - 1);
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
