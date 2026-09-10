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
  const imgRef = useRef<HTMLImageElement>(null);
  const [hovered, setHovered] = useState(false);
  const [centred, setCentred] = useState(false);
  const [loadIt, setLoadIt] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
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

  const wanted = (canHover && hovered) || centred;
  const visible = wanted && ready;

  /*
   * On the very first reveal the image element does not exist yet, and an
   * element that was not in the DOM a frame ago has nothing to transition
   * from - so it used to appear instantly the first time and animate only
   * from the second. It now mounts hidden and is not shown until it has
   * decoded and a frame has been painted at zero, which gives the transition
   * a real starting point. Waiting on decode also means the fade begins when
   * the picture is genuinely ready to paint, rather than racing the network.
   */
  useEffect(() => {
    if (!loadIt) return;
    const img = imgRef.current;
    if (!img) return;

    let cancelled = false;
    const arm = () => {
      // Two frames: one to paint the hidden state, one to change off it.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        }),
      );
    };

    // decode() settles when the bitmap can be painted. If it can't - a game
    // without library art, say - the halftone simply stays, which is a better
    // outcome than revealing a broken graphic.
    const fail = () => {
      if (!cancelled) setFailed(true);
    };
    void (img.decode ? img.decode().then(arm, fail) : Promise.resolve().then(arm));

    return () => {
      cancelled = true;
    };
  }, [loadIt]);

  const soft = !instant;

  /*
   * Revealing and hiding are not the same gesture, so they aren't timed the
   * same. Revealing is the one that has to feel good: the picture eases in
   * over ~620ms while the halftone takes ~900ms to go. Because the photo
   * reaches full opacity first, the grid's last stretch finishes underneath
   * something already opaque - so the awkward end of its fade is simply never
   * seen. An earlier version had the dots drop from 0.66 to 0 over the final
   * third and that late cliff was the part that read as a snap.
   *
   * Both use a symmetric ease so neither end lurches. Hiding is quicker, and
   * the dots come back faster than the photo leaves so nothing flashes.
   */
  const SMOOTH = "cubic-bezier(0.4, 0, 0.2, 1)";
  const photoMs = instant ? 1 : visible ? 620 : 400;
  const dotsMs = instant ? 1 : visible ? 900 : 300;

  const move = (specs: [string, number][]) =>
    specs.map(([prop, d]) => `${prop} ${d}ms ${SMOOTH}`).join(", ");

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
            ["opacity", dotsMs],
            ["filter", dotsMs],
          ]),
          willChange: "opacity, filter",
        }}
      >
        {children}
      </span>
      {loadIt && !failed && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
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
              ["opacity", photoMs],
              ["filter", photoMs],
              ["transform", photoMs],
            ]),
            willChange: "opacity, filter, transform",
            pointerEvents: "none",
          }}
        />
      )}
    </span>
  );
}
