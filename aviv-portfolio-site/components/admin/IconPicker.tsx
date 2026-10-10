'use client'

import { useEffect, useMemo, useState } from 'react'
import PixIcon, { PIX_ICONS, type PixName } from '@/components/PixIcon'
import { folderIconFor, itemIconFor } from '@/components/desktop/icons'
import type { Folder, Item, Tree } from '@/lib/types'

export type IconTarget = { type: 'folder'; folder: Folder } | { type: 'item'; item: Item }

// PIX_ICONS lists the first sheet, then the film sheet; this is where it switches.
const FILM_SHEET_START = PIX_ICONS.indexOf('movie-camera')

interface Props {
  tree: Tree
  target: IconTarget
  onPick: (name: PixName) => void
  onReset: () => void
  onClose: () => void
}

/**
 * Choose a custom icon for one folder or file. Shows the icons nobody else is
 * using by default; "All icons" also shows the taken ones, marked with who has them.
 */
export default function IconPicker({ tree, target, onPick, onReset, onClose }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')

  const current = target.type === 'folder' ? target.folder.icon : target.item.icon
  const fallback: PixName =
    target.type === 'folder'
      ? folderIconFor({ ...target.folder, icon: undefined }).name
      : itemIconFor({ ...target.item, icon: undefined }, tree.folders.find(f => f.id === target.item.folderId))
  const label =
    target.type === 'folder'
      ? target.folder.name
      : target.item.title || target.item.caption || (target.item.kind === 'film' ? 'Untitled film' : 'Untitled photo')

  // Which custom icons are already assigned to something else.
  const usedBy = useMemo(() => {
    const map = new Map<string, string>()
    const selfId = target.type === 'folder' ? target.folder.id : target.item.id
    for (const f of tree.folders) if (f.icon && f.id !== selfId) map.set(f.icon, f.name)
    for (const i of tree.items) {
      if (i.icon && i.id !== selfId) map.set(i.icon, i.title || i.caption || 'a file')
    }
    return map
  }, [tree, target])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase().replace(/\s+/g, '-')
  const visible = PIX_ICONS.filter(
    n => (showAll || !usedBy.has(n) || n === current) && (!q || n.includes(q))
  )
  const sheet1 = visible.filter(n => PIX_ICONS.indexOf(n) < FILM_SHEET_START)
  const sheet2 = visible.filter(n => PIX_ICONS.indexOf(n) >= FILM_SHEET_START)

  const Grid = ({ names }: { names: readonly PixName[] }) => (
    <div className="ip-grid">
      {names.map(n => {
        const taken = usedBy.get(n)
        return (
          <button
            key={n}
            type="button"
            className={`ip-cell${n === current ? ' on' : ''}${taken ? ' taken' : ''}`}
            onClick={() => onPick(n)}
            title={taken ? `${n} — used by ${taken}` : n}
            aria-label={taken ? `${n}, used by ${taken}` : n}
            aria-pressed={n === current}
          >
            <PixIcon name={n} size={36} />
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="lightbox-share-backdrop" onClick={onClose}>
      <div className="win-dialog ip-dialog" role="dialog" aria-label={`Icon for ${label}`} onClick={e => e.stopPropagation()}>
        <div className="ip-head">
          <span className="ip-preview">
            <PixIcon name={(current as PixName) || fallback} size={48} />
          </span>
          <div className="ip-head-text">
            <p className="win-dialog-title">Icon for “{label}”</p>
            <p className="win-dialog-note">
              {current ? 'Custom icon' : 'Using the default icon'} · pick any icon below
            </p>
          </div>
        </div>

        <div className="ip-tools">
          <input
            className="win-dialog-field"
            placeholder="Search icons (folder, film, camera…)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <div className="win-view-toggle" role="group" aria-label="Which icons">
            <button
              type="button"
              className={`win-view-btn ip-tab${!showAll ? ' active' : ''}`}
              onClick={() => setShowAll(false)}
              aria-pressed={!showAll}
            >
              Unused
            </button>
            <button
              type="button"
              className={`win-view-btn ip-tab${showAll ? ' active' : ''}`}
              onClick={() => setShowAll(true)}
              aria-pressed={showAll}
            >
              All icons
            </button>
          </div>
        </div>

        <div className="ip-scroll">
          {visible.length === 0 && <p className="win-empty">No icons match “{query}”.</p>}
          {sheet1.length > 0 && (
            <>
              <p className="ip-group">Sheet 1 — everyday</p>
              <Grid names={sheet1} />
            </>
          )}
          {sheet2.length > 0 && (
            <>
              <p className="ip-group">Sheet 2 — film &amp; characters</p>
              <Grid names={sheet2} />
            </>
          )}
        </div>

        <div className="win-dialog-actions ip-actions">
          <button type="button" className="win-btn" onClick={onReset} disabled={!current}>
            <PixIcon name={fallback} size={14} /> Use default
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="win-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
