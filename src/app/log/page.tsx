import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Rating } from "@/components/Rating";
import { formatDate } from "@/lib/dates";
import { getLog, type LogEvent } from "@/lib/log";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "log — wasserstiefel",
  description: "Everything logged, newest first: films, games, series, books, albums and writing.",
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Year, then month, keeping the feed's newest-first order throughout. */
function group(events: LogEvent[]) {
  const years: { year: string; months: { month: string; events: LogEvent[] }[] }[] = [];
  for (const e of events) {
    const year = e.date.slice(0, 4);
    const month = MONTHS[Number(e.date.slice(5, 7)) - 1] ?? "";
    let y = years.at(-1);
    if (y?.year !== year) years.push((y = { year, months: [] }));
    let m = y.months.at(-1);
    if (m?.month !== month) y.months.push((m = { month, events: [] }));
    m.events.push(e);
  }
  return years;
}

function Row({ e }: { e: LogEvent }) {
  const body = (
    <>
      <span className="text-[10px] tabular-nums text-ink-soft">{formatDate(e.date)}</span>
      <span className="text-[10px] tracking-[0.14em] text-ink-soft">{e.kind}</span>
      <span className="col-span-2 min-w-0 text-[12px] leading-snug tracking-[-0.01em] sm:col-span-1">
        <span className="text-ink-soft">{e.verb} </span>
        <span className="group-hover:underline">{e.title}</span>
        {e.detail && <span className="text-ink-soft"> — {e.detail}</span>}
      </span>
      <span className="hidden justify-self-end sm:block">
        <Rating value={e.rating} />
      </span>
    </>
  );
  const grid = "grid grid-cols-[4.5rem_1fr] items-baseline gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[4.5rem_4rem_1fr_auto]";

  return (
    <li className="border-b border-rule first:border-t">
      {e.url ? (
        <a href={e.url} className={`group ${grid}`}>
          {body}
        </a>
      ) : (
        <div className={grid}>{body}</div>
      )}
    </li>
  );
}

export default async function LogPage() {
  const years = group(await getLog());

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
      <SiteHeader active="log" />

      {years.length === 0 ? (
        <p className="text-[11px] text-ink-soft">nothing logged yet</p>
      ) : (
        <div className="flex max-w-[52rem] flex-col gap-20">
          {years.map((y) => (
            <section key={y.year}>
              <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-3">
                <h2 className="text-3xl font-medium tabular-nums tracking-[-0.04em]">{y.year}</h2>
                <Link
                  href={`/year/${y.year}`}
                  className="text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline"
                >
                  year in review →
                </Link>
              </div>

              <div className="flex flex-col gap-10">
                {y.months.map((m) => (
                  <div key={m.month}>
                    <h3 className="mb-2 text-[10px] tracking-[0.2em] text-ink-soft">{m.month}</h3>
                    <ol>
                      {m.events.map((e) => (
                        <Row key={`${e.kind}-${e.date}-${e.title}`} e={e} />
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
