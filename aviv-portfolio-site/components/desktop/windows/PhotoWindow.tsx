'use client'

import { rotClass } from '@/lib/types'
import { useEffect, useRef } from 'react'
import { folderById, itemById } from '@/lib/tree-query'
import { getEmbedUrl } from '@/lib/video'
import { photosIn, quickLookList } from '../entries'
import PixIcon from '@/components/PixIcon'
import Window from '../Window'
import type { FrameProps } from './frame'

/** A single photo in its own window — Preview, more or less. */
export default function PhotoWindow({ frame, itemId }: { frame: FrameProps; itemId: string }) {
  const { api, win, active } = frame
  const { tree } = api
  const item = itemById(tree, itemId)
  const photo = item?.kind === 'photo' ? item : null
  const siblings = photo && !photo.youtubeUrl ? photosIn(tree, photo.folderId) : []
  const index = siblings.findIndex(p => p.id === itemId)

  const step = (delta: number) => {
    if (siblings.length < 2 || index < 0) return
    const next = siblings[(index + delta + siblings.length) % siblings.length]
    api.replaceSpec(win.id, { kind: 'photo', itemId: next.id })
  }

  const swipe = useRef<number | null>(null)

  // Arrow keys flip through the folder while this is the front window.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        step(-1)
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        step(1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!photo) {
    return (
      <Window {...frame} title="Missing photo" size={{ w: 420, h: 220 }} status="">
        <p className="win-empty">This photo has moved or been removed.</p>
      </Window>
    )
  }

  const folder = folderById(tree, photo.folderId)
  const title = photo.title || photo.caption || folder?.name || 'Photo'
  const embed = photo.youtubeUrl ? getEmbedUrl(photo.youtubeUrl) : null
  const caption = [photo.title, photo.caption].filter(Boolean).join(' — ')

  const toolbar = (
    <div className="win-toolbar dark">
      {siblings.length > 1 && (
        <div className="win-seg">
          <button type="button" onClick={() => step(-1)} aria-label="Previous photo">
            <PixIcon name="arrow-left" size={14} />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next photo">
            <PixIcon name="arrow-right" size={14} />
          </button>
        </div>
      )}
      <span className="win-toolbar-label">
        {folder?.name}
        {index >= 0 && siblings.length > 1 && ` — ${index + 1} of ${siblings.length}`}
      </span>
      <span style={{ flex: 1 }} />
      {!embed && (
        <button
          type="button"
          className="win-btn ghost"
          onClick={() => {
            const list = quickLookList(tree, photo.folderId)
            api.quickLook(list, Math.max(0, list.findIndex(p => p.id === photo.id)), folder?.name)
          }}
        >
          <PixIcon name="expand" size={12} /> Full Screen
        </button>
      )}
      <button type="button" className="win-btn ghost" onClick={() => api.copyLink(`/p/${photo.id}`)}>
        <PixIcon name="link" size={12} /> Copy Link
      </button>
    </div>
  )

  return (
    <Window
      {...frame}
      title={title}
      size={{ w: 760, h: 580 }}
      minSize={{ w: 300, h: 240 }}
      dark
      toolbar={toolbar}
      status={caption || ' '}
    >
      <div
        className="photo-stage"
        onTouchStart={e => (swipe.current = e.touches[0].clientX)}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - (swipe.current ?? e.changedTouches[0].clientX)
          swipe.current = null
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
        }}
      >
        {!embed && siblings.length > 1 && (
          <>
            <button type="button" className="photo-nav prev" onClick={() => step(-1)} aria-label="Previous photo" title="Previous (←)">
              <PixIcon name="arrow-left" size={22} />
            </button>
            <button type="button" className="photo-nav next" onClick={() => step(1)} aria-label="Next photo" title="Next (→)">
              <PixIcon name="arrow-right" size={22} />
            </button>
          </>
        )}
        {embed ? (
          <iframe
            src={embed.embedSrc}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : photo.src ? (
          <img src={photo.src} alt={photo.alt || title} draggable={false} key={photo.id} className={rotClass(photo)} />
        ) : (
          <div className="lightbox-missing">Image coming soon</div>
        )}
        {/* load the neighbours ahead, so arrowing through feels instant */}
        {index >= 0 && siblings.length > 1 && (
          <span hidden aria-hidden="true">
            {[1, -1].map(d => {
              const n = siblings[(index + d + siblings.length) % siblings.length]
              return n.kind === 'photo' && n.src ? <img key={n.id} src={n.src} alt="" loading="eager" /> : null
            })}
          </span>
        )}
      </div>
    </Window>
  )
}
