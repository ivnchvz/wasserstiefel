"use client";

import { useEffect, useRef, useState } from "react";

/** Used until the player reports its own height, and if it never does. */
const FALLBACK_HEIGHT = 690;

/**
 * A saved Instagram reel. The page shows only a paper tile; Instagram's own
 * embed player is loaded into an overlay when the tile is clicked, and torn
 * down when it closes (which also stops playback).
 *
 * Nothing is requested from Instagram until then - no player, no scripts, no
 * cookies - so visitors who never open a reel never contact it. The embed is
 * Instagram's official one, framed as it is meant to be; no media is pulled
 * out of it, since its image URLs are signed and expire within days anyway.
 */
export function ReelTile({
  shortcode,
  note,
  index,
  poster,
}: {
  shortcode: string;
  note: string | null;
  index: number;
  /** A halftone of the uploaded still, rendered on the server. */
  poster?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number | null>(null);

  /*
   * The player posts {type: "MEASURE", details: {height}} to its parent once
   * laid out - it's how Instagram's own embed script sizes its frames. Sizing
   * to it means no guessed height and no blank band under the comments.
   * Only this frame's messages, from Instagram's origin, are listened to.
   */
  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.instagram.com" || e.source !== frame.current?.contentWindow) return;
      try {
        const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const h = msg?.type === "MEASURE" ? Number(msg.details?.height) : NaN;
        if (Number.isFinite(h) && h > 100) setHeight(Math.ceil(h));
      } catch {
        // Not one of the player's messages.
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };
  const hide = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="group relative flex aspect-[9/16] w-full flex-col justify-between overflow-hidden border border-rule bg-paper p-3 text-left transition-colors hover:border-ink"
        aria-label={`Play reel${note ? `: ${note}` : ""}`}
      >
        {poster ? (
          <span aria-hidden="true" // Held back so the labels over it stay readable; full strength on hover.
            className="pointer-events-none absolute inset-0 overflow-hidden text-ink opacity-[0.55] transition-opacity group-hover:opacity-90">
            {poster}
          </span>
        ) : (
          /* Without a still, a dot grid keeps the tile in the page's halftone language. */
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 text-ink opacity-[0.16] transition-opacity group-hover:opacity-30"
            style={{ backgroundImage: "radial-gradient(currentColor 0.9px, transparent 1.1px)", backgroundSize: "7px 7px" }}
          />
        )}
        <span className="relative flex items-baseline justify-between text-[10px] tracking-[0.18em] text-ink-soft">
          {/* On paper, so they read against a busy still underneath. */}
          <span className="bg-paper px-1">reel</span>
          <span className="bg-paper px-1 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
        </span>
        <span className="relative self-center bg-paper px-2 text-2xl leading-none text-ink">▶</span>
        <span className="relative line-clamp-4 bg-paper px-1 text-[11px] leading-snug text-ink">{note ?? " "}</span>
      </button>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        // A click that lands on the backdrop, not the player, closes it.
        onClick={(e) => e.target === dialog.current && hide()}
        className="m-auto bg-transparent p-0 backdrop:bg-[var(--scrim)]"
      >
        <div className="flex w-[min(380px,92vw)] flex-col">
          <button
            type="button"
            onClick={hide}
            className="self-end px-1 pb-2 text-[11px] tracking-[0.16em] text-slab-ink hover:underline"
          >
            close ✕
          </button>
          {open && (
            <iframe
              ref={frame}
              src={`https://www.instagram.com/reel/${shortcode}/embed/`}
              title={note ?? "Instagram reel"}
              // Capped to the viewport; the player scrolls inside if it's taller.
              style={{ height: height ?? FALLBACK_HEIGHT }}
              className="max-h-[85vh] w-full border-0 bg-paper"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </dialog>
    </>
  );
}
