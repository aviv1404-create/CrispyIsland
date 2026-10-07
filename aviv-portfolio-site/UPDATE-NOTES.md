# Site update: desktop redesign

This zip is the full source of the portfolio site (Next.js), updated with a new
desktop-style interface. Copy it over the existing project, then follow the
steps below. Nothing here touches content: the photos/films in Vercel Blob are
read the same way as before.

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
