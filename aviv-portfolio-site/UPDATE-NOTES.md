# Site update: desktop redesign

This zip is the full source of the portfolio site (Next.js), updated with a new
desktop-style interface. Copy it over the existing project, then follow the
steps below. Nothing here touches content: the photos/films in Vercel Blob are
read the same way as before.

## URGENT: why the admin is read-only (found, Oct 7)

**Cause: the Blob store is suspended for going over the Hobby plan's free usage.**
In Aviv's Vercel account (team `crispyisland`, project `site`) the store
`crispyisland-content` shows **status: limits-exceeded-suspended** since
**Oct 1, 2026**. Nothing is lost (11 blobs, ~13 MB), but while it's suspended
the server can't read it, so `loadTree()` reports an error and the admin locks
itself on purpose.

Hobby includes only **2,000 Blob "advanced operations" a month** (every
`put()` and `list()`). The old code ran `list()` on **every page view**
(layout + page both called `getTree()`), and the visit counter did a `put()`
per visit. A few hundred visitors a month were enough.

**To get editing back, one of:**
- Vercel → Settings → Billing → **start the Pro trial / upgrade to Pro**. This
  lifts the cap right away. Aviv has to do this himself.
- Or wait. Vercel says a Hobby store unlocks ~30 days after the limit was hit
  (around Oct 31).

**This update stops it happening again** (see "Blob usage fix" below). Deploy
it either way; without it the store will hit the limit again next month.

**Optional:** to turn the private visit counter back on, add **Upstash for
Redis** from the Vercel Marketplace (free tier) to the project. It sets
`KV_REST_API_URL` / `KV_REST_API_TOKEN`, then redeploy. Without it the counter
is simply off (the About window says so to the admin).

## Before you deploy

1. **Delete these four files** from the existing project. They are no longer
   used, and the zip can't remove files on its own:
   - `components/FolderView.tsx`
   - `components/FilmDetail.tsx`
   - `components/PhotoPermalink.tsx`
   - `lib/view.ts`
2. `npm install` (no new packages were added; `package.json` is unchanged).
3. **Run `npm run build` and fix anything it reports.** This version was
   type-checked and click-tested in a stand-in environment, but has not been
   through a real `next build` yet.
4. `npm run dev` with `CONTENT_STORE=local` and click around: open folders,
   drag icons, open a photo, the About window, the music player, `/admin`.
5. In Vercel → Settings → Environment Variables, set **`ADMIN_PASSWORD_AVIV`**
   to the admin code Aviv gives you (it's the code for the hidden login box and
   for /admin). Redeploy after changing it.
6. Push to `main` as usual to deploy.
7. After deploy, Aviv uploads new photos himself through /admin (e.g. the
   35mm scans and the DARIACOOK SUMMER FESTIVAL set) — they are not in this zip.

Not included on purpose: `node_modules`, `.next`, `.env*` (keep your own),
`data/tree.local.json`, `public/uploads` (local-dev content), `.git`, `.vercel`.

## What changed

**Blob usage fix (newest).** Public pages no longer touch the Blob store on
every request:
- `lib/content.ts`: `getTree()` now reads through Next's Data Cache
  (`unstable_cache`, tag `content-tree`, refreshed once a day). `saveTree()`
  calls `revalidateTag('content-tree', { expire: 0 })`, so admin edits still go
  live on the next page load. If the store fails, public pages show the seed
  and back off for 5 minutes instead of retrying on every request.
  `loadTree()` (fresh, uncached) is now used only by `/admin` and saves.
- `app/api/admin/route.ts`: `GET` gives a fresh store read only to the signed-in
  admin; everyone else gets the cached tree.
- `lib/guestbook.ts`: the entry list is cached the same way (tag `guestbook`),
  invalidated when someone signs or an entry is deleted; delete no longer
  lists first.
- `lib/visits.ts`: no more Blob fallback. Counts only with Upstash Redis;
  otherwise off. `GET /api/visits` answers 501 `{off:true}` and
  `VisitCounter` explains it to the admin.
- Expected usage now: a few dozen advanced operations a month (admin opens and
  saves, uploads, guestbook posts), well inside Hobby.
- **Run `npm run build` before deploying.** These files were syntax-checked but
  not built here (`revalidateTag(tag, profile)` is the Next 16 two-argument
  form).


**Desktop interface.** `app/layout.tsx` now renders `components/desktop/Desktop.tsx`
around every page except `/admin`. Folders, photos, films, About, Search and
Get Info open as draggable, resizable windows; icons float and can be dragged
anywhere (arrangement saved per visitor in localStorage). Routes still work:
the URL always names the front window (`/photography/naval`, `/p/<id>`,
`/about`, `/search?q=`), updated with `history.pushState`. Pages now only supply
metadata / 404s and render `null`. New `app/not-found.tsx`.

**Pure tree queries** moved from `lib/content.ts` to `lib/tree-query.ts`
(re-exported from content.ts, so server imports are unchanged) so the client
can use them. `publicTree()` strips hidden folders before the tree is sent to
the browser.

**Pixel icon set.** Aviv's icons, cut from his two sheets, are in
`public/icons/*.png` (312 files); names in `lib/pix-icons.ts`, rendered by
`components/PixIcon.tsx` as CSS masks (they take the text colour).

**Custom icons (admin).** Folders and items have an optional `icon` field
(`lib/types.ts`, validated in `lib/normalize.ts`). In `/admin`, every folder
and file has an "Icon" button that opens `components/admin/IconPicker.tsx`.
Existing content without the field keeps its default icon.

**Media player.** `components/desktop/MediaPlayer.tsx` + `PlayerSkins.tsx`:
YouTube IFrame API player on the desktop, random song each visit, skins drawn
by Aviv (`public/skins/*.png`), S/M/L size. Playlist: `data/music.ts` — add
YouTube links there. Sound starts on the visitor's first click (browser rule).

**About window.** Name + "Crispy", Service/Education pixel badges
(`public/logos/badge-*.png`), contact list (now with TikTok), and Instagram /
TikTok panels (`components/desktop/SocialPortal.tsx`, config in
`data/socials.ts`; TikTok uses `public/embeds/tiktok-profile.html`).

**Other.** Nav tabs and toolbars use the pixel icons. The 3D smiley is no
longer on the desktop (component kept); `data/desktop.ts` holds an optional
centre graphic (none yet).

**Phone admin + robust uploads (second update).** `/admin` now picks a
phone layout (`components/admin/MobileAdmin.tsx`) or the computer layout via
`AdminShell.tsx`; each can switch to the other. Both share:
- `useAdminStore.ts`: saves send `{ tree, baseRev }`. `PUT /api/admin` returns
  409 + the latest tree if another device saved in between; the client replays
  its pending edits on top and retries. Edits made offline queue and send on
  reconnect. (Bare-tree PUTs from old clients still work.)
- Uploads go **straight from the browser to Vercel Blob** via the new
  `app/api/upload/client/route.ts` (`handleUpload`, admin-only token, image
  types, 200 MB cap, multipart over 8 MB) — this avoids Vercel's ~4.5 MB
  function body limit, so full-size phone originals work. HEIC is converted to
  full-res JPEG in the browser; width/height are stored. Local dev
  (`CONTENT_STORE=local`) still uses `/api/upload`.
  **Needs:** `BLOB_READ_WRITE_TOKEN` in the Vercel env (already used) — no new
  vars. Client uploads also need the Blob store to allow the site's domain
  (default on Vercel).
- `public/admin.webmanifest` lets the admin be added to a phone home screen.
- Photos inside a folder named `35mm` show film-strip icons by default.

**Admin tools + player fixes (third update).**
- Photos have an optional `rotate` (90 / 180 / 270, clockwise; `lib/types.ts`,
  kept by `lib/normalize.ts`). Set in the admin; the site turns the `<img>`
  with `.rot-*` classes (see "Rotated photos" in `globals.css`, uses CSS
  container units + `:has()`). The original file is never changed.
- Admin (both layouts): turn photos, drag to reorder photos and folders
  (`components/admin/useDragSort.ts`; on phones inside Reorder mode), select
  many → turn / move / tag / delete together, and Preview
  (`components/admin/PreviewPane.tsx`) — the folder drawn as visitors see it
  from the admin's current copy. New pure ops in `lib/tree-ops.ts`:
  `reorderItem`, `reorderFolder`, `moveItemsTo`, `tagItems`, `rotateItems`.
- Window title bars: the two plain squares are now real buttons with icons
  (close ×, make bigger / restore). The admin's corner square exits to the site.
- Player: if `youtube.com/iframe_api` is blocked (ad blockers, strict hosts)
  it falls back to `components/desktop/yt-lite.ts`, which drives a plain
  YouTube embed over postMessage. If YouTube can't be reached at all it says
  so instead of "Loading…" forever. Sizes are smaller: S 0.7 / M 0.85 / L 1.
- New default skin "Crispy Player" (`public/skins/crispy-blue.png`, high-res
  art). Skins can now declare a `screen` rect: the YouTube video then plays
  inside the drawn screen instead of the docked monitor (`skinLayout`), plus a
  live `progress` fill and title-bar close / size buttons.

**Playlists / mixes.** A link in `data/music.ts` with `&list=` (a playlist or
YouTube mix) plays the whole list when it comes up (`parseSong`); Next and
Previous step through it, then the player returns to the shuffle.

**Secret 90s page — "Crispy's Dungeon Layer".** New route `app/secret/page.tsx` (noindex) renders
`components/secret/SecretPage.tsx`; the desktop and nav step aside on
`/secret` (passthrough in `Desktop.tsx`, `NavBar.tsx`). On 1 in `ODDS` visits
(rolled once per tab session, `?secret` forces it) `SecretBubble.tsx` runs the
goblin GIF onto the desktop (`public/secret/troll-cutout.gif`) linking there. All content, odds, the GIF
and cursor live in `data/secret.ts`; assets in `public/secret/` (cursor pack "Bejeweled Red Swords" by Billy1905, public domain, in
`public/secret/cursor/`).

**DOS game: סוחר הים (Sochar HaYam).** Playable in the browser with js-dos
v8 (DOSBox in WebAssembly), loaded from `v8.js-dos.com` only when someone
presses Play (`components/desktop/DosPlayer.tsx`, config in `data/games.ts`).
The game is `public/games/sochar-hayam/sochar-hayam.jsdos` (the game files
plus `.jsdos/dosbox.conf`, whose autoexec loads the Hebrew font/keyboard TSRs
and runs `K.COM`). A desktop icon (the ship) opens `GameWindow` — tabs "Play"
and "Clothing"; the second shows the hoodie photos listed in `data/games.ts`
(`public/games/sochar-hayam/fashion/`) plus any photos in an admin folder with
slug `sochar-hayam`, and a "DM me on Instagram" button (ig.me link). Route: `/sochar-hayam` (`app/sochar-hayam/page.tsx`,
`routes.ts`). Aviv confirmed they have the rights to publish the game.

**Icons.** The browser-tab icon (`app/icon.png`, `app/apple-icon.png`) is
now Aviv's 3D pixel smiley — if the project also has an older
`app/favicon.ico`, delete it so it doesn't win. About / Instagram / TikTok
desktop icons are pictures in `public/desk/`.

**Hidden admin entrance.** On the About window, three quick clicks on
"Crispy" open a small code box (`components/desktop/SecretLogin.tsx`). It
posts `{ username: 'aviv', password: code }` to the existing
`/api/admin/login` and goes to /admin on success. **Set
`ADMIN_PASSWORD_AVIV` in Vercel to the code Aviv chose** (he'll give it to
you directly — it is not in the code). /admin itself still works as before.

**Events app.** New desktop icon "Events" → `windows/EventsWindow.tsx`: a
Cover Flow (`components/desktop/CoverFlow.tsx`, CSS 3D) of event posters;
clicking one shows the event's details and a Cover Flow of its photos
(click → full screen). Events are listed in `data/events.ts`; each points at
an admin folder by slug for its photos. Route `/events`. The same Cover Flow
is a fourth view mode in every folder window (`'flow'` in `useViewMode.ts`).

**Boot screen, TV, clients strip, guestbook, events in admin (latest).**
- `components/desktop/BootScreen.tsx` (+ `data/boot.ts`): 2 s fake loader with
  the Crispy Island logo, once per session; optional intro sound (`sound`).
- TV app: `windows/TvWindow.tsx` + `data/tv.ts` (VHS tapes = YouTube/Vimeo
  links; no link → static). Route `/tv`. Pauses the music player while playing.
  A tape can carry `art` (an image in `public/tv/`) instead of written text: it
  shows on the spine and on the TV screen until the tape gets a video
  ("TAPE EXCLUSIVE" uses this).
- About: "Worked with" scrolling logo strip (`ClientStrip.tsx`, `data/clients.ts`,
  logos go in `public/clients/`).
  Now holds 7 client logos; Peak Production moved to About → Service with its
  badge (`public/logos/badge-peak.png`).
- Instagram window has two account tabs (`SOCIALS.instagram.accounts` in
  `data/socials.ts`): @crispy1404 (main) and @crispy_textiles (clothing).
- Mini TV: `Window.tsx` takes an optional `mini` prop that adds a title-bar
  button to shrink the window into a small draggable box (content stays
  mounted, so a playing video keeps going). Used by the TV; styled via `.dwin.mini`.
- Music: starts by itself at 50% (`START_VOLUME` in `data/music.ts`); where the
  browser blocks sound it starts on the first click/key. A TV tape pauses it
  (`crispy:tv-play`), and `crispy:tv-stop` fires when the tape stops.
- Secret layer 2: **Crispy's Secret Pirate Port** at `/secret/pirate`
  (`app/secret/pirate/page.tsx`, `components/secret/PiratePage.tsx`, content in
  `data/pirate.ts`, GIFs in `public/secret/pirate/`). Reached from a "go deeper"
  link at the bottom of the dungeon page. No-index like /secret. Loads the
  Restyled flatter/90s (no web font any more); the Shipyard links go to
  BrickLink catalog pages.
  Has its own "Pirate Pack" cursors (`PIRATE_CURSORS` in `data/pirate.ts`,
  48px PNGs in `public/secret/pirate/cursor/`).
- Pirate pop-up: pressing Play on the DOS game fires `crispy:game-play`;
  `PirateBubble.tsx` then has a 1-in-2 chance (`PIRATE_POPUP` in `data/pirate.ts`)
  to drop the skull GIF onto the desktop 6 s later, linking to /secret/pirate.
  `?pirate` in the URL forces it. The goblin's drag/close logic moved into a
  shared `GifPopup` in `SecretBubble.tsx`.
- Dungeon guestbook: `components/secret/Guestbook.tsx`, API
  `app/api/guestbook/route.ts`, storage `lib/guestbook.ts` — one Vercel Blob per
  entry under `guestbook/` (no new env vars). Name + message, no login;
  honeypot field, length limits, per-IP rate limit. Signed-in admins see a
  delete button on each entry. Local dev uses `data/guestbook.local.json`
  (add it to .gitignore).
- Events are now part of the content tree (`Tree.events`, normalised in
  `lib/normalize.ts`) and edited in /admin → "Events" (`EventsEditor.tsx`):
  add / edit / reorder / delete, poster upload, pick the photo folder. Until
  the first edit, the bundled list in `data/events.ts` is shown. Note:
  `restoreDeleted`, `deleteFolder`, `deleteItems` and `publicTree` now spread
  `...tree` so the new field survives.

## First-visit guide (newest)

- A small stick-figure guide (`components/desktop/Guide.tsx`, text and settings
  in `data/guide.ts`, GIFs in `public/guide/`). Computers only. On a visitor's
  first visit (localStorage `guide:seen`), 5 s after the site opens he walks
  up in the bottom-left corner and says hi. Only if clicked does he do a short
  tour: he walks to the folders, the TV, the player etc. (positions found via
  the new `data-entry` attribute on desktop icons) and talks in speech bubbles
  with Next / × — he never blocks the page. Right-click the desktop → "Show the
  guide" brings him back; `?guide` in the URL forces him for testing.

## Change icons from the desktop

- Signed-in admins get **"Change Icon…"** when right-clicking a folder or a
  file on the desktop (or inside folder windows). It opens the same icon
  picker as /admin; on Done the change is saved through `PUT /api/admin`
  (`components/desktop/adminEdit.ts`: read latest tree → apply → save, retry
  once on a 409 conflict) and the desktop refreshes with `router.refresh()`,
  so the music keeps playing. Visitors never see the menu item, and the API
  checks the admin session anyway. (`DeskIconEditor.tsx`, `entries.tsx`,
  `editIcon` on `DesktopApi`.) Needs the admin read-only issue fixed to save.

## Admin in a new tab + pirate banner

- The desktop's Admin icon and the hidden code box now open /admin in a **new
  tab**, so the music keeps playing on the site. (`Desktop.tsx`,
  `SecretLogin.tsx` — the code box opens the tab on submit, before the
  password check, so pop-up blockers allow it; it closes again on a wrong
  code, and falls back to the same tab if pop-ups are blocked.)
- Pirate page: an old 468×60 "X marks the spot!" banner GIF between the page
  and the sea (`public/secret/pirate/banner-x-marks.gif`).

## Dungeon page: castle look

- `/secret` now has a 90s fantasy-castle / browser-MMO look: night castle
  behind, stone-framed dark panels, gold headings, a stone tab menu (Works /
  Archive / Guestbook / Go deeper), wizard + knight art, treasure chest, a
  little knight walking at the bottom. Pictures in `public/secret/castle/`.
- **Reversible**: `THEME` in `data/secret.ts` — `'castle'` (default) or
  `'classic'` for the original blue/goblin page. There's also a small
  "classic look / castle look" switch at the top right of the page
  (remembered per browser). All castle styling is scoped under `.s90.castle`.
- Castle title is static, in the pixel blackletter font **Jacquard 24**
  (Google Fonts, loaded by `SecretPage.tsx` only in the castle look).

## Game keys on phones

- `DosPlayer.tsx`: on touch screens / ≤700px, once the game runs, three 80s
  keycaps appear under the screen — YES (F / כ), NO (K / ל), ENTER — plus a
  tiny ESC key in the screen's corner. They send keys through js-dos's
  CommandInterface (`onEvent('ci-ready')` → `ci.sendKeyEvent`, codes F=70,
  K=75, Enter=257, Esc=256), falling back to synthetic keyboard events.
  Hidden on computers. Please test on a real phone.

## Default icon layout

- On computers the desktop icons now open in Aviv's arrangement
  (`DESK_LAYOUT` in `data/desktop.ts`, applied via the new `presets` prop on
  `FloatField`): a 2×3 block top-right (Cinema/Commercial, About/Photography,
  TV/Events), Instagram + TikTok bottom-left, סוחר הים bottom-right. Spots are
  measured from the edges, so they adapt to any screen size. Icons can still be
  dragged; "Clean Up" returns them here. Visitors who already dragged icons
  keep their own arrangement (localStorage) until they Clean Up.
- The music player now starts top-left (`.mp { top: 40px }`) instead of
  bottom-left. Phones unchanged.

## Phone fixes

- Phones (≤700px): the music player starts folded into a small bar at the
  bottom (logo, scrolling title, play/pause, next). Tapping the bar opens the
  full player; "▼ hide player" folds it again. The YouTube player stays
  mounted (moved off-screen) so music keeps playing. (`MediaPlayer.tsx`,
  `.mp.mobile.mini` / `.mp-pill` CSS.)
- Header on phones: the engraved smiley mark is hidden (`.nav-mark`), the logo
  is smaller and the four tabs share the width evenly (icons hidden under 440px).
- Desktop icons on phones: smaller cells (84×78), 44px pictures, one-line labels,
  and bottom padding so the player bar never covers them.
- Please check on a real iPhone and Android after deploy.

## Private visit counter

- When signed in as admin, the About window shows a small red LED "VISITS"
  counter (click it for today / this week / all time and a 14-day chart).
  Nobody else sees it; the numbers come from admin-only `GET /api/visits`.
- `VisitPing` (in `Desktop.tsx`) sends one `POST /api/visits` per browser tab
  session. Bots (by user agent) and the signed-in admin aren't counted. No IP,
  email or cookie is stored — only a count per day. (Visitors don't sign in,
  so there's no way to see who they are, and we don't try.)
- Storage (`lib/visits.ts`): if `KV_REST_API_URL` + `KV_REST_API_TOKEN` exist
  (Vercel Marketplace → **Upstash for Redis**, free tier), it uses atomic
  INCR — **recommended**. Without them it falls back to one tiny Vercel Blob
  per visit under `visits/<day>/`, counted by listing, which uses a Blob write
  per visit — fine for low traffic, but connect Upstash if the site gets busy.
- Local dev: `data/visits.local.json` (gitignored).

## TV channels in the admin + tab title

- Browser tab now says **Crispy Island** (`app/layout.tsx`); every page title
  ends in "— Crispy Island" instead of "— Aviv Shmuelof".
- TV channels moved into the content tree (`Tree.tv = { tapes: TvTape[] }`,
  types in `lib/types.ts`, normalised in `lib/normalize.ts`). Edited in /admin →
  **TV** (`components/admin/TvEditor.tsx`, both layouts): add/reorder/delete
  channels, name/colour, play order (in order / shuffle), videos as YouTube or
  Vimeo links or uploaded files. Until the first edit, `data/tv.ts` is used.
- `TvWindow.tsx` plays a channel's videos one after another and loops; a
  shuffled channel reshuffles each loop. End-of-video detection: YouTube via
  postMessage (`enablejsapi=1`), Vimeo via its `finish` event, files via
  `<video onEnded>`. New ⏭ knob skips to the next video.
- Uploads now accept video (mp4/webm/mov) up to 1 GB through the client
  upload route (`app/api/upload/client/route.ts`, `prepareVideo` in
  `components/admin/uploads.ts`). Photo uploads are unchanged.

## Green ticker under the menu

- `components/Ticker.tsx` (mounted in `app/layout.tsx` under `<NavBar />`):
  NYSE-style green LED strip. Text comes from the content tree
  (`Tree.ticker = { on, messages[] }`, normalised in `lib/normalize.ts`) and is
  edited in /admin → **Ticker** (`components/admin/TickerEditor.tsx`, both admin
  layouts). With no messages it shows placeholder stock quotes from
  `data/ticker.ts` whose prices drift (simulated, not market data). Speed and
  direction are in `data/ticker.ts`. Hidden on /secret and /admin.
- `Desktop.tsx` now places the desktop under the ticker too (`--desk-top`).
- Needs the admin's read-only problem above fixed before messages can be saved.

## Things to check after deploy

- A song plays after the first click on the live site (YouTube links in
  `data/music.ts`; a video whose owner blocks embedding shows "This video
  can't play here").
- The TikTok panel loads the @crispy_island profile.
- `/admin` icon picker saves.
- On a phone: sign in at /admin, upload a large photo (10 MB+) and an iPhone
  HEIC, rename a folder, delete a photo and tap Undo.
- Open /sochar-hayam, press PLAY: DOS boots and the game starts (Hebrew
  text readable, keyboard works). Adjust `cycles` in the bundle's
  `.jsdos/dosbox.conf` if it runs too fast or slow.
- Sign the guestbook on /secret, reload: the entry is still there.
- /admin → Events: edit an event, reload the site, the Events app shows it.
- Open the site with `?secret` and click the yellow bubble; /secret loads.
- Turn a photo in /admin and check it shows turned on the site (grid, photo
  window, Quick Look). Drag-reorder on a phone (Reorder mode) and a computer.
