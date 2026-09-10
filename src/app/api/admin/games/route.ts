import { readFile, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { GAMES_FILE } from "@/lib/games";
import { adminGate } from "@/lib/adminGate";

type Entry = {
  slug?: string;
  title?: string;
  status?: string;
  rating?: number | null;
  playedAt?: string | null;
  platform?: string | null;
};

const STATUSES = ["completed", "playing", "retired", "shelved"] as const;

async function load(): Promise<Entry[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(GAMES_FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

async function save(entries: Entry[]) {
  await writeFile(GAMES_FILE, JSON.stringify(entries, null, 2) + "\n", "utf8");
  // The homepage reads this file, so drop its cache rather than waiting out
  // the revalidate window.
  revalidatePath("/");
}

const keyOf = (e: Entry) => (e.slug ?? e.title ?? "").toLowerCase();

export async function GET(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  return NextResponse.json({ entries: await load() });
}

export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  const body = (await request.json()) as Entry;
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!slug && !title) {
    return NextResponse.json({ error: "need a slug or a title" }, { status: 400 });
  }

  const status = STATUSES.includes(body.status as (typeof STATUSES)[number]) ? body.status : undefined;
  const entry: Entry = {
    ...(slug ? { slug } : {}),
    ...(title && !slug ? { title } : {}),
    ...(status ? { status } : {}),
    ...(typeof body.rating === "number" ? { rating: body.rating } : {}),
    ...(body.playedAt ? { playedAt: body.playedAt } : {}),
    ...(body.platform ? { platform: body.platform } : {}),
  };

  const entries = await load();
  const at = entries.findIndex((e) => keyOf(e) === keyOf(entry));
  // Merge rather than replace, so fields set earlier aren't dropped by an
  // update that only carries a status.
  if (at >= 0) entries[at] = { ...entries[at], ...entry };
  else entries.unshift(entry);

  await save(entries);
  return NextResponse.json({ entries });
}

export async function DELETE(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  const key = (new URL(request.url).searchParams.get("key") ?? "").toLowerCase();
  const entries = (await load()).filter((e) => keyOf(e) !== key);
  await save(entries);
  return NextResponse.json({ entries });
}
