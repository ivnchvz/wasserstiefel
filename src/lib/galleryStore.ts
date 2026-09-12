import { createHash } from "node:crypto";
import { createStore, type StoreEntry } from "./adminStore";
import { GALLERY_IMAGES_FILE, GALLERY_REELS_FILE, reelShortcode } from "./gallery";
import { rawUrl, storageMode } from "./repoStore";

/** What an upload's src looks like: content-hashed, always re-encoded to JPEG. */
export const UPLOADED = /^\/gallery\/[a-f0-9]{16}\.jpg$/;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function imageEntry(body: StoreEntry): StoreEntry | null {
  const src = str(body.src);
  if (!src || !(UPLOADED.test(src) || /^https?:\/\//i.test(src))) return null;
  return {
    // Derived from the source, so saving the same image twice updates it.
    id: createHash("sha1").update(src).digest("hex").slice(0, 12),
    src,
    ...(str(body.source) ? { source: str(body.source) } : {}),
    ...(str(body.caption) ? { caption: str(body.caption) } : {}),
    addedAt: str(body.addedAt) ?? new Date().toISOString().slice(0, 10),
  };
}

export const imagesStore = createStore(GALLERY_IMAGES_FILE, {
  label: "gallery",
  keyOf: (e) => String(e.id ?? ""),
  sanitise: imageEntry,
  // An upload belongs to its entry, and goes in the same commit that removes it.
  ownedFiles: (e) => (UPLOADED.test(String(e.src)) ? [`public${e.src}`] : []),
  // A fresh upload isn't on the live deployment until the deploy its commit
  // triggers has finished, so admin previews it from GitHub in the meantime.
  present: (e) =>
    UPLOADED.test(String(e.src)) && storageMode() === "github" ? { ...e, preview: rawUrl(`public${e.src}`) } : e,
});

export function reelEntry(body: StoreEntry): StoreEntry | null {
  const url = typeof body.url === "string" ? body.url : "";
  // An existing entry is re-sent with its shortcode when edited.
  const shortcode = reelShortcode(url) ?? (typeof body.shortcode === "string" ? body.shortcode : null);
  if (!shortcode) return null;

  return {
    shortcode,
    url: `https://www.instagram.com/reel/${shortcode}/`,
    ...(str(body.note) ? { note: str(body.note) } : {}),
    ...(str(body.thumb) ? { thumb: str(body.thumb) } : {}),
    addedAt: str(body.addedAt) ?? new Date().toISOString().slice(0, 10),
  };
}

export const reelsStore = createStore(GALLERY_REELS_FILE, {
  label: "reels",
  keyOf: (e) => String(e.shortcode ?? ""),
  sanitise: reelEntry,
  ownedFiles: (e) => (UPLOADED.test(String(e.thumb ?? "")) ? [`public${e.thumb}`] : []),
  present: (e) =>
    UPLOADED.test(String(e.thumb ?? "")) && storageMode() === "github"
      ? { ...e, preview: rawUrl(`public${e.thumb}`) }
      : e,
});
