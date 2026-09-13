/**
 * Public identifiers, baked in with an environment override.
 *
 * These are already public - they appear in the profile URLs this site links
 * to from every section header - so committing them costs nothing and means a
 * fresh deploy renders properly without any setup.
 *
 * API keys deliberately stay out of here: this repository is public, and a
 * Steam key in particular is issued per account, rate-limited, and revoked by
 * Valve if it leaks.
 */
export const LETTERBOXD_USER = process.env.LETTERBOXD_USERNAME ?? "wasserstiefel";
export const BACKLOGGD_USER = process.env.BACKLOGGD_USERNAME ?? "wasserstiefel";
export const LASTFM_USER = process.env.LASTFM_USERNAME ?? "wasserstiefel";
export const STEAM_ACCOUNT = process.env.STEAM_ID ?? "wasserstiefel";

/** A playlist to share, shown with Apple's own embedded player. */
export const PLAYLIST = {
  url: process.env.APPLE_PLAYLIST_URL ?? "https://music.apple.com/us/playlist/linux-kernel/pl.u-Ymb0vd5IgEPR50y",
  title: process.env.APPLE_PLAYLIST_TITLE ?? "Linux Kernel",
};

/**
 * Apple serves the player from embed.music.apple.com at the same path as the
 * page it came from, so a shared link converts by swapping the host.
 */
export function appleEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)music\.apple\.com$/.test(u.hostname)) return null;
    u.hostname = "embed.music.apple.com";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * The site's own address, needed wherever a link has to be absolute - the
 * feed. Vercel provides the production domain; locally it falls back to dev.
 */
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
