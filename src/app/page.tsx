import { getRecentMovies, getRecentReviews } from "@/lib/letterboxd";
import { getRecentGames, getFinishedGames } from "@/lib/games";
import { getSeries } from "@/lib/series";
import { getRatedAlbums } from "@/lib/albums";
import { getNowPlayingGame } from "@/lib/steam";
import { getFavoriteFilms, getFavoriteGames } from "@/lib/favorites";
import { getRecentTracks } from "@/lib/music";
import { HalftoneImage, AsciiImage } from "@/components/Halftone";
import { Reveal } from "@/components/Reveal";
import { LocalTime } from "@/components/LocalTime";
import { NowPlayingBanner } from "@/components/NowPlayingBanner";
import { halftone } from "@/lib/halftone";
import type { NowPlayingPayload } from "./api/now-playing/route";
import type { Favorite, Movie, SectionResult } from "@/lib/types";
import { BACKLOGGD_USER, LASTFM_USER, LETTERBOXD_USER } from "@/lib/config";

export const revalidate = 60;

/** Crouwel's exhibition dates read 30.03-03.07.11; dates here follow suit. */
function when(date: string | null): string | null {
  if (!date) return null;
  const local = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

/** Five cells, filled by score - the grid logic applied to a rating. */
function Rating({ value }: { value: number | null }) {
  if (value === null) return null; // Steam has no score; an em-dash per row is just noise
  return (
    <svg viewBox="0 0 29 5" className="h-[7px] w-[41px]" aria-label={`${value} out of 5`} role="img">
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <g key={i}>
            <rect x={i * 6} y={0} width={5} height={5} fill="none" stroke="currentColor" strokeWidth={0.6} opacity={0.35} />
            {fill > 0 && <rect x={i * 6} y={0} width={5 * fill} height={5} fill="currentColor" />}
          </g>
        );
      })}
    </svg>
  );
}

/** How many paragraphs show before deferring to Letterboxd. */
const PARAGRAPH_CAP = 3;

function ReviewBody({ paragraphs, url }: { paragraphs: string[]; url: string }) {
  const shown = paragraphs.slice(0, PARAGRAPH_CAP);
  return (
    /* ch resolves against this element's own font-size, so the measure is set
       here at text size rather than on an inheriting wrapper. */
    <div className="max-w-[64ch] text-[12px]">
      {shown.map((p, i) => (
        <p key={i} className="mt-3 text-[12px] leading-[1.85] text-ink first:mt-0">
          {p}
        </p>
      ))}
      {paragraphs.length > shown.length && (
        <a href={url} className="mt-3 inline-block text-[10px] tracking-[0.12em] text-ink-soft hover:text-ink hover:underline">
          continue on letterboxd ↗
        </a>
      )}
    </div>
  );
}

/**
 * The collapsible review used inside the film list on narrow screens. The
 * films list and the reviews section both render one, so ids are namespaced
 * per section - duplicate ids would point every label at the first checkbox.
 */
function ReviewDisclosure({ movie, idPrefix }: { movie: Movie; idPrefix: string }) {
  const id = `${idPrefix}-${movie.url.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
  const paragraphs = movie.review ?? [];

  return (
    <>
      <input type="checkbox" id={id} className="sr-only" aria-label={`Read the review of ${movie.title}`} />
      <label
        htmlFor={id}
        className="mt-2 inline-block cursor-pointer text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink"
      >
        <span className="group-has-[:checked]:hidden">▸ read review</span>
        <span className="hidden group-has-[:checked]:inline">▾ hide review</span>
      </label>
      <div className="mt-3 hidden group-has-[:checked]:block">
        {movie.spoilers ? (
          <details>
            <summary className="cursor-pointer list-none text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink">
              ▸ contains spoilers — reveal
            </summary>
            <div className="mt-3">
              <ReviewBody paragraphs={paragraphs} url={movie.url} />
            </div>
          </details>
        ) : (
          <ReviewBody paragraphs={paragraphs} url={movie.url} />
        )}
      </div>
    </>
  );
}

/** The standalone reviews section only renders from sm, so it never folds. */
function Review({ movie }: { movie: Movie }) {
  const paragraphs = movie.review ?? [];

  return (
    <li className="border-t border-rule py-8 first:border-t-0 first:pt-0">
      <div className="grid gap-6 sm:grid-cols-[86px_1fr]">
        <div className="w-[86px]">
          {movie.poster && (
            <a href={movie.url} className="block border border-rule bg-paper p-[3px] transition-colors hover:border-ink">
              <Reveal src={movie.poster} alt={movie.title}>
                <HalftoneImage src={movie.poster} cols={26} rows={36} label={movie.title} className="w-full text-ink" />
              </Reveal>
            </a>
          )}
        </div>

        <div className="min-w-0">
          <a href={movie.url} className="group/t inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[14px] font-medium tracking-[-0.01em] group-hover/t:underline">{movie.title}</span>
            <span className="text-[10px] tabular-nums text-ink-soft">{movie.year}</span>
            <Rating value={movie.rating} />
            <span className="text-[10px] tabular-nums text-ink-soft">{when(movie.watchedAt)}</span>
            {movie.rewatch && <span className="text-[10px] tracking-[0.12em] text-ink-soft">rewatch</span>}
          </a>

          <div className="mt-4">
            {movie.spoilers ? (
              /* Flagged by the member, so it stays shut until asked for. */
              <details>
                <summary className="cursor-pointer list-none text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink">
                  ▸ contains spoilers — reveal
                </summary>
                <div className="mt-4">
                  <ReviewBody paragraphs={paragraphs} url={movie.url} />
                </div>
              </details>
            ) : (
              <ReviewBody paragraphs={paragraphs} url={movie.url} />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function FavouriteGrid({ items }: { items: Favorite[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
      {items.map((f) => (
        <li key={f.url}>
          <a href={f.url} className="group block">
            <span className="block border border-rule bg-paper p-[3px] transition-colors group-hover:border-ink">
              {f.image ? (
                <Reveal src={f.image} alt={f.title}>
                  <HalftoneImage src={f.image} cols={30} rows={42} label={f.title} className="w-full text-ink" />
                </Reveal>
              ) : (
                <span className="flex aspect-[2/3] items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                  {f.title}
                </span>
              )}
            </span>
            <span className="mt-3 block text-[11px] leading-snug group-hover:underline">{f.title}</span>
            {f.year && <span className="mt-1 block text-[10px] tabular-nums text-ink-soft">{f.year}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Section({
  index,
  title,
  href,
  result,
  className,
  children,
}: {
  index: string;
  title: string;
  href?: string;
  result?: SectionResult<unknown>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`border-t border-rule pt-4 ${className ?? ""}`}>
      <div className="mb-8 flex items-baseline gap-4">
        <span className="text-[10px] tabular-nums text-ink-soft">{index}</span>
        <h2 className="text-[11px] lowercase tracking-[0.28em] text-ink">{title}</h2>
        {href && (
          <a
            href={href}
            className="ml-auto text-[10px] tracking-[0.1em] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            index ↗
          </a>
        )}
      </div>
      {!result || result.status === "ok" ? (
        children
      ) : (
        <p className="pb-10 text-[11px] leading-relaxed text-ink-soft">
          {result.status === "unconfigured" ? "not configured" : "unavailable"} — {result.message}
        </p>
      )}
    </section>
  );
}

export default async function Home() {
  const [movies, reviews, games, finished, watching, seenSeries, albums, music, favFilms, favGames, nowGame] =
    await Promise.all([
      getRecentMovies(6),
      getRecentReviews(4),
      getRecentGames(11),
      getFinishedGames(12),
      getSeries("watching", 12),
      getSeries("completed", 12),
      getRatedAlbums(12),
      getRecentTracks(5),
      getFavoriteFilms(),
      getFavoriteGames(),
      getNowPlayingGame(),
    ]);

  // Rendered once on the server so the banner is in the first paint and works
  // without scripting; the component polls from there.
  let initialNowPlaying: NowPlayingPayload = null;
  if (nowGame) {
    const grid = await halftone(nowGame.cover, 44, 21, { invert: true });
    initialNowPlaying = {
      title: nowGame.title,
      url: nowGame.url,
      cols: 44,
      rows: 21,
      cells: grid ? grid.cells.map((c) => Math.round(c * 100) / 100) : [],
    };
  }

  const lb = LETTERBOXD_USER;
  const bl = BACKLOGGD_USER;
  const fm = LASTFM_USER;
  const track = music.status === "ok" ? music.items[0] : undefined;
  const recentTracks = music.status === "ok" ? music.items.slice(1) : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
      <header className="mb-20 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-5">
        <h1 className="text-3xl font-medium lowercase tracking-[-0.045em] sm:text-4xl">wasserstiefel</h1>
        <p className="text-[10px] leading-[1.7] tracking-[0.12em] text-ink-soft">
          watched · played · heard
          <br />
          an index, updated automatically
        </p>
      </header>

      <NowPlayingBanner initial={initialNowPlaying} />

      <div className="flex flex-col gap-20">
        <Section index="01" title="now" href={fm ? `https://www.last.fm/user/${fm}` : undefined}>
          <div className="flex flex-col gap-10">
            {track && (
              <a href={track.url ?? "#"} className="group flex items-start gap-7">
                {track.artwork && (
                  <AsciiImage src={track.artwork} cols={26} rows={26} label={`${track.title} cover`} className="shrink-0 text-[6px] text-ink" />
                )}
                <span className="min-w-0">
                  <span className="block text-[10px] tracking-[0.18em] text-ink-soft">music</span>
                  <span className="mt-1 block text-lg font-medium tracking-[-0.02em] group-hover:underline">
                    {track.title}
                  </span>
                  <span className="mt-1 block text-[12px] text-ink-soft">{track.artist}</span>
                  <span className="mt-3 block text-[10px] tracking-[0.14em] text-ink-soft">
                    {track.nowPlaying ? "▪ playing now" : track.playedAt ? <LocalTime iso={track.playedAt} /> : "recently"}
                  </span>
                </span>
              </a>
            )}

            {recentTracks.length > 0 && (
              <div>
                <h3 className="mb-2 text-[10px] tracking-[0.18em] text-ink-soft">before that</h3>
                <ol>
                  {recentTracks.map((t, i) => (
                    <li key={`${t.playedAt ?? i}-${t.title}`} className="border-b border-rule first:border-t">
                      <a
                        href={t.url ?? "#"}
                        className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-2.5"
                      >
                        <span className="min-w-0 truncate text-[12px] tracking-[-0.01em]">
                          <span className="group-hover:underline">{t.title}</span>
                          <span className="text-ink-soft"> — {t.artist}</span>
                        </span>
                        <span className="text-right text-[10px] tabular-nums text-ink-soft">
                          {t.playedAt ? <LocalTime iso={t.playedAt} /> : "—"}
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!track && (
              <p className="text-[11px] text-ink-soft">
                {music.status === "unconfigured"
                  ? `not configured — ${music.message}`
                  : "nothing scrobbled yet"}
              </p>
            )}
          </div>
        </Section>


        <Section
          index="02"
          title="albums"
          result={albums}
        >
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
            {albums.status === "ok" &&
              albums.items.map((a) => (
                <li key={`${a.artist}-${a.title}`}>
                  <span className="block border border-rule bg-paper p-[3px]">
                    {a.cover ? (
                      <Reveal src={a.cover} alt={`${a.artist} — ${a.title}`}>
                        <HalftoneImage src={a.cover} cols={34} rows={34} label={a.title} className="w-full text-ink" />
                      </Reveal>
                    ) : (
                      <span className="flex aspect-square items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                        {a.title}
                      </span>
                    )}
                  </span>
                  <span className="mt-3 block text-[11px] leading-snug">{a.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-ink-soft">{a.artist}</span>
                  <span className="mt-1 flex items-center gap-2">
                    {a.year && <span className="text-[10px] tabular-nums text-ink-soft">{a.year}</span>}
                    <Rating value={a.rating} />
                  </span>
                </li>
              ))}
          </ul>
        </Section>

        <Section
          index="03"
          title="recently watched"
          href={lb ? `https://letterboxd.com/${lb}/films/diary/` : undefined}
          result={movies}
        >
          {/*
           * One layout, two shapes. Narrow screens read as a list - poster
           * beside its details, with the review folded in - so the films and
           * their writing are one thing rather than two sections saying the
           * same names twice. From sm it becomes the poster grid and the
           * reviews get their own section below.
           */}
          <ul className="grid grid-cols-1 gap-y-9 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-6">
            {movies.status === "ok" &&
              movies.items.map((m) => (
                <li key={m.url} className="group flex gap-5 sm:block">
                  <div className="relative w-[86px] shrink-0 sm:w-auto">
                    <a
                      href={m.url}
                      className="block border border-rule bg-paper p-[3px] transition-colors hover:border-ink"
                    >
                      {m.poster ? (
                        <Reveal src={m.poster} alt={m.title}>
                          <HalftoneImage src={m.poster} cols={30} rows={42} label={m.title} className="w-full text-ink" />
                        </Reveal>
                      ) : (
                        <span className="flex aspect-[2/3] items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                          {m.title}
                        </span>
                      )}
                    </a>
                    {m.review && (
                      /* On a phone the poster opens the writing rather than
                         leaving the page; dropped entirely from sm. */
                      <label
                        htmlFor={`m-${m.url.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`}
                        className="absolute inset-0 z-10 cursor-pointer sm:hidden"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 sm:mt-3">
                    <a href={m.url} className="block text-[11px] leading-snug tracking-[-0.01em] hover:underline">
                      {m.title}
                    </a>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] tabular-nums text-ink-soft">{m.year ?? "—"}</span>
                      <Rating value={m.rating} />
                    </span>
                    {m.review && (
                      <div className="sm:hidden">
                        <ReviewDisclosure movie={m} idPrefix="m" />
                      </div>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </Section>

        <Section
          index="04"
          title="reviews"
          className="hidden sm:block"
          href={lb ? `https://letterboxd.com/${lb}/films/reviews/` : undefined}
          result={reviews}
        >
          {reviews.status === "ok" &&
            (reviews.items.length === 0 ? (
              <p className="text-[11px] text-ink-soft">nothing written yet</p>
            ) : (
              <ul>
                {reviews.items.map((m) => (
                  <Review key={m.url} movie={m} />
                ))}
              </ul>
            ))}
        </Section>

        <Section
          index="05"
          title="favorite films"
          href={lb ? `https://letterboxd.com/${lb}/` : undefined}
          result={favFilms}
        >
          {favFilms.status === "ok" && <FavouriteGrid items={favFilms.items} />}
        </Section>


        <Section index="06" title="series">
          <div className="flex flex-wrap items-center gap-x-7">
            <input type="radio" name="series-tab" id="series-watching" defaultChecked className="peer/watching sr-only" />
            <input type="radio" name="series-tab" id="series-seen" className="peer/seen sr-only" />

            <label htmlFor="series-watching" className="cursor-pointer border-b border-transparent pb-1 text-[10px] tracking-[0.2em] text-ink-soft transition-colors hover:text-ink peer-checked/watching:border-ink peer-checked/watching:text-ink">
              watching
            </label>
            <label htmlFor="series-seen" className="cursor-pointer border-b border-transparent pb-1 text-[10px] tracking-[0.2em] text-ink-soft transition-colors hover:text-ink peer-checked/seen:border-ink peer-checked/seen:text-ink">
              finished
            </label>

            <div className="mt-9 hidden w-full peer-checked/watching:block">
              {watching.status === "ok" &&
                (watching.items.length === 0 ? (
                  <p className="max-w-[60ch] text-[11px] leading-relaxed text-ink-soft">nothing in progress — add series from /admin</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
                    {watching.items.map((s) => (
                      <li key={s.id}>
                        <a href={s.url} className="group block">
                          <span className="block border border-rule bg-paper p-[3px] transition-colors group-hover:border-ink">
                            {s.poster ? (
                              <Reveal src={s.poster} alt={s.title}>
                                <HalftoneImage src={s.poster} cols={30} rows={42} label={s.title} className="w-full text-ink" />
                              </Reveal>
                            ) : (
                              <span className="flex aspect-[2/3] items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                                {s.title}
                              </span>
                            )}
                          </span>
                          <span className="mt-3 block text-[11px] leading-snug group-hover:underline">{s.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2">
                            {s.year && <span className="text-[10px] tabular-nums text-ink-soft">{s.year}</span>}
                            <Rating value={s.rating} />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>

            <div className="mt-9 hidden w-full peer-checked/seen:block">
              {seenSeries.status === "ok" &&
                (seenSeries.items.length === 0 ? (
                  <p className="max-w-[60ch] text-[11px] leading-relaxed text-ink-soft">nothing finished yet — add series from /admin</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
                    {seenSeries.items.map((s) => (
                      <li key={s.id}>
                        <a href={s.url} className="group block">
                          <span className="block border border-rule bg-paper p-[3px] transition-colors group-hover:border-ink">
                            {s.poster ? (
                              <Reveal src={s.poster} alt={s.title}>
                                <HalftoneImage src={s.poster} cols={30} rows={42} label={s.title} className="w-full text-ink" />
                              </Reveal>
                            ) : (
                              <span className="flex aspect-[2/3] items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                                {s.title}
                              </span>
                            )}
                          </span>
                          <span className="mt-3 block text-[11px] leading-snug group-hover:underline">{s.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2">
                            {s.year && <span className="text-[10px] tabular-nums text-ink-soft">{s.year}</span>}
                            <Rating value={s.rating} />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          </div>
        </Section>

        <Section
          index="07"
          title="played"
          href={bl ? `https://backloggd.com/u/${bl}/` : undefined}
          result={games}
        >
          {/*
           * Radios rather than state: the panels are server-rendered and swap
           * in CSS, so there is no flash of the wrong tab before hydration
           * and it still works with scripting off.
           */}
          <div className="flex flex-wrap items-center gap-x-7">
            <input type="radio" name="games-tab" id="games-recent" defaultChecked className="peer/recent sr-only" />
            <input type="radio" name="games-tab" id="games-finished" className="peer/finished sr-only" />

            <label htmlFor="games-recent" className="cursor-pointer border-b border-transparent pb-1 text-[10px] tracking-[0.2em] text-ink-soft transition-colors hover:text-ink peer-checked/recent:border-ink peer-checked/recent:text-ink">
              recent
            </label>
            <label htmlFor="games-finished" className="cursor-pointer border-b border-transparent pb-1 text-[10px] tracking-[0.2em] text-ink-soft transition-colors hover:text-ink peer-checked/finished:border-ink peer-checked/finished:text-ink">
              finished
            </label>

            <div className="mt-9 hidden w-full peer-checked/recent:block">
            {/*
             * The most recent few get their covers shown, the rest stay a list.
             * A full grid would bury the dates, and a full list would waste the
             * artwork the halftone treatment is for.
             */}
            {games.status === "ok" && (
              <>
                {/* Capped so three covers don't outweigh the films above, which
                    sit six across and are the smaller cards. */}
                <ul className="mb-10 grid grid-cols-3 gap-x-5 gap-y-6 sm:max-w-[34rem]">
                  {games.items.slice(0, 3).map((g) => (
                    <li key={`card-${g.title}`}>
                      <a href={g.url ?? "#"} className="group block">
                        <span className="block border border-rule bg-paper p-[3px] transition-colors group-hover:border-ink">
                          {g.cover ? (
                            <Reveal src={g.cover} alt={g.title}>
                              <HalftoneImage src={g.cover} cols={30} rows={42} label={g.title} className="w-full text-ink" />
                            </Reveal>
                          ) : (
                            <span className="flex aspect-[2/3] items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                              {g.title}
                            </span>
                          )}
                        </span>
                        <span className="mt-3 block text-[11px] leading-snug tracking-[-0.01em] group-hover:underline">
                          {g.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-baseline gap-x-3">
                          <span className="text-[10px] tabular-nums text-ink-soft">{when(g.playedAt)}</span>
                          {g.platform && (
                            <span className="text-[10px] tracking-[0.12em] text-ink-soft">{g.platform}</span>
                          )}
                          <Rating value={g.rating} />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>

                <ul>
                  {games.items.slice(3).map((g) => (
                    <li key={`${g.title}-${g.playedAt}`} className="border-b border-rule first:border-t">
                      <a
                        href={g.url ?? "#"}
                        className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 sm:grid-cols-[1fr_7rem_3rem_4.5rem]"
                      >
                        <span className="truncate text-[13px] tracking-[-0.01em] group-hover:underline">{g.title}</span>
                        <span className="hidden text-[10px] tracking-[0.12em] text-ink-soft sm:block">
                          {g.platform ?? ""}
                        </span>
                        <span className="hidden sm:block">
                          <Rating value={g.rating} />
                        </span>
                        <span className="text-right text-[10px] tabular-nums text-ink-soft">{when(g.playedAt)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            </div>

            <div className="mt-9 hidden w-full peer-checked/finished:block">
              {finished.status === "ok" &&
                (finished.items.length === 0 ? (
                  <p className="max-w-[60ch] text-[11px] leading-relaxed text-ink-soft">
                    nothing marked finished yet — add entries to src/data/games.json with
                    <span className="text-ink"> &quot;status&quot;: &quot;completed&quot;</span>. a
                    <span className="text-ink"> &quot;slug&quot;</span> from a backloggd game url is
                    enough; the title, year and cover are fetched from it.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
                    {finished.items.map((g) => (
                      <li key={`fin-${g.title}`}>
                        <a href={g.url ?? "#"} className="group block">
                          <span className="block border border-rule bg-paper p-[3px] transition-colors group-hover:border-ink">
                            {g.cover ? (
                              <Reveal src={g.cover} alt={g.title}>
                                <HalftoneImage src={g.cover} cols={30} rows={42} label={g.title} className="w-full text-ink" />
                              </Reveal>
                            ) : (
                              <span className="flex aspect-[2/3] items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                                {g.title}
                              </span>
                            )}
                          </span>
                          <span className="mt-3 block text-[11px] leading-snug group-hover:underline">{g.title}</span>
                          <span className="mt-1 flex items-center gap-2">
                            {g.playedAt && <span className="text-[10px] tabular-nums text-ink-soft">{when(g.playedAt)}</span>}
                            <Rating value={g.rating} />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          </div>
        </Section>

        <Section
          index="08"
          title="favorite games"
          href={bl ? `https://backloggd.com/u/${bl}/` : undefined}
          result={favGames}
        >
          {favGames.status === "ok" && <FavouriteGrid items={favGames.items} />}
        </Section>
      </div>

      <footer className="mt-24 border-t border-rule pt-5 text-[10px] tracking-[0.12em] text-ink-soft">
        posters rendered as halftone grids from source artwork
      </footer>
    </main>
  );
}
