import { childFolders, folderById, folderCoverItem, itemsIn, pathOf } from '@/lib/tree-query'
import type { Folder, Item, Tree } from '@/lib/types'
import { itemThumb, rotClass } from '@/lib/types'
import { DeskIcon, folderIconFor, itemIconFor } from './icons'
import type { FloatEntry } from './FloatField'
import type { DesktopApi } from './types'

// Every icon now sits in the same cell: a 64px pixel icon plus a label.
const CELL = { w: 104, h: 108 }

/** Photos you can arrow through in a folder (video tiles are skipped, as before). */
export function photosIn(tree: Tree, folderId: string) {
  return itemsIn(tree, folderId).filter(i => i.kind === 'photo' && !i.youtubeUrl)
}

export function quickLookList(tree: Tree, folderId: string) {
  return photosIn(tree, folderId).map(p => ({
    id: p.id,
    src: itemThumb(p),
    alt: p.alt || p.title,
    title: p.title,
    caption: p.caption,
    rotate: p.kind === 'photo' ? p.rotate : undefined,
  }))
}

export function folderEntry(
  tree: Tree,
  folder: Folder,
  api: DesktopApi,
  winId?: string
): FloatEntry {
  const href = pathOf(tree, folder.id)
  const spec = { kind: 'folder' as const, folderId: folder.id }
  return {
    id: `f:${folder.id}`,
    label: folder.name,
    cell: CELL,
    icon: (() => {
      const cover = folderCoverItem(tree, folder)
      return <DeskIcon {...folderIconFor(folder)} preview={cover ? itemThumb(cover) : undefined} previewClass={rotClass(cover)} />
    })(),
    // Finder rules: open in place; ⌘/Ctrl-click opens a separate window.
    onOpen: e =>
      api.open(spec, e.metaKey || e.ctrlKey || !winId ? { newWindow: true } : { inWindow: winId }),
    menu: [
      { label: 'Open', onSelect: () => api.open(spec, winId ? { inWindow: winId } : {}) },
      ...(winId ? [{ label: 'Open in New Window', onSelect: () => api.open(spec, { newWindow: true }) }] : []),
      { separator: true },
      { label: 'Get Info', onSelect: () => api.open({ kind: 'info', target: { type: 'folder', id: folder.id } }) },
      { label: 'Copy Link', onSelect: () => api.copyLink(href) },
    ],
  }
}

export function itemEntry(tree: Tree, item: Item, api: DesktopApi): FloatEntry {
  const label = item.title || item.caption || ''
  const info = () => api.open({ kind: 'info', target: { type: 'item', id: item.id } })
  const copy = () => api.copyLink(`/p/${item.id}`)

  if (item.kind === 'film') {
    const spec = { kind: 'film' as const, itemId: item.id }
    return {
      id: `i:${item.id}`,
      label: label || 'Untitled film',
      cell: CELL,
      icon: <DeskIcon name={itemIconFor(item, folderById(tree, item.folderId))} preview={item.posterSrc} />,
      onOpen: () => api.open(spec),
      menu: [
        { label: 'Open', onSelect: () => api.open(spec) },
        { separator: true },
        { label: 'Get Info', onSelect: info },
        { label: 'Copy Link', onSelect: copy },
      ],
    }
  }

  const spec = { kind: 'photo' as const, itemId: item.id }
  const quick = () => {
    const list = quickLookList(tree, item.folderId)
    const at = list.findIndex(p => p.id === item.id)
    if (at >= 0) api.quickLook(list, at)
  }
  return {
    id: `i:${item.id}`,
    label: label || (item.youtubeUrl ? 'Video' : 'Photo'),
    cell: CELL,
    icon: <DeskIcon name={itemIconFor(item, folderById(tree, item.folderId))} preview={item.src} previewClass={rotClass(item)} />,
    onOpen: () => api.open(spec),
    menu: [
      { label: 'Open', onSelect: () => api.open(spec) },
      ...(item.youtubeUrl
        ? [{ label: 'Watch on YouTube', onSelect: () => window.open(item.youtubeUrl, '_blank', 'noopener') }]
        : [{ label: 'Quick Look', onSelect: quick }]),
      { separator: true },
      { label: 'Get Info', onSelect: info },
      { label: 'Copy Link', onSelect: copy },
    ],
  }
}

export function folderContents(tree: Tree, folderId: string, api: DesktopApi, winId: string) {
  return [
    ...childFolders(tree, folderId).map(f => folderEntry(tree, f, api, winId)),
    ...itemsIn(tree, folderId).map(i => itemEntry(tree, i, api)),
  ]
}

