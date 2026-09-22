import { getRecentMovies } from "./letterboxd";
import { getLoggedGames } from "./games";
import { getAllSeries, type Series } from "./series";
import { getAllBooks, type Book } from "./books";
import { getTopReleasesOf, type Album } from "./albums";
import { getYearListening, type YearListening } from "./music";
import { listPosts, type PostMeta } from "./posts";
import type { Game, Movie } from "./types";

export type YearReview = {
  year: number;
  /** The year isn't over, so every figure is "so far". */
  inProgress: boolean;
  films: {
    count: number;
    rewatches: number;
    reviews: number;
    average: number | null;
    best: Movie[];
    /**
     * The diary feed holds only the latest few dozen entries. When its oldest
     * entry already falls inside the year, earlier films have scrolled off
     * and the count is a floor, not a total.
     */
    partialSince: string | null;
  } | null;
  games: { finished: Game[]; started: Game[] };
  series: { finished: Series[]; started: Series[] };
  books: { finished: Book[]; started: Book[] };
  releases: Album[];
  listening: YearListening | null;
  posts: PostMeta[];
};

const inYear = (year: number) => (d: string | null | undefined) => !!d && d.startsWith(`${year}-`);

const newestFirst = <T>(date: (t: T) => string | null) => (a: T, b: T) =>
  (date(b) ?? "").localeCompare(date(a) ?? "");

export async function getYearReview(year: number): Promise<YearReview> {
  const within = inYear(year);

  const [feed, games, series, books, releases, listening, posts] = await Promise.all([
    getRecentMovies(Number.MAX_SAFE_INTEGER),
    getLoggedGames(),
    getAllSeries(),
    getAllBooks(),
    getTopReleasesOf(String(year), 6),
    getYearListening(year, 5),
    listPosts(),
  ]);

  let films: YearReview["films"] = null;
  if (feed.status === "ok") {
    const seen = feed.items.filter((m) => within(m.watchedAt));
    const rated = seen.filter((m) => m.rating !== null);
    const oldest = feed.items.map((m) => m.watchedAt).filter(Boolean).sort()[0] ?? null;

    films = {
      count: seen.length,
      rewatches: seen.filter((m) => m.rewatch).length,
      reviews: seen.filter((m) => m.review).length,
      average: rated.length ? rated.reduce((n, m) => n + (m.rating ?? 0), 0) / rated.length : null,
      // Highest rated, and among equals the most recent.
      best: [...rated]
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.watchedAt ?? "").localeCompare(a.watchedAt ?? ""))
        .slice(0, 6),
      partialSince: oldest && within(oldest) && oldest > `${year}-01-01` ? oldest : null,
    };
  }

  const played = games.filter((g) => within(g.playedAt)).sort(newestFirst((g) => g.playedAt));
  const watched = series.filter((s) => within(s.watchedAt)).sort(newestFirst((s) => s.watchedAt));
  const read = books.filter((b) => within(b.readAt)).sort(newestFirst((b) => b.readAt));

  return {
    year,
    inProgress: year === new Date().getUTCFullYear(),
    films,
    games: {
      finished: played.filter((g) => g.status === "completed"),
      started: played.filter((g) => g.status === "playing"),
    },
    series: {
      finished: watched.filter((s) => s.status === "completed"),
      started: watched.filter((s) => s.status === "watching"),
    },
    books: {
      finished: read.filter((b) => b.status === "finished"),
      started: read.filter((b) => b.status === "reading"),
    },
    releases,
    listening,
    posts: posts.filter((p) => within(p.date)),
  };
}
