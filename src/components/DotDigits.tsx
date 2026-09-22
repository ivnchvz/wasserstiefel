/**
 * 5x7 dot-matrix numerals, drawn as squares like the rest of the site's
 * imagery - the type specimen the site takes its look from, at display size.
 */
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

export function DotDigits({ value, className }: { value: string; className?: string }) {
  const chars = [...value].filter((c) => GLYPHS[c]);
  const width = chars.length * 6 - 1;

  const rects = chars.flatMap((c, i) =>
    GLYPHS[c].flatMap((row, y) =>
      [...row].map((bit, x) =>
        bit === "1" ? <rect key={`${i}-${x}-${y}`} x={i * 6 + x + 0.06} y={y + 0.06} width={0.88} height={0.88} /> : null,
      ),
    ),
  );

  return (
    <svg viewBox={`0 0 ${width} 7`} className={className} fill="currentColor" role="img" aria-label={value}>
      {rects}
    </svg>
  );
}
