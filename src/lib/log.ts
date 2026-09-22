import { getRecentMovies } from "./letterboxd";
import { getLoggedGames } from "./games";
import { getAllSeries } from "./series";
import { getAllBooks } from "./books";
import { getDatedAlbumRatings } from "./albums";
import { listPosts } from "./posts";

export type LogKind = "film" | "game" | "series" | "book" | "album" | "post";

export type LogEvent = {
  /** YYYY-MM-DD. */
  date: string;
  kind: LogKind;
  verb: string;
  title: string;
  /** A little context: the author, artist, platform or year. */
  detail: string | null;
  rating: number | null;
  url: string | null;
};

const GAME_VERBS: Record<string, string> = {
  playing: "started playing",
  completed: "finished",
  retired: "retired",
  shelved: "shelved",
};
const SERIES_VERBS: Record<string, string> = {
  watching: "started watching",
  completed: "finished",
  dropped: "dropped",
  paused: "paused",
};
const BOOK_VERBS: Record<string, string> = {
  reading: "started reading",
  finished: "finished",
  abandoned: "abandoned",
  paused: "paused",
};

const isDate = (d: string | null | undefined): d is string => !!d && /^\d{4}-\d{2}-\d{2}/.test(d);

/**
 * Everything logged anywhere, as one reverse-chronological feed.
 *
 * Only deliberate entries count: Steam's last-played dates and individual
 * scrobbles would drown the rest. Games, series and books keep one date per
 * entry - the latest status - so each appears once, as it stands now.
 */
export async function getLog(): Promise<LogEvent[]> {
  const [films, games, series, books, albums, posts] = await Promise.all([
    getRecentMovies(Number.MAX_SAFE_INTEGER),
    getLoggedGames(),
    getAllSeries(),
    getAllBooks(),
    getDatedAlbumRatings(),
    listPosts(),
  ]);

  const events: LogEvent[] = [];

  if (films.status === "ok") {
    for (const m of films.items) {
      if (!isDate(m.watchedAt)) continue;
      events.push({
        date: m.watchedAt.slice(0, 10),
        kind: "film",
        verb: m.rewatch ? "rewatched" : "watched",
        title: m.title,
        detail: m.year,
        rating: m.rating,
        url: m.url,
      });
    }
  }
  for (const g of games) {
    if (!isDate(g.playedAt)) continue;
    events.push({
      date: g.playedAt.slice(0, 10),
      kind: "game",
      verb: (g.status && GAME_VERBS[g.status]) || "played",
      title: g.title,
      detail: g.platform,
      rating: g.rating,
      url: g.url,
    });
  }
  for (const s of series) {
    if (!isDate(s.watchedAt)) continue;
    events.push({
      date: s.watchedAt.slice(0, 10),
      kind: "series",
      verb: (s.status && SERIES_VERBS[s.status]) || "watched",
      title: s.title,
      detail: s.year,
      rating: s.rating,
      url: s.url,
    });
  }
  for (const b of books) {
    if (!isDate(b.readAt)) continue;
    events.push({
      date: b.readAt.slice(0, 10),
      kind: "book",
      verb: (b.status && BOOK_VERBS[b.status]) || "read",
      title: b.title,
      detail: b.author,
      rating: b.rating,
      url: b.url,
    });
  }
  for (const a of albums) {
    if (!isDate(a.ratedAt)) continue;
    events.push({
      date: a.ratedAt.slice(0, 10),
      kind: "album",
      verb: "rated",
      title: a.title,
      detail: a.artist || null,
      rating: a.rating,
      url: null,
    });
  }
  for (const p of posts) {
    if (!isDate(p.date)) continue;
    events.push({
      date: p.date.slice(0, 10),
      kind: "post",
      verb: "wrote",
      title: p.title,
      detail: `${p.readingMinutes} min`,
      rating: null,
      url: `/writing/${p.slug}`,
    });
  }

  // Newest first; within a day, a stable order by kind then title.
  const KIND_ORDER: LogKind[] = ["post", "book", "series", "film", "game", "album"];
  return events.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      a.title.localeCompare(b.title),
  );
}

/** The years anything was logged in, newest first, always including this one. */
export async function getLoggedYears(): Promise<number[]> {
  const years = new Set((await getLog()).map((e) => Number(e.date.slice(0, 4))));
  years.add(new Date().getUTCFullYear());
  return [...years].sort((a, b) => b - a);
}
