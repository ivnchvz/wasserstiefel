"use client";

import { useState } from "react";

/**
 * Apple's own player, loaded on click rather than on page load - it pulls a
 * good deal of script and would otherwise cost every visitor, playing or not.
 * Once opened it stays mounted, so the music keeps going while the rest of
 * the page is read; that's why this isn't the overlay the reels use.
 *
 * Signed-out listeners get previews; signed in to Apple Music, full tracks.
 */
export function PlaylistEmbed({ src, title, href }: { src: string; title: string; href: string }) {
  const [playing, setPlaying] = useState(false);

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group flex w-full max-w-[42rem] items-center gap-5 border border-rule bg-paper px-5 py-5 text-left transition-colors hover:border-ink"
      >
        <span className="text-2xl leading-none text-ink">▶</span>
        <span className="min-w-0">
          <span className="block text-[10px] tracking-[0.2em] text-ink-soft">apple music</span>
          <span className="mt-1 block truncate text-lg font-medium tracking-[-0.02em] group-hover:underline">{title}</span>
          <span className="mt-1 block text-[10px] tracking-[0.14em] text-ink-soft">play here</span>
        </span>
      </button>
    );
  }

  return (
    <div className="max-w-[42rem]">
      <iframe
        src={src}
        title={title}
        height={450}
        className="w-full border border-rule bg-paper"
        // Apple's own embed attributes; storage access is what lets a signed-in
        // listener hear whole tracks instead of previews.
        allow="autoplay *; encrypted-media *; clipboard-write; fullscreen *"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
      />
      <a
        href={href}
        className="mt-2 inline-block text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline"
      >
        open in apple music ↗
      </a>
    </div>
  );
}
