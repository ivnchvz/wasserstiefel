"use client";

import { useEffect, useState } from "react";

/**
 * Starts from what the server rendered, then re-reads `url` on an interval.
 *
 * Nothing on the page changes while the tab is in the background, so polling
 * stops there - a hidden tab doesn't reschedule - and resumes with an
 * immediate read when the tab comes back. A failed read keeps the last good
 * value rather than blanking the section over a transient upstream error.
 */
export function usePoll<T>(url: string, initial: T, everyMs = 25_000): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled || document.hidden) return; // the visibility handler restarts it
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!cancelled && res.ok) setValue((await res.json()) as T);
      } catch {
        // Not worth surfacing; the next read will do.
      }
      if (!cancelled && !document.hidden) timer = setTimeout(poll, everyMs);
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      void poll();
    };

    timer = setTimeout(poll, everyMs);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, everyMs]);

  return value;
}
