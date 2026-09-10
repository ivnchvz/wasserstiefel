export type AlbumSearchResult = {
  id: number;
  title: string;
  artist: string;
  year: string | null;
  cover: string | null;
};

type ItunesAlbum = {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
};

/** iTunes needs no key, and its catalogue is the one Apple Music plays from. */
export async function searchAlbums(query: string, limit = 12): Promise<AlbumSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 } });
    if (!res.ok) return [];

    // Served with a leading newline and a text content type.
    const body = JSON.parse((await res.text()).trim());
    const results: ItunesAlbum[] = body?.results ?? [];

    return results
      .filter((a) => a.collectionId && a.collectionName && a.artistName)
      .map((a) => ({
        id: a.collectionId!,
        title: a.collectionName!.trim(),
        artist: a.artistName!.trim(),
        year: a.releaseDate ? a.releaseDate.slice(0, 4) : null,
        cover: a.artworkUrl100?.replace("100x100bb", "600x600bb") ?? null,
      }));
  } catch {
    return [];
  }
}
