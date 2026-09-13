/** Five cells, filled by score - the grid logic applied to a rating. */
export function Rating({ value }: { value: number | null }) {
  if (value === null) return null; // Steam has no score; an em-dash per row is just noise

  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = Math.max(0, 5 - full - (half ? 1 : 0));

  return (
    <span className="inline-flex items-center gap-[3px] align-middle" role="img" aria-label={`${value} out of 5`}>
      {Array.from({ length: full }, (_, i) => (
        <span key={`f${i}`} className="block h-[7px] w-[7px] bg-current" />
      ))}
      {/* A real ½ reads as half a rating; a half-filled square just looks misdrawn. */}
      {half && <span className="text-[12px] leading-none">½</span>}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className="block h-[7px] w-[7px] border border-current opacity-40" />
      ))}
    </span>
  );
}
