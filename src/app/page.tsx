import { getRecentMovies } from "@/lib/letterboxd";
import { getRecentGames } from "@/lib/games";
import { getNowPlayingGame } from "@/lib/steam";
import { getFavoriteFilms, getFavoriteGames } from "@/lib/favorites";
import { getLastTrack } from "@/lib/music";
import { HalftoneImage, AsciiImage } from "@/components/Halftone";
import { Reveal } from "@/components/Reveal";
import type { Favorite, SectionResult } from "@/lib/types";

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
  children,
}: {
  index: string;
  title: string;
  href?: string;
  result?: SectionResult<unknown>;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-4">
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
  const [movies, games, music, favFilms, favGames, nowGame] = await Promise.all([
    getRecentMovies(6),
    getRecentGames(8),
    getLastTrack(),
    getFavoriteFilms(),
    getFavoriteGames(),
    getNowPlayingGame(),
  ]);

  const lb = process.env.LETTERBOXD_USERNAME;
  const bl = process.env.BACKLOGGD_USERNAME;
  const fm = process.env.LASTFM_USERNAME;
  const track = music.status === "ok" ? music.items[0] : undefined;

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

      <div className="flex flex-col gap-20">
        <Section index="01" title="now" href={fm ? `https://www.last.fm/user/${fm}` : undefined}>
          <div className="flex flex-col gap-10">
            {nowGame && (
              <a href={nowGame.url} className="group flex items-center gap-6">
                <span className="w-[132px] shrink-0 border border-rule bg-paper p-[3px]">
                  <Reveal src={nowGame.cover} alt={nowGame.title}>
                    <HalftoneImage src={nowGame.cover} cols={44} rows={21} label={nowGame.title} className="w-full text-ink" />
                  </Reveal>
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] tracking-[0.18em] text-ink-soft">game</span>
                  <span className="mt-1 block text-lg font-medium tracking-[-0.02em] group-hover:underline">
                    {nowGame.title}
                  </span>
                  <span className="mt-2 block text-[10px] tracking-[0.14em] text-ink-soft">▪ playing now</span>
                </span>
              </a>
            )}

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
                    {track.nowPlaying ? "▪ playing now" : when(track.playedAt) ?? "recently"}
                  </span>
                </span>
              </a>
            )}

            {!nowGame && !track && (
              <p className="text-[11px] text-ink-soft">
                {music.status === "unconfigured"
                  ? `not configured — ${music.message}`
                  : "nothing playing right now"}
              </p>
            )}
          </div>
        </Section>

        <Section
          index="02"
          title="recently watched"
          href={lb ? `https://letterboxd.com/${lb}/films/diary/` : undefined}
          result={movies}
        >
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {movies.status === "ok" &&
              movies.items.map((m) => (
                <li key={m.url}>
                  <a href={m.url} className="group block">
                    <span className="block border border-rule bg-paper p-[3px] transition-colors group-hover:border-ink">
                      {m.poster ? (
                        <Reveal src={m.poster} alt={m.title}>
                          <HalftoneImage src={m.poster} cols={30} rows={42} label={m.title} className="w-full text-ink" />
                        </Reveal>
                      ) : (
                        <span className="flex aspect-[2/3] items-center justify-center p-2 text-center text-[9px] text-ink-soft">
                          {m.title}
                        </span>
                      )}
                    </span>
                    <span className="mt-3 block text-[11px] leading-snug tracking-[-0.01em] group-hover:underline">
                      {m.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] tabular-nums text-ink-soft">{m.year ?? "—"}</span>
                      <Rating value={m.rating} />
                    </span>
                  </a>
                </li>
              ))}
          </ul>
        </Section>

        <Section
          index="03"
          title="favorite films"
          href={lb ? `https://letterboxd.com/${lb}/` : undefined}
          result={favFilms}
        >
          {favFilms.status === "ok" && <FavouriteGrid items={favFilms.items} />}
        </Section>

        <Section
          index="04"
          title="recently played"
          href={bl ? `https://backloggd.com/u/${bl}/` : undefined}
          result={games}
        >
          <ul>
            {games.status === "ok" &&
              games.items.map((g) => (
                <li key={`${g.title}-${g.playedAt}`} className="border-b border-rule first:border-t">
                  <a href={g.url ?? "#"} className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 sm:grid-cols-[1fr_7rem_3rem_4.5rem]">
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
        </Section>

        <Section
          index="05"
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
