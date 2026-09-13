"use client";

import MarkdownIt from "markdown-it";
import { useEffect, useRef, useState } from "react";

type Listed = { slug: string; title: string; date: string; draft: boolean };
type Draft = { title: string; slug: string; date: string; draft: boolean; body: string; originalSlug: string };

const FIELD =
  "min-w-0 border border-rule bg-transparent px-3 py-2 text-[12px] outline-none placeholder:text-ink-soft focus:border-ink";
const BUTTON =
  "shrink-0 cursor-pointer border border-rule px-3 py-2 text-[10px] tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40";

const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
const today = () => new Date().toISOString().slice(0, 10);
const blank = (): Draft => ({ title: "", slug: "", date: today(), draft: true, body: "", originalSlug: "" });

export function AdminPosts() {
  const [posts, setPosts] = useState<Listed[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const body = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/posts");
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(data.error ?? "could not load posts");
      else setPosts(data.posts ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function edit(slug: string) {
    setError(null);
    const res = await fetch(`/api/admin/posts?slug=${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "could not open that post");
    const p = data.post;
    setDraft({ title: p.title, slug: p.slug, date: p.date, draft: p.draft, body: p.body, originalSlug: p.slug });
    setPreview(false);
  }

  async function save() {
    if (!draft) return;
    setBusy("saving…");
    setError(null);
    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "could not save");
    else {
      setPosts(data.posts ?? []);
      setDraft((d) => (d ? { ...d, slug: data.slug, originalSlug: data.slug } : d));
    }
    setBusy(null);
  }

  async function remove(slug: string) {
    setBusy("removing…");
    const res = await fetch(`/api/admin/posts?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setPosts(data.posts ?? []);
      setDraft((d) => (d?.originalSlug === slug ? null : d));
    } else setError(data.error ?? "could not remove");
    setBusy(null);
  }

  /** Insert at the cursor, so pasting lands where you were typing. */
  function insert(text: string) {
    const el = body.current;
    setDraft((d) => {
      if (!d) return d;
      const at = el?.selectionStart ?? d.body.length;
      return { ...d, body: d.body.slice(0, at) + text + d.body.slice(el?.selectionEnd ?? at) };
    });
  }

  async function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (!file) return; // ordinary text paste
    e.preventDefault();

    setBusy("uploading the image…");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "could not upload that image");
    else insert(`\n\n![](${data.src})\n\n`);
    setBusy(null);
  }

  return (
    <section>
      <h2 className="mb-4 text-[11px] lowercase tracking-[0.28em] text-ink-soft">writing</h2>
      {error && <p className="mb-4 border border-ink px-3 py-2 text-[11px] text-ink">{error}</p>}

      {draft ? (
        <div className="flex flex-col gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="title"
            className={`${FIELD} text-[15px]`}
          />

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              // Left blank, the address is made from the title when saving.
              placeholder="address (from the title if left empty)"
              className={`${FIELD} flex-1`}
            />
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className={`${FIELD} tabular-nums`}
            />
            <label className="flex cursor-pointer items-center gap-2 text-[10px] tracking-[0.14em] text-ink-soft">
              <input
                type="checkbox"
                checked={draft.draft}
                onChange={(e) => setDraft({ ...draft, draft: e.target.checked })}
              />
              draft
            </label>
          </div>

          {preview ? (
            <div
              className="prose min-h-[18rem] border border-rule px-4 py-3"
              dangerouslySetInnerHTML={{ __html: md.render(draft.body) }}
            />
          ) : (
            <textarea
              ref={body}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              onPaste={onPaste}
              placeholder="markdown — paste an image straight in"
              className={`${FIELD} min-h-[18rem] resize-y leading-[1.7]`}
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={!!busy || !draft.title.trim()} className={BUTTON}>
              {draft.draft ? "save draft" : "save"}
            </button>
            <button type="button" onClick={() => setPreview((v) => !v)} className={BUTTON}>
              {preview ? "edit" : "preview"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className={BUTTON}>
              close
            </button>
            {busy && <span className="text-[10px] tracking-[0.12em] text-ink-soft">{busy}</span>}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setDraft(blank())} className={BUTTON}>
          new post
        </button>
      )}

      <h3 className="mt-10 mb-3 text-[10px] tracking-[0.2em] text-ink-soft">posts ({posts.length})</h3>
      {posts.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing written yet</p>
      ) : (
        <ul>
          {posts.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule py-3">
              <span className="text-[10px] tabular-nums text-ink-soft">{p.date}</span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{p.title}</span>
              {p.draft && <span className="border border-rule px-1.5 text-[10px] tracking-[0.12em] text-ink-soft">draft</span>}
              <button type="button" onClick={() => edit(p.slug)} className="text-[10px] tracking-[0.12em] text-ink-soft hover:text-ink hover:underline">
                edit
              </button>
              <button type="button" onClick={() => remove(p.slug)} className="text-[10px] tracking-[0.12em] text-ink-soft hover:text-ink hover:underline">
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
