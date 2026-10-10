'use client'

import { useState } from 'react'
import { search } from '@/lib/tree-query'
import FloatField from '../FloatField'
import { folderEntry, itemEntry } from '../entries'
import { SearchGlyph } from '../icons'
import Window from '../Window'
import type { FrameProps } from './frame'

/** V6 — matches folder names, titles, captions, alt text and tags. */
export default function SearchWindow({ frame, q }: { frame: FrameProps; q: string }) {
  const { api, win } = frame
  const [draft, setDraft] = useState(q)
  // Follow the query when it's changed from outside (another window's search box).
  const [shownQ, setShownQ] = useState(q)
  if (shownQ !== q) {
    setShownQ(q)
    setDraft(q)
  }

  const { folders, items } = search(api.tree, q)
  const total = folders.length + items.length
  const entries = [
    ...folders.map(f => folderEntry(api.tree, f, api)),
    ...items.map(i => itemEntry(api.tree, i, api)),
  ]

  const toolbar = (
    <div className="win-toolbar">
      <form
        className="win-search wide"
        onSubmit={e => {
          e.preventDefault()
          api.replaceSpec(win.id, { kind: 'search', q: draft.trim() })
        }}
      >
        <SearchGlyph />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Search folders, captions and tags"
          aria-label="Search"
          autoFocus={!q}
        />
      </form>
    </div>
  )

  return (
    <Window
      {...frame}
      title={q ? `Search: ${q}` : 'Search'}
      size={{ w: 720, h: 500 }}
      toolbar={toolbar}
      status={q ? `${total} ${total === 1 ? 'result' : 'results'}` : 'Type to search folders, captions and tags'}
    >
      <div className="dwin-scroll">
        {!q ? (
          <p className="win-empty">Search folders, captions and tags</p>
        ) : total === 0 ? (
          <p className="win-empty">No matches for “{q}”</p>
        ) : (
          <FloatField key={q} scope={`search:${q}`} entries={entries} draggable={!api.isMobile} />
        )}
      </div>
    </Window>
  )
}
