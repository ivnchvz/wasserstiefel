import { getRecentMovies } from "@/lib/letterboxd";
import { getRecentGames } from "@/lib/games";
import { getLastTrack } from "@/lib/music";
import type { SectionResult } from "@/lib/types";

// Sections revalidate on their own clocks; the shell is static.
export const revalidate = 60;

function stars(rating: number | null): string | null {
  if (rating === null) return null;
  return "★".repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? "½" : "");
}

function when(date: string | null): string | null {
  if (!date) return null;
  // A bare YYYY-MM-DD parses as UTC midnight, which renders as the previous
  // day anywhere west of Greenwich - pin those to local time instead.
  const local = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Section({
  title,
  href,
  result,
  children,
}: {
  title: string;
  href?: string;
  result: SectionResult<unknown>;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <h2 className="mb-4 flex items-baseline gap-3 text-sm font-medium uppercase tracking-widest text-neutral-400">
        {title}
        {href && (
          <a href={href} className="text-xs normal-case tracking-normal text-neutral-600 hover:text-neutral-300">
            profile ↗
          </a>
        )}
      </h2>
      {result.status === "ok" ? (
        children
      ) : (
        <p className="text-sm text-neutral-500">
          {result.status === "unconfigured" ? "Not set up yet — " : "Unavailable — "}
          <span className="text-neutral-600">{result.message}</span>
        </p>
      )}
    </section>
  );
}

export default async function Home() {
  // Fetched together so a slow upstream doesn't serialise the others.
  const [movies, games, music] = await Promise.all([
    getRecentMovies(6),
    getRecentGames(6),
    getLastTrack(),
  ]);

  const letterboxdUser = process.env.LETTERBOXD_USERNAME;
  const backloggdUser = process.env.BACKLOGGD_USERNAME;
  const track = music.status === "ok" ? music.items[0] : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-neutral-950 px-6 py-20 text-neutral-100">
      <header className="mb-16">
        <h1 className="text-2xl font-semibold tracking-tight">wasserstiefel</h1>
        <p className="mt-2 text-sm text-neutral-500">What I&apos;ve been watching, playing and listening to.</p>
      </header>

      <Section
        title="Now playing"
        href={process.env.LASTFM_USERNAME ? `https://www.last.fm/user/${process.env.LASTFM_USERNAME}` : undefined}
        result={music}
      >
        {track ? (
          <a href={track.url ?? "#"} className="group flex items-center gap-4">
            {track.artwork && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={track.artwork} alt="" className="h-16 w-16 rounded object-cover" />
            )}
            <span>
              <span className="block font-medium group-hover:underline">{track.title}</span>
              <span className="block text-sm text-neutral-400">{track.artist}</span>
              <span className="block text-xs text-neutral-600">
                {track.nowPlaying ? "● playing now" : when(track.playedAt) ?? "recently"}
              </span>
            </span>
          </a>
        ) : (
          <p className="text-sm text-neutral-500">Nothing scrobbled yet.</p>
        )}
      </Section>

      <Section
        title="Recently watched"
        href={letterboxdUser ? `https://letterboxd.com/${letterboxdUser}/films/diary/` : undefined}
        result={movies}
      >
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {movies.status === "ok" &&
            movies.items.map((m) => (
              <li key={m.url}>
                <a href={m.url} className="group block">
                  {m.poster ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.poster}
                      alt={m.title}
                      className="aspect-[2/3] w-full rounded object-cover transition group-hover:opacity-80"
                    />
                  ) : (
                    <span className="flex aspect-[2/3] w-full items-center justify-center rounded bg-neutral-900 p-2 text-center text-xs text-neutral-500">
                      {m.title}
                    </span>
                  )}
                  <span className="mt-1.5 block truncate text-xs text-neutral-400" title={m.title}>
                    {m.title}
                  </span>
                  <span className="block text-xs text-amber-500">{stars(m.rating) ?? " "}</span>
                </a>
              </li>
            ))}
        </ul>
      </Section>

      <Section
        title="Recently played"
        href={backloggdUser ? `https://backloggd.com/u/${backloggdUser}/` : undefined}
        result={games}
      >
        <ul className="divide-y divide-neutral-900 border-y border-neutral-900">
          {games.status === "ok" &&
            games.items.map((g) => (
              <li key={g.title} className="flex items-baseline justify-between gap-4 py-3">
                <a href={g.url ?? "#"} className="truncate font-medium hover:underline">
                  {g.title}
                </a>
                <span className="flex shrink-0 items-baseline gap-3 text-xs text-neutral-500">
                  {g.platform && <span>{g.platform}</span>}
                  <span className="text-amber-500">{stars(g.rating)}</span>
                  <span>{when(g.playedAt)}</span>
                </span>
              </li>
            ))}
        </ul>
      </Section>
    </main>
  );
}
