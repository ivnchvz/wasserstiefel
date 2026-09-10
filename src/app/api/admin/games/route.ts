import { createStore, type StoreEntry } from "@/lib/adminStore";
import { GAMES_FILE } from "@/lib/games";

const STATUSES = ["completed", "playing", "retired", "shelved"];

const store = createStore(
  GAMES_FILE,
  (e) => String(e.slug ?? e.title ?? "").toLowerCase(),
  (body) => {
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!slug && !title) return null;

    const status = typeof body.status === "string" && STATUSES.includes(body.status) ? body.status : undefined;
    return {
      ...(slug ? { slug } : { title }),
      ...(status ? { status } : {}),
      ...(typeof body.rating === "number" ? { rating: body.rating } : {}),
      ...(body.playedAt ? { playedAt: body.playedAt } : {}),
      ...(body.platform ? { platform: body.platform } : {}),
    } as StoreEntry;
  },
);

export const { GET, POST, DELETE } = store;
