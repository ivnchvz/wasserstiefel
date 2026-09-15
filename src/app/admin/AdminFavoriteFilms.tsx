"use client";

import { useEffect, useState } from "react";

type Entry = { slug?: string };

const FIELD =
  "min-w-0 flex-1 border border-rule bg-transparent px-3 py-2 text-[12px] outline-none placeholder:text-ink-soft focus:border-ink";
const BUTTON =
  "shrink-0 cursor-pointer border border-rule px-3 py-2 text-[10px] tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40";

export function AdminFavoriteFilms() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/favorite-films");
      const body = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(body.error ?? "could not load");
      else setEntries(body.entries ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/favorite-films", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: value.trim() }),
    });
    const body = await res.json();
    if (!res.ok) setError(body.error === "invalid entry" ? "that isn't a letterboxd film address" : (body.error ?? "could not save"));
    else {
      setEntries(body.entries ?? []);
      setValue("");
    }
    setBusy(false);
  }

  async function remove(slug: string) {
    const res = await fetch(`/api/admin/favorite-films?key=${encodeURIComponent(slug)}`, { method: "DELETE" });
    if (res.ok) setEntries((await res.json()).entries ?? []);
  }

  return (
    <section>
      <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">favourite films</h2>
      {error && <p className="mb-4 border border-ink px-3 py-2 text-[11px] text-ink">{error}</p>}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="letterboxd.com/film/…"
            className={FIELD}
          />
          <button type="button" onClick={add} disabled={!value.trim() || busy} className={BUTTON}>
            add film
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-ink-soft">
          letterboxd put member profiles behind a bot check, so this list is kept here rather than read from your
          profile. each film&apos;s title, year and poster still come from its own page.
        </p>
      </div>

      <h3 className="mt-10 mb-3 text-[10px] tracking-[0.2em] text-ink-soft">shown ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing here yet</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={String(e.slug)} className="flex items-center gap-4 border-b border-rule py-3">
              <a
                href={`https://letterboxd.com/film/${e.slug}/`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-[12px] hover:underline"
              >
                {String(e.slug)}
              </a>
              <button
                type="button"
                onClick={() => remove(String(e.slug))}
                className="text-[10px] tracking-[0.12em] text-ink-soft hover:text-ink hover:underline"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
