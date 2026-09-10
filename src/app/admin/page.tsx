import type { Metadata } from "next";
import Link from "next/link";
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

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
        <h1 className="text-2xl font-medium lowercase tracking-[-0.04em]">admin</h1>
        <Link href="/" className="text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline">
          ← back to the site
        </Link>
      </header>

      {process.env.NODE_ENV === "production" && (
        /*
         * Admin writes a file in the repo. A serverless filesystem is
         * read-only and thrown away between invocations, so edits made here
         * would appear to work and then vanish - worth saying plainly rather
         * than letting someone log a month of games into nothing.
         */
        <p className="mb-10 border border-ink px-4 py-3 text-[11px] leading-relaxed text-ink">
          running in production — edits made here write to a file that this
          deployment cannot keep. log locally with <span className="tracking-[0.1em]">npm run dev</span> and
          commit the result, until writes move to the GitHub API or a database.
        </p>
      )}

      <div className="flex flex-col gap-20">
        <AdminLibrary config={GAMES} />
        <AdminLibrary config={SERIES} />
        <AdminLibrary config={ALBUMS} />
        <AdminGallery />
      </div>
    </main>
  );
}
