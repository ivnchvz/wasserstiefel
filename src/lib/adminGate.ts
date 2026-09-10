import { NextResponse } from "next/server";
import { sessionFromCookieHeader, verifySession } from "./adminSession";

/** Admin is open without a login only when running locally. */
export const adminNeedsLogin = () => process.env.NODE_ENV === "production";

/**
 * The admin routes write to the repository, so on the live site they need a
 * signed-in session: the cookie set by /api/admin/login. With no
 * ADMIN_PASSWORD configured, admin stays shut rather than open. Returns a
 * response when the request must be refused, null when it may proceed.
 *
 * (An earlier version accepted the password as a header or query parameter.
 * Nothing sent it, and a password in a URL ends up in logs, so it's gone.)
 */
export function adminGate(request: Request): NextResponse | null {
  if (!adminNeedsLogin()) return null;

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "admin is disabled: set ADMIN_PASSWORD" }, { status: 403 });
  }
  if (!verifySession(sessionFromCookieHeader(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "signed out — log in again at /admin/login" }, { status: 401 });
  }
  return null;
}
