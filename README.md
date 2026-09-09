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

`BACKLOGGD_USERNAME` is used only to link out to the profile.
