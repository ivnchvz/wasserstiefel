"use client";

import { useEffect, useState } from "react";

const POLL_MS = 10_000;

/**
 * Saves commit as they're made, but Vercel skips building those commits, so
 * nothing is deployed while logging. Leaving admin publishes them as one
 * build.
 *
 * Two signals, because neither covers both cases: pagehide catches closing the
 * tab or navigating away, and the cleanup catches moving to another page
 * within the site, where pagehide never fires. Publishing with nothing pending
 * does nothing, so firing twice is harmless.
 */
export function PublishOnLeave() {
  const [pending, setPending] = useState(0);
  const [applicable, setApplicable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;

    const read = async () => {
      try {
        const res = await fetch("/api/admin/publish", { cache: "no-store" });
        if (!res.ok || stop) return;
        const body = await res.json();
        setApplicable(Boolean(body.applicable));
        setPending(Number(body.pending) || 0);
      } catch {
        // A failed count isn't worth showing; the next one will do.
      }
    };

    void read();
    const timer = setInterval(read, POLL_MS);

    // sendBeacon survives the page going away, which a normal fetch may not.
    const onLeave = () => navigator.sendBeacon("/api/admin/publish");
    window.addEventListener("pagehide", onLeave);

    return () => {
      stop = true;
      clearInterval(timer);
      window.removeEventListener("pagehide", onLeave);
      onLeave();
    };
  }, []);

  if (!applicable) return null;

  const publishNow = async () => {
    setBusy(true);
    await fetch("/api/admin/publish", { method: "POST" }).catch(() => {});
    setPending(0);
    setBusy(false);
  };

  return (
    <span className="flex items-baseline gap-3 text-[10px] tracking-[0.14em] text-ink-soft">
      {pending > 0 ? (
        <>
          <span className="text-ink">
            {pending} unpublished — goes live when you leave
          </span>
          <button
            type="button"
            onClick={publishNow}
            disabled={busy}
            className="cursor-pointer underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
          >
            {busy ? "publishing…" : "publish now"}
          </button>
        </>
      ) : (
        <span>everything published</span>
      )}
    </span>
  );
}
