export type GameSearchResult = {
  slug: string;
  title: string;
  year: string | null;
  cover: string | null;
  /** "Main Game", "DLC", "Expansion" - useful for telling editions apart. */
  kind: string | null;
};

/**
 * Backloggd's search results are delivered to the page as a turbo-stream, and
 * that endpoint answers normally - unlike the member pages, which sit behind
 * the proof-of-work wall. It returns Backloggd slugs, which is exactly the
 * identifier games.json stores.
 */
export async function searchGames(query: string, limit = 12): Promise<GameSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `https://backloggd.com/search/results.turbo_stream?page=1&query=${encodeURIComponent(q)}&type=games`;
  const res = await fetch(url, {
    headers: { "User-Agent": "wasserstiefel.dev personal site" },
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) return [];

  const html = await res.text();
  if (/Making sure you&#39;re not a bot/i.test(html)) return [];

  const results: GameSearchResult[] = [];
  const seen = new Set<string>();

  // Each hit is one <div class="col-12 result"> block.
  for (const block of html.split('class="col-12 result"').slice(1)) {
    const slug = block.match(/href="\/games\/([a-z0-9-]+)\/?"/)?.[1];
    if (!slug || seen.has(slug)) continue;

    const heading = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? "";
    const year = heading.match(/<span[^>]*subtitle-text[^>]*>\s*(\d{4})/)?.[1] ?? null;
    const title = heading
      .replace(/<span[\s\S]*?<\/span>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .trim();
    if (!title) continue;

    seen.add(slug);
    results.push({
      slug,
      title,
      year,
      cover: block.match(/https:\/\/images\.igdb\.com\/igdb\/image\/upload\/t_cover_big[^"']+/)?.[0] ?? null,
      kind: block.match(/game-result-type[^>]*>([^<]+)</)?.[1]?.trim() ?? null,
    });

    if (results.length >= limit) break;
  }

  return results;
}
