import { createHash } from "node:crypto";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const LONG_EDGE = 1600;

/**
 * Prepares an uploaded image for the repository. It is re-encoded rather than
 * stored as sent: phone photos arrive at 5-10MB with EXIF (including location)
 * attached, and they live in a public repository. Rotated upright, capped at
 * 1600px on the long edge, stripped of metadata, and flattened onto the paper
 * colour so transparent PNGs don't come out on black.
 *
 * Named by content hash, so the same picture twice is one file.
 */
export async function processUpload(file: File): Promise<{ name: string; buffer: Buffer } | null> {
  try {
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#e8e6e1" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { name: `${createHash("sha1").update(buffer).digest("hex").slice(0, 16)}.jpg`, buffer };
  } catch {
    return null;
  }
}
