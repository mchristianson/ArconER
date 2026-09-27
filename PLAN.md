# ArconEr Cup — Site Plan

Annual Ryder Cup–style golf weekend, Hayward WI, since 2001. Team **Arcon** vs Team **ER Systems / 838 Coatings**, ~8 per side.
Site = history archive + next-year planning + photo/memory collection. Used heavily ~Aug–Oct, idle otherwise.

## Decisions (from Q&A)

| Topic | Decision |
|---|---|
| Visibility | Public read. Login (Google) required to post. |
| Posting rights | Anyone can sign in; admin links account → player (or approves) before they can post. |
| Admins | Matt Christianson (seeded by email `christianson.matt@gmail.com`) + Patrick McKinney (promoted in admin UI after first login). |
| Team name | Per-year: "ER Systems" 2001–2011, "838 Coatings" 2012+. Stored as `tournaments.team2_name`. |
| URL | https://arconer.vercel.app (no custom domain). Repo: github.com/mchristianson/ArconER |
| Scoring | No live scoring on site. Group already uses **Golf GameBook** (Reds vs Blues mode) on course. GameBook has no export/API → admin enters final results after; year page links to GameBook event (`tournaments.gamebook_url`). |
| Missing history | Memories wall per year (comments) **+** "suggest an edit" queue admins approve into the official record. 2001–2013 winners unknown → those year pages show a "Do you remember this one?" prompt asking players to comment and upload photos. |
| Planning | Event info page (dates, lodging, courses, tee times), RSVP, homepage countdown. No cost tracking (use Splitwise). |
| Photos | EXIF date → auto-select year. No EXIF → uploader picks year. Tag players in photos. |
| Players | Career record/points, photo gallery via tags, admin-editable bio/nickname. |
| Look | Classic Ryder Cup: serif display type, cream paper, crest logo, big team-score scoreboard. **Arcon = red** (`#C8102E`), **838 = blue** (`#003C71`) — mirrors real Ryder Cup USA/Europe. Neutral: navy ink, fairway green `#1F5130` accents only, gold `#C9A227` for trophy/winner marks. No Packers colors. |

## Existing tools considered

- **CupTracker** (cuptracker.com) — paid per event, live match play scoring. Not history/photos. Optional for live day-of.
- **SchenkTech/golf-trip** (GitHub, OSS) — Ryder-Cup buddies trip scoring PWA w/ all-time records. Borrow data-model ideas, not code (scope differs).
- **exifr** (npm) — browser EXIF reader, JPEG + HEIC. Use `exifr.parse(file, ['DateTimeOriginal'])`.
- **Supabase Auth** Google provider, **Supabase Storage** for photos, **Vercel** hosting.
- Build custom: nothing off-the-shelf covers history + photos + planning together.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind**, deployed to Vercel.
- **Supabase**: Postgres, Auth (Google), Storage (`photos` bucket), RLS for all permissions.
- `@supabase/ssr` for server components/auth cookies.
- `exifr` (lite build) client-side for photo date.
- HEIC: browsers other than Safari can't display HEIC → convert client-side to JPEG with `heic2any` before upload (EXIF read first). Resize to max 2400px client-side (canvas) to keep storage within free tier.
- No component library beyond a few hand-rolled components; shadcn only if forms get heavy.

## Data model (Postgres)

```
players        id, name, nickname, bio, photo_url, team_default ('arcon'|'838'|null), active
profiles       id (=auth.users.id), display_name, avatar_url, player_id → players, role ('pending'|'member'|'admin')
tournaments    year (PK), start_date, end_date, lodging, lodging_address, courses text,
               notes (markdown: "Famous Dave's fire", venue history), winner ('arcon'|'838'|'tie'|null),
               team2_name text,  -- 'ER Systems' | '838 Coatings'
               gamebook_url text
               arcon_points numeric, team838_points numeric, is_upcoming bool
roster         year → tournaments, player_id, team ('arcon'|'838'), is_captain
sessions       id, year, day_label ('Thursday'), format ('4-ball'|'2-man scramble'|'singles'|...), sort
matches        id, session_id, arcon_players uuid[], team838_players uuid[],
               front text, back text, total text,   -- '1 UP', '3 & 1', 'AS' as recorded
               arcon_pts numeric, team838_pts numeric
schedule_items id, year, starts_at, title, location, details   -- tee times, dinners
rsvps          year, player_id, status ('in'|'out'|'maybe'), note
photos         id, year, storage_path, taken_at (from EXIF, nullable), caption, uploaded_by, created_at
photo_tags     photo_id, player_id
comments       id, year, photo_id nullable, body, author, created_at      -- memories wall + photo comments
edit_suggestions id, year, field, proposed_value, reason, author, status ('open'|'approved'|'rejected'), reviewed_by
```

Views: `player_career` (years played, W-L-H, total points, best year) computed from `matches` + `roster`; `alltime` (cup wins per team).
Team totals on `tournaments` are stored (2014–2017 have winner only, no match detail) and recomputed from matches when detail exists.

### RLS summary
- `select`: public on everything except `profiles.role`/email columns.
- `insert` on `photos`, `photo_tags`, `comments`, `edit_suggestions`, `rsvps`: `role in ('member','admin')`; RSVP only for own `player_id`.
- `update/delete` own comments/photos; admins everything.
- Admin tables (`tournaments`, `roster`, `sessions`, `matches`, `players`, `schedule_items`): admin write only.
- Storage bucket `photos`: public read, member write to `photos/{year}/{uuid}.jpg`.
- Helper SQL fn `is_member()` / `is_admin()` reading `profiles.role`.

## Pages

| Route | Content |
|---|---|
| `/` | Hero: crest, **countdown** to next Cup, dates/lodging. Big scoreboard of last result. All-time series tally (Arcon X – 838 Y). Recent photos strip. |
| `/next` | Upcoming year: dates, lodging, courses, schedule/tee times, teams (if set), **RSVP** buttons, who's in. |
| `/history` | Timeline 2001 → now: year card w/ winner color band, score, venue, cover photo. Unknown years show "Help fill this in". |
| `/history/[year]` | Scoreboard, rosters side by side (red vs blue), sessions → match cards (Ryder Cup style: players left/right, result in middle colored by winner), notes, photo gallery, **memories wall**, "Suggest an edit". |
| `/players` | Grid of players w/ nickname, team, years. |
| `/players/[id]` | Bio, career stats table by year, tagged photos. |
| `/photos` | All photos, filter by year/player. Upload button (members). |
| `/upload` | Drag/drop multi-file → per file: EXIF date → preselected year (editable), caption, tag players → upload. |
| `/admin` | Tabs: Pending users (link to player/approve), Tournament editor (year info, roster, sessions/matches grid mirroring spreadsheet layout), Schedule, Players, Edit-suggestion queue, Moderation (delete photos/comments). |

## Photo upload flow

1. User selects files (accept `image/*,.heic`).
2. For each: `exifr.parse(file, ['DateTimeOriginal','CreateDate'])` → date → year. Tournament is in Sept; if date exists, pick `tournaments` row whose year matches (photos from any month of that year map to that year; flag if outside Aug–Oct as "maybe not from the trip?" hint).
3. No date → year dropdown, required.
4. HEIC → `heic2any` → JPEG; resize to ≤2400px; upload to Storage via supabase-js (RLS enforces member).
5. Insert `photos` row with `taken_at`, `year`, caption; insert `photo_tags`.

## Data import (one-time)

Script `scripts/import-xlsx.ts` (or Python) parses Patrick's workbook:
- 2014–2017 sheets: roster columns (Arcon / 838), "Winner" row, remaining rows → `notes`.
- 2018–2026 sheets: left block = team sessions (4-ball / scramble), pairs split on `/`, `vs` separates Arcon (top) vs 838 (bottom) pairs; points col. Right block = singles; roster/points table; "CUP TOTAL" → team points + winner.
- Player name normalization map (`Stelly`/`Stelman`, `Hough`/`Hougher`, `Matty`/`Matty Ice`/`Matt`, `Feldy`/`Feldman`) — reviewed by you before import.
- Seed 2001–2013 as empty tournament rows (team2_name = "ER Systems" ≤2011, "838 Coatings" 2012–2013). Year page + timeline card show "Do you remember this one? Share a memory or upload photos" CTA when winner is null.
- Dry-run mode prints parsed JSON for review; write mode upserts via service role key.

## Build phases

1. **Scaffold** — Next.js app, Tailwind theme tokens (red/blue/navy/cream, serif display font e.g. Playfair/Cormorant + Inter), Supabase project, schema migration + RLS, Google OAuth configured, Vercel deploy.
2. **Import** — xlsx parser, name map, dry run → review → load 2014–2026 + empty 2001–2013.
3. **History read side** — `/`, `/history`, `/history/[year]`, `/players`, `/players/[id]`, career view.
4. **Auth + roles** — Google sign-in, profile auto-create trigger (`role='pending'`), admin approve/link screen.
5. **Photos** — upload flow w/ EXIF, HEIC, resize, tagging; galleries on year/player/photos pages; lightbox.
6. **Community** — memories wall/comments, edit suggestions + admin queue.
7. **Planning** — `/next`, schedule, RSVP, countdown; admin tournament/roster/match editor.
8. **Polish** — crest logo (SVG), OG images per year for link sharing in group text, mobile pass, empty states.

## Setup you'll need to do

- Create Supabase project (or I do via MCP) + Vercel project; connect GitHub repo.
- Google Cloud OAuth client (redirect to Supabase callback URL).
- Vercel project named `arconer` → arconer.vercel.app.

## Costs

Free tiers should fit: Supabase free (1 GB storage ≈ 2–3k resized photos, 500 MB DB). **Note:** free Supabase projects pause after 7 days inactive — fine for off-season, but first visit in August needs a manual "restore" in dashboard, or upgrade to Pro ($25/mo) / add a weekly keep-alive cron (Vercel cron hitting a cheap query). Plan: Vercel cron keep-alive.
