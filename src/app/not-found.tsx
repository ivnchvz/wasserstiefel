import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { DotDigits } from "@/components/DotDigits";

export const metadata = { title: "not found — wasserstiefel" };

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
      <SiteHeader />
      <DotDigits value="404" className="w-full max-w-[26rem] text-ink" />
      <p className="mt-10 max-w-[48ch] text-[12px] leading-relaxed text-ink-soft">
        Nothing lives at this address. It may have moved, or never been here at all.
      </p>
      <Link href="/" className="mt-6 inline-block text-[11px] tracking-[0.14em] hover:underline">
        ← back to the index
      </Link>
    </main>
  );
}
