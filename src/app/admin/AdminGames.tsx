"use client";

import { useEffect, useRef, useState } from "react";
import type { GameSearchResult } from "@/lib/gameSearch";

type Entry = {
  slug?: string;
  title?: string;
  status?: string;
  rating?: number | null;
  playedAt?: string | null;
  platform?: string | null;
};

const STATUSES = ["playing", "completed", "retired", "shelved"] as const;
const today = () => new Date().toISOString().slice(0, 10);
const keyOf = (e: Entry) => (e.slug ?? e.title ?? "").toLowerCase();

const CHIP =
  "cursor-pointer border border-rule px-2 py-1 text-[10px] tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40";

export function AdminGames() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/games");
      const body = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(body.error ?? "could not load entries");
      else setEntries(body.entries ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // results are hidden below rather than cleared here

    // Debounced, and stamped so a slow response can't overwrite a newer one.
    const mine = ++seq.current;
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const body = await res.json();
        if (mine === seq.current) setResults(body.results ?? []);
      })();
    }, 280);

    return () => clearTimeout(t);
  }, [query]);

  async function upsert(entry: Entry) {
    setBusy(keyOf(entry));
    setError(null);
    const res = await fetch("/api/admin/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    const body = await res.json();
    if (!res.ok) setError(body.error ?? "could not save");
    else setEntries(body.entries ?? []);
    setBusy(null);
  }

  async function remove(entry: Entry) {
    setBusy(keyOf(entry));
    const res = await fetch(`/api/admin/games?key=${encodeURIComponent(keyOf(entry))}`, { method: "DELETE" });
    if (res.ok) setEntries((await res.json()).entries ?? []);
    setBusy(null);
  }

  const statusOf = (slug: string) => entries.find((e) => keyOf(e) === slug.toLowerCase())?.status;

  return (
    <div className="flex flex-col gap-14">
      {error && <p className="border border-ink px-3 py-2 text-[11px] text-ink">{error}</p>}

      <section>
        <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">search games</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="type a title…"
          className="w-full border border-rule bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-ink-soft focus:border-ink"
        />

        <ul className="mt-6 flex flex-col gap-3">
          {(query.trim().length >= 2 ? results : []).map((r) => {
            const current = statusOf(r.slug);
            return (
              <li key={r.slug} className="flex items-center gap-4 border-b border-rule pb-3">
                {r.cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={r.cover} alt="" className="h-16 w-12 shrink-0 border border-rule object-cover" />
                ) : (
                  <span className="h-16 w-12 shrink-0 border border-rule" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {r.title} {r.year && <span className="text-ink-soft">{r.year}</span>}
                  </span>
                  <span className="mt-0.5 block text-[10px] tracking-[0.1em] text-ink-soft">
                    {r.kind ?? "game"} · {r.slug}
                    {current && <span className="text-ink"> · {current}</span>}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy === r.slug.toLowerCase()}
                      onClick={() => upsert({ slug: r.slug, status: s, playedAt: today() })}
                      className={`${CHIP} ${current === s ? "border-ink text-ink" : ""}`}
                    >
                      {s}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">
          logged games <span className="text-ink-soft">({entries.length})</span>
        </h2>
        {entries.length === 0 ? (
          <p className="text-[11px] text-ink-soft">nothing logged yet</p>
        ) : (
          <ul className="flex flex-col">
            {entries.map((e) => (
              <li key={keyOf(e)} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule py-3">
                <span className="min-w-0 flex-1 truncate text-[13px]">{e.slug ?? e.title}</span>

                <select
                  value={e.status ?? ""}
                  onChange={(ev) => upsert({ ...e, status: ev.target.value })}
                  className="border border-rule bg-transparent px-2 py-1 text-[10px] tracking-[0.1em] outline-none focus:border-ink"
                >
                  <option value="">no status</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={e.playedAt ?? ""}
                  onChange={(ev) => upsert({ ...e, playedAt: ev.target.value })}
                  className="border border-rule bg-transparent px-2 py-1 text-[10px] tabular-nums outline-none focus:border-ink"
                />

                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  value={e.rating ?? ""}
                  placeholder="—"
                  onChange={(ev) =>
                    upsert({ ...e, rating: ev.target.value === "" ? null : Number(ev.target.value) })
                  }
                  className="w-16 border border-rule bg-transparent px-2 py-1 text-[10px] tabular-nums outline-none focus:border-ink"
                />

                <button type="button" onClick={() => remove(e)} className={CHIP}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
