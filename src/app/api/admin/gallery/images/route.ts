import { createHash } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { adminGate } from "@/lib/adminGate";
import { createStore, type StoreEntry } from "@/lib/adminStore";
import { GALLERY_IMAGES_FILE, GALLERY_UPLOAD_DIR } from "@/lib/gallery";

const UPLOADED = /^\/gallery\/[a-f0-9]{16}\.jpg$/;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

const store = createStore(
  GALLERY_IMAGES_FILE,
  (e) => String(e.id ?? ""),
  (body) => {
    const src = str(body.src);
    if (!src || !(UPLOADED.test(src) || /^https?:\/\//i.test(src))) return null;
    return {
      // Derived from the source, so saving the same image twice updates it.
      id: createHash("sha1").update(src).digest("hex").slice(0, 12),
      src,
      ...(str(body.source) ? { source: str(body.source) } : {}),
      ...(str(body.caption) ? { caption: str(body.caption) } : {}),
      addedAt: str(body.addedAt) ?? new Date().toISOString().slice(0, 10),
    } as StoreEntry;
  },
  // An upload belongs to its entry; remove the file with it.
  async (entry) => {
    const src = String(entry.src ?? "");
    if (UPLOADED.test(src)) await unlink(path.join(GALLERY_UPLOAD_DIR, path.basename(src))).catch(() => {});
  },
);

export const { GET, DELETE } = store;

/**
 * Linked images are checked before they're saved. The common mistake is
 * pasting the address of the page an image is on rather than the image, and
 * that should fail here with a reason, not later as a blank tile.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  const body = (await request.json()) as StoreEntry;
  const src = str(body.src);

  if (src && /^https?:\/\//i.test(src)) {
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

  return store.POST(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(body) }));
}
