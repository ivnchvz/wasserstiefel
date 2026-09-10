import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Sessions are signed with a key derived from ADMIN_PASSWORD, so there is no
 * second secret to manage - and changing the password ends every session.
 */
function key(): Buffer | null {
  const password = process.env.ADMIN_PASSWORD;
  return password ? createHmac("sha256", "wasserstiefel.admin.session").update(password).digest() : null;
}

const sign = (k: Buffer, exp: number) => createHmac("sha256", k).update(`admin:${exp}`).digest("base64url");

export function createSession(): string | null {
  const k = key();
  if (!k) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${sign(k, exp)}`;
}

export function verifySession(token: string | undefined | null): boolean {
  const k = key();
  if (!k || !token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig || exp < Date.now() / 1000) return false;

  const expected = Buffer.from(sign(k, exp));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Compared as digests, so the check takes the same time whatever was typed. */
export function passwordMatches(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(password).digest();
  return timingSafeEqual(a, b);
}

/** Reads the session cookie out of a raw Cookie header. */
export function sessionFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}
