import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { adminGate } from "@/lib/adminGate";
import { GALLERY_UPLOAD_DIR } from "@/lib/gallery";

const MAX_BYTES = 25 * 1024 * 1024;
const LONG_EDGE = 1600;

/**
 * Saves an uploaded image into public/gallery. It is re-encoded rather than
 * stored as sent: phone photos arrive at 5-10MB with EXIF (including location)
 * attached, and they live in a public repository. Downscaled to 1600px on the
 * long edge, rotated upright, stripped of metadata and flattened onto the
 * paper colour so transparent PNGs don't come out on black.
 *
 * Named by content hash, so uploading the same picture twice is one file.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file sent" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "that file is over 25MB" }, { status: 413 });

  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#e8e6e1" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "that file isn't an image" }, { status: 400 });
  }

  const name = `${createHash("sha1").update(out).digest("hex").slice(0, 16)}.jpg`;
  await mkdir(GALLERY_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(GALLERY_UPLOAD_DIR, name), out);

  return NextResponse.json({ src: `/gallery/${name}`, bytes: out.length });
}
