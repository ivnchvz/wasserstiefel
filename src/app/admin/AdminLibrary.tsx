"use client";

import { useEffect, useRef, useState } from "react";

type Result = {
  key: string;
  title: string;
  year: string | null;
  image: string | null;
  note: string | null;
  slug?: string;
  id?: number;
  artist?: string;
  cover?: string | null;
};

type Entry = Record<string, unknown>;

export type LibraryConfig = {
  kind: "games" | "series" | "albums";
  heading: string;
  placeholder: string;
  /** Shelves to pick from. Empty when the entry is rated rather than shelved. */
  statuses: readonly string[];
  /** Which field carries the date, and which identifies an entry. */
  dateField: "playedAt" | "watchedAt" | "ratedAt";
  idField: "slug" | "id";
  /**
   * Albums aren't shelved, they're scored - so their search results offer a
   * rating straight away instead of a status.
   */
  mode?: "status" | "rating";
};

const CHIP =
  "cursor-pointer border border-rule px-2 py-1 text-[10px] tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40";
const FIELD = "border border-rule bg-transparent px-2 py-1 text-[10px] outline-none focus:border-ink";

const today = () => new Date().toISOString().slice(0, 10);

/** How long to wait after the last keystroke before saving. */
const SETTLE_MS = 900;

/**
 * A logged entry's row. The fields are local while being edited and saved once
 * they settle - bound straight to the server, a rating typed as "4.5" saved
 * three times, and each save was a commit and a deploy.
 */
function LoggedRow({
  entry,
  statuses,
  dateField,
  label,
  onSave,
  onRemove,
}: {
  entry: Entry;
  statuses: readonly string[];
  dateField: LibraryConfig["dateField"];
  label: string;
  onSave: (e: Entry) => Promise<void>;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(entry);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Save whatever is pending if the row goes away mid-edit.
  useEffect(() => () => clearTimeout(timer.current), []);

  const edit = (patch: Entry, immediate = false) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    clearTimeout(timer.current);
    if (immediate) void onSave(next);
    else timer.current = setTimeout(() => void onSave(next), SETTLE_MS);
  };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule py-3">
      <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>

      {statuses.length > 0 && (
        <select
          value={(draft.status as string) ?? ""}
          onChange={(e) => edit({ status: e.target.value }, true)}
          className={`${FIELD} tracking-[0.1em]`}
        >
          <option value="">no status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      <input
        type="date"
        value={(draft[dateField] as string) ?? ""}
        onChange={(e) => edit({ [dateField]: e.target.value })}
        onBlur={() => void onSave(draft)}
        className={`${FIELD} tabular-nums`}
      />

      <input
        type="number"
        min={0}
        max={5}
        step={0.5}
        placeholder="—"
        value={(draft.rating as number) ?? ""}
        onChange={(e) => edit({ rating: e.target.value === "" ? null : Number(e.target.value) })}
        onBlur={() => void onSave(draft)}
        className={`${FIELD} w-16 tabular-nums`}
      />

      <button type="button" onClick={onRemove} className={CHIP}>
        remove
      </button>
    </li>
  );
}

export function AdminLibrary({ config }: { config: LibraryConfig }) {
  const { kind, heading, placeholder, statuses, dateField, idField, mode = "status" } = config;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const keyOf = (e: Entry) => String(e[idField] ?? e.title ?? "").toLowerCase();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/admin/${kind}`);
      const body = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(body.error ?? "could not load entries");
      else setEntries(body.entries ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // results are hidden below rather than cleared here

    // Debounced, and stamped so a slow response can't overwrite a newer one.
    const mine = ++seq.current;
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/admin/search?kind=${kind}&q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const body = await res.json();
        if (mine === seq.current) setResults(body.results ?? []);
      })();
    }, 280);

    return () => clearTimeout(t);
  }, [query, kind]);

  async function upsert(entry: Entry) {
    setBusy(keyOf(entry));
    setError(null);
    const res = await fetch(`/api/admin/${kind}`, {
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
    const res = await fetch(`/api/admin/${kind}?key=${encodeURIComponent(String(entry[idField] ?? ""))}`, {
      method: "DELETE",
    });
    if (res.ok) setEntries((await res.json()).entries ?? []);
    setBusy(null);
  }

  const statusOf = (k: string) =>
    entries.find((e) => String(e[idField] ?? "").toLowerCase() === k.toLowerCase())?.status as string | undefined;

  const identify = (r: Result) => ({
    ...(idField === "slug" ? { slug: r.slug } : { id: r.id }),
    title: r.title,
    // Albums keep their artist, year and artwork, so the page needs no lookup.
    ...(r.artist ? { artist: r.artist } : {}),
    ...(r.year ? { year: r.year } : {}),
    ...(r.cover ? { cover: r.cover } : {}),
  });

  const ratingOf = (k: string) =>
    entries.find((e) => String(e[idField] ?? "").toLowerCase() === k.toLowerCase())?.rating as number | undefined;

  return (
    <section>
      <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">{heading}</h2>
      {error && <p className="mb-4 border border-ink px-3 py-2 text-[11px] text-ink">{error}</p>}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-rule bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-ink-soft focus:border-ink"
      />

      <ul className="mt-5 flex flex-col gap-3">
        {(query.trim().length >= 2 ? results : []).map((r) => {
          const current = statusOf(r.key);
          return (
            <li key={r.key} className="flex items-center gap-4 border-b border-rule pb-3">
              {r.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={r.image} alt="" className="h-16 w-12 shrink-0 border border-rule object-cover" />
              ) : (
                <span className="h-16 w-12 shrink-0 border border-rule" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">
                  {r.title} {r.year && <span className="text-ink-soft">{r.year}</span>}
                </span>
                <span className="mt-0.5 block truncate text-[10px] tracking-[0.1em] text-ink-soft">
                  {r.note}
                  {current && <span className="text-ink"> · {current}</span>}
                  {mode === "rating" && ratingOf(r.key) !== undefined && (
                    <span className="text-ink"> · rated {ratingOf(r.key)}</span>
                  )}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap gap-1">
                {mode === "rating"
                  ? [1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={busy === r.key.toLowerCase()}
                        onClick={() => upsert({ ...identify(r), rating: n, [dateField]: today() })}
                        className={`${CHIP} ${(ratingOf(r.key) ?? 0) >= n ? "border-ink text-ink" : ""}`}
                        aria-label={`${n} out of 5`}
                      >
                        {n}
                      </button>
                    ))
                  : statuses.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy === r.key.toLowerCase()}
                        onClick={() => upsert({ ...identify(r), status: s, [dateField]: today() })}
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

      <h3 className="mt-10 mb-3 text-[10px] tracking-[0.2em] text-ink-soft">logged ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing logged yet</p>
      ) : (
        <ul className="flex flex-col">
          {entries.map((e) => (
            <LoggedRow
              key={keyOf(e)}
              entry={e}
              statuses={statuses}
              dateField={dateField}
              label={String(e.title ?? e[idField])}
              onSave={(next) => upsert(next)}
              onRemove={() => remove(e)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
