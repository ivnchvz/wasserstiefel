import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminNeedsLogin } from "@/lib/adminGate";
import { SESSION_COOKIE, verifySession } from "@/lib/adminSession";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "admin — log in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Locally there's nothing to log in to; and a live session skips the form.
  if (!adminNeedsLogin()) redirect("/admin");
  if (verifySession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/admin");

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-24">
      <h1 className="mb-8 text-2xl font-medium lowercase tracking-[-0.04em]">admin</h1>
      {process.env.ADMIN_PASSWORD ? (
        <LoginForm />
      ) : (
        <p className="text-[11px] leading-relaxed text-ink-soft">
          admin is disabled on this deployment — set ADMIN_PASSWORD in Vercel to enable it.
        </p>
      )}
      <Link href="/" className="mt-12 inline-block text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline">
        ← back to the site
      </Link>
    </main>
  );
}
