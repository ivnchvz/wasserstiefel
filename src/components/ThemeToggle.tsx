"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useMediaQuery } from "./useMediaQuery";

export const THEME_KEY = "theme";

/**
 * The chosen theme lives on the document, set before paint by the script in
 * the layout. Subscribed to rather than copied into state, so the control and
 * the page can't disagree.
 */
function useChoice(): string {
  const subscribe = useCallback((onChange: () => void) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme ?? "",
    () => "", // the server can't know; the script settles it before paint
  );
}

export function ThemeToggle() {
  const choice = useChoice();
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  // No choice made yet means follow the system.
  const dark = choice ? choice === "dark" : systemDark;

  const set = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing; the choice just won't outlast the page.
    }
  };

  return (
    <button
      type="button"
      onClick={set}
      // The label is what pressing it does, not the state it's in.
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      className="cursor-pointer border-b border-transparent pb-1 text-[11px] lowercase tracking-[0.2em] text-ink-soft transition-colors hover:text-ink"
    >
      {dark ? "light" : "dark"}
    </button>
  );
}
