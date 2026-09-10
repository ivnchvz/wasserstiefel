import { createStore, type StoreEntry } from "@/lib/adminStore";
import { SERIES_FILE } from "@/lib/series";

const STATUSES = ["watching", "completed", "dropped", "paused"];

const store = createStore(SERIES_FILE, {
  label: "series",
  keyOf: (e) => String(e.id ?? ""),
  sanitise: (body) => {
    const id = Number(body.id);
    if (!Number.isFinite(id)) return null;

    const status = typeof body.status === "string" && STATUSES.includes(body.status) ? body.status : undefined;
    return {
      id,
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(status ? { status } : {}),
      ...(typeof body.rating === "number" ? { rating: body.rating } : {}),
      ...(body.watchedAt ? { watchedAt: body.watchedAt } : {}),
    } as StoreEntry;
  },
});

export const { GET, POST, DELETE } = store;
