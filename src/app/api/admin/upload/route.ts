import { NextResponse } from "next/server";
import { adminGate } from "@/lib/adminGate";
import { cannotSave, failure } from "@/lib/adminStore";
import { commitRepoFiles } from "@/lib/repoStore";
import { MAX_UPLOAD_BYTES, processUpload } from "@/lib/uploadImage";

/**
 * Stores an image and returns its address, without filing it in the gallery -
 * for pictures that belong inside a post rather than on the gallery wall.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  const blocked = cannotSave();
  if (blocked) return NextResponse.json({ error: blocked }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file sent" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "that file is over 25MB" }, { status: 413 });

  const image = await processUpload(file);
  if (!image) return NextResponse.json({ error: "that file isn't an image" }, { status: 400 });

  try {
    await commitRepoFiles(
      [{ path: `public/gallery/${image.name}`, content: image.buffer }],
      `admin: save ${image.name} for writing`,
    );
    return NextResponse.json({ src: `/gallery/${image.name}` });
  } catch (err) {
    return failure(err);
  }
}
