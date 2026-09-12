import { NextResponse } from "next/server";
import { adminGate } from "@/lib/adminGate";
import { cannotSave, failure, type StoreEntry } from "@/lib/adminStore";
import { reelEntry, reelsStore } from "@/lib/galleryStore";
import { MAX_UPLOAD_BYTES, processUpload } from "@/lib/uploadImage";
import type { FileChange } from "@/lib/repoStore";

export const { GET, DELETE } = reelsStore;

/**
 * Accepts JSON, or a form when a thumbnail comes with it. Instagram's own
 * still can't be used - its image addresses are signed and expire within days
 * - so a reel shows an uploaded still or a plain tile. The still and the reel
 * are saved in one commit.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  const blocked = cannotSave();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

  let body: StoreEntry;
  const extra: FileChange[] = [];

  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const text = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
    body = { url: text("url"), shortcode: text("shortcode"), note: text("note") };

    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "that file is over 25MB" }, { status: 413 });
      const image = await processUpload(file);
      if (!image) return NextResponse.json({ error: "that file isn't an image" }, { status: 400 });
      body.thumb = `/gallery/${image.name}`;
      extra.push({ path: `public/gallery/${image.name}`, content: image.buffer });
    }
  } else {
    body = (await request.json()) as StoreEntry;
  }

  const entry = reelEntry(body);
  if (!entry) return NextResponse.json({ error: "invalid entry" }, { status: 400 });

  try {
    return NextResponse.json({ entries: reelsStore.shown(await reelsStore.upsert(entry, extra)) });
  } catch (err) {
    return failure(err);
  }
}
