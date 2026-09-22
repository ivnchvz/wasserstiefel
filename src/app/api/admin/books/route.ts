import { createStore, type StoreEntry } from "@/lib/adminStore";
import { BOOKS_FILE } from "@/lib/books";

const STATUSES = ["reading", "finished", "abandoned", "paused"];

const store = createStore(BOOKS_FILE, {
  label: "books",
  keyOf: (e) => String(e.id ?? ""),
  sanitise: (body) => {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!/^OL\d+W$/.test(id)) return null;

    const status = typeof body.status === "string" && STATUSES.includes(body.status) ? body.status : undefined;
    return {
      id,
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.author === "string" ? { author: body.author } : {}),
      ...(typeof body.year === "string" ? { year: body.year } : {}),
      ...(typeof body.cover === "string" ? { cover: body.cover } : {}),
      ...(status ? { status } : {}),
      ...(typeof body.rating === "number" ? { rating: body.rating } : {}),
      ...(body.readAt ? { readAt: body.readAt } : {}),
    } as StoreEntry;
  },
});

export const { GET, POST, DELETE } = store;
