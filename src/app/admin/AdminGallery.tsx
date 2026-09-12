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

  async function send(form: FormData): Promise<boolean> {
    setError(null);
    const res = await fetch(url, { method: "POST", body: form });
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

  return { entries, setEntries, error, setError, add, send, remove };
}

function Images() {
  const { entries, setEntries, error, setError, add, remove } = useEntries("/api/admin/gallery/images");
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
      // One caption can't describe a batch, so it only applies to a single file.
      if (list.length === 1) form.append("caption", caption);
      const res = await fetch("/api/admin/gallery/upload", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) {
        setError(`${file.name}: ${body.error ?? "upload failed"}`);
        break;
      }
      setEntries(body.entries ?? []);
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
              <img src={String(e.preview ?? e.src)} alt="" className="aspect-square w-full border border-rule object-cover" />
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
  const { entries, error, send, remove } = useEntries("/api/admin/gallery/reels");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function addReel() {
    setBusy(true);
    const form = new FormData();
    form.append("url", url.trim());
    form.append("note", note);
    if (thumb) form.append("file", thumb);
    if (await send(form)) {
      setUrl("");
      setNote("");
      setThumb(null);
    }
    setBusy(false);
  }

  /** Adds or replaces the still on a reel that's already saved. */
  async function setThumbFor(shortcode: string, file: File | null) {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append("shortcode", shortcode);
    form.append("file", file);
    await send(form);
    setBusy(false);
  }

  return (
    <section>
      <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">gallery — reels</h2>
      {error && (
        <p className="mb-4 border border-ink px-3 py-2 text-[11px] text-ink">
          {error === "invalid entry" ? "that isn't an instagram reel or post link" : error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="instagram.com/reel/…" className={FIELD} />
        <div className="flex flex-wrap gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="why it's here (optional)" className={FIELD} />
          <label className={`${BUTTON} ${busy ? "pointer-events-none opacity-40" : ""}`}>
            {thumb ? "still ✓" : "still…"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
          </label>
          <button type="button" onClick={addReel} disabled={!url.trim() || busy} className={BUTTON}>
            add reel
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-ink-soft">
          instagram&apos;s own thumbnail can&apos;t be used — its image addresses are signed and expire — so a reel shows
          a still you upload, or a plain tile.
        </p>
      </div>

      <h3 className="mt-10 mb-3 text-[10px] tracking-[0.2em] text-ink-soft">saved ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing saved yet</p>
      ) : (
        <ul>
          {entries.map((e) => {
            const shortcode = String(e.shortcode);
            const still = (e.preview ?? e.thumb) as string | undefined;
            return (
              <li key={shortcode} className="flex items-center gap-4 border-b border-rule py-3">
                {still ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={still} alt="" className="h-14 w-9 shrink-0 border border-rule object-cover" />
                ) : (
                  <span className="h-14 w-9 shrink-0 border border-rule" />
                )}
                <a href={String(e.url)} target="_blank" rel="noreferrer" className="shrink-0 text-[12px] tabular-nums hover:underline">
                  {shortcode}
                </a>
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{String(e.note ?? "")}</span>
                <label className={`${BUTTON} ${busy ? "pointer-events-none opacity-40" : ""}`}>
                  {still ? "replace still…" : "add still…"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(ev) => {
                      void setThumbFor(shortcode, ev.target.files?.[0] ?? null);
                      ev.target.value = "";
                    }}
                  />
                </label>
                <button type="button" onClick={() => remove(shortcode)} className="text-[10px] tracking-[0.12em] text-ink-soft hover:text-ink hover:underline">
                  remove
                </button>
              </li>
            );
          })}
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
