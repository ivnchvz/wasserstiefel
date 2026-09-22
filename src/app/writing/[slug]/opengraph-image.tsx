import { getPost } from "@/lib/posts";
import { formatDate } from "@/lib/dates";
import { ogCard, OG_SIZE } from "@/lib/ogCard";

export const alt = "A post on wasserstiefel";
export const size = OG_SIZE;
export const contentType = "image/png";

/** A shared post shows its own title, so the link says what it's about. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) return ogCard();
  return ogCard({ title: post.title, kicker: `writing · ${formatDate(post.date)}` });
}
