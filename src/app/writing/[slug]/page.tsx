import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getPost, listPosts } from "@/lib/posts";
import { formatDate } from "@/lib/dates";

export const revalidate = 60;

/** Published posts are prerendered; a draft opened by URL renders on demand. */
export async function generateStaticParams() {
  return (await listPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "wasserstiefel — writing" };
  return {
    title: `${post.title} — wasserstiefel`,
    description: post.excerpt || undefined,
    // A draft reachable by link shouldn't turn up in search.
    robots: post.draft ? { index: false, follow: false } : undefined,
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
      <SiteHeader active="writing" />

      <article className="max-w-[64ch]">
        <header className="mb-10">
          <div className="flex items-baseline gap-4 text-[10px] tracking-[0.12em] text-ink-soft">
            <span className="tabular-nums">{formatDate(post.date)}</span>
            <span>{post.readingMinutes} min</span>
            {post.draft && <span className="border border-ink px-1.5 py-0.5 text-ink">draft</span>}
          </div>
          <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em] sm:text-3xl">{post.title}</h2>
        </header>

        {/* The parser is configured to reject raw HTML, so this is Markdown's output only. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>

      <Link
        href="/writing"
        className="mt-16 inline-block text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline"
      >
        ← all writing
      </Link>
    </main>
  );
}
