import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { adminGate } from "@/lib/adminGate";
import { cannotSave, failure } from "@/lib/adminStore";
import { imageEntry, imagesStore } from "@/lib/galleryStore";

const MAX_BYTES = 25 * 1024 * 1024;
const LONG_EDGE = 1600;

/**
 * Saves an uploaded image and its gallery entry together - one commit on the
 * live site, so there is never an entry pointing at a file that isn't there.
 *
 * It is re-encoded rather than stored as sent: phone photos arrive at 5-10MB
 * with EXIF (including location) attached, and they live in a public
 * repository. Downscaled to 1600px on the long edge, rotated upright, stripped
 * of metadata and flattened onto the paper colour so transparent PNGs don't
 * come out on black. Named by content hash, so the same picture twice is one
 * file.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  const blocked = cannotSave();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

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
  const caption = form.get("caption");
  const entry = imageEntry({ src: `/gallery/${name}`, caption: typeof caption === "string" ? caption : "" });
  if (!entry) return NextResponse.json({ error: "could not name the upload" }, { status: 500 });

  try {
    const entries = await imagesStore.upsert(entry, [{ path: `public/gallery/${name}`, content: out }]);
    return NextResponse.json({ entries: imagesStore.shown(entries) });
  } catch (err) {
    return failure(err);
  }
}
