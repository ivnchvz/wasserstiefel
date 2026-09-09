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

### Backloggd — read from `src/data/games.json`

Backloggd has no public API and no RSS. Its `robots.txt` disallows automated
agents outright, and its pages sit behind an [Anubis](https://anubis.techaro.lol)
proof-of-work wall. Getting at the data programmatically would mean working
around an access control the operator put there on purpose, so this reads a
small file in the repo instead:

```json
[{ "title": "Blue Prince", "platform": "PC", "rating": 5, "playedAt": "2026-08-30", "url": "..." }]
```

`playedAt` sorts the list (newest first); `rating`, `platform`, `url` and `cover`
are all optional. `BACKLOGGD_USERNAME` is used only to link out to the profile.

Swapping in a real feed later means replacing `getRecentGames` in
`src/lib/games.ts` and nothing else — Steam's Web API
(`GetRecentlyPlayedGames`) is the obvious candidate if the library lives there.
