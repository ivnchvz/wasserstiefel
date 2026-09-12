import { NextResponse } from "next/server";
import { adminGate } from "@/lib/adminGate";
import { failure } from "@/lib/adminStore";
import { publishPending, storageMode, unpublishedCount } from "@/lib/repoStore";

/** How many saves are waiting to go live. */
export async function GET(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;

  // Locally there is nothing to publish: saves are already in the files.
  if (storageMode() === "local") return NextResponse.json({ applicable: false, pending: 0 });

  try {
    return NextResponse.json({ applicable: true, pending: await unpublishedCount() });
  } catch (err) {
    return failure(err);
  }
}

/**
 * Sent when admin is left, and by the publish button. Doing nothing when
 * there's nothing pending is what makes it safe to call more than once - the
 * page-leave signal and a route change can both fire for one departure.
 */
export async function POST(request: Request) {
  const denied = adminGate(request);
  if (denied) return denied;
  if (storageMode() === "local") return NextResponse.json({ published: 0 });

  try {
    return NextResponse.json({ published: await publishPending() });
  } catch (err) {
    return failure(err);
  }
}
