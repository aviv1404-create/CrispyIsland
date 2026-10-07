'use client'

import { useState } from 'react'
import PixIcon from '@/components/PixIcon'
import { eventsOf, type EventInfo } from '@/data/events'
import { folderCover, itemsIn } from '@/lib/tree-query'
import type { Tree } from '@/lib/types'
import { itemThumb, rotClass } from '@/lib/types'
import CoverFlow from '../CoverFlow'
import Window from '../Window'
import type { FrameProps } from './frame'

function eventFolder(tree: Tree, ev: EventInfo) {
  return ev.folderSlug ? tree.folders.find(f => f.slug === ev.folderSlug) : undefined
}
function posterFor(tree: Tree, ev: EventInfo) {
  if (ev.poster) return ev.poster
  const f = eventFolder(tree, ev)
  return f ? folderCover(tree, f) : undefined
}

/**
 * Events: a Cover Flow of posters; open one for its details and a second
 * Cover Flow of the photos from that night.
 */
export default function EventsWindow({ frame }: { frame: FrameProps }) {
  const { api, active } = frame
  const { tree } = api
  const [at, setAt] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [photoAt, setPhotoAt] = useState(0)
  const EVENTS = eventsOf(tree)
  const ev = openId ? EVENTS.find(e => e.id === openId) : undefined

  const posters = EVENTS.map(e => ({
    id: e.id,
    src: posterFor(tree, e),
    title: e.title,
    sub: [e.date, e.place].filter(Boolean).join(' · '),
  }))

  if (!ev) {
    return (
      <Window
        {...frame}
        title="Events"
        size={{ w: 860, h: 560 }}
        minSize={{ w: 320, h: 360 }}
        dark
        status={EVENTS.length ? '← → to browse · click the poster to open' : 'No events yet'}
      >
        <div className="ev">
          {EVENTS.length ? (
            <CoverFlow
              items={posters}
              index={at}
              onIndex={setAt}
              onOpen={i => {
                setOpenId(EVENTS[i].id)
                setPhotoAt(0)
              }}
              active={active}
            />
          ) : (
            <p className="win-empty">Events coming soon.</p>
          )}
        </div>
      </Window>
    )
  }

  const folder = eventFolder(tree, ev)
  const photos = folder ? itemsIn(tree, folder.id).filter(i => i.kind === 'photo' && !i.youtubeUrl) : []
  const flow = photos.map((p, i) => ({
    id: p.id,
    src: itemThumb(p),
    title: p.title || `${i + 1} of ${photos.length}`,
    sub: p.caption,
    className: rotClass(p),
  }))
  const look = photos.map(p => ({
    id: p.id,
    src: itemThumb(p),
    alt: p.alt || ev.title,
    title: p.title,
    caption: p.caption,
    rotate: p.kind === 'photo' ? p.rotate : undefined,
  }))
  const poster = posterFor(tree, ev)

  const toolbar = (
    <div className="win-toolbar dark">
      <button type="button" className="win-back" onClick={() => setOpenId(null)} aria-label="Back to all events">
        <PixIcon name="arrow-left" size={14} />
      </button>
      <span className="win-toolbar-label">Events ▸ {ev.title}</span>
    </div>
  )

  return (
    <Window
      {...frame}
      title={ev.title}
      size={{ w: 860, h: 600 }}
      minSize={{ w: 320, h: 380 }}
      dark
      toolbar={toolbar}
      status={photos.length ? `${photos.length} photos · click the middle photo for full screen` : ' '}
    >
      <div className="ev ev-detail">
        <header className="ev-head">
          {poster && <img className="ev-poster" src={poster} alt="" />}
          <div className="ev-info">
            <h2>{ev.title}</h2>
            {(ev.date || ev.place) && <p className="ev-meta">{[ev.date, ev.place].filter(Boolean).join(' · ')}</p>}
            {ev.about && <p className="ev-about">{ev.about}</p>}
            {ev.link && (
              <a className="win-btn ghost" href={ev.link.href} target="_blank" rel="noopener">
                {ev.link.label} ↗
              </a>
            )}
          </div>
        </header>
        {photos.length ? (
          <CoverFlow
            items={flow}
            index={photoAt}
            onIndex={setPhotoAt}
            onOpen={i => api.quickLook(look, i, ev.title)}
            active={active}
            shape="photo"
          />
        ) : (
          <p className="win-empty">Photos coming soon.</p>
        )}
      </div>
    </Window>
  )
}
