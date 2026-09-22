export type BookSearchResult = {
  /** Open Library work id, e.g. "OL59800W" - one per book, across editions. */
  id: string;
  title: string;
  author: string | null;
  year: string | null;
  cover: string | null;
  editions: number;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
};

/**
 * Open Library asks apps to identify themselves; covers are requested by
 * cover id, which their covers service serves without a rate limit (the
 * ISBN-keyed route is the limited one).
 */
const HEADERS = { "User-Agent": "wasserstiefel.vercel.app personal site" };

export const coverUrl = (coverId: number) => `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;

function toResult(doc: OpenLibraryDoc): BookSearchResult | null {
  const id = doc.key?.replace(/^\/works\//, "");
  const title = doc.title?.trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    author: doc.author_name?.slice(0, 2).join(", ") || null,
    year: doc.first_publish_year ? String(doc.first_publish_year) : null,
    cover: doc.cover_i ? coverUrl(doc.cover_i) : null,
    editions: doc.edition_count ?? 0,
  };
}

/** Open Library is open and unauthenticated, so books need no key of their own. */
export async function searchBooks(query: string, limit = 12): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i,edition_count");
  url.searchParams.set("limit", String(limit));

  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 * 60 } });
    if (!res.ok) return [];
    const body = (await res.json()) as { docs?: OpenLibraryDoc[] };
    return (body.docs ?? []).map(toResult).filter((r): r is BookSearchResult => r !== null);
  } catch {
    return [];
  }
}
