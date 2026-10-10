'use client'

import { useState } from 'react'
import { gameById } from '@/data/games'
import { childFolders, itemsIn } from '@/lib/tree-query'
import { itemThumb, rotClass } from '@/lib/types'
import DosPlayer from '../DosPlayer'
import Window from '../Window'
import type { FrameProps } from './frame'

/**
 * A game's own window: Play (the DOS game, in the browser) and a second tab
 * with photos — for Sochar HaYam, the clothing made for the game: the photos
 * listed in data/games.ts, plus any uploaded in the admin to a folder whose
 * slug matches (e.g. a folder named "Sochar HaYam" in any section).
 */
export default function GameWindow({ frame, gameId }: { frame: FrameProps; gameId: string }) {
  const { api } = frame
  const game = gameById(gameId)
  const [tab, setTab] = useState<'play' | 'photos'>('play')

  if (!game) {
    return (
      <Window {...frame} title="Missing game" size={{ w: 420, h: 220 }} status="">
        <p className="win-empty">This game isn’t here any more.</p>
      </Window>
    )
  }

  const folder = api.tree.folders.find(f => f.slug === game.folderSlug)
  const items = folder ? itemsIn(api.tree, folder.id) : []
  const subfolders = folder ? childFolders(api.tree, folder.id) : []
  const photoCount = game.photos.length + items.length
  const staticLook = game.photos.map((p, i) => ({ id: `${game.id}-${i}`, src: p.src, alt: p.title, title: p.title }))

  const toolbar = (
    <div className="win-toolbar dark game-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'play'} className={tab === 'play' ? 'on' : ''} onClick={() => setTab('play')}>
        <img src={game.icon} alt="" /> Play
      </button>
      <button type="button" role="tab" aria-selected={tab === 'photos'} className={tab === 'photos' ? 'on' : ''} onClick={() => setTab('photos')}>
        {game.folderTab}
        {photoCount > 0 && <span className="game-count">{photoCount}</span>}
      </button>
    </div>
  )

  return (
    <Window
      {...frame}
      title={`${game.name} — ${game.subtitle}`}
      size={{ w: 760, h: 600 }}
      minSize={{ w: 360, h: 320 }}
      dark
      toolbar={toolbar}
      status={tab === 'play' ? game.howTo : `${photoCount} photos`}
    >
      {/* The DOS machine stays mounted while you look at the photos. */}
      <div className="game-pane" hidden={tab !== 'play'}>
        <DosPlayer bundle={game.bundle} cover={game.cover} label={game.subtitle} />
        <p className="game-credits">{game.credits}</p>
      </div>

      {tab === 'photos' && (
        <div className="game-pane game-photos">
          {game.shop && (
            <div className="game-shop">
              <span>{game.shop.text}</span>
              <a className="game-shop-btn" href={game.shop.href} target="_blank" rel="noopener">
                {game.shop.button} ↗
              </a>
            </div>
          )}
          {subfolders.length > 0 && (
            <div className="game-subs">
              {subfolders.map(f => (
                <button key={f.id} type="button" className="win-btn ghost" onClick={() => api.open({ kind: 'folder', folderId: f.id })}>
                  {f.name}
                </button>
              ))}
            </div>
          )}
          {photoCount === 0 ? (
            <p className="win-empty">Photos coming soon.</p>
          ) : (
            <div className="item-grid">
              {game.photos.map((ph, i) => (
                <button
                  key={ph.src}
                  type="button"
                  className="item-tile"
                  onClick={() => api.quickLook(staticLook, i, game.folderTab)}
                  aria-label={ph.title}
                >
                  <img src={ph.src} alt={ph.title} loading="lazy" />
                  <span className="item-tile-title">{ph.title}</span>
                </button>
              ))}
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`item-tile${item.kind === 'film' ? ' poster' : ''}`}
                  onClick={() =>
                    api.open(item.kind === 'film' ? { kind: 'film', itemId: item.id } : { kind: 'photo', itemId: item.id })
                  }
                >
                  {itemThumb(item) ? (
                    <img src={itemThumb(item)} alt={item.alt} loading="lazy" className={rotClass(item)} />
                  ) : (
                    <span className="item-tile-blank">PHOTO</span>
                  )}
                  {item.title && <span className="item-tile-title">{item.title}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Window>
  )
}
