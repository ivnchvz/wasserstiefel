import type { NowListening, SectionResult, TopTrack, Track } from "./types";
import { halftone, toAscii } from "./halftone";
import { LASTFM_USER } from "./config";

const NOW_PLAYING_TTL_SECONDS = 60; // this one should feel live

type LastfmImage = { "#text"?: string; size?: string };
type LastfmTrack = {
  name?: string;
  url?: string;
  artist?: { "#text"?: string; name?: string };
  album?: { "#text"?: string };
  image?: LastfmImage[];
  date?: { uts?: string };
  "@attr"?: { nowplaying?: string };
};

function pickArtwork(images: LastfmImage[] | undefined): string | null {
  if (!images?.length) return null;
  const preferred = ["extralarge", "large", "medium"];
  for (const size of preferred) {
    const hit = images.find((i) => i.size === size && i["#text"]);
    if (hit?.["#text"]) return hit["#text"];
  }
  return images.find((i) => i["#text"])?.["#text"] ?? null;
}

export function parseLastfmTrack(raw: LastfmTrack): Track | null {
  const title = raw.name?.trim();
  const artist = (raw.artist?.["#text"] ?? raw.artist?.name)?.trim();
  if (!title || !artist) return null;

  const uts = raw.date?.uts;
  return {
    title,
    artist,
    album: raw.album?.["#text"]?.trim() || null,
    url: raw.url ?? null,
    artwork: pickArtwork(raw.image),
    playedAt: uts ? new Date(Number.parseInt(uts, 10) * 1000).toISOString() : null,
    nowPlaying: raw["@attr"]?.nowplaying === "true",
  };
}

/**
 * Apple Music has no public "recently played" feed for a third party, and its
 * MusicKit equivalent needs a per-listener token that expires. Scrobbling
 * Apple Music into Last.fm (Marvis, NepTunes, Cider) and reading Last.fm's
 * open API is the durable way to surface a last-played track on a static site.
 */
/**
 * Last.fm scrobbles a track once it passes its halfway point, so a song still
 * playing also appears as the newest history entry. Within this window of the
 * current song, the same title and artist are taken to be the same play rather
 * than a replay.
 */
const SAME_PLAY_MS = 15 * 60 * 1000;

function samePlay(current: Track, earlier: Track): boolean {
  if (current.title !== earlier.title || current.artist !== earlier.artist) return false;
  if (!earlier.playedAt) return true;
  return Date.now() - new Date(earlier.playedAt).getTime() < SAME_PLAY_MS;
}

/**
 * The newest track, then up to `count` before it. Apple Music has no public
 * "recently played" feed for a third party, and its MusicKit equivalent needs
 * a per-listener token that expires. Scrobbling Apple Music into Last.fm
 * (NepTunes, QuietScrob, Cider) and reading Last.fm's open API is the durable
 * way to surface listening on a static site.
 */
export async function getRecentTracks(
  count = 5,
  { ttl = NOW_PLAYING_TTL_SECONDS }: { ttl?: number } = {},
): Promise<SectionResult<Track>> {
  const user = LASTFM_USER;
  const key = process.env.LASTFM_API_KEY;
  // Only the key is missing when unset; the username is baked in.
  if (!key) {
    return { status: "unconfigured", message: "LASTFM_API_KEY is not set" };
  }

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "user.getrecenttracks");
  url.searchParams.set("user", user);
  url.searchParams.set("api_key", key);
  url.searchParams.set("format", "json");
  // Headroom for the now-playing entry and a duplicate of it.
  url.searchParams.set("limit", String(count + 2));

  try {
    const res = await fetch(url, { next: { revalidate: ttl } });
    const body = await res.json();

    if (!res.ok || body?.error) {
      return { status: "error", message: body?.message ?? `Last.fm returned ${res.status}` };
    }

    const raw = body?.recenttracks?.track;
    const list: LastfmTrack[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const tracks = list.map(parseLastfmTrack).filter((t): t is Track => t !== null);
    if (tracks.length === 0) return { status: "ok", items: [] };

    const [latest, ...rest] = tracks;
    const history = latest.nowPlaying && rest[0] && samePlay(latest, rest[0]) ? rest.slice(1) : rest;

    return { status: "ok", items: [latest, ...history.slice(0, count)] };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Last.fm fetch failed" };
  }
}

/** Pairs the tracks with the featured one's artwork, as ASCII. */
export async function withArtwork(tracks: Track[]): Promise<NowListening> {
  const art = tracks[0]?.artwork;
  // Wider than tall on purpose: a character cell is about 0.56em wide and
  // 0.82em high, so a square sampling of a square cover renders squashed.
  // 44x30 characters comes out square on the page.
  //
  // The artwork fetch inside halftone() is cached for a week, so polling
  // redraws from a stored image rather than downloading it again.
  const grid = art ? await halftone(art, 44, 30) : null;
  return { tracks, ascii: grid ? toAscii(grid) : null };
}

/** Counted totals move slowly; no reason to ask more than hourly. */
const TOP_TRACKS_TTL_SECONDS = 60 * 60;

type ChartTrack = {
  name?: string;
  url?: string;
  playcount?: string;
  artist?: { "#text"?: string; name?: string };
};

/**
 * The most played tracks since the first of January.
 *
 * Last.fm's ready-made periods are rolling windows - 7 days, 1, 3, 6 or 12
 * months - and none of them is "this year". The weekly chart takes an
 * arbitrary range instead, and honours one starting at January 1st.
 *
 * It counts scrobbles, so it only knows what was played since scrobbling
 * began; it isn't a record of the whole year's listening.
 */
export async function getTopTracksThisYear(limit = 10): Promise<SectionResult<TopTrack>> {
  const user = LASTFM_USER;
  const key = process.env.LASTFM_API_KEY;
  if (!key) return { status: "unconfigured", message: "LASTFM_API_KEY is not set" };

  const from = Math.floor(Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000);
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "user.getweeklytrackchart");
  url.searchParams.set("user", user);
  url.searchParams.set("api_key", key);
  url.searchParams.set("format", "json");
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(Math.floor(Date.now() / 1000)));

  try {
    const res = await fetch(url, { next: { revalidate: TOP_TRACKS_TTL_SECONDS } });
    const body = await res.json();
    if (!res.ok || body?.error) {
      return { status: "error", message: body?.message ?? `Last.fm returned ${res.status}` };
    }

    const raw = body?.weeklytrackchart?.track;
    const list: ChartTrack[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const tracks = list
      .map((t) => {
        const title = t.name?.trim();
        const artist = (t.artist?.["#text"] ?? t.artist?.name)?.trim();
        const plays = Number.parseInt(t.playcount ?? "", 10);
        return title && artist && Number.isFinite(plays)
          ? { title, artist, url: t.url ?? null, plays }
          : null;
      })
      .filter((t): t is TopTrack => t !== null)
      // Ranked by the chart already, but sorted here so ties fall the same way
      // every time rather than however they arrived.
      .sort((a, b) => b.plays - a.plays || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));

    return { status: "ok", items: tracks.slice(0, limit) };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Last.fm fetch failed" };
  }
}
