/** Below this the cell is paper; skipping it keeps the markup light. */
const INK_FLOOR = 0.07;
const r = (n: number) => Math.round(n * 100) / 100;

/**
 * Draws a halftone from a grid computed on the server - for the places where
 * the picture arrives as numbers over the wire rather than being rendered on
 * the server outright.
 */
export function HalftoneCells({
  cols,
  rows,
  cells,
  className,
  label,
}: {
  cols: number;
  rows: number;
  cells: number[];
  className?: string;
  label?: string;
}) {
  const squares = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = cells[y * cols + x] ?? 0;
      if (d < INK_FLOOR) continue;
      // Side scales with sqrt so drawn *area* tracks density linearly.
      const side = Math.sqrt(d) * 0.98;
      const off = (1 - side) / 2;
      squares.push(<rect key={`${x}-${y}`} x={r(x + off)} y={r(y + off)} width={r(side)} height={r(side)} />);
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
