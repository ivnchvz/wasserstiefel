# wasserstiefel

Personal landing page aggregating what I've been watching, playing and listening to.

Next.js 16 (App Router) + TypeScript + Tailwind. Each source is an adapter in
`src/lib/` returning a `SectionResult`, so a dead upstream degrades that one
section instead of blanking the page.

## Setup

```bash
cp .env.example .env.local   # fill in the values below
npm install
npm run dev
```

## The three sources

### Favourites and "now"

**Favourite films** come from the Letterboxd member profile, whose four picks
sit in a `#favourites` section. The general `User-agent: *` rules there
disallow only sorting, genre, tag and friends paths, so the profile itself is
fair game. Posters on that page are lazy-loaded placeholders, so the real 2:3
artwork is read from each film page's JSON-LD `image` (`og:image` is a
landscape crop and the wrong shape).

**Favourite games** come from the Backloggd profile, which serves normally and
carries the four picks with IGDB cover art. Only Backloggd's *sub*-pages sit
behind the proof-of-work wall — nothing here works around it, and if the
profile is ever closed off too, the section degrades to empty.

**Now playing (game)** uses Steam's `GetPlayerSummaries`, which includes
`gameextrainfo` only while a game is actually running — its presence *is* the
signal. Cached 45s, the one genuinely live thing on the page.

Both favourites lists cache for 24h.

### Letterboxd — working, no key needed

Letterboxd publishes every member's diary at `letterboxd.com/<user>/rss/`, with
`letterboxd:` extension fields for title, year, rating, watched date and rewatch
flag, plus the poster in the description. Set `LETTERBOXD_USERNAME` and it works.
Cached for 1 hour.

### Last.fm — the route to "last song on Apple Music"

Apple Music has no public endpoint a third party can poll for your recently
played tracks. Its MusicKit API needs a Music User Token that is tied to a
signed-in listener and expires, which a static site can't hold onto.

The durable approach is to scrobble Apple Music into Last.fm and read Last.fm's
open API, which is what this does. Scrobblers: **Marvis Pro** (iOS),
**NepTunes** (macOS), **Cider**. Then set `LASTFM_USERNAME` and `LASTFM_API_KEY`
(free key: https://www.last.fm/api/account/create). Cached for 60s so
"now playing" stays live.

### Games — Steam, plus a manual list for everything else

Backloggd has no public API and no RSS. Its `robots.txt` disallows automated
agents outright, and its pages sit behind an [Anubis](https://anubis.techaro.lol)
proof-of-work wall. Getting at that data programmatically would mean working
around an access control the operator put there on purpose, so games come from
two sources that get merged:

**Steam** (`src/lib/steam.ts`) — set `STEAM_API_KEY`
([get one](https://steamcommunity.com/dev/apikey)) and `STEAM_ID`, which takes
either a SteamID64 or your vanity URL name. **Your profile's game details must
be set to Public** or the API returns nothing. Cached 30 min.

This calls `GetOwnedGames` rather than `GetRecentlyPlayedGames`, because only
the former returns `rtime_last_played`. The recently-played endpoint sorts by
two-week playtime and carries no date, so its rows can't share a timeline with
manual entries.

**`src/data/games.json`** — for Switch, PlayStation, and anything Steam can't
see:

```json
[{ "title": "Hollow Knight: Silksong", "platform": "Switch", "rating": 4.5, "playedAt": "2026-09-07", "url": "..." }]
```

Only `title` is required. On a title clash the manual entry wins, since those
carry a rating and Steam never does. If the Steam key breaks, the manual list
still renders on its own.

**Finished games** are the entries in `games.json` marked
`"status": "completed"`, shown under the *finished* tab. Every Backloggd page
that lists a member's shelves is behind the wall, so this one is kept by hand -
but an entry only needs the slug from a Backloggd game URL:

```json
[{ "slug": "outer-wilds", "status": "completed", "rating": 5, "playedAt": "2026-06-14" }]
```

Per-game pages *do* serve, so the title, year and cover art are read from
`backloggd.com/games/<slug>/` and cached for a week. Anything written out by
hand wins over the lookup, so a personal rating or platform is never
overwritten.

`BACKLOGGD_USERNAME` is used only to link out to the profile.

## /admin

A local page for logging games without editing JSON by hand. Search runs
against Backloggd's own search endpoint - which answers normally, unlike the
member pages - so results carry the slug, cover and year straight from the
source `games.json` already uses. Clicking a status writes the entry and
revalidates the homepage.

`src/data/games.json` is read from disk at request time rather than imported,
so an admin write shows up on the next render instead of waiting for a build.

**It writes to a file in the repo, so it only works where that file is
writable - locally.** On a serverless deploy the filesystem is read-only and
ephemeral, so admin edits there would silently vanish. The options when this is
deployed are to keep using admin locally and commit the file, or to move writes
to the GitHub API (commit from the route) or a database.

The routes are open in development and refuse in production unless
`ADMIN_PASSWORD` is set and sent as `x-admin-password`.
