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

  const ms = instant ? 1 : 520;
  const soft = !instant;

  // The two layers hand off rather than fading in step. If both sit at part
  // opacity together the paper ground shows through and the picture goes
  // milky, so the incoming image rises fast (ease-out) while the halftone
  // holds and then drops late (ease-in). Combined cover stays high the whole
  // way, and no paper is ever visible between them.
  // A CSS transition applies the same curve in both directions, so the pair is
  // swapped by state: whichever layer is arriving rises fast, whichever is
  // leaving holds and drops late. Without this the exit mirrors the entrance
  // and opens the very gap the entrance was tuned to avoid.
  const RISE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  const HOLD = "cubic-bezier(0.55, 0.055, 0.675, 0.19)";
  const arriving = visible ? RISE : HOLD;
  const leaving = visible ? HOLD : RISE;
  const move = (specs: [string, string][]) =>
    specs.map(([prop, ease]) => `${prop} ${ms}ms ${ease}`).join(", ");

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
      {/*
       * The halftone dissolves rather than simply sitting underneath. Its
       * squares are high-frequency and high-contrast, so cross-fading against
       * a photograph on its own reads as two images at once; blurring the
       * grid out as it goes lets the dots melt instead of ghosting.
       */}
      <span
        style={{
          display: "block",
          opacity: visible ? 0 : 1,
          filter: soft && visible ? "blur(3px)" : "blur(0px)",
          transition: move([
            ["opacity", leaving],
            ["filter", RISE],
          ]),
          willChange: "opacity, filter",
        }}
      >
        {children}
      </span>
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
            // Arrives slightly soft and large, then settles - the picture
            // pulls into focus as the grid lets go.
            filter: soft && !visible ? "blur(5px)" : "blur(0px)",
            transform: soft && !visible ? "scale(1.03)" : "scale(1)",
            transition: move([
              ["opacity", arriving],
              ["filter", RISE],
              ["transform", RISE],
            ]),
            willChange: "opacity, filter, transform",
            pointerEvents: "none",
          }}
        />
      )}
    </span>
  );
}
