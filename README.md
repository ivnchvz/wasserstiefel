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

## Series

`src/data/series.json`, logged from `/admin`. Letterboxd doesn't cover
television and Backloggd is games-only, so series come from
[TVmaze](https://www.tvmaze.com/api), which is open and needs no key.

Entries store a TVmaze id and whatever is personal to them; the title, year and
artwork are looked up and cached for a week:

```json
[{ "id": 156, "title": "Twin Peaks", "status": "watching", "watchedAt": "2026-09-10" }]
```

Statuses are `watching`, `completed`, `dropped` and `paused`; the section shows
the first two under its tabs.

## Albums

RateYourMusic can't be read automatically: its robots.txt opens by prohibiting
"any kind of automated means (e.g. crawling, scraping, etc) of access to the
service without express permission", and profiles sit behind a Cloudflare
challenge — `/~user` answers 403.

Albums come from two places, merged:

- **`src/data/albums.json`** - logged from `/admin`, searching the iTunes
  catalogue. Rate one out of five and it's stored with its artwork.
- **`src/data/rym-ratings.csv`** - the back catalogue. RYM lets members export
  their own ratings: download yours from
  **rateyourmusic.com/user_albums_export/** and save it under that name. The
  section reads it directly, no reformatting.

An album logged from admin wins over the same album in the export, being the
later judgement. Neither is required - the section works with either alone.

Columns are matched by header name rather than position, so export changes are
survivable, and RYM's 1-10 half-star scale is halved to match the star ratings
used elsewhere. Unrated rows (`0`) are skipped. Cover art is looked up from the
iTunes Search API, which needs no key — a few releases aren't in its index, and
those fall back to a titled placeholder.

## Gallery

Section 09, with two tabs, both filled from `/admin`.

**Images** are either linked (`src/data/gallery-images.json` stores the URL)
or uploaded. A link is checked before it's saved, since the usual mistake is
pasting the address of the page an image sits on rather than the image itself.
Uploads are written to `public/gallery/`, re-encoded on the way in: rotated
upright, downscaled to 1600px on the long edge, flattened onto the paper
colour, and **stripped of all metadata** - phone photos carry GPS coordinates,
and this repository is public. They're named by content hash, and removing one
in admin deletes its file.

Halftones in the gallery follow each image's own proportions rather than the
2:3 of posters, laid out in columns so nothing is cropped.

**Reels** store only an Instagram shortcode. The page shows a paper tile; the
official Instagram embed is loaded into an overlay only when it's clicked, and
removed when it closes. Nothing is requested from Instagram before that - a
visitor who never opens a reel never contacts it (opening one makes around 40
requests). The player reports its own height, which sizes the overlay exactly.
No media is extracted from Instagram: its image URLs are signed and expire
within days, and the embed is the sanctioned way to show a post.

Uploads have the same limit as the rest of admin - they only persist where the
repository is writable, so add them locally and commit.

## /admin

Logs games, series, albums and the gallery without editing JSON by hand.

**Locally** (`npm run dev`) it's open and writes straight to the files in
`src/data/` and `public/gallery/` - commit them to publish.

**On the live site** it needs a login, and saves become **commits** made through
the GitHub API: Vercel deploys every push, so a change shows up about a minute
after saving, and git stays the single record of everything. An upload and its
list entry are one commit; removing an upload deletes its file in the same
commit. If two saves race, the second is re-applied on top of the first rather
than overwriting it.

To turn it on, set two variables in Vercel (Project → Settings → Environment
Variables → Production), then redeploy:

- `ADMIN_PASSWORD` - long and random. The login page is on a public URL; wrong
  guesses are slowed, but the password is the real defence. Changing it signs
  out every session.
- `GITHUB_TOKEN` - a **fine-grained** token limited to this repository, with
  **Contents: Read and write** and nothing else. Create it at
  github.com/settings/personal-access-tokens/new.

Sessions are a signed, HTTP-only cookie lasting 30 days. Without
`ADMIN_PASSWORD` admin stays shut; without `GITHUB_TOKEN` it opens but says
saving is unavailable, rather than failing against Vercel's read-only disk.
