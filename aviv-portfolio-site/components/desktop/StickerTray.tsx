'use client'

import { useEffect, useRef, useState } from 'react'
import { SHOW_COUNT, STICKERS } from '@/data/stickers'
import { foundStickers, markShown, shownStickers, STICKER_EVENT } from '@/lib/stickers'
import { GUIDE_EVENT } from './Guide'

/** A little tilt per sticker, so they look slapped on by hand. */
const TILT: Record<string, number> = { goblin: -7, pirate: 6, guide: -3 }
const POS_KEY = 'stickers:pos'
type Pos = Record<string, { x: number; y: number }>

function loadPos(): Pos {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || '{}') as Pos
  } catch {
    return {}
  }
}

/**
 * The collected stickers, stuck to the desktop. They start in a row in the
 * bottom-left corner; each can be peeled off and stuck anywhere (it slaps
 * back down where it's dropped, and the spot is remembered). A newly found
 * sticker flies in and slaps down with a wobble. Click one to visit its secret.
 */
export default function StickerTray({ mobile = false }: { mobile?: boolean }) {
  const [found, setFound] = useState<Record<string, number>>({})
  const [fresh, setFresh] = useState<string[]>([])
  const [restuck, setRestuck] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [pos, setPos] = useState<Pos>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const layer = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)

  useEffect(() => {
    const sync = () => {
      setPos(loadPos())
      const f = foundStickers()
      setFound(f)
      const shown = shownStickers()
      const isNew = Object.keys(f).filter(id => !shown.includes(id))
      if (isNew.length) {
        setFresh(isNew)
        const first = STICKERS.find(s => s.id === isNew[0])
        if (first) setNote(first.title.split(' — ')[0])
        markShown([...shown, ...isNew])
        setTimeout(() => setFresh([]), 1600)
        setTimeout(() => setNote(null), 3600)
      }
    }
    sync()
    window.addEventListener(STICKER_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(STICKER_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // ── Peel off and re-stick ───────────────────────────
  const onDown = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const box = layer.current?.getBoundingClientRect()
    const r = e.currentTarget.getBoundingClientRect()
    if (!box) return
    drag.current = { id, dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    const box = layer.current?.getBoundingClientRect()
    if (!d || !box) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return
    if (!d.moved) {
      d.moved = true
      setDragId(d.id)
    }
    const w = e.currentTarget.offsetWidth
    const h = e.currentTarget.offsetHeight
    const x = Math.min(Math.max(0, e.clientX - box.left - d.dx), box.width - w)
    const y = Math.min(Math.max(0, e.clientY - box.top - d.dy), box.height - h)
    setPos(p => ({ ...p, [d.id]: { x: Math.round(x), y: Math.round(y) } }))
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    swallowClick.current = true
    setDragId(null)
    // stick it down where it landed — same slap, just shorter
    setRestuck(d.id)
    setTimeout(() => setRestuck(r => (r === d.id ? null : r)), 700)
    setPos(p => {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(p))
      } catch {}
      return p
    })
  }
  const onClick = (e: React.MouseEvent, action?: 'guide') => {
    if (swallowClick.current) {
      swallowClick.current = false
      e.preventDefault()
      return
    }
    if (action === 'guide') window.dispatchEvent(new Event(GUIDE_EVENT))
  }

  const mine = STICKERS.filter(s => found[s.id]).sort((a, b) => found[a.id] - found[b.id])
  if (!mine.length) return null

  const sticker = (s: (typeof STICKERS)[number], placed: boolean) => {
    const cls = `sticker${fresh.includes(s.id) ? ' slap' : ''}${restuck === s.id ? ' restick' : ''}${dragId === s.id ? ' peeled' : ''}${placed ? ' placed' : ''}`
    const style: React.CSSProperties = {
      ['--tilt' as string]: `${TILT[s.id] ?? 0}deg`,
      ...(placed ? { left: pos[s.id].x, top: pos[s.id].y } : {}),
    }
    const body = <img src={s.image} alt="" draggable={false} style={{ height: s.size ?? 80 }} />
    const handlers = {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => onDown(e, s.id),
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onUp,
    }
    return s.href ? (
      <a key={s.id} className={cls} style={style} href={s.href} title={s.title} aria-label={s.title} draggable={false} onClick={e => onClick(e)} {...handlers}>
        {body}
      </a>
    ) : (
      <button key={s.id} type="button" className={cls} style={style} title={s.title} aria-label={s.title} onClick={e => onClick(e, s.action)} {...handlers}>
        {body}
      </button>
    )
  }

  return (
    <div ref={layer} className={`sticker-layer${mobile ? ' mobile' : ''}`} aria-label="Stickers you found">
      {note && (
        <span className="stickers-note" role="status">
          ★ Sticker found: {note}!
        </span>
      )}
      {/* One list, so a sticker keeps hold of the pointer while it's peeled
          out of the row; moved ones are positioned against the whole desktop. */}
      <div className="stickers">
        {mine.map(s => sticker(s, !!pos[s.id]))}
        {SHOW_COUNT && (
          <span className="stickers-count" title="Stickers found">
            {mine.length}/{STICKERS.length}
          </span>
        )}
      </div>
    </div>
  )
}
