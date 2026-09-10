import { NextResponse } from "next/server";
import { createSession, passwordMatches, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/adminSession";

/** Slows guessing from one connection; a long random password is the real defence. */
const FAILURE_DELAY_MS = 800;

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "admin is disabled: set ADMIN_PASSWORD" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";

  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSession()!, {
    httpOnly: true, // never readable by page scripts
    secure: process.env.NODE_ENV === "production",
    // Lax keeps the cookie off cross-site POSTs and DELETEs, which is what
    // stops another site from triggering a save with your session.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
