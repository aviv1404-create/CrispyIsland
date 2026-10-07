import { ROOT_SLUGS, slugify, uniqueSlug } from './types'
import type { Folder, Item, Rotation, SiteEvent, Tree } from './types'
import { isPixName } from './pix-icons'

export class TreeError extends Error {}

/**
 * Validate and canonicalise a tree coming from the admin client. Guarantees the
 * three system roots survive, that the folder graph is a forest rooted at them,
 * that sibling slugs are unique, and that `position` is a dense 0..n-1 run in
 * every sibling group and folder. Never trust the client's positions.
 */
export function normalizeTree(raw: unknown): Tree {
  if (!raw || typeof raw !== 'object') throw new TreeError('Tree must be an object')
  const { folders, items } = raw as { folders?: unknown; items?: unknown }
  if (!Array.isArray(folders) || !Array.isArray(items)) {
    throw new TreeError('Tree needs folders[] and items[]')
  }

  const seenIds = new Set<string>()
  const cleanFolders: Folder[] = folders.map((f: Folder) => {
    if (!f?.id || !f?.name) throw new TreeError('Every folder needs an id and a name')
    if (seenIds.has(f.id)) throw new TreeError(`Duplicate folder id: ${f.id}`)
    seenIds.add(f.id)
    return {
      id: String(f.id),
      name: String(f.name),
      slug: f.slug ? slugify(f.slug) : slugify(f.name),
      parentId: f.parentId == null ? null : String(f.parentId),
      position: Number(f.position) || 0,
      ...(f.coverItemId ? { coverItemId: String(f.coverItemId) } : {}),
      visible: f.visible !== false,
      ...(f.system ? { system: true as const } : {}),
      ...(isPixName(f.icon) ? { icon: f.icon } : {}),
    }
  })

  // The three roots are structural — they must exist, stay at the top level,
  // and keep their slugs, whatever the client sent.
  for (const slug of ROOT_SLUGS) {
    const root = cleanFolders.find(f => f.id === slug)
    if (!root) throw new TreeError(`Missing system root: ${slug}`)
    root.parentId = null
    root.slug = slug
    root.system = true
    root.visible = true
  }
  for (const folder of cleanFolders) {
    if (folder.parentId === null && !ROOT_SLUGS.includes(folder.id as never)) {
      throw new TreeError(`Folder "${folder.name}" must live inside a category`)
    }
    if (folder.parentId !== null && !seenIds.has(folder.parentId)) {
      throw new TreeError(`Folder "${folder.name}" has a missing parent`)
    }
  }

  // Reject cycles: every folder must reach a root within folders.length hops.
  const byId = new Map(cleanFolders.map(f => [f.id, f]))
  for (const folder of cleanFolders) {
    let hops = 0
    let cursor: Folder | undefined = folder
    while (cursor?.parentId) {
      cursor = byId.get(cursor.parentId)
      if (++hops > cleanFolders.length) {
        throw new TreeError(`Folder "${folder.name}" is inside itself`)
      }
    }
  }

  // Unique slugs among siblings, dense positions per sibling group.
  const groups = new Map<string, Folder[]>()
  for (const folder of cleanFolders) {
    const key = folder.parentId ?? '__root__'
    const group = groups.get(key) ?? []
    group.push(folder)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.position - b.position)
    const taken = new Set<string>()
    group.forEach((folder, i) => {
      folder.slug = uniqueSlug(folder.slug, taken)
      taken.add(folder.slug)
      folder.position = i
    })
  }

  const seenItemIds = new Set<string>()
  const cleanItems: Item[] = items.map((i: Item) => {
    if (!i?.id) throw new TreeError('Every item needs an id')
    if (seenItemIds.has(i.id)) throw new TreeError(`Duplicate item id: ${i.id}`)
    seenItemIds.add(i.id)
    if (!byId.has(i.folderId)) throw new TreeError(`Item ${i.id} points at a missing folder`)

    const base = {
      id: String(i.id),
      folderId: String(i.folderId),
      position: Number(i.position) || 0,
      title: String(i.title ?? ''),
      caption: String(i.caption ?? ''),
      tags: Array.isArray(i.tags) ? i.tags.map(String).filter(Boolean) : [],
      alt: String(i.alt ?? ''),
      ...(isPixName(i.icon) ? { icon: i.icon } : {}),
    }

    if (i.kind === 'film') {
      return {
        ...base,
        kind: 'film',
        posterSrc: String(i.posterSrc ?? ''),
        videoUrl: String(i.videoUrl ?? ''),
        duration: String(i.duration ?? ''),
        ...(i.year ? { year: Number(i.year) } : {}),
        director: String(i.director ?? ''),
        producer: String(i.producer ?? ''),
        cinematographer: String(i.cinematographer ?? ''),
        editor: String(i.editor ?? ''),
        productionCompany: String(i.productionCompany ?? ''),
        awards: Array.isArray(i.awards) ? i.awards.map(String) : [],
        stills: Array.isArray(i.stills)
          ? i.stills.map(s => ({ id: String(s.id), src: String(s.src ?? ''), caption: String(s.caption ?? '') }))
          : [],
      }
    }
    return {
      ...base,
      kind: 'photo',
      src: String(i.src ?? ''),
      ...(i.width ? { width: Number(i.width) } : {}),
      ...(i.height ? { height: Number(i.height) } : {}),
      ...(i.youtubeUrl ? { youtubeUrl: String(i.youtubeUrl) } : {}),
      ...([90, 180, 270].includes(Number(i.rotate)) ? { rotate: Number(i.rotate) as Rotation } : {}),
    }
  })

  // Dense positions per folder.
  const byFolder = new Map<string, Item[]>()
  for (const item of cleanItems) {
    const group = byFolder.get(item.folderId) ?? []
    group.push(item)
    byFolder.set(item.folderId, group)
  }
  for (const group of byFolder.values()) {
    group.sort((a, b) => a.position - b.position)
    group.forEach((item, i) => { item.position = i })
  }

  // Drop cover references to items that no longer exist.
  for (const folder of cleanFolders) {
    if (folder.coverItemId && !seenItemIds.has(folder.coverItemId)) delete folder.coverItemId
  }

  const events = normalizeEvents((raw as { events?: unknown }).events)
  return { folders: cleanFolders, items: cleanItems, ...(events ? { events } : {}) }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Events list: keep only well-formed entries, trimmed; unset stays unset. */
function normalizeEvents(raw: unknown): SiteEvent[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const seen = new Set<string>()
  const out: SiteEvent[] = []
  for (const e of raw as Record<string, unknown>[]) {
    const id = str(e?.id, 80)
    const title = str(e?.title, 200)
    if (!id || !title || seen.has(id)) continue
    seen.add(id)
    const link = e.link as { label?: unknown; href?: unknown } | undefined
    const href = str(link?.href, 500)
    out.push({
      id,
      title,
      ...(str(e.date, 60) ? { date: str(e.date, 60) } : {}),
      ...(str(e.place, 200) ? { place: str(e.place, 200) } : {}),
      ...(str(e.about, 1000) ? { about: str(e.about, 1000) } : {}),
      ...(str(e.poster, 1000) ? { poster: str(e.poster, 1000) } : {}),
      ...(str(e.folderSlug, 200) ? { folderSlug: slugify(str(e.folderSlug, 200)) } : {}),
      ...(href && /^(https?:\/\/|\/)/.test(href) ? { link: { label: str(link?.label, 80) || 'Link', href } } : {}),
    })
  }
  return out
}
