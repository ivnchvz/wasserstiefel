import { NextResponse } from "next/server";
import { getRecentTracks, withArtwork } from "@/lib/music";

/**
 * Polled by section 01. GET handlers aren't cached in this version of Next,
 * so the response is built per request - but the Last.fm read underneath is
 * cached for 15 seconds and shared, so however many tabs are polling, Last.fm
 * sees roughly one request per window.
 */
export async function GET() {
  const result = await getRecentTracks(5, { ttl: 15 });

  // An upstream failure answers as an error, so the client keeps what it
  // already shows instead of treating it as "nothing played".
  if (result.status !== "ok") {
    return NextResponse.json({ error: result.message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(await withArtwork(result.items), { headers: { "Cache-Control": "no-store" } });
}
