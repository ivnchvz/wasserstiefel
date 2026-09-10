import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SectionResult } from "./types";

export const GALLERY_IMAGES_FILE = path.join(process.cwd(), "src", "data", "gallery-images.json");
export const GALLERY_REELS_FILE = path.join(process.cwd(), "src", "data", "gallery-reels.json");
/** Uploads live here, so they are served as static files and deploy with the repo. */
export const GALLERY_UPLOAD_DIR = path.join(process.cwd(), "public", "gallery");

export type GalleryImage = {
  id: string;
  /** A remote URL for a linked image, or "/gallery/<file>" for an upload. */
  src: string;
  /** Where the image came from, when it was saved from a page. */
  source: string | null;
  caption: string | null;
  addedAt: string | null;
};

export type Reel = {
  shortcode: string;
  url: string;
  note: string | null;
  addedAt: string | null;
};

/** instagram.com/reel/CODE, /reels/CODE or /p/CODE, with or without a username prefix. */
export function reelShortcode(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (!/(^|\.)instagram\.com$/.test(u.hostname)) return null;
    return u.pathname.match(/\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,})/)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function readList(file: string): Promise<Record<string, unknown>[] | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function getGalleryImages(): Promise<SectionResult<GalleryImage>> {
  const raw = await readList(GALLERY_IMAGES_FILE);
  if (!raw) return { status: "ok", items: [] };

  const items = raw
    .map((e) => ({ id: str(e.id), src: str(e.src), source: str(e.source), caption: str(e.caption), addedAt: str(e.addedAt) }))
    .filter((e): e is GalleryImage => Boolean(e.id && e.src));
  return { status: "ok", items };
}

export async function getReels(): Promise<SectionResult<Reel>> {
  const raw = await readList(GALLERY_REELS_FILE);
  if (!raw) return { status: "ok", items: [] };

  const items = raw
    .map((e) => {
      const shortcode = str(e.shortcode);
      return shortcode
        ? { shortcode, url: str(e.url) ?? `https://www.instagram.com/reel/${shortcode}/`, note: str(e.note), addedAt: str(e.addedAt) }
        : null;
    })
    .filter((e): e is Reel => e !== null);
  return { status: "ok", items };
}
