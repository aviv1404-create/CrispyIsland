import { itemThumb } from './types'
import type { Folder, Item, Tree } from './types'

// Pure, client-safe queries over the content tree. No I/O — lib/content.ts
// re-exports these for server code; the desktop imports them directly.
// Ordering always comes from the explicit `position` integer, never from
// filename, id or upload date.

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

export function rootFolders(tree: Tree): Folder[] {
  return tree.folders.filter(f => f.parentId === null && f.visible).sort(byPosition)
}

export function childFolders(tree: Tree, parentId: string): Folder[] {
  return tree.folders.filter(f => f.parentId === parentId && f.visible).sort(byPosition)
}

export function itemsIn(tree: Tree, folderId: string): Item[] {
  return tree.items.filter(i => i.folderId === folderId).sort(byPosition)
}

export function folderById(tree: Tree, id: string): Folder | undefined {
  return tree.folders.find(f => f.id === id)
}

export function itemById(tree: Tree, id: string): Item | undefined {
  return tree.items.find(i => i.id === id)
}

/** Walk a slug path from the roots down. Returns undefined if any hop misses. */
export function folderByPath(tree: Tree, slugs: string[]): Folder | undefined {
  let parentId: string | null = null
  let found: Folder | undefined
  for (const slug of slugs) {
    found = tree.folders.find(f => f.parentId === parentId && f.slug === slug && f.visible)
    if (!found) return undefined
    parentId = found.id
  }
  return found
}

/** Root-first ancestor chain, including the folder itself. */
export function breadcrumb(tree: Tree, folderId: string): Folder[] {
  const chain: Folder[] = []
  let current = folderById(tree, folderId)
  while (current) {
    chain.unshift(current)
    current = current.parentId ? folderById(tree, current.parentId) : undefined
  }
  return chain
}

export function pathOf(tree: Tree, folderId: string): string {
  return '/' + breadcrumb(tree, folderId).map(f => f.slug).join('/')
}

/** The folder an item lives in, as a URL path. */
export function itemPath(tree: Tree, item: Item): string {
  return pathOf(tree, item.folderId)
}

/** Cover image for a folder: its chosen cover, else the first item, else the first descendant item. */
export function folderCover(tree: Tree, folder: Folder): string | undefined {
  const item = folderCoverItem(tree, folder)
  return item ? itemThumb(item) : undefined
}

/** The item whose picture is the folder's cover (see folderCover). */
export function folderCoverItem(tree: Tree, folder: Folder): Item | undefined {
  if (folder.coverItemId) {
    const cover = itemById(tree, folder.coverItemId)
    if (cover && itemThumb(cover)) return cover
  }
  const own = itemsIn(tree, folder.id).find(i => itemThumb(i))
  if (own) return own

  for (const child of childFolders(tree, folder.id)) {
    const nested = folderCoverItem(tree, child)
    if (nested) return nested
  }
  return undefined
}

/** How many things a folder shows — subfolders plus items. Drives the "N items" status bar. */
export function countIn(tree: Tree, folderId: string): number {
  return childFolders(tree, folderId).length + itemsIn(tree, folderId).length
}

// ── Search (V6) ──────────────────────────────────────

export interface SearchResults {
  folders: Folder[]
  items: Item[]
}

/** Matches folder names, item titles, captions, alt text and tags. */
export function search(tree: Tree, query: string): SearchResults {
  const q = query.trim().toLowerCase()
  if (!q) return { folders: [], items: [] }

  const folders = tree.folders
    .filter(f => f.visible && !f.system && f.name.toLowerCase().includes(q))
    .sort(byPosition)

  const items = tree.items
    .filter(i =>
      [i.title, i.caption, i.alt, ...i.tags].some(field => field?.toLowerCase().includes(q))
    )
    .sort(byPosition)

  return { folders, items }
}

// ── Public view ──────────────────────────────────────

/** True when the folder and every ancestor are visible. */
export function isPubliclyVisible(tree: Tree, folderId: string): boolean {
  let current = folderById(tree, folderId)
  while (current) {
    if (!current.visible) return false
    current = current.parentId ? folderById(tree, current.parentId) : undefined
  }
  return true
}

/**
 * The slice of the tree that's safe to ship to every visitor's browser:
 * hidden folders, their subfolders and everything inside them are dropped.
 */
export function publicTree(tree: Tree): Tree {
  const folders = tree.folders.filter(f => isPubliclyVisible(tree, f.id))
  const shown = new Set(folders.map(f => f.id))
  return { ...tree, folders, items: tree.items.filter(i => shown.has(i.folderId)) }
}
