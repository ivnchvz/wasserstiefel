import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Site-relative sources ("/gallery/x.jpg") are uploads sitting in
 * public/gallery, which the server can't fetch from itself before it is
 * listening - so they are read from disk. Anything else is fetched and cached
 * like artwork.
 */
export async function loadImage(src: string): Promise<Buffer | null> {
  if (src.startsWith("/")) {
    // Only gallery uploads are local. The fixed folder keeps a crafted path
    // from reaching anything else, and keeps the bundler's trace to it.
    if (!src.startsWith("/gallery/")) return null;
    return readFile(path.join(process.cwd(), "public", "gallery", path.basename(src))).catch(() => null);
  }

  const res = await fetch(src, {
    headers: { "User-Agent": "wasserstiefel.dev personal site" },
    next: { revalidate: 60 * 60 * 24 * 7 }, // artwork is effectively immutable
  });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

/**
 * An image's displayed proportions, so the page can hold its place before it
 * arrives instead of shifting everything down when it does. Reads the same
 * cached bytes the halftone does, and follows the EXIF rotation, so a portrait
 * phone photo is reported portrait.
 */
export async function imageSize(src: string): Promise<{ width: number; height: number } | null> {
  try {
    const buf = await loadImage(src);
    if (!buf) return null;
    const meta = await sharp(buf).metadata();
    const width = meta.autoOrient?.width ?? meta.width;
    const height = meta.autoOrient?.height ?? meta.height;
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}
