import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const TAB =
  "border-b pb-1 text-[11px] lowercase tracking-[0.2em] transition-colors hover:text-ink";

/** The masthead, and the three things the site is. */
type Section = "index" | "gallery" | "writing";

export function SiteHeader({ active }: { active: Section }) {
  const tab = (href: string, label: string, key: Section) => (
    <Link
      href={href}
      className={`${TAB} ${active === key ? "border-ink text-ink" : "border-transparent text-ink-soft"}`}
      aria-current={active === key ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <header className="mb-20 border-b border-rule pb-5">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-3xl font-medium lowercase tracking-[-0.045em] sm:text-4xl">wasserstiefel</h1>
        <p className="text-[10px] tracking-[0.12em] text-ink-soft">an insight</p>
      </div>

      <nav className="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-2">
        {tab("/", "index", "index")}
        {tab("/gallery", "gallery", "gallery")}
        {tab("/writing", "writing", "writing")}
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </nav>
    </header>
  );
}
