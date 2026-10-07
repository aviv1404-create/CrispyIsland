'use client'

import { useEffect, useState } from 'react'
import PixIcon from '@/components/PixIcon'
import { folderIconFor } from '@/components/desktop/icons'
import { childrenOf, itemsOf } from '@/lib/tree-ops'
import { itemThumb, rotClass } from '@/lib/types'
import type { Tree } from '@/lib/types'
import { pathOf } from '@/lib/tree-query'

/**
 * "What will visitors see?" — the open folder drawn the way the site draws
 * it (same tiles, crops and rotations), from the admin's current copy, so
 * it's right even for edits still saving. Hidden subfolders are left out,
 * as on the site; a hidden folder itself shows with a note.
 */
export default function PreviewPane({ tree, folderId, onClose }: { tree: Tree; folderId: string; onClose: () => void }) {
  const [at, setAt] = useState(folderId)
  const [photo, setPhoto] = useState<number | null>(null)
  const folder = tree.folders.find(f => f.id === at)
  const folders = childrenOf(tree, at).filter(f => f.visible)
  const items = folder ? itemsOf(tree, folder.id) : []
  const photos = items.filter(i => i.kind === 'photo' && !i.youtubeUrl)
  const hidden = (() => {
    for (let f = folder; f; f = tree.folders.find(x => x.id === f!.parentId)) if (!f.visible) return true
    return false
  })()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') photo !== null ? setPhoto(null) : onClose()
      if (photo !== null && e.key === 'ArrowRight') setPhoto(p => (p! + 1) % photos.length)
      if (photo !== null && e.key === 'ArrowLeft') setPhoto(p => (p! - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [photo, photos.length, onClose])

  if (!folder) return null
  const shown = photo !== null ? photos[photo] : null

  return (
    <div className="pv-scrim" onClick={onClose}>
      <section className="pv" role="dialog" aria-label={`Preview of ${folder.name}`} onClick={e => e.stopPropagation()}>
        <header className="pv-head">
          {folder.id !== folderId && folder.parentId && (
            <button type="button" className="pv-btn" onClick={() => setAt(folder.parentId!)} aria-label="Back">
              <PixIcon name="arrow-left" size={14} />
            </button>
          )}
          <strong>
            Preview · {folder.name}
            <span>As visitors see it{hidden ? ' — hidden right now, visitors can’t open it' : ''}</span>
          </strong>
          {!hidden && (
            <a className="pv-btn" href={pathOf(tree, folder.id)} target="_blank" rel="noopener">
              <PixIcon name="globe" size={14} /> Open on site
            </a>
          )}
          <button type="button" className="pv-btn" onClick={onClose} aria-label="Close preview" title="Close">
            <PixIcon name="x" size={14} />
          </button>
        </header>

        <div className="pv-body">
          {folders.length === 0 && items.length === 0 && <p className="pv-empty">Visitors will see an empty folder.</p>}
          {folders.length > 0 && (
            <div className="pv-folders">
              {folders.map(f => (
                <button key={f.id} type="button" className="pv-folder" onClick={() => setAt(f.id)}>
                  <PixIcon name={folderIconFor(f).name} size={48} />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <div className="item-grid">
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`item-tile${item.kind === 'film' ? ' poster' : ''}`}
                  onClick={() => {
                    const i = photos.indexOf(item)
                    if (i >= 0) setPhoto(i)
                  }}
                >
                  {itemThumb(item) ? (
                    <img src={itemThumb(item)} alt={item.alt} loading="lazy" className={rotClass(item)} />
                  ) : (
                    <span className="item-tile-blank">{item.kind === 'film' ? 'FILM' : 'PHOTO'}</span>
                  )}
                  {item.title && <span className="item-tile-title">{item.title}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {shown && shown.kind === 'photo' && (
          <div className="pv-photo" onClick={() => setPhoto(null)}>
            <div className="photo-stage" onClick={e => e.stopPropagation()}>
              <img src={shown.src} alt={shown.alt} className={rotClass(shown)} />
            </div>
            <div className="pv-photo-bar" onClick={e => e.stopPropagation()}>
              <button type="button" className="pv-btn" onClick={() => setPhoto((photo! - 1 + photos.length) % photos.length)} aria-label="Previous photo">
                <PixIcon name="arrow-left" size={16} />
              </button>
              <span>
                {photo! + 1} of {photos.length}
                {shown.caption ? ` · ${shown.caption}` : ''}
              </span>
              <button type="button" className="pv-btn" onClick={() => setPhoto((photo! + 1) % photos.length)} aria-label="Next photo">
                <PixIcon name="arrow-right" size={16} />
              </button>
              <button type="button" className="pv-btn" onClick={() => setPhoto(null)} aria-label="Back to the folder">
                <PixIcon name="x" size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
