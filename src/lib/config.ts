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
