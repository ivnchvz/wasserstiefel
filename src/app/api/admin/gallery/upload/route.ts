import { NextResponse } from "next/server";
import { adminGate } from "@/lib/adminGate";
import { cannotSave, failure } from "@/lib/adminStore";
import { imageEntry, imagesStore } from "@/lib/galleryStore";
import { MAX_UPLOAD_BYTES, processUpload } from "@/lib/uploadImage";

/**
 * Saves an uploaded image and its gallery entry together - one commit on the
 * live site, so there is never an entry pointing at a file that isn't there.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  const blocked = cannotSave();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file sent" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "that file is over 25MB" }, { status: 413 });

  const image = await processUpload(file);
  if (!image) return NextResponse.json({ error: "that file isn't an image" }, { status: 400 });

  const caption = form.get("caption");
  const entry = imageEntry({ src: `/gallery/${image.name}`, caption: typeof caption === "string" ? caption : "" });
  if (!entry) return NextResponse.json({ error: "could not name the upload" }, { status: 500 });

  try {
    const entries = await imagesStore.upsert(entry, [{ path: `public/gallery/${image.name}`, content: image.buffer }]);
    return NextResponse.json({ entries: imagesStore.shown(entries) });
  } catch (err) {
    return failure(err);
  }
}
