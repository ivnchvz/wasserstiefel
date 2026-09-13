"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryPicture = {
  id: string;
  src: string;
  caption: string | null;
  source: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Saved images, shown as they are - the halftone belongs to the index, where
 * it turns other people's artwork into the page's own language. Here the
 * picture is the point.
 *
 * Clicking one opens it as large as the window allows, with the rest reachable
 * by arrow key or the controls.
 */
export function GalleryViewer({ pictures }: { pictures: GalleryPicture[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [at, setAt] = useState<number | null>(null);

  const open = (i: number) => {
    setAt(i);
    dialog.current?.showModal();
  };

  const step = useCallback(
    (by: number) => setAt((i) => (i === null ? null : (i + by + pictures.length) % pictures.length)),
    [pictures.length],
  );

  useEffect(() => {
    if (at === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, step]);

  const current = at === null ? null : pictures[at];
  // The neighbours are fetched quietly, so stepping through doesn't wait.
  const neighbours =
    at === null ? [] : [pictures[(at + 1) % pictures.length], pictures[(at - 1 + pictures.length) % pictures.length]];

  return (
    <>
      {/*
       * A shelf rather than a grid: each picture keeps its own proportions and
       * they sit on a shared baseline, so a row reads as objects on a surface.
       * Nothing is ever drawn larger than the file actually is - upscaling a
       * small image just makes it soft.
       */}
      <ul className="flex flex-wrap items-end gap-x-7 gap-y-14">
        {pictures.map((p, i) => (
          <li key={p.id} className="flex w-fit max-w-[190px] flex-col gap-2">
            <button
              type="button"
              onClick={() => open(i)}
              className="block cursor-zoom-in transition-opacity hover:opacity-80"
              aria-label={p.caption ? `Open ${p.caption}` : "Open image"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.caption ?? ""}
                loading="lazy"
                decoding="async"
                style={{
                  // Scales with the viewport, but never past the file's own size.
                  maxHeight: p.height ? `min(clamp(120px, 22vw, 240px), ${p.height}px)` : "clamp(120px, 22vw, 240px)",
                  maxWidth: p.width ? `min(clamp(96px, 18vw, 190px), ${p.width}px)` : "clamp(96px, 18vw, 190px)",
                  aspectRatio: p.width && p.height ? `${p.width} / ${p.height}` : undefined,
                }}
                className="block h-auto w-auto"
              />
            </button>

            <span className="flex flex-col gap-0.5 text-[10px] leading-[1.5]">
              <span className="tabular-nums text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
              {p.caption && <span className="text-ink">{p.caption}</span>}
              {p.source && (
                <a href={p.source} className="w-fit tracking-[0.1em] text-ink-soft hover:text-ink hover:underline">
                  SRC ↗
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setAt(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-[var(--scrim)]"
      >
        {current && (
          <div className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-4 p-4 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.caption ?? ""}
              // Big enough to look at, never bigger than the file: a low-res
              // picture stretched to fill the window only looks worse.
              style={{
                maxHeight: current.height ? `min(82vh, ${current.height}px)` : "82vh",
                maxWidth: current.width ? `min(100%, ${current.width}px)` : "100%",
              }}
              className="pointer-events-auto cursor-zoom-out object-contain"
              onClick={() => dialog.current?.close()}
            />

            <div className="pointer-events-auto flex w-full max-w-3xl items-baseline justify-between gap-6 text-slab-ink">
              <button type="button" onClick={() => step(-1)} className="text-[11px] tracking-[0.16em] hover:underline" aria-label="Previous image">
                ← prev
              </button>
              <span className="min-w-0 flex-1 truncate text-center text-[11px]">
                {current.caption}
                <span className="ml-3 tabular-nums text-slab-ink/60">
                  {(at ?? 0) + 1}/{pictures.length}
                </span>
              </span>
              <button type="button" onClick={() => step(1)} className="text-[11px] tracking-[0.16em] hover:underline" aria-label="Next image">
                next →
              </button>
            </div>

            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="pointer-events-auto text-[10px] tracking-[0.16em] text-slab-ink/60 hover:text-paper hover:underline"
            >
              close ✕
            </button>
          </div>
        )}

        {neighbours.map(
          (n) =>
            n && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={`pre-${n.id}`} src={n.src} alt="" aria-hidden="true" className="hidden" />
            ),
        )}
      </dialog>
    </>
  );
}
