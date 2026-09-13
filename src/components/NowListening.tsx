"use client";

import type { NowListening as Payload } from "@/lib/types";
import { LocalTime } from "./LocalTime";
import { usePoll } from "./usePoll";

/**
 * Section 01's music. Songs change every few minutes and the page is cached
 * for about one, so without this the "playing now" track lagged behind -
 * the same problem the in-game banner had. Server-rendered first, so it is in
 * the first paint and works with scripting off; it keeps itself current from
 * there.
 */
export function NowListening({ initial }: { initial: Payload }) {
  const { tracks, ascii } = usePoll<Payload>("/api/now-listening", initial);
  const [track, ...recent] = tracks;

  if (!track) return <p className="text-[11px] text-ink-soft">nothing scrobbled yet</p>;

  return (
    <div className="flex flex-col gap-10">
      <a href={track.url ?? "#"} className="group flex items-start gap-7">
        {ascii && (
          <pre
            role="img"
            aria-label={`${track.title} cover`}
            className="shrink-0 text-[8px] text-ink"
            style={{ lineHeight: 0.82, letterSpacing: "-0.04em" }}
          >
            {ascii.join("\n")}
          </pre>
        )}
        <span className="min-w-0">
          <span className="block text-[10px] tracking-[0.18em] text-ink-soft">music</span>
          <span className="mt-1 block text-lg font-medium tracking-[-0.02em] group-hover:underline">
            {track.title}
          </span>
          <span className="mt-1 block text-[12px] text-ink-soft">{track.artist}</span>
          <span className="mt-3 block text-[10px] tracking-[0.14em] text-ink-soft">
            {track.nowPlaying ? (
              "▪ playing now"
            ) : track.playedAt ? (
              <LocalTime iso={track.playedAt} />
            ) : (
              "recently"
            )}
          </span>
        </span>
      </a>

      {recent.length > 0 && (
        <div>
          <h3 className="mb-2 text-[10px] tracking-[0.18em] text-ink-soft">before that</h3>
          <ol>
            {recent.map((t, i) => (
              <li key={`${t.playedAt ?? i}-${t.title}`} className="border-b border-rule first:border-t">
                <a href={t.url ?? "#"} className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-2.5">
                  <span className="min-w-0 truncate text-[12px] tracking-[-0.01em]">
                    <span className="group-hover:underline">{t.title}</span>
                    <span className="text-ink-soft"> — {t.artist}</span>
                  </span>
                  <span className="text-right text-[10px] tabular-nums text-ink-soft">
                    {t.playedAt ? <LocalTime iso={t.playedAt} /> : "—"}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
