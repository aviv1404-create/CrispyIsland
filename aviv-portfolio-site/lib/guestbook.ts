import { del, list, put } from '@vercel/blob'
import { revalidateTag, unstable_cache } from 'next/cache'
import { localStoreEnabled } from './content'

/**
 * The dungeon guestbook. No accounts: a name and a message. Each entry is its
 * own small blob (`guestbook/<time>-<random>.json`), so two people signing at
 * once can never overwrite each other, and an entry can be removed on its own.
 * Local dev keeps them in data/guestbook.local.json instead.
 */
export interface GuestEntry {
  id: string
  name: string
  message: string
  /** ISO time */
  at: string
}

const PREFIX = 'guestbook/'
const LOCAL_FILE = 'data/guestbook.local.json'
/** how many of the newest entries the page shows */
export const SHOW = 80

export const LIMITS = { name: 40, message: 500 }

/** Trim, drop control characters and squeeze runs of blank lines. */
export function clean(text: unknown, max: number): string {
  return String(text ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
}

async function localRead(): Promise<GuestEntry[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), LOCAL_FILE), 'utf-8')) as GuestEntry[]
  } catch {
    return []
  }
}
async function localWrite(all: GuestEntry[]) {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.writeFile(path.join(process.cwd(), LOCAL_FILE), JSON.stringify(all, null, 2))
}

// Listing the store is a billed Blob operation (Hobby includes only 2,000 a
// month), so the entry list goes through Next's shared Data Cache. It's only
// re-listed after someone signs or an entry is removed, or once a day.
const GUESTBOOK_TAG = 'guestbook'

const cachedEntries = unstable_cache(
  async (): Promise<GuestEntry[]> => {
    const { blobs } = await list({ prefix: PREFIX, limit: 1000 })
    const newest = blobs.sort((a, b) => +b.uploadedAt - +a.uploadedAt).slice(0, SHOW)
    return (
      await Promise.all(
        newest.map(async b => {
          try {
            const res = await fetch(b.url, { cache: 'force-cache' })
            if (!res.ok) return null
            const e = (await res.json()) as GuestEntry
            return e?.id && e?.message ? { ...e, id: b.pathname } : null
          } catch {
            return null
          }
        })
      )
    ).filter((e): e is GuestEntry => !!e)
  },
  ['guestbook-v2'],
  { tags: [GUESTBOOK_TAG], revalidate: 86_400 }
)

export async function readEntries(): Promise<GuestEntry[]> {
  if (localStoreEnabled()) return (await localRead()).slice(0, SHOW)
  return cachedEntries()
}

export async function addEntry(name: string, message: string): Promise<GuestEntry> {
  const at = new Date().toISOString()
  const rand = Math.random().toString(36).slice(2, 8)
  const id = `${PREFIX}${Date.now()}-${rand}.json`
  const entry: GuestEntry = { id, name, message, at }
  if (localStoreEnabled()) {
    const all = await localRead()
    await localWrite([entry, ...all].slice(0, 1000))
    return entry
  }
  await put(id, JSON.stringify(entry), { access: 'public', contentType: 'application/json', addRandomSuffix: false })
  revalidateTag(GUESTBOOK_TAG, { expire: 0 })
  return entry
}

export async function removeEntry(id: string): Promise<void> {
  if (!id.startsWith(PREFIX)) throw new Error('Not a guestbook entry')
  if (localStoreEnabled()) {
    await localWrite((await localRead()).filter(e => e.id !== id))
    return
  }
  // The entry id is its pathname, so it can be deleted directly (del() is
  // free; no list() needed).
  await del(id)
  revalidateTag(GUESTBOOK_TAG, { expire: 0 })
}
