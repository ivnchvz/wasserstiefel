import { createStore, type StoreEntry } from "@/lib/adminStore";
import { ALBUMS_FILE } from "@/lib/albums";

const store = createStore(
  ALBUMS_FILE,
  (e) => String(e.id ?? `${e.artist}-${e.title}`).toLowerCase(),
  (body) => {
    const id = Number(body.id);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!Number.isFinite(id) && !title) return null;

    return {
      ...(Number.isFinite(id) ? { id } : {}),
      ...(title ? { title } : {}),
      ...(typeof body.artist === "string" ? { artist: body.artist } : {}),
      ...(typeof body.year === "string" ? { year: body.year } : {}),
      ...(typeof body.cover === "string" ? { cover: body.cover } : {}),
      ...(typeof body.rating === "number" ? { rating: body.rating } : {}),
      ...(body.ratedAt ? { ratedAt: body.ratedAt } : {}),
    } as StoreEntry;
  },
);

export const { GET, POST, DELETE } = store;
