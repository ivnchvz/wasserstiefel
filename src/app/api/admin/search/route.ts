import { NextResponse } from "next/server";
import { searchGames } from "@/lib/gameSearch";
import { adminGate } from "@/lib/adminGate";

export async function GET(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  const q = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: await searchGames(q) });
}
