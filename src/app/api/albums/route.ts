import { NextResponse } from "next/server";
import { albumsPage } from "@/lib/albumsPage";

export const revalidate = 3600;

/** Later pages, fetched when asked for. Public: it's what the page shows. */
export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
  const data = await albumsPage(Number.isFinite(page) ? page : 1);
  if ("error" in data) return NextResponse.json(data, { status: 502 });
  return NextResponse.json(data);
}
