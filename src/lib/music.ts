import type { SectionResult, Track } from "./types";
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
export async function getRecentTracks(count = 5): Promise<SectionResult<Track>> {
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
    const res = await fetch(url, { next: { revalidate: NOW_PLAYING_TTL_SECONDS } });
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
