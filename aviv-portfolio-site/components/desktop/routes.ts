import { folderByPath, itemById, pathOf } from '@/lib/tree-query'
import type { Tree } from '@/lib/types'
import type { WinSpec } from './types'
import { GAMES } from '@/data/games'

/**
 * The address bar always names the front window, so every window that matters
 * has a shareable URL. These two functions are the whole mapping.
 */
export function hrefFor(tree: Tree, spec: WinSpec): string | null {
  switch (spec.kind) {
    case 'folder':
      return pathOf(tree, spec.folderId)
    case 'photo':
    case 'film':
      return `/p/${spec.itemId}`
    case 'about':
      return '/about'
    case 'search':
      return spec.q ? `/search?q=${encodeURIComponent(spec.q)}` : '/search'
    case 'game':
      return `/${spec.gameId}`
    case 'events':
      return '/events'
    case 'tv':
      return '/tv'
    case 'info':
    case 'social':
      // Get Info panels and the social portals never take over the URL.
      return null
  }
}

/**
 * Windows a URL should put on screen, back to front. A photo link opens its
 * folder behind it, so closing the photo lands somewhere sensible.
 */
export function specsForPath(tree: Tree, pathname: string, query = ''): WinSpec[] {
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean === '/') return []
  if (clean === '/about') return [{ kind: 'about' }]
  if (clean === '/events') return [{ kind: 'events' }]
  if (clean === '/tv') return [{ kind: 'tv' }]
  const game = GAMES.find(g => clean === `/${g.id}`)
  if (game) return [{ kind: 'game', gameId: game.id }]
  if (clean === '/search') {
    const q = new URLSearchParams(query).get('q') ?? ''
    return [{ kind: 'search', q }]
  }

  const photo = clean.match(/^\/p\/([^/]+)$/)
  if (photo) {
    const item = itemById(tree, decodeURIComponent(photo[1]))
    if (!item) return []
    const own: WinSpec =
      item.kind === 'film' ? { kind: 'film', itemId: item.id } : { kind: 'photo', itemId: item.id }
    return [{ kind: 'folder', folderId: item.folderId }, own]
  }

  const slugs = clean.split('/').filter(Boolean).map(decodeURIComponent)
  const folder = folderByPath(tree, slugs)
  return folder ? [{ kind: 'folder', folderId: folder.id }] : []
}
