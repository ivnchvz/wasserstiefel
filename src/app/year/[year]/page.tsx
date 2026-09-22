import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { DotDigits } from "@/components/DotDigits";
import { HalftoneImage } from "@/components/Halftone";
import { Reveal } from "@/components/Reveal";
import { Rating } from "@/components/Rating";
import { formatDate } from "@/lib/dates";
import { getLoggedYears } from "@/lib/log";
import { getYearReview } from "@/lib/yearReview";
import type { TopTrack } from "@/lib/types";

export const revalidate = 3600;

type Params = { params: Promise<{ year: string }> };

export async function generateStaticParams() {
  return (await getLoggedYears()).map((y) => ({ year: String(y) }));
}

/** Only years something was logged in; any other number is a 404. */
async function resolveYear(raw: string): Promise<number | null> {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return (await getLoggedYears()).includes(year) ? year : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year} — wasserstiefel`, description: `The year ${year} in films, games, series, books and music.` };
}

type Tile = { key: string; title: string; sub: string | null; image: string | null; url: string | null; rating: number | null };

function Shelf({ items, square = false }: { items: Tile[]; square?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((t) => {
        const inner = (
          <>
            <span className="block border border-rule bg-paper p-[3px] transition-colors group-hover:border-ink">
              {t.image ? (
                <Reveal src={t.image} alt={t.title}>
                  <HalftoneImage
                    src={t.image}
                    cols={square ? 34 : 30}
                    rows={square ? 34 : 42}
                    label={t.title}
                    className="w-full text-ink"
                  />
                </Reveal>
              ) : (
                <span
                  className={`flex ${square ? "aspect-square" : "aspect-[2/3]"} items-center justify-center p-2 text-center text-[9px] text-ink-soft`}
                >
                  {t.title}
                </span>
              )}
            </span>
            <span className="mt-3 block text-[11px] leading-snug group-hover:underline">{t.title}</span>
            {t.sub && <span className="mt-0.5 block truncate text-[10px] text-ink-soft">{t.sub}</span>}
            <span className="mt-1 flex">
              <Rating value={t.rating} />
            </span>
          </>
        );
        return (
          <li key={t.key}>
            {t.url ? (
              <a href={t.url} className="group block">
                {inner}
              </a>
            ) : (
              <div className="group block">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Chart({ title, rows, credit }: { title: string; rows: TopTrack[]; credit: boolean }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-[10px] tracking-[0.18em] text-ink-soft">{title}</h3>
      <ol>
        {rows.map((r, i) => (
          <li key={`${r.artist}-${r.title}`} className="border-b border-rule first:border-t">
            <a href={r.url ?? "#"} className="group grid grid-cols-[1.4rem_1fr_auto] items-baseline gap-3 py-2">
              <span className="text-[10px] tabular-nums text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 truncate text-[12px]">
                <span className="group-hover:underline">{r.title}</span>
                {credit && <span className="text-ink-soft"> — {r.artist}</span>}
              </span>
              <span className="text-[10px] tabular-nums text-ink-soft">{r.plays}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Block({ title, note, children }: { title: string; note?: string | null; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule pt-4">
      <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-[11px] lowercase tracking-[0.28em] text-ink">{title}</h2>
        {note && <span className="text-[10px] tracking-[0.08em] text-ink-soft">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export default async function YearPage({ params }: Params) {
  const year = await resolveYear((await params).year);
  if (year === null) notFound();

  const r = await getYearReview(year);
  const { films, listening } = r;

  const stats = [
    { n: films?.count ?? 0, label: films?.count === 1 ? "film" : "films", floor: !!films?.partialSince },
    { n: r.games.finished.length, label: "games finished" },
    { n: r.series.finished.length, label: "series finished" },
    { n: r.books.finished.length, label: r.books.finished.length === 1 ? "book read" : "books read" },
    { n: listening?.scrobbles ?? 0, label: "songs played" },
    { n: r.posts.length, label: r.posts.length === 1 ? "post" : "posts" },
  ];

  const finished: { title: string; tiles: Tile[] }[] = [
    {
      title: "games finished",
      tiles: r.games.finished.map((g) => ({ key: g.title, title: g.title, sub: g.platform, image: g.cover, url: g.url, rating: g.rating })),
    },
    {
      title: "series finished",
      tiles: r.series.finished.map((s) => ({ key: String(s.id), title: s.title, sub: s.year, image: s.poster, url: s.url, rating: s.rating })),
    },
    {
      title: "books read",
      tiles: r.books.finished.map((b) => ({ key: b.id, title: b.title, sub: b.author, image: b.cover, url: b.url, rating: b.rating })),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
      <SiteHeader active="log" />

      <div className="mb-16">
        <DotDigits value={String(year)} className="w-full max-w-[34rem] text-ink" />
        <p className="mt-6 text-[10px] tracking-[0.14em] text-ink-soft">
          year in review
          {r.inProgress && <> · so far, as of {formatDate(new Date().toISOString().slice(0, 10))}</>}
          {" · "}
          <Link href="/log" className="hover:text-ink hover:underline">
            the full log
          </Link>
        </p>
      </div>

      <dl className="mb-20 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-rule py-8 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col">
            <dt className="order-2 mt-1 text-[10px] tracking-[0.14em] text-ink-soft">{s.label}</dt>
            <dd className="text-3xl font-medium tabular-nums tracking-[-0.04em]">
              {s.n}
              {s.floor && <span className="text-ink-soft">+</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-20">
        {films && films.best.length > 0 && (
          <Block
            title="best films"
            note={[
              films.average !== null && `averaging ${films.average.toFixed(1)} / 5`,
              films.rewatches > 0 && `${films.rewatches} rewatched`,
              films.reviews > 0 && `${films.reviews} reviewed`,
              films.partialSince && `the diary feed only reaches back to ${formatDate(films.partialSince)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <Shelf
              items={films.best.map((m) => ({
                key: m.url,
                title: m.title,
                sub: m.year,
                image: m.poster,
                url: m.url,
                rating: m.rating,
              }))}
            />
          </Block>
        )}

        {listening && listening.scrobbles > 0 && (
          <Block title="listening" note={`${listening.scrobbles} scrobbles`}>
            <div className="grid gap-10 md:grid-cols-3">
              <Chart title="tracks" rows={listening.tracks} credit />
              <Chart title="artists" rows={listening.artists} credit={false} />
              <Chart title="albums" rows={listening.albums} credit />
            </div>
          </Block>
        )}

        {r.releases.length > 0 && (
          <Block title={`best of ${year}'s releases`} note="the highest rated records that came out this year">
            <Shelf
              square
              items={r.releases.map((a) => ({
                key: `${a.artist}-${a.title}`,
                title: a.title,
                sub: a.artist,
                image: a.cover,
                url: null,
                rating: a.rating,
              }))}
            />
          </Block>
        )}

        {finished
          .filter((f) => f.tiles.length > 0)
          .map((f) => (
            <Block key={f.title} title={f.title}>
              <Shelf items={f.tiles} />
            </Block>
          ))}

        {r.posts.length > 0 && (
          <Block title="writing">
            <ul className="max-w-[68ch]">
              {r.posts.map((p) => (
                <li key={p.slug} className="border-b border-rule first:border-t">
                  <Link href={`/writing/${p.slug}`} className="group flex items-baseline gap-4 py-3">
                    <span className="text-[10px] tabular-nums text-ink-soft">{formatDate(p.date)}</span>
                    <span className="text-[13px] group-hover:underline">{p.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        )}
      </div>
    </main>
  );
}
