import { listPosts } from "@/lib/posts";
import { SITE_URL } from "@/lib/config";

export const revalidate = 3600;

/** & < > and friends would otherwise break the document. */
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await listPosts();
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/writing/${p.slug}`;
      // Midday, so a date-only post doesn't shift a day either side of UTC.
      const when = new Date(`${p.date}T12:00:00Z`).toUTCString();
      return `    <item>
      <title>${escape(p.title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="true">${escape(url)}</guid>
      <pubDate>${when}</pubDate>
      <description>${escape(p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>wasserstiefel — writing</title>
    <link>${escape(`${SITE_URL}/writing`)}</link>
    <description>Writing by wasserstiefel.</description>
    <language>en</language>
    <atom:link href="${escape(`${SITE_URL}/writing/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
