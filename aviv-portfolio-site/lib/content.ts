import { list, put, del } from '@vercel/blob'
import seed from '@/data/tree.json'
import type { Tree } from './types'

// Vercel Blob's public CDN caches content per-URL and does not reliably
// invalidate on overwrite of a stable pathname (confirmed: even useCache:false
// and cache-busting query strings still served stale content once a pathname
// had been cached). So instead of overwriting one stable file, every write
// creates a new immutable, timestamped blob and reads pick the newest one —
// a URL that's never been requested before is always a guaranteed cache miss.

const PREFIX = 'data/tree-'

/** Local dev store: a plain JSON file, no network, isolated from production. */
const LOCAL_FILE = 'data/tree.local.json'

/**
 * Which backing store to use.
 *   CONTENT_STORE=local  — the JSON file above. Nothing touches production.
 *   CONTENT_STORE=blob   — Vercel Blob.
 *   unset                — blob when a token exists, otherwise local.
 *
 * Local is the sane default for `next dev`: reads of the blob's public URL are
 * routinely answered with Vercel's bot-protection challenge (403 + an HTML
 * page) from a developer machine, and the blob store is shared with
 * production, so local edits would otherwise write to live content.
 */
export function localStoreEnabled(): boolean {
  const mode = process.env.CONTENT_STORE
  if (mode === 'local') return true
  if (mode === 'blob') return false
  return !process.env.BLOB_READ_WRITE_TOKEN
}

async function localPath() {
  const path = await import('node:path')
  return path.join(process.cwd(), LOCAL_FILE)
}

async function readLocal(): Promise<TreeLoad> {
  const fs = await import('node:fs/promises')
  const file = await localPath()
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(file, 'utf-8'))
    if (!isTree(parsed)) return { tree: seed as Tree, source: 'error', error: `${LOCAL_FILE} is not a content tree` }
    return { tree: parsed, source: 'local' }
  } catch (err) {
    // First run: start from the bundled seed and write it out.
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      await fs.writeFile(file, JSON.stringify(seed, null, 2))
      return { tree: seed as Tree, source: 'local' }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { tree: seed as Tree, source: 'error', error: message }
  }
}

async function writeLocal(tree: Tree): Promise<void> {
  const fs = await import('node:fs/promises')
  await fs.writeFile(await localPath(), JSON.stringify(tree, null, 2))
}

/**
 * Where the tree we're holding actually came from.
 *   'blob'  — the live content. Safe to edit.
 *   'local' — the local dev file. Safe to edit.
 *   'empty' — no blob written yet, so the bundled seed *is* the truth. Safe to edit.
 *   'error' — the store exists but we could not read it. The seed is a stand-in so
 *             the site keeps rendering; saving over it would destroy real data.
 */
export type TreeSource = 'blob' | 'local' | 'empty' | 'error'

export interface TreeLoad {
  tree: Tree
  source: TreeSource
  error?: string
}

function isTree(value: unknown): value is Tree {
  if (!value || typeof value !== 'object') return false
  const { folders, items } = value as Partial<Tree>
  return Array.isArray(folders) && Array.isArray(items)
}

/**
 * Read the newest tree blob.
 *
 * The blob's public URL sits behind Vercel's edge protection, which can answer
 * with an HTML "Security Checkpoint" page — sometimes carrying a 200 status.
 * `res.ok` is therefore not enough: an unchecked `res.json()` there throws, and
 * silently falling back to the bundled seed would let the admin save stale
 * content over the real tree. So we verify we actually got a tree, retry once,
 * and otherwise report 'error' so callers can refuse to write.
 */
export async function loadTree(): Promise<TreeLoad> {
  if (localStoreEnabled()) return readLocal()

  try {
    const { blobs } = await list({ prefix: PREFIX })
    if (blobs.length === 0) return { tree: seed as Tree, source: 'empty' }

    const latest = blobs.reduce((a, b) => (+a.uploadedAt > +b.uploadedAt ? a : b))

    let lastError = ''
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 250))

      const res = await fetch(latest.url, { cache: 'no-store', headers: { accept: 'application/json' } })
      const body = res.ok ? await res.text() : ''
      if (!res.ok) {
        lastError =
          res.headers.get('x-vercel-mitigated') === 'challenge'
            ? `blob blocked by Vercel bot protection (${res.status})`
            : `blob responded ${res.status}`
        continue
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        // Almost always the edge-protection interstitial rather than a bad write.
        lastError = body.trimStart().startsWith('<')
          ? 'blob returned an HTML page instead of JSON (edge protection)'
          : 'blob returned malformed JSON'
        continue
      }

      if (!isTree(parsed)) {
        lastError = 'blob JSON is not a content tree'
        continue
      }
      return { tree: parsed, source: 'blob' }
    }

    console.error('loadTree: falling back to seed —', lastError)
    return { tree: seed as Tree, source: 'error', error: lastError }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('loadTree: blob store unavailable —', message)
    return { tree: seed as Tree, source: 'error', error: message }
  }
}

/** Convenience for public pages, which just want something to render. */
export async function getTree(): Promise<Tree> {
  return (await loadTree()).tree
}

export async function saveTree(tree: Tree): Promise<void> {
  if (localStoreEnabled()) return writeLocal(tree)

  await put(`${PREFIX}${Date.now()}.json`, JSON.stringify(tree, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  })

  // Clean up older versions so blobs don't accumulate forever. Keep the two
  // newest, so a reader that listed just before this write still resolves.
  const { blobs } = await list({ prefix: PREFIX })
  const stale = blobs.sort((a, b) => +b.uploadedAt - +a.uploadedAt).slice(2)
  if (stale.length > 0) await del(stale.map(b => b.url))
}

/** Which store uploads go to: 'local' in dev (public/uploads), else Vercel Blob. */
export function storeMode(): 'local' | 'blob' {
  return localStoreEnabled() ? 'local' : 'blob'
}

/**
 * A short fingerprint of a tree. The admin sends back the fingerprint of the
 * tree it last saw; if the stored tree has changed since (another phone or
 * computer saved in between), the save is refused instead of overwriting it.
 */
export async function treeRev(tree: Tree): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha1').update(JSON.stringify(tree)).digest('hex').slice(0, 16)
}

// ── Queries ──────────────────────────────────────────
// The pure tree queries live in ./tree-query so client components (the
// desktop) can use them without pulling in the blob store.
export * from './tree-query'
