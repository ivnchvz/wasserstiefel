"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a halftone with its source artwork, revealed on attention: hover on
 * pointer devices, and on touch when the element crosses the middle of the
 * screen. Scrolling past drops it back to the halftone.
 *
 * The real image has no `src` until the first reveal, so the page keeps making
 * zero image requests until someone actually asks for one.
 */
export function Reveal({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [centred, setCentred] = useState(false);
  const [loadIt, setLoadIt] = useState(false);

  useEffect(() => {
    // Hover handles this wherever a pointer exists; only touch needs scroll.
    if (window.matchMedia("(hover: hover)").matches) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setCentred(entry.isIntersecting);
        if (entry.isIntersecting) setLoadIt(true);
      },
      // Collapsing the root to a band across the middle means "intersecting"
      // is true only while the element sits in the centre of the screen.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className="reveal relative block"
      data-centred={centred || undefined}
      onPointerEnter={() => setLoadIt(true)}
    >
      {children}
      {loadIt && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={alt} decoding="async" className="reveal-img" />
      )}
    </span>
  );
}
