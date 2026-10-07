import { del, list } from '@vercel/blob'
import { STORAGE_LIMIT_GB } from '@/data/storage'
import { localStoreEnabled } from './content'
import type { Tree } from './types'

/**
 * Storage housekeeping for the admin:
 *  - how much of the store the site uses (the meter in /admin),
 *  - deleting a file from the store as soon as it's removed from the site,
 *  - cleaning out files nothing on the site points to any more.
 *
 * Only files under these prefixes are ever deleted — never the site's own
 * data (data/ = the content list, guestbook/ = guestbook entries).
 */
const DISPOSABLE = ['uploads/', 'visits/']
/** Files younger than this are left alone by "Clean up" (an upload may still be on its way into the site). */
const GRACE_MS = 60 * 60 * 1000

export interface StorageUsage {
  /** bytes the store holds in total */
  total: number
  /** bytes of files the site actually shows (or needs) */
  used: number
  /** bytes of uploads nothing on the site points to */
  unused: number
  unusedCount: number
  files: number
  /** the plan's limit, in bytes */
  limit: number
}

const clean = (url: string) => url.split(/[?#]/)[0]
const isBlobUrl = (s: string) => /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(s)
const pathOf = (url: string) => decodeURIComponent(new URL(url).pathname.slice(1))
const disposable = (url: string) => DISPOSABLE.some(p => pathOf(url).startsWith(p))

/** Every stored-file URL the content tree points to (photos, posters, stills, TV videos, icons, events…). */
export function blobUrlsIn(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (isBlobUrl(value)) out.add(clean(value))
  } else if (Array.isArray(value)) {
    for (const v of value) blobUrlsIn(v, out)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) blobUrlsIn(v, out)
  }
  return out
}

async function listAll(prefix?: string) {
  const blobs: { url: string; pathname: string; size: number; uploadedAt: Date }[] = []
  let cursor: string | undefined
  // Each page is one billed list() call, so cap it (50,000 files is plenty).
  for (let page = 0; page < 50; page++) {
    const res = await list({ prefix, limit: 1000, cursor })
    blobs.push(...res.blobs)
    if (!res.hasMore) break
    cursor = res.cursor
  }
  return blobs
}

export async function storageUsage(tree: Tree): Promise<StorageUsage> {
  const limit = STORAGE_LIMIT_GB * 1024 ** 3
  if (localStoreEnabled()) return { total: 0, used: 0, unused: 0, unusedCount: 0, files: 0, limit }
  const refs = blobUrlsIn(tree)
  let total = 0
  let unused = 0
  let unusedCount = 0
  const blobs = await listAll()
  for (const b of blobs) {
    total += b.size
    if (disposable(b.url) && !refs.has(clean(b.url))) {
      unused += b.size
      unusedCount++
    }
  }
  return { total, used: total - unused, unused, unusedCount, files: blobs.length, limit }
}

/** The stored files the old tree pointed to and the new one doesn't (a deleted photo, a replaced poster…). */
export function removedUrls(before: Tree, after: Tree): string[] {
  if (localStoreEnabled()) return []
  const keep = blobUrlsIn(after)
  return [...blobUrlsIn(before)].filter(u => !keep.has(u) && disposable(u))
}

/**
 * Delete files that were taken off the site — unless the live content points
 * to them again by now (the phone admin's "Undo" puts a deleted photo back
 * within a few seconds). Deleting is free.
 */
export async function deleteIfStillUnused(urls: string[], latest: Tree): Promise<number> {
  const keep = blobUrlsIn(latest)
  const gone = urls.filter(u => !keep.has(u))
  if (gone.length) await del(gone)
  return gone.length
}

/** "Clean up": delete every upload nothing on the site points to (older than an hour). */
export async function cleanUnused(tree: Tree): Promise<number> {
  if (localStoreEnabled()) return 0
  const refs = blobUrlsIn(tree)
  const cutoff = Date.now() - GRACE_MS
  const stale: string[] = []
  for (const prefix of DISPOSABLE) {
    for (const b of await listAll(prefix)) {
      if (!refs.has(clean(b.url)) && +new Date(b.uploadedAt) < cutoff) stale.push(b.url)
    }
  }
  for (let i = 0; i < stale.length; i += 500) await del(stale.slice(i, i + 500))
  return stale.length
}
