import PixIcon, { isPixName, type PixName } from '@/components/PixIcon'
import type { Folder, Item } from '@/lib/types'

/**
 * The picture half of each desktop icon, drawn with Aviv's pixel set.
 * Labels are drawn by FloatField.
 */
export function DeskIcon({
  name,
  hoverName,
  preview,
  previewClass,
  size = 64,
}: {
  name: PixName
  /** swapped in on hover — a folder opens when you point at it */
  hoverName?: PixName
  /** a photo or poster that peeks out above the icon on hover */
  preview?: string
  /** rotation class for the preview (see rotClass) */
  previewClass?: string
  size?: number
}) {
  return (
    <span className={`ficon-pix${hoverName ? ' has-hover' : ''}`} style={{ width: size, height: size }}>
      <PixIcon name={name} size={size} className="ficon-rest" />
      {hoverName && <PixIcon name={hoverName} size={size} className="ficon-hover" />}
      {preview && (
        <span className="ficon-peek" aria-hidden="true">
          <img src={preview} alt="" draggable={false} loading="lazy" className={previewClass || undefined} />
        </span>
      )}
    </span>
  )
}

/** Which icon a folder gets: a custom one from the admin, else its default. */
export function folderIconFor(folder: Folder): { name: PixName; hoverName?: PixName } {
  if (isPixName(folder.icon)) return { name: folder.icon }
  const isRoot = folder.parentId === null
  if (isRoot && folder.slug === 'photography') return { name: 'folder-face' }
  if (isRoot && folder.slug === 'cinema') return { name: 'folder-film' }
  if (isRoot && folder.slug === 'commercial') return { name: 'folder-star' }
  return { name: 'folder', hoverName: 'folder-open' }
}

// Photos in a 35mm folder show film strips instead of a file icon,
// cycling through Aviv's three strip drawings.
const FILM_STRIPS: PixName[] = ['filmstrip', 'filmstrip-2', 'filmstrip-3']

/** Which icon a photo, video or film gets: custom, else by its folder/file type. */
export function itemIconFor(item: Item, folder?: Folder): PixName {
  if (isPixName(item.icon)) return item.icon
  if (item.kind === 'film') return 'clapperboard'
  if (folder?.slug === '35mm' && !item.youtubeUrl) return FILM_STRIPS[item.position % FILM_STRIPS.length]
  return photoIconFor(item.src, !!item.youtubeUrl)
}

export function SearchGlyph({ size = 14 }: { size?: number }) {
  return <PixIcon name="search" size={size} />
}

/** A photo's file icon follows its real file type. */
export function photoIconFor(src: string, isVideo: boolean): PixName {
  if (isVideo) return 'file-mp4'
  const ext = src.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'file-png'
  if (ext === 'gif') return 'file-gif'
  return 'file-jpg'
}
