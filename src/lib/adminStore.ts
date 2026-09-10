import { readFile, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminGate } from "./adminGate";

export type StoreEntry = Record<string, unknown>;

/**
 * Games and series are both "a list of things I've logged" kept in a JSON file
 * in the repo, so they share one set of handlers. `keyOf` decides identity, so
 * logging the same title twice updates rather than duplicates.
 */
export function createStore(file: string, keyOf: (e: StoreEntry) => string, sanitise: (body: StoreEntry) => StoreEntry | null) {
  async function load(): Promise<StoreEntry[]> {
    try {
      const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
      return Array.isArray(parsed) ? (parsed as StoreEntry[]) : [];
    } catch {
      return [];
    }
  }

  async function save(entries: StoreEntry[]) {
    await writeFile(file, JSON.stringify(entries, null, 2) + "\n", "utf8");
    // The homepage reads these files, so drop its cache rather than waiting
    // out the revalidate window.
    revalidatePath("/");
  }

  return {
    async GET(request: Request) {
      const denied = adminGate(request);
      if (denied) return denied;
      return NextResponse.json({ entries: await load() });
    },

    async POST(request: Request) {
      const denied = adminGate(request);
      if (denied) return denied;

      const entry = sanitise((await request.json()) as StoreEntry);
      if (!entry) return NextResponse.json({ error: "invalid entry" }, { status: 400 });

      const entries = await load();
      const at = entries.findIndex((e) => keyOf(e) === keyOf(entry));
      // Merge rather than replace, so fields set earlier survive an update
      // that only carries a status.
      if (at >= 0) entries[at] = { ...entries[at], ...entry };
      else entries.unshift(entry);

      await save(entries);
      return NextResponse.json({ entries });
    },

    async DELETE(request: Request) {
      const denied = adminGate(request);
      if (denied) return denied;

      const key = new URL(request.url).searchParams.get("key") ?? "";
      await save((await load()).filter((e) => keyOf(e) !== key));
      return NextResponse.json({ entries: await load() });
    },
  };
}
