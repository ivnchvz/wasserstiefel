import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminNeedsLogin } from "@/lib/adminGate";
import { SESSION_COOKIE, verifySession } from "@/lib/adminSession";
import { cannotSave } from "@/lib/adminStore";
import { storageMode } from "@/lib/repoStore";
import { LogoutButton } from "./LogoutButton";
import { AdminLibrary, type LibraryConfig } from "./AdminLibrary";
import { AdminGallery } from "./AdminGallery";

export const metadata: Metadata = {
  title: "admin",
  robots: { index: false, follow: false },
};

const GAMES: LibraryConfig = {
  kind: "games",
  heading: "games",
  placeholder: "search backloggd…",
  statuses: ["playing", "completed", "retired", "shelved"],
  dateField: "playedAt",
  idField: "slug",
};

const SERIES: LibraryConfig = {
  kind: "series",
  heading: "series",
  placeholder: "search tvmaze…",
  statuses: ["watching", "completed", "dropped", "paused"],
  dateField: "watchedAt",
  idField: "id",
};

const ALBUMS: LibraryConfig = {
  kind: "albums",
  heading: "albums",
  placeholder: "search itunes…",
  statuses: [],
  dateField: "ratedAt",
  idField: "id",
  mode: "rating",
};

export default async function AdminPage() {
  const live = adminNeedsLogin();
  if (live && !verifySession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/admin/login");

  // Says where a save will actually go, so nothing is logged into a void.
  const blocked = cannotSave();
  const where = blocked
    ? blocked
    : storageMode() === "github"
      ? `saves commit to ${process.env.ADMIN_BRANCH ?? "main"} on GitHub — the site updates once Vercel finishes deploying, about a minute`
      : "saves write to the files in this folder — commit them to publish";

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
        <h1 className="text-2xl font-medium lowercase tracking-[-0.04em]">admin</h1>
        <span className="flex items-baseline gap-6">
          <Link href="/" className="text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline">
            ← back to the site
          </Link>
          {live && <LogoutButton />}
        </span>
      </header>

      <p className={`mb-12 px-4 py-3 text-[11px] leading-relaxed ${blocked ? "border border-ink text-ink" : "border border-rule text-ink-soft"}`}>
        {where}
      </p>


      <div className="flex flex-col gap-20">
        <AdminLibrary config={GAMES} />
        <AdminLibrary config={SERIES} />
        <AdminLibrary config={ALBUMS} />
        <AdminGallery />
      </div>
    </main>
  );
}
