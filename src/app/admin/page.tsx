import type { Metadata } from "next";
import Link from "next/link";
import { AdminGames } from "./AdminGames";

export const metadata: Metadata = {
  title: "admin",
  robots: { index: false, follow: false },
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
      <AdminGames />
    </main>
  );
}
