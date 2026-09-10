/** Shared shapes for everything the landing page aggregates. */

export type Movie = {
  title: string;
  year: string | null;
  /** 0.5 - 5.0, or null when logged without a rating. */
  rating: number | null;
  watchedAt: string | null;
  rewatch: boolean;
  url: string;
  poster: string | null;
};

export type Game = {
  title: string;
  /** e.g. "Steam", "Switch" - free-form, may be null. */
  platform: string | null;
  /** 0 - 5, or null when unrated. */
  rating: number | null;
  playedAt: string | null;
  url: string | null;
  cover: string | null;
};

export type Track = {
  title: string;
  artist: string;
  album: string | null;
  url: string | null;
  artwork: string | null;
  playedAt: string | null;
  /** True when the track is playing right now rather than merely last-played. */
  nowPlaying: boolean;
};

/**
 * Every source resolves to one of these instead of throwing, so one dead
 * upstream never blanks the whole page.
 *
 * - `ok`           got data (possibly an empty list)
 * - `unconfigured` missing env vars; render a setup hint, not an error
 * - `error`        upstream failed; render a soft failure
 */
export type SectionResult<T> =
  | { status: "ok"; items: T[] }
  | { status: "unconfigured"; message: string }
  | { status: "error"; message: string };

export type Favorite = {
  title: string;
  /** Films carry a year; games generally don't. */
  year: string | null;
  url: string;
  image: string | null;
};

/** A game running right now, from Steam's live presence field. */
export type NowPlayingGame = {
  title: string;
  appid: string;
  url: string;
  cover: string;
};
