import { NextResponse } from "next/server";

/**
 * The admin routes write to the repo, so they must never be openly reachable.
 * In development they're allowed; anywhere else they require ADMIN_PASSWORD to
 * be set and sent, and refuse outright if no password is configured. Returns a
 * response when the request should be rejected, null when it may proceed.
 */
export function adminGate(request: Request): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "admin is disabled: set ADMIN_PASSWORD" }, { status: 403 });
  }

  const supplied =
    request.headers.get("x-admin-password") ??
    new URL(request.url).searchParams.get("password");

  if (supplied !== expected) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  return null;
}
