"use client";

import { useEffect, useRef, useState } from "react";

type Entry = { slug?: string };
type Result = { key: string; slug: string; title: string; year: string | null; note: string | null };

const FIELD =
  "w-full border border-rule bg-transparent px-3 py-2 text-[12px] outline-none placeholder:text-ink-soft focus:border-ink";
const BUTTON =
  "shrink-0 cursor-pointer border border-rule px-3 py-2 text-[10px] tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40";

export function AdminFavoriteGames() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/favorite-games");
      const body = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(body.error ?? "could not load");
      else setEntries(body.entries ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    const mine = ++seq.current;
    if (!q) return;

    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/admin/search?kind=games&q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const body = await res.json();
        if (mine === seq.current) setResults(body.results ?? []);
      })();
    }, 280);

    return () => clearTimeout(t);
  }, [query]);

  async function add(slug: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/favorite-games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const body = await res.json();
    if (!res.ok) setError(body.error ?? "could not save");
    else {
      setEntries(body.entries ?? []);
      setQuery("");
      setResults([]);
    }
    setBusy(false);
  }

  async function remove(slug: string) {
    const res = await fetch(`/api/admin/favorite-games?key=${encodeURIComponent(slug)}`, { method: "DELETE" });
    if (res.ok) setEntries((await res.json()).entries ?? []);
  }

  return (
    <section>
      <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">favourite games</h2>
      {error && <p className="mb-4 border border-ink px-3 py-2 text-[11px] text-ink">{error}</p>}

      <div className="flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) setResults([]);
          }}
          placeholder="search backloggd…"
          className={FIELD}
        />
        <p className="text-[10px] leading-relaxed text-ink-soft">
          backloggd put member profiles behind a bot check, so this list is kept here rather than read from your
          profile. each game&apos;s title, year and cover still come from its own page.
        </p>
      </div>

      {results.length > 0 && (
        <ul className="mt-4">
          {results.map((r) => (
            <li key={r.key} className="flex items-center gap-4 border-b border-rule py-3">
              <span className="min-w-0 flex-1 truncate text-[12px]">
                {r.title}
                {r.year && <span className="text-ink-soft"> ({r.year})</span>}
                {r.note && <span className="ml-2 text-[10px] text-ink-soft">{r.note}</span>}
              </span>
              <button type="button" onClick={() => add(r.slug)} disabled={busy} className={BUTTON}>
                add game
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-10 mb-3 text-[10px] tracking-[0.2em] text-ink-soft">shown ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing here yet</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={String(e.slug)} className="flex items-center gap-4 border-b border-rule py-3">
              <a
                href={`https://backloggd.com/games/${e.slug}/`}
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
