export type SeriesSearchResult = {
  id: number;
  title: string;
  year: string | null;
  poster: string | null;
  network: string | null;
  /** "Running", "Ended", "To Be Determined". */
  state: string | null;
};

type TvmazeShow = {
  id?: number;
  name?: string;
  premiered?: string | null;
  status?: string | null;
  image?: { medium?: string; original?: string } | null;
  network?: { name?: string } | null;
  webChannel?: { name?: string } | null;
};

function toResult(show: TvmazeShow): SeriesSearchResult | null {
  if (!show?.id || !show.name) return null;
  return {
    id: show.id,
    title: show.name.trim(),
    year: show.premiered ? show.premiered.slice(0, 4) : null,
    // The untouched original is a tall poster; medium is a small crop.
    poster: show.image?.original ?? show.image?.medium ?? null,
    network: show.network?.name ?? show.webChannel?.name ?? null,
    state: show.status ?? null,
  };
}

/** TVmaze is open and unauthenticated, so series need no key of their own. */
export async function searchSeries(query: string, limit = 12): Promise<SeriesSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": "wasserstiefel.dev personal site" },
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) return [];

  const hits = (await res.json()) as { show?: TvmazeShow }[];
  return hits
    .map((h) => toResult(h.show ?? {}))
    .filter((r): r is SeriesSearchResult => r !== null)
    .slice(0, limit);
}

export async function getSeriesById(id: number): Promise<SeriesSearchResult | null> {
  try {
    const res = await fetch(`https://api.tvmaze.com/shows/${id}`, {
      headers: { "User-Agent": "wasserstiefel.dev personal site" },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;
    return toResult((await res.json()) as TvmazeShow);
  } catch {
    return null;
  }
}
