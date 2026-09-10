const GAME_TTL_SECONDS = 60 * 60 * 24 * 7; // game metadata doesn't move

export type BackloggdGame = {
  title: string;
  year: string | null;
  cover: string | null;
  url: string;
};

/**
 * Backloggd's per-game pages serve normally, even though every page that
 * *lists* a member's games sits behind the proof-of-work wall. So a finished
 * list can be kept as a handful of slugs and have its titles and cover art
 * filled in from here, rather than typed out by hand.
 */
export async function getGameBySlug(slug: string): Promise<BackloggdGame | null> {
  const url = `https://backloggd.com/games/${slug}/`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "wasserstiefel.dev personal site" },
      next: { revalidate: GAME_TTL_SECONDS },
    });
    if (!res.ok) return null;

    const html = await res.text();
    if (/Making sure you&#39;re not a bot/i.test(html)) return null;

    // og:title reads "Balatro (2024)".
    const raw = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
    if (!raw) return null;
    const parts = raw.match(/^(.*?)\s*\((\d{4})\)\s*$/);

    return {
      title: (parts ? parts[1] : raw).trim(),
      year: parts ? parts[2] : null,
      cover: html.match(/https:\/\/images\.igdb\.com\/igdb\/image\/upload\/t_cover_big[^"']+/)?.[0] ?? null,
      url,
    };
  } catch {
    return null;
  }
}
