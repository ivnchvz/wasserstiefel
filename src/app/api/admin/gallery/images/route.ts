import { NextResponse } from "next/server";
import sharp from "sharp";
import { adminGate } from "@/lib/adminGate";
import { cannotSave, failure, type StoreEntry } from "@/lib/adminStore";
import { imageEntry, imagesStore } from "@/lib/galleryStore";

export const { GET, DELETE } = imagesStore;

/**
 * Linked images are checked before they're saved. The common mistake is
 * pasting the address of the page an image is on rather than the image, and
 * that should fail here with a reason, not later as a blank tile.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  const blocked = cannotSave();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

  const entry = imageEntry((await request.json()) as StoreEntry);
  if (!entry) return NextResponse.json({ error: "invalid entry" }, { status: 400 });

  const src = String(entry.src);
  if (/^https?:\/\//i.test(src)) {
    try {
      const res = await fetch(src, { headers: { "User-Agent": "wasserstiefel.dev personal site" } });
      if (!res.ok) throw new Error(`that link answered ${res.status}`);
      await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    } catch (err) {
      const reason = err instanceof Error && err.message.startsWith("that link") ? err.message : "that link isn't an image";
      return NextResponse.json(
        { error: `${reason} — use the image's own address (right-click the image → copy image address)` },
        { status: 400 },
      );
    }
  }

  try {
    return NextResponse.json({ entries: imagesStore.shown(await imagesStore.upsert(entry)) });
  } catch (err) {
    return failure(err);
  }
}
