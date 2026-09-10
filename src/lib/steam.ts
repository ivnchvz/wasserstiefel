import type { Game, NowPlayingGame } from "./types";
import { STEAM_ACCOUNT } from "./config";

const STEAM_TTL_SECONDS = 60 * 30;

type OwnedGame = {
  appid?: number;
  name?: string;
  rtime_last_played?: number;
  playtime_forever?: number;
};

/** Steam accepts a 17-digit SteamID64; anything else is a vanity name to resolve. */
async function resolveSteamId(idOrVanity: string, key: string): Promise<string | null> {
  if (/^\d{17}$/.test(idOrVanity)) return idOrVanity;

  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/");
  url.searchParams.set("key", key);
  url.searchParams.set("vanityurl", idOrVanity);

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) return null;

  const body = await res.json();
  return body?.response?.success === 1 ? (body.response.steamid as string) : null;
}

export function mapOwnedGames(games: OwnedGame[], limit: number): Game[] {
  return games
    .filter((g) => g.name && g.rtime_last_played)
    .sort((a, b) => (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0))
    .slice(0, limit)
    .map((g) => ({
      title: g.name!.trim(),
      platform: "Steam",
      rating: null, // Steam exposes playtime, not a personal score
      playedAt: new Date(g.rtime_last_played! * 1000).toISOString().slice(0, 10),
      url: `https://store.steampowered.com/app/${g.appid}/`,
      // Portrait library art rather than the landscape header, so games sit
      // in the same 2:3 grid as the film posters and the Backloggd covers.
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
      status: null, // Steam has no notion of finishing a game
    }));
}

/**
 * GetOwnedGames is used rather than GetRecentlyPlayedGames because only the
 * former returns `rtime_last_played` - the recently-played endpoint sorts by
 * two-week playtime and carries no date, which can't be merged with manual
 * entries on a shared timeline.
 *
 * Returns null when unconfigured so the caller can fall back silently.
 */
export async function getSteamGames(limit: number): Promise<Game[] | null> {
  const key = process.env.STEAM_API_KEY;
  const account = STEAM_ACCOUNT;
  if (!key) return null;

  const steamId = await resolveSteamId(account, key);
  if (!steamId) throw new Error(`Could not resolve Steam account "${account}"`);

  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");

  const res = await fetch(url, { next: { revalidate: STEAM_TTL_SECONDS } });
  if (!res.ok) throw new Error(`Steam returned ${res.status}`);

  const body = await res.json();
  const games: OwnedGame[] | undefined = body?.response?.games;

  // An empty object here almost always means the profile's game details are private.
  if (!games) throw new Error("Steam returned no games — is the profile set to public?");

  return mapOwnedGames(games, limit);
}

/**
 * Steam only includes `gameextrainfo` in a player summary while a game is
 * actually running, so its presence *is* the "playing now" signal. Returns
 * null whenever nothing is running, or Steam isn't configured.
 */
export async function getNowPlayingGame(): Promise<NowPlayingGame | null> {
  const key = process.env.STEAM_API_KEY;
  const account = STEAM_ACCOUNT;
  if (!key) return null;

  try {
    const steamId = await resolveSteamId(account, key);
    if (!steamId) return null;

    const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
    url.searchParams.set("key", key);
    url.searchParams.set("steamids", steamId);

    // Presence is the one genuinely live thing here; keep it short.
    const res = await fetch(url, { next: { revalidate: 45 } });
    if (!res.ok) return null;

    const player = (await res.json())?.response?.players?.[0];
    const title: string | undefined = player?.gameextrainfo;
    const appid: string | undefined = player?.gameid;
    if (!title || !appid) return null;

    return {
      title,
      appid,
      url: `https://store.steampowered.com/app/${appid}/`,
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
    };
  } catch {
    return null;
  }
}
