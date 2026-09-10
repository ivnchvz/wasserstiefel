import { createStore, type StoreEntry } from "@/lib/adminStore";
import { GALLERY_REELS_FILE, reelShortcode } from "@/lib/gallery";

const store = createStore(
  GALLERY_REELS_FILE,
  (e) => String(e.shortcode ?? ""),
  (body) => {
    const url = typeof body.url === "string" ? body.url : "";
    // Existing entries are re-sent with their shortcode when edited.
    const shortcode = reelShortcode(url) ?? (typeof body.shortcode === "string" ? body.shortcode : null);
    if (!shortcode) return null;

    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    return {
      shortcode,
      url: `https://www.instagram.com/reel/${shortcode}/`,
      ...(note ? { note } : {}),
      addedAt: typeof body.addedAt === "string" ? body.addedAt : new Date().toISOString().slice(0, 10),
    } as StoreEntry;
  },
);

export const { GET, POST, DELETE } = store;
