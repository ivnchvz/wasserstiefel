import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminGate } from "@/lib/adminGate";
import { cannotSave, failure } from "@/lib/adminStore";
import { commitRepoFiles, GitHubError, type FileChange } from "@/lib/repoStore";
import { getPost, listPosts, postPath, serializePost, slugify } from "@/lib/posts";

const today = () => new Date().toISOString().slice(0, 10);

/** Drafts included: admin is where they're meant to be visible. */
export async function GET(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  const slug = new URL(request.url).searchParams.get("slug");
  try {
    if (slug) {
      const post = await getPost(slug);
      return post
        ? NextResponse.json({ post })
        : NextResponse.json({ error: "no such post" }, { status: 404 });
    }
    const posts = await listPosts({ includeDrafts: true });
    return NextResponse.json({
      posts: posts.map(({ slug, title, date, draft, readingMinutes }) => ({ slug, title, date, draft, readingMinutes })),
    });
  } catch (err) {
    return failure(err);
  }
}

export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  const blocked = cannotSave();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

  const body = (await request.json()) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "a post needs a title" }, { status: 400 });

  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
  if (!slug) return NextResponse.json({ error: "that title makes an empty address" }, { status: 400 });

  const was = typeof body.originalSlug === "string" ? slugify(body.originalSlug) : "";
  const post = {
    title,
    date: typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : today(),
    draft: body.draft === true,
    body: typeof body.body === "string" ? body.body : "",
  };

  // Renaming moves the file, so the old address doesn't linger.
  const changes: FileChange[] = [{ path: postPath(slug), content: serializePost(post) }];
  if (was && was !== slug) changes.push({ path: postPath(was), content: null });

  try {
    await commitRepoFiles(changes, `admin: save ${slug} in writing`);
    revalidatePath("/", "layout");
    return NextResponse.json({ slug, posts: (await listPosts({ includeDrafts: true })).map((p) => ({ slug: p.slug, title: p.title, date: p.date, draft: p.draft })) });
  } catch (err) {
    if (err instanceof GitHubError) return failure(err);
    return failure(err);
  }
}

export async function DELETE(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  const blocked = cannotSave();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

  const slug = slugify(new URL(request.url).searchParams.get("slug") ?? "");
  if (!slug) return NextResponse.json({ error: "which post?" }, { status: 400 });

  try {
    await commitRepoFiles([{ path: postPath(slug), content: null }], `admin: remove ${slug} from writing`);
    revalidatePath("/", "layout");
    return NextResponse.json({ posts: (await listPosts({ includeDrafts: true })).map((p) => ({ slug: p.slug, title: p.title, date: p.date, draft: p.draft })) });
  } catch (err) {
    return failure(err);
  }
}
