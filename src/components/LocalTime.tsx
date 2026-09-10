"use client";

/**
 * A scrobble time in the viewer's own timezone. Rendered on the server it
 * would be in the host's zone (UTC on most platforms), which reads as the
 * wrong time of day for anyone not there. The server text is replaced on
 * hydration, so the brief mismatch is expected rather than a bug.
 *
 * Today's plays show the time; anything older shows the date in the same
 * dd.mm.yy form as the rest of the page.
 */
export function LocalTime({ iso }: { iso: string }) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const sameDay = d.toDateString() === new Date().toDateString();
  const text = sameDay
    ? `${p(d.getHours())}:${p(d.getMinutes())}`
    : `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
