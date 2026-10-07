import type { Tree } from '@/lib/types'

/** What a window shows. One window = one spec; folder windows can navigate in place. */
export type WinSpec =
  | { kind: 'folder'; folderId: string }
  | { kind: 'photo'; itemId: string }
  | { kind: 'film'; itemId: string }
  | { kind: 'about' }
  | { kind: 'search'; q: string }
  | { kind: 'info'; target: { type: 'folder' | 'item'; id: string } }
  | { kind: 'social'; network: 'instagram' | 'tiktok' }
  | { kind: 'game'; gameId: string }
  | { kind: 'events' }
  | { kind: 'tv' }

export interface WinGeom {
  x: number
  y: number
  w: number
  h: number
}

export interface Win {
  id: string
  spec: WinSpec
  z: number
  /** null until the window is first dragged or resized — until then CSS centres it */
  geom: WinGeom | null
  /** cascade step, so new windows don't stack exactly on top of each other */
  cascade: number
  maximized: boolean
  closing?: boolean
  /** previous specs, for a folder window's own Back button */
  back: WinSpec[]
}

export interface OpenOptions {
  /** force a separate window even when the spec could reuse one */
  newWindow?: boolean
  /** replace this window's content instead of opening a new one (Finder-style) */
  inWindow?: string
}

export interface QuickLookPhoto {
  id: string
  src: string
  alt: string
  title?: string
  caption?: string
  rotate?: number
}

export interface DesktopApi {
  tree: Tree
  isMobile: boolean
  open: (spec: WinSpec, opts?: OpenOptions) => void
  /** step a folder window back through its own history */
  goBack: (winId: string) => void
  /** swap a window's spec without touching its history (prev/next photo) */
  replaceSpec: (winId: string, spec: WinSpec) => void
  close: (winId: string) => void
  quickLook: (photos: QuickLookPhoto[], index: number, title?: string) => void
  copyLink: (href: string) => void
  toast: (message: string) => void
}

/** Stable identity for "is this already open?" checks. */
export function specKey(spec: WinSpec): string {
  switch (spec.kind) {
    case 'folder':
      return `folder:${spec.folderId}`
    case 'photo':
    case 'film':
      return `${spec.kind}:${spec.itemId}`
    case 'about':
      return 'about'
    case 'search':
      return 'search'
    case 'info':
      return `info:${spec.target.type}:${spec.target.id}`
    case 'social':
      return `social:${spec.network}`
    case 'game':
      return `game:${spec.gameId}`
    case 'events':
      return 'events'
    case 'tv':
      return 'tv'
  }
}
