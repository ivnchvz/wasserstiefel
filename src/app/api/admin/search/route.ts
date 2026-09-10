import { NextResponse } from "next/server";
import { searchGames } from "@/lib/gameSearch";
import { searchSeries } from "@/lib/seriesSearch";
import { searchAlbums } from "@/lib/albumSearch";
import { adminGate } from "@/lib/adminGate";

export async function GET(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";

  if (params.get("kind") === "albums") {
    const hits = await searchAlbums(q);
    return NextResponse.json({
      results: hits.map((a) => ({
        key: String(a.id),
        id: a.id,
        title: a.title,
        artist: a.artist,
        year: a.year,
        image: a.cover,
        cover: a.cover,
        note: a.artist,
      })),
    });
  }

  if (params.get("kind") === "series") {
    const hits = await searchSeries(q);
    return NextResponse.json({
      results: hits.map((s) => ({
        key: String(s.id),
        id: s.id,
        title: s.title,
        year: s.year,
        image: s.poster,
        note: [s.network, s.state].filter(Boolean).join(" · ") || null,
      })),
    });
  }

  const hits = await searchGames(q);
  return NextResponse.json({
    results: hits.map((g) => ({
      key: g.slug,
      slug: g.slug,
      title: g.title,
      year: g.year,
      image: g.cover,
      note: [g.kind, g.slug].filter(Boolean).join(" · ") || null,
    })),
  });
}
