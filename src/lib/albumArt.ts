const ART_TTL_SECONDS = 60 * 60 * 24 * 30; // artwork is effectively immutable

/**
 * Album covers come from the iTunes Search API, which needs no key. The
 * thumbnail URL carries its size in the path, so a larger render is a string
 * swap rather than another request.
 */
async function lookup(term: string): Promise<string | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=1`;
    const res = await fetch(url, { next: { revalidate: ART_TTL_SECONDS } });
    if (!res.ok) return null;

    // The response is served with a leading newline and a text content type.
    const body = JSON.parse((await res.text()).trim());
    const art: string | undefined = body?.results?.[0]?.artworkUrl100;
    return art ? art.replace("100x100bb", "600x600bb") : null;
  } catch {
    return null;
  }
}

export async function findAlbumArt(artist: string, title: string): Promise<string | null> {
  const a = artist.trim();
  const t = title.trim();
  if (!t) return null;

  // Artist and title together is the precise query, but iTunes misses when a
  // release is titled differently there. Falling back to each half separately
  // recovers most of those.
  for (const term of [`${a} ${t}`, t, a ? `${t} ${a.split(" ")[0]}` : ""]) {
    if (!term.trim()) continue;
    const hit = await lookup(term.trim());
    if (hit) return hit;
  }
  return null;
}
