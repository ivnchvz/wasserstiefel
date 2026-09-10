"use client";

import { useEffect, useState } from "react";
import type { NowPlayingPayload } from "@/app/api/now-playing/route";

const POLL_MS = 25_000;
const INK_FLOOR = 0.07;
const r = (n: number) => Math.round(n * 100) / 100;

function Grid({ data }: { data: NonNullable<NowPlayingPayload> }) {
  const squares = [];
  for (let y = 0; y < data.rows; y++) {
    for (let x = 0; x < data.cols; x++) {
      const d = data.cells[y * data.cols + x] ?? 0;
      if (d < INK_FLOOR) continue;
      const side = Math.sqrt(d) * 0.98;
      const off = (1 - side) / 2;
      squares.push(
        <rect key={`${x}-${y}`} x={r(x + off)} y={r(y + off)} width={r(side)} height={r(side)} />,
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${data.cols} ${data.rows}`} className="w-full text-paper" shapeRendering="crispEdges" aria-hidden="true">
      <g fill="currentColor">{squares}</g>
    </svg>
  );
}

/**
 * Whether a game is running is the only thing on the page that is true *now*
 * rather than recently, and the rest of the page is cached for a minute or
 * more. So this one block keeps itself current: it renders whatever the
 * server saw, then polls and takes over.
 *
 * Server-rendered first so the banner is present without scripting and in the
 * first paint, rather than popping in after hydration.
 */
export function NowPlayingBanner({ initial }: { initial: NowPlayingPayload }) {
  const [game, setGame] = useState<NowPlayingPayload>(initial);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        if (!cancelled && res.ok) setGame((await res.json()) as NowPlayingPayload);
      } catch {
        // A failed poll is not worth surfacing; the next one will do.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };

    // Nothing changes while the tab is in the background, and polling there
    // wakes the radio for no benefit. Check once on return instead.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void poll();
      }
    };

    timer = setTimeout(poll, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!game) return null;

  return (
    <a
      key={game.url}
      href={game.url}
      className="group mb-16 -mt-8 block animate-[fade-in_420ms_ease] bg-ink px-6 py-6 text-paper transition-opacity hover:opacity-90 sm:px-8"
    >
      <span className="flex items-center gap-6">
        <span className="w-[124px] shrink-0 border border-paper/25 p-[2px]">
          <Grid data={game} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[10px] tracking-[0.24em] text-paper/70">
            <span className="pulse-mark">▪</span> playing now
          </span>
          <span className="mt-2 block truncate text-xl font-medium tracking-[-0.02em] group-hover:underline sm:text-2xl">
            {game.title}
          </span>
          <span className="mt-1 block text-[10px] tracking-[0.14em] text-paper/50">steam</span>
        </span>
      </span>
    </a>
  );
}
