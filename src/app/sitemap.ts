import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { listPosts } from "@/lib/posts";
import { getLoggedYears } from "@/lib/log";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, years] = await Promise.all([listPosts(), getLoggedYears()]);
  const page = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
  });

  return [
    page("/"),
    page("/gallery"),
    page("/writing", posts[0]?.date),
    page("/log"),
    ...years.map((y) => page(`/year/${y}`)),
    ...posts.map((p) => page(`/writing/${p.slug}`, p.date)),
  ];
}
