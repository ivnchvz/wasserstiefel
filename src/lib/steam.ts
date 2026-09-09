import type { Game } from "./types";

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
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
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
  const account = process.env.STEAM_ID;
  if (!key || !account) return null;

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
