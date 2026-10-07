@AGENTS.md

# Aviv Shmuelof — Portfolio Site

Portfolio for Aviv Shmuelof: filmmaker, photographer, producer. Its job is to get him hired in film/TV/media.

## Stack
Next.js 16.2.7 (App Router) · React 19 · Tailwind 4 · Vercel Blob for content · @react-three/fiber for the 3D smiley on the desktop landing. Deployed on Vercel; pushing to `main` deploys production.

## Design language
2007-era Apple: brushed-silver metallic tab nav on near-black, sharp type, generous darkspace. Photos are the content — the UI stays out of the way.

## Content model
- `data/tree.json` is the bundled seed and defines the structure: a recursive folder tree (Photography → Naval, Music, Fashion, 35mm · Cinema → DOP, Directed, Produced · Commercial · About). Live content lives in Vercel Blob.
- Content is edited through the password/Google-gated admin at `/admin` (drag-and-drop upload), not by hand-editing JSON.
- `lib/content.ts` picks the store via `CONTENT_STORE`:
  - `local` → `data/tree.local.json` (gitignored, auto-created from the seed on first run) + `public/uploads`. Safe sandbox, nothing touches production.
  - `blob` → live Vercel Blob, shared with production. Edits in local dev change the real site.
  - unset → blob if `BLOB_READ_WRITE_TOKEN` exists, else local.
- For local dev, set `CONTENT_STORE=local` in `.env.local` — blob reads from a dev machine often get a 403 bot-protection page. Do real content uploads through `/admin` on the live site.

## Setup
```
npm install
vercel link
vercel env pull .env.local   # admin passwords, Blob token, Google OAuth, session secret
echo "CONTENT_STORE=local" >> .env.local
npm run dev
```
Env vars used: `ADMIN_PASSWORD_AVIV`, `ADMIN_PASSWORD_DANA`, `ADMIN_GOOGLE_EMAILS`, `BLOB_READ_WRITE_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `OAUTH_ORIGIN` (optional), `CONTENT_STORE` (optional). Never commit `.env*`.

## Where things stand
- The build is ahead of the content. Galleries still hold placeholders (picsum images, "Untitled Film I–IV", empty YouTube URLs). The priority is real photos, films and copy — not new features.
- Open decisions: final domain, Instagram handle, whether Cinema cards embed YouTube inline or open a new tab.

## Working rules
- Read `node_modules/next/dist/docs/` before writing Next.js code (see AGENTS.md).
- Run `npm run build` before pushing to `main`.
- Don't add features unless asked; keep the design language intact.
