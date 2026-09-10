import { halftone, toAscii } from "@/lib/halftone";

/** Below this the cell is paper; skipping it keeps the SVG light. */
const INK_FLOOR = 0.07;

const r = (n: number) => Math.round(n * 100) / 100;

/**
 * A Crouwel-style halftone: one square per cell, its side growing with ink
 * density, so the image resolves out of a regular grid rather than pixels.
 */
export async function HalftoneImage({
  src,
  cols = 30,
  rows = 42,
  className,
  label,
  invert = false,
}: {
  src: string;
  cols?: number;
  rows?: number;
  className?: string;
  label?: string;
  /** Draw the marks for light instead of dark, for use on an ink ground. */
  invert?: boolean;
}) {
  const grid = await halftone(src, cols, rows, { invert });
  if (!grid) return <span className={`block bg-[--ink]/5 ${className ?? ""}`} />;

  const squares = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = grid.cells[y * cols + x];
      if (d < INK_FLOOR) continue;
      // Side scales with sqrt so drawn *area* tracks density linearly.
      const side = Math.sqrt(d) * 0.98;
      const off = (1 - side) / 2;
      // Full float precision costs ~1MB of markup across a page of posters
      // and buys nothing at this cell size.
      squares.push(
        <rect
          key={`${x}-${y}`}
          x={r(x + off)}
          y={r(y + off)}
          width={r(side)}
          height={r(side)}
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      className={className}
      role="img"
      aria-label={label ?? "halftone image"}
      shapeRendering="crispEdges"
    >
      <g fill="currentColor">{squares}</g>
    </svg>
  );
}

/**
 * The same grid rendered as characters instead of squares - the other half of
 * the reference language, where the picture is literally made of type.
 */
export async function AsciiImage({
  src,
  cols = 22,
  rows = 22,
  className,
  label,
}: {
  src: string;
  cols?: number;
  rows?: number;
  className?: string;
  label?: string;
}) {
  const grid = await halftone(src, cols, rows);
  if (!grid) return null;

  return (
    <pre
      className={className}
      role="img"
      aria-label={label ?? "ascii image"}
      style={{ lineHeight: 0.82, letterSpacing: "-0.04em" }}
    >
      {toAscii(grid).join("\n")}
    </pre>
  );
}
