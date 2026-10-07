// One recursive content tree. Three fixed system roots (photography / cinema /
// commercial); arbitrary folder nesting inside each.

export interface Folder {
  id: string
  name: string
  slug: string
  /** null only for the three system roots */
  parentId: string | null
  position: number
  coverItemId?: string
  visible: boolean
  /** system roots cannot be renamed, reparented or deleted */
  system?: true
  /** custom pixel icon (a name from lib/pix-icons); unset = the default */
  icon?: string
}

interface ItemBase {
  id: string
  folderId: string
  position: number
  title: string
  caption: string
  tags: string[]
  alt: string
  /** custom pixel icon (a name from lib/pix-icons); unset = the default */
  icon?: string
}

export interface PhotoItem extends ItemBase {
  kind: 'photo'
  src: string
  width?: number
  height?: number
  /** set when the tile is really a video link — keeps the play badge behaviour */
  youtubeUrl?: string
  /** clockwise turn, set in the admin for sideways scans; unset = as uploaded */
  rotate?: Rotation
}

export type Rotation = 90 | 180 | 270
export const ROTATIONS = [90, 180, 270] as const

/** Class that turns a photo's <img> (see "Rotated photos" in globals.css). */
export function rotClass(item: object | null | undefined): string {
  const r = item && 'rotate' in item ? item.rotate : undefined
  return r === 90 || r === 180 || r === 270 ? `rot-${r}` : ''
}

/** The next clockwise (dir 1) or counter-clockwise (dir -1) turn. */
export function turned(r: number | undefined, dir: 1 | -1): Rotation | undefined {
  const next = ((((r ?? 0) + dir * 90) % 360) + 360) % 360
  return next === 0 ? undefined : (next as Rotation)
}

export interface Still {
  id: string
  src: string
  caption: string
}

export interface FilmItem extends ItemBase {
  kind: 'film'
  posterSrc: string
  videoUrl: string
  duration: string
  year?: number
  director: string
  producer: string
  cinematographer: string
  editor: string
  productionCompany: string
  awards: string[]
  stills: Still[]
}

export type Item = PhotoItem | FilmItem

/** One poster in the Events app (edited in the admin). */
export interface SiteEvent {
  id: string
  title: string
  /** shown as written, e.g. "17.8" or "Summer 2026" */
  date?: string
  place?: string
  about?: string
  /** poster image URL (portrait works best) */
  poster?: string
  /** slug of the admin folder holding the photos from the night */
  folderSlug?: string
  link?: { label: string; href: string }
}

export interface Tree {
  folders: Folder[]
  items: Item[]
  /** Events app posters, in display order. Unset = the bundled list in data/events.ts. */
  events?: SiteEvent[]
}

export const ROOT_SLUGS = ['photography', 'cinema', 'commercial'] as const
export type RootSlug = (typeof ROOT_SLUGS)[number]

/** The thumbnail a tile should show, whichever kind it is. */
export function itemThumb(item: Item): string {
  return item.kind === 'film' ? item.posterSrc : item.src
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  )
}

/** Make `slug` unique among `taken`, appending -2, -3 … as needed. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
