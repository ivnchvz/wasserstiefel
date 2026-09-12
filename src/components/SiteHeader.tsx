import Link from "next/link";

const TAB =
  "border-b pb-1 text-[11px] lowercase tracking-[0.2em] transition-colors hover:text-ink";

/** The masthead, and the two things the site is: an index, and a gallery. */
export function SiteHeader({ active }: { active: "index" | "gallery" }) {
  const tab = (href: string, label: string, key: "index" | "gallery") => (
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
        <p className="text-[10px] leading-[1.7] tracking-[0.12em] text-ink-soft">
          watched · played · heard
          <br />
          an index, updated automatically
        </p>
      </div>

      <nav className="mt-6 flex items-baseline gap-7">
        {tab("/", "index", "index")}
        {tab("/gallery", "gallery", "gallery")}
      </nav>
    </header>
  );
}
