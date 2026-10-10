'use client'

import { breadcrumb, countIn, folderById, folderCoverItem, itemById, pathOf } from '@/lib/tree-query'
import { itemThumb, rotClass } from '@/lib/types'
import PixIcon, { type PixName } from '@/components/PixIcon'
import { folderIconFor, itemIconFor } from '../icons'
import Window from '../Window'
import type { FrameProps } from './frame'

/** Get Info — the small grey panel from the Finder. */
export default function InfoWindow({
  frame,
  target,
}: {
  frame: FrameProps
  target: { type: 'folder' | 'item'; id: string }
}) {
  const { tree } = frame.api
  let name = ''
  let thumb: string | undefined
  let thumbRot = ''
  let rows: [string, string][] = []
  let href = ''
  let icon: PixName = 'file-face'

  if (target.type === 'folder') {
    const f = folderById(tree, target.id)
    if (f) {
      name = f.name
      const cover = folderCoverItem(tree, f)
      thumb = cover ? itemThumb(cover) : undefined
      thumbRot = rotClass(cover)
      href = pathOf(tree, f.id)
      icon = folderIconFor(f).name
      const n = countIn(tree, f.id)
      rows = [
        ['Kind', 'Folder'],
        ['Where', breadcrumb(tree, f.id).slice(0, -1).map(c => c.name).join(' ▸ ') || 'Desktop'],
        ['Contains', `${n} ${n === 1 ? 'item' : 'items'}`],
      ]
    }
  } else {
    const it = itemById(tree, target.id)
    if (it) {
      name = it.title || it.caption || 'Untitled'
      thumb = itemThumb(it) || undefined
      thumbRot = rotClass(it)
      href = `/p/${it.id}`
      icon = itemIconFor(it, folderById(tree, it.folderId))
      const kind = it.kind === 'film' ? 'Film' : it.youtubeUrl ? 'Video' : 'Photo'
      rows = [
        ['Kind', kind],
        ['Where', breadcrumb(tree, it.folderId).map(c => c.name).join(' ▸ ')],
        ...(it.kind === 'photo' && it.width && it.height
          ? ([['Dimensions', `${it.width} × ${it.height}`]] as [string, string][])
          : []),
        ...(it.kind === 'film' && it.year ? ([['Year', String(it.year)]] as [string, string][]) : []),
        ...(it.kind === 'film' && it.duration ? ([['Duration', it.duration]] as [string, string][]) : []),
        ...(it.caption ? ([['Caption', it.caption]] as [string, string][]) : []),
        ...(it.tags.length ? ([['Tags', it.tags.join(', ')]] as [string, string][]) : []),
      ]
    }
  }

  return (
    <Window {...frame} title={`${name || 'Item'} Info`} size={{ w: 300, h: 420 }} minSize={{ w: 240, h: 220 }}>
      <div className="dwin-scroll info-panel">
        <div className="info-head">
          <span className="info-icon">
            <PixIcon name={icon} size={40} />
          </span>
          <span className="info-thumb">{thumb ? <img src={thumb} alt="" className={thumbRot || undefined} /> : null}</span>
          <strong>{name || 'Not found'}</strong>
        </div>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {href && (
          <button type="button" className="win-btn" onClick={() => frame.api.copyLink(href)}>
            <PixIcon name="link" size={12} /> Copy Link
          </button>
        )}
      </div>
    </Window>
  )
}
