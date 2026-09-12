"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

/** In case the video never reports finishing - autoplay blocked, a decode failure. */
const FALLBACK_MS = 9000;
const FADE_MS = 500;

/**
 * The way in. Rendered on the server so it's part of the first paint rather
 * than appearing over a page that's already visible, and it clears itself when
 * the video ends.
 *
 * Nobody can be trapped behind it: a click, Escape or the enter control closes
 * it, a timer closes it if the video never plays, and it's hidden outright
 * without scripting or when reduced motion is asked for.
 */
export function Intro({ src, caption }: { src: string; caption: string }) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  // Mirrors the CSS rule that hides the overlay, so the scroll lock is never
  // left on behind something nobody can see.
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", false);

  useEffect(() => {
    if (gone || reduceMotion) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dismiss = () => setLeaving(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const failsafe = setTimeout(dismiss, FALLBACK_MS);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      clearTimeout(failsafe);
    };
  }, [gone, reduceMotion]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone || reduceMotion) return null;

  return (
    <div
      className="intro-overlay fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-8 bg-paper px-6 py-10 transition-opacity"
      style={{ opacity: leaving ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      onClick={() => setLeaving(true)}
      role="button"
      tabIndex={0}
      aria-label="Enter the site"
    >
      <video
        ref={video}
        src={src}
        autoPlay
        muted
        playsInline
        // Removing controls and looping would trap the eye; it plays once and leaves.
        onEnded={() => setLeaving(true)}
        onError={() => setGone(true)}
        className="max-h-[62vh] w-auto max-w-full border border-rule object-contain"
      />

      <p className="max-w-[46ch] text-center text-[13px] leading-relaxed tracking-[-0.01em] text-ink">{caption}</p>

      <span className="text-[10px] tracking-[0.2em] text-ink-soft">click anywhere to enter</span>
    </div>
  );
}
