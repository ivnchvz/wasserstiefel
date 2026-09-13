import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { listPosts } from "@/lib/posts";
import { formatDate } from "@/lib/dates";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "wasserstiefel — writing",
  description: "Writing.",
};

export default async function WritingIndex() {
  const posts = await listPosts();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
      <SiteHeader active="writing" />

      {posts.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing written yet — start one from /admin</p>
      ) : (
        <ul className="max-w-[68ch]">
          {posts.map((p) => (
            <li key={p.slug} className="border-b border-rule first:border-t">
              <Link href={`/writing/${p.slug}`} className="group block py-7">
                <span className="flex items-baseline gap-4">
                  <span className="text-[10px] tabular-nums text-ink-soft">{formatDate(p.date)}</span>
                  <span className="text-[10px] tracking-[0.12em] text-ink-soft">{p.readingMinutes} min</span>
                </span>
                <span className="mt-2 block text-lg font-medium tracking-[-0.02em] group-hover:underline">
                  {p.title}
                </span>
                {p.excerpt && (
                  <span className="mt-2 block max-w-[62ch] text-[12px] leading-[1.8] text-ink-soft">{p.excerpt}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <a
        href="/writing/rss.xml"
        className="mt-14 inline-block text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline"
      >
        rss ↗
      </a>
    </main>
  );
}
