"use client";

import { useState } from "react";
import type { AlbumsPayload } from "@/lib/albumsPage";
import { HalftoneCells } from "./HalftoneCells";
import { Rating } from "./Rating";

const TAB =
  "cursor-pointer border-b border-transparent pb-0.5 text-[10px] tabular-nums text-ink-soft transition-colors hover:text-ink disabled:cursor-default";

/**
 * Rated albums, a page at a time.
 *
 * The first page is server-rendered, so it's in the first paint and readable
 * without scripting; later pages are fetched when asked for. Sending all of
 * them at once would mean every cover's grid in the markup - over a hundred
 * of them - for a section most visitors never page through.
 */
export function AlbumShelf({ initial }: { initial: AlbumsPayload }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function go(page: number) {
    if (page === data.page || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/albums?page=${page}`);
      if (res.ok) setData((await res.json()) as AlbumsPayload);
    } catch {
      // Keep showing the page already here.
    }
    setBusy(false);
  }

  // From the fixed page size, not this page's length - the last page is short.
  const from = (data.page - 1) * data.perPage + 1;

  return (
    <div style={{ opacity: busy ? 0.5 : 1, transition: "opacity 150ms ease" }}>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
        {data.items.map((a) => (
          <li key={`${a.artist}-${a.title}`}>
            <span className="block border border-rule bg-paper p-[3px]">
              {a.cells.length > 0 ? (
                <HalftoneCells cols={a.cols} rows={a.rows} cells={a.cells} label={a.title} className="w-full text-ink" />
              ) : (
                <span className="flex aspect-square items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                  {a.title}
                </span>
              )}
            </span>
            <span className="mt-3 block text-[11px] leading-snug">{a.title}</span>
            <span className="mt-0.5 block truncate text-[10px] text-ink-soft">{a.artist}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2">
              {a.year && <span className="text-[10px] tabular-nums text-ink-soft">{a.year}</span>}
              <Rating value={a.rating} />
            </span>
          </li>
        ))}
      </ul>

      {data.pages > 1 && (
        <div className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="text-[10px] tracking-[0.14em] text-ink-soft">
            {from}–{from + data.items.length - 1} of {data.total}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-3">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => go(n)}
                disabled={busy}
                aria-current={n === data.page ? "page" : undefined}
                className={`${TAB} ${n === data.page ? "border-ink text-ink" : ""}`}
              >
                {String(n).padStart(2, "0")}
              </button>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
