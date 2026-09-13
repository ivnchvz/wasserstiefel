"use client";

import type { NowPlayingPayload } from "@/app/api/now-playing/route";
import { HalftoneCells } from "./HalftoneCells";
import { usePoll } from "./usePoll";

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
  const game = usePoll<NowPlayingPayload>("/api/now-playing", initial);

  if (!game) return null;

  return (
    <a
      key={game.url}
      href={game.url}
      className="group mb-16 -mt-8 block animate-[fade-in_420ms_ease] bg-slab px-6 py-6 text-slab-ink transition-opacity hover:opacity-90 sm:px-8"
    >
      <span className="flex items-center gap-6">
        <span className="w-[124px] shrink-0 border border-slab-ink/25 p-[2px]">
          <HalftoneCells cols={game.cols} rows={game.rows} cells={game.cells} className="w-full text-slab-ink" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[10px] tracking-[0.24em] text-slab-ink/70">
            <span className="pulse-mark">▪</span> playing now
          </span>
          <span className="mt-2 block truncate text-xl font-medium tracking-[-0.02em] group-hover:underline sm:text-2xl">
            {game.title}
          </span>
          <span className="mt-1 block text-[10px] tracking-[0.14em] text-slab-ink/50">steam</span>
        </span>
      </span>
    </a>
  );
}
