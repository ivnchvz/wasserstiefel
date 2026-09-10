"use client";

import { useEffect, useState } from "react";

type Entry = Record<string, unknown>;

const FIELD =
  "min-w-0 flex-1 border border-rule bg-transparent px-3 py-2 text-[12px] outline-none placeholder:text-ink-soft focus:border-ink";
const BUTTON =
  "shrink-0 cursor-pointer border border-rule px-3 py-2 text-[10px] tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40";

function useEntries(url: string) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(url);
      const body = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(body.error ?? "could not load");
      else setEntries(body.entries ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function add(entry: Entry): Promise<boolean> {
    setError(null);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "could not save");
      return false;
    }
    setEntries(body.entries ?? []);
    return true;
  }

  async function remove(key: string) {
    const res = await fetch(`${url}?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (res.ok) setEntries((await res.json()).entries ?? []);
  }

  return { entries, error, setError, add, remove };
}

function Images() {
  const { entries, error, setError, add, remove } = useEntries("/api/admin/gallery/images");
  const [link, setLink] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function addLink() {
    setBusy("checking the link…");
    if (await add({ src: link.trim(), caption })) {
      setLink("");
      setCaption("");
    }
    setBusy(null);
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    for (const [i, file] of list.entries()) {
      setBusy(`uploading ${i + 1} of ${list.length}…`);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/gallery/upload", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) {
        setError(`${file.name}: ${body.error ?? "upload failed"}`);
        break;
      }
      await add({ src: body.src, caption: list.length === 1 ? caption : "" });
    }
    setCaption("");
    setBusy(null);
  }

  return (
    <section>
      <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">gallery — images</h2>
      {error && <p className="mb-4 border border-ink px-3 py-2 text-[11px] text-ink">{error}</p>}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="image address (https://…/photo.jpg)" className={FIELD} />
          <button type="button" onClick={addLink} disabled={!link.trim() || !!busy} className={BUTTON}>
            add link
          </button>
        </div>
        <div className="flex gap-2">
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="caption (optional)" className={FIELD} />
          <label className={`${BUTTON} ${busy ? "pointer-events-none opacity-40" : ""}`}>
            upload…
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = ""; // let the same file be picked again
              }}
            />
          </label>
        </div>
        {busy && <p className="text-[10px] tracking-[0.12em] text-ink-soft">{busy}</p>}
      </div>

      <h3 className="mt-10 mb-3 text-[10px] tracking-[0.2em] text-ink-soft">saved ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing saved yet</p>
      ) : (
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {entries.map((e) => (
            <li key={String(e.id)} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={String(e.src)} alt="" className="aspect-square w-full border border-rule object-cover" />
              <span className="truncate text-[10px] text-ink-soft">{String(e.caption ?? (String(e.src).startsWith("/") ? "upload" : "link"))}</span>
              <button type="button" onClick={() => remove(String(e.id))} className="self-start text-[10px] tracking-[0.12em] text-ink-soft hover:text-ink hover:underline">
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Reels() {
  const { entries, error, add, remove } = useEntries("/api/admin/gallery/reels");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");

  async function addReel() {
    if (await add({ url: url.trim(), note })) {
      setUrl("");
      setNote("");
    }
  }

  return (
    <section>
      <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">gallery — reels</h2>
      {error && <p className="mb-4 border border-ink px-3 py-2 text-[11px] text-ink">{error === "invalid entry" ? "that isn't an instagram reel or post link" : error}</p>}

      <div className="flex flex-col gap-3">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="instagram.com/reel/…" className={FIELD} />
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="why it's here (optional)" className={FIELD} />
          <button type="button" onClick={addReel} disabled={!url.trim()} className={BUTTON}>
            add reel
          </button>
        </div>
      </div>

      <h3 className="mt-10 mb-3 text-[10px] tracking-[0.2em] text-ink-soft">saved ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing saved yet</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={String(e.shortcode)} className="flex items-center gap-4 border-b border-rule py-3">
              <a href={String(e.url)} target="_blank" rel="noreferrer" className="shrink-0 text-[12px] tabular-nums hover:underline">
                {String(e.shortcode)}
              </a>
              <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{String(e.note ?? "")}</span>
              <button type="button" onClick={() => remove(String(e.shortcode))} className="text-[10px] tracking-[0.12em] text-ink-soft hover:text-ink hover:underline">
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminGallery() {
  return (
    <>
      <Images />
      <Reels />
    </>
  );
}
