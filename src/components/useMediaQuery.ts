"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query is external state, so it is subscribed to rather than copied
 * into state in an effect - which also means it reacts to the user plugging
 * in a mouse or turning on reduced motion mid-session.
 */
export function useMediaQuery(query: string, serverFallback: boolean): boolean {
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
