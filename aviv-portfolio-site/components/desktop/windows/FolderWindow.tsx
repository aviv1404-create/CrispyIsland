'use client'

import { useState } from 'react'
import PixIcon from '@/components/PixIcon'
import { breadcrumb, childFolders, folderById, folderCover, itemsIn } from '@/lib/tree-query'
import { itemThumb, rotClass } from '@/lib/types'
import FloatField from '../FloatField'
import { folderContents } from '../entries'
import { SearchGlyph, folderIconFor, itemIconFor } from '../icons'
import { setViewMode, useViewMode, type ViewMode } from '../useViewMode'
import CoverFlow from '../CoverFlow'
import Window from '../Window'
import type { FrameProps } from './frame'

export default function FolderWindow({ frame, folderId }: { frame: FrameProps; folderId: string }) {
  const { api, win } = frame
  const { tree } = api
  const view = useViewMode()
  const [query, setQuery] = useState('')
  const [flowAt, setFlowAt] = useState(0)
  const [flowFor, setFlowFor] = useState(folderId)
  if (flowFor !== folderId) {
    setFlowFor(folderId)
    setFlowAt(0)
  }
  const folder = folderById(tree, folderId)

  if (!folder) {
    return (
      <Window {...frame} title="Missing folder" size={{ w: 420, h: 220 }} status="">
        <p className="win-empty">This folder has moved or been removed.</p>
      </Window>
    )
  }

  const crumbs = breadcrumb(tree, folder.id)
  const folders = childFolders(tree, folder.id)
  const items = itemsIn(tree, folder.id)
  const count = folders.length + items.length
  const entries = folderContents(tree, folder.id, api, win.id)
  const parent = folder.parentId

  const goUp = () => {
    if (win.back.length) api.goBack(win.id)
    else if (parent) api.open({ kind: 'folder', folderId: parent }, { inWindow: win.id })
  }

  const toolbar = (
    <div className="win-toolbar">
      <button
        type="button"
        className="win-back"
        onClick={goUp}
        disabled={!win.back.length && !parent}
        aria-label="Back"
      >
        <PixIcon name="arrow-left" size={14} />
      </button>

      <nav className="win-crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.id}>
            {i > 0 && <span className="win-crumb-sep">▸</span>}
            {i === crumbs.length - 1 ? (
              <span className="win-crumb-current">{c.name}</span>
            ) : (
              <button
                type="button"
                className="win-crumb-btn"
                onClick={() => api.open({ kind: 'folder', folderId: c.id }, { inWindow: win.id })}
              >
                {c.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      <form
        className="win-search"
        onSubmit={e => {
          e.preventDefault()
          if (query.trim()) api.open({ kind: 'search', q: query.trim() })
        }}
      >
        <SearchGlyph />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search photos and folders"
        />
      </form>

      <div className="win-view-toggle" role="group" aria-label="View">
        <ViewBtn mode="icons" label="Icons" />
        <ViewBtn mode="gallery" label="Gallery" />
        <ViewBtn mode="list" label="List" />
        <ViewBtn mode="flow" label="Cover Flow" />
      </div>
    </div>
  )

  const open = entries

  // Cover Flow: subfolders first (their cover photo), then the photos.
  const flowItems = [
    ...folders.map(f => ({ id: `f:${f.id}`, src: folderCover(tree, f), title: f.name, sub: 'Folder' })),
    ...items.map((it, i) => ({
      id: `i:${it.id}`,
      src: itemThumb(it) || undefined,
      title: it.title || `${i + 1} of ${items.length}`,
      sub: it.caption,
      className: rotClass(it),
    })),
  ]

  return (
    <Window
      {...frame}
      title={folder.name}
      size={{ w: 820, h: 560 }}
      minSize={{ w: 320, h: 240 }}
      toolbar={toolbar}
      status={`${count} ${count === 1 ? 'item' : 'items'}`}
    >
      <div className={`dwin-scroll${view === 'flow' && count > 0 ? ' is-flow' : ''}`}>
        {count === 0 ? (
          <p className="win-empty">Content coming soon</p>
        ) : view === 'icons' ? (
          <FloatField
            scope={`folder:${folder.id}`}
            entries={entries}
            draggable={!api.isMobile}
            backgroundMenu={[
              { label: 'View as Gallery', onSelect: () => setViewMode('gallery') },
              { label: 'View as List', onSelect: () => setViewMode('list') },
            ]}
          />
        ) : view === 'flow' ? (
          <div className="folder-flow">
            <CoverFlow
              key={folder.id}
              items={flowItems}
              index={flowAt}
              onIndex={setFlowAt}
              onOpen={i => {
                const e = open.find(x => x.id === flowItems[i].id)
                e?.onOpen({ metaKey: false, ctrlKey: false, shiftKey: false })
              }}
              active={frame.active}
              shape="photo"
            />
          </div>
        ) : view === 'list' ? (
          <div className="folder-list dwin-pad">
            {open.map(e => (
              <button
                key={e.id}
                type="button"
                className="folder-row"
                onClick={ev => e.onOpen(ev)}
              >
                <span className="folder-row-thumb">{rowThumb(e.id)}</span>
                <span className="folder-row-label">{e.label}</span>
                <span className="folder-row-meta">{rowKind(e.id)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="dwin-pad">
            {folders.length > 0 && (
              <div className="gallery-folders">
                {open
                  .filter(e => e.id.startsWith('f:'))
                  .map(e => (
                    <button key={e.id} type="button" className="gallery-folder" onClick={ev => e.onOpen(ev)}>
                      <span className="gallery-folder-pic">{e.icon}</span>
                      <span className="folder-label">{e.label}</span>
                    </button>
                  ))}
              </div>
            )}
            {items.length > 0 && (
              <div className={`item-grid${folders.length ? ' spaced' : ''}`}>
                {items.map(item => {
                  const entry = open.find(e => e.id === `i:${item.id}`)!
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`item-tile${item.kind === 'film' ? ' poster' : ''}`}
                      onClick={ev => entry.onOpen(ev)}
                      aria-label={entry.label}
                    >
                      {itemThumb(item) ? (
                        <img src={itemThumb(item)} alt={item.alt} loading="lazy" className={rotClass(item)} />
                      ) : (
                        <span className="item-tile-blank">{item.kind === 'film' ? 'FILM' : 'PHOTO'}</span>
                      )}
                      {(item.kind === 'film' || (item.kind === 'photo' && item.youtubeUrl)) && (
                        <span className="item-play">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      )}
                      {item.kind === 'film' && item.title && (
                        <span className="item-tile-title">{item.title}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Window>
  )

  function rowThumb(entryId: string) {
    if (entryId.startsWith('f:')) {
      const f = folderById(tree, entryId.slice(2))
      return <PixIcon name={f ? folderIconFor(f).name : 'folder'} size={22} />
    }
    const item = items.find(i => `i:${i.id}` === entryId)
    return <PixIcon name={item ? itemIconFor(item, folder) : 'file-blank'} size={22} />
  }

  function rowKind(entryId: string) {
    if (entryId.startsWith('f:')) return 'Folder'
    const item = items.find(i => `i:${i.id}` === entryId)
    if (item?.kind === 'film') return 'Film'
    return item?.kind === 'photo' && item.youtubeUrl ? 'Video' : 'Photo'
  }
}

function ViewBtn({ mode, label }: { mode: ViewMode; label: string }) {
  const view = useViewMode()
  return (
    <button
      type="button"
      className={`win-view-btn${view === mode ? ' active' : ''}`}
      onClick={() => setViewMode(mode)}
      aria-label={`${label} view`}
      aria-pressed={view === mode}
      title={label}
    >
      <PixIcon name={mode === 'icons' ? 'move' : mode === 'gallery' ? 'grid' : mode === 'list' ? 'list' : 'layers'} size={16} />
    </button>
  )
}
