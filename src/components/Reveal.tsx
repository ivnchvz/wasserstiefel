"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * A media query is external state, so it is subscribed to rather than copied
 * into state in an effect - which also means it reacts to the user plugging
 * in a mouse or turning on reduced motion mid-session.
 */
function useMediaQuery(query: string, serverFallback: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

/**
 * Wraps a halftone with its source artwork, revealed on attention: hover on
 * pointer devices, and on touch when the element crosses the middle of the
 * screen. Scrolling past drops it back to the halftone.
 *
 * Positioning and fade are inline rather than in a stylesheet. An earlier
 * version put them in globals.css, and a stale stylesheet dropped the image
 * out of its overlay and into the flow *below* the halftone - a class of
 * failure inline styles can't have.
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
  const [hovered, setHovered] = useState(false);
  const [centred, setCentred] = useState(false);
  const [loadIt, setLoadIt] = useState(false);
  const canHover = useMediaQuery("(hover: hover)", true);
  const instant = useMediaQuery("(prefers-reduced-motion: reduce)", false);

  useEffect(() => {
    // Hover covers this wherever a pointer exists; only touch needs scroll.
    if (canHover) return;

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
  }, [canHover]);

  const visible = (canHover && hovered) || centred;

  return (
    <span
      ref={ref}
      style={{ position: "relative", display: "block" }}
      onPointerEnter={() => {
        setLoadIt(true);
        setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      {children}
      {loadIt && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: visible ? 1 : 0,
            pointerEvents: "none",
            transition: `opacity ${instant ? 1 : 320}ms ease`,
          }}
        />
      )}
    </span>
  );
}
