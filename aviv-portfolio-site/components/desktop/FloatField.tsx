'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useContextMenu, type MenuItem } from './ContextMenu'

export interface FloatEntry {
  id: string
  label: string
  /** spoken name when the visible label is empty */
  ariaLabel?: string
  /** the picture part of the icon; the label is drawn by the field */
  icon: React.ReactNode
  /** footprint of this icon's cell — photos are wider than folders */
  cell?: { w: number; h: number }
  onOpen: (e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void
  menu?: MenuItem[]
}

interface Point {
  x: number
  y: number
}

interface FloatFieldProps {
  /** localStorage key the arrangement is remembered under */
  scope: string
  entries: FloatEntry[]
  /** 'rows' fills left→right (folder windows); 'right-column' stacks down the right edge (the desktop) */
  arrange?: 'rows' | 'right-column'
  /** false on touch-only/small screens: icons sit in a plain grid and scroll normally */
  draggable?: boolean
  /** extra items for right-clicking empty space, above "Clean Up" */
  backgroundMenu?: MenuItem[]
  /** fill the parent's height (the desktop) instead of growing with content (windows) */
  fill?: boolean
  className?: string
}

const DEFAULT_CELL = { w: 112, h: 118 }
const PAD = 16
const DRAG_THRESHOLD = 4

// ── Remembered arrangement ────────────────────────────
function loadPositions(scope: string): Record<string, Point> {
  try {
    const raw = localStorage.getItem(`icons:${scope}`)
    return raw ? (JSON.parse(raw) as Record<string, Point>) : {}
  } catch {
    return {}
  }
}

function savePositions(scope: string, positions: Record<string, Point>) {
  try {
    localStorage.setItem(`icons:${scope}`, JSON.stringify(positions))
  } catch {
    // private mode / storage full — the arrangement just won't persist
  }
}

function clearPositions(scope: string) {
  try {
    localStorage.removeItem(`icons:${scope}`)
  } catch {}
}

/** Default slots, the way Finder would "Clean Up". */
function gridLayout(
  entries: FloatEntry[],
  width: number,
  height: number,
  arrange: 'rows' | 'right-column'
): Record<string, Point> {
  const out: Record<string, Point> = {}
  if (arrange === 'right-column') {
    let x = width - PAD
    let y = PAD
    let colW = 0
    for (const e of entries) {
      const c = e.cell ?? DEFAULT_CELL
      if (y + c.h > height - PAD && y > PAD) {
        x -= colW + 8
        y = PAD
        colW = 0
      }
      colW = Math.max(colW, c.w)
      out[e.id] = { x: x - c.w, y }
      y += c.h + 6
    }
    return out
  }

  let x = PAD
  let y = PAD
  let rowH = 0
  for (const e of entries) {
    const c = e.cell ?? DEFAULT_CELL
    if (x + c.w > width - PAD && x > PAD) {
      x = PAD
      y += rowH + 10
      rowH = 0
    }
    out[e.id] = { x, y }
    rowH = Math.max(rowH, c.h)
    x += c.w + 10
  }
  return out
}

/**
 * A field of free-floating icons. Drag them anywhere — they lift, tilt with
 * the motion, glide to a stop when let go and bob gently at rest. Click opens,
 * right-click (or long-press) brings up a context menu. The arrangement is
 * remembered per field in localStorage.
 */
export default function FloatField({
  scope,
  entries,
  arrange = 'rows',
  draggable = true,
  backgroundMenu = [],
  fill = false,
  className = '',
}: FloatFieldProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [saved, setSaved] = useState<Record<string, Point>>({})
  const [live, setLive] = useState<{ id: string; p: Point; tilt: number } | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const { openMenu } = useContextMenu()

  // Measure the field; re-measure whenever it changes size.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Saved positions load after mount so server and client render the same grid first.
  useEffect(() => {
    setSaved(loadPositions(scope))
  }, [scope])

  const free = draggable && size !== null
  const defaults = size ? gridLayout(entries, size.w, fill ? size.h : Infinity, arrange) : {}

  const clamp = useCallback(
    (p: Point, cell: { w: number; h: number }): Point => {
      if (!size) return p
      const maxX = Math.max(0, size.w - cell.w)
      const maxY = fill ? Math.max(0, size.h - cell.h) : Number.POSITIVE_INFINITY
      return { x: Math.min(Math.max(0, p.x), maxX), y: Math.min(Math.max(0, p.y), maxY) }
    },
    [size, fill]
  )

  const posOf = (e: FloatEntry): Point => {
    if (live?.id === e.id) return live.p
    const p = saved[e.id] ?? defaults[e.id] ?? { x: PAD, y: PAD }
    return clamp(p, e.cell ?? DEFAULT_CELL)
  }

  // ── Drag with a little physics ───────────────────────
  const drag = useRef<{
    id: string
    pointerId: number
    start: Point
    origin: Point
    last: Point
    lastT: number
    v: Point
    moved: boolean
    cell: { w: number; h: number }
    longPress?: ReturnType<typeof setTimeout>
  } | null>(null)
  const suppressClick = useRef(false)
  const glide = useRef<number | null>(null)

  useEffect(() => () => {
    if (glide.current) cancelAnimationFrame(glide.current)
  }, [])

  const commit = useCallback(
    (id: string, p: Point) => {
      setSaved(prev => {
        const next = { ...prev, [id]: p }
        // Pin every other icon where it currently sits, so moving one icon
        // never reshuffles the rest if the field is later resized.
        for (const e of entries) if (!next[e.id] && defaults[e.id]) next[e.id] = defaults[e.id]
        savePositions(scope, next)
        return next
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope, entries, size]
  )

  const onPointerDown = (e: React.PointerEvent, entry: FloatEntry) => {
    if (e.button !== 0) return
    setSelected(entry.id)
    setOrder(o => [...o.filter(id => id !== entry.id), entry.id])
    if (glide.current) cancelAnimationFrame(glide.current)

    const origin = posOf(entry)
    drag.current = {
      id: entry.id,
      pointerId: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      origin,
      last: { x: e.clientX, y: e.clientY },
      lastT: performance.now(),
      v: { x: 0, y: 0 },
      moved: false,
      cell: entry.cell ?? DEFAULT_CELL,
    }

    // Long-press opens the context menu on touch screens.
    if (e.pointerType === 'touch' && entry.menu?.length) {
      const { clientX, clientY } = e
      drag.current.longPress = setTimeout(() => {
        suppressClick.current = true
        drag.current = null
        openMenu(clientX, clientY, entry.menu!)
      }, 550)
    }

    if (free) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId || !free) return
    const dx = e.clientX - d.start.x
    const dy = e.clientY - d.start.y
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    if (!d.moved) {
      d.moved = true
      if (d.longPress) clearTimeout(d.longPress)
    }

    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    // Smoothed velocity in px/ms, so a flick carries through on release.
    d.v = {
      x: d.v.x * 0.6 + ((e.clientX - d.last.x) / dt) * 0.4,
      y: d.v.y * 0.6 + ((e.clientY - d.last.y) / dt) * 0.4,
    }
    d.last = { x: e.clientX, y: e.clientY }
    d.lastT = now

    const p = clamp({ x: d.origin.x + dx, y: d.origin.y + dy }, d.cell)
    setLive({ id: d.id, p, tilt: Math.max(-9, Math.min(9, d.v.x * 6)) })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    if (d.longPress) clearTimeout(d.longPress)
    drag.current = null
    if (!d.moved) return

    suppressClick.current = true
    // Glide: keep the release velocity, bleed it off with friction, bounce
    // softly off the edges, then settle and remember the spot.
    let p = live?.id === d.id ? live.p : d.origin
    let v = { ...d.v }
    let t = performance.now()
    const step = (now: number) => {
      const dt = Math.min(32, now - t)
      t = now
      p = { x: p.x + v.x * dt, y: p.y + v.y * dt }
      const c = clamp(p, d.cell)
      if (c.x !== p.x) v.x = -v.x * 0.35
      if (c.y !== p.y) v.y = -v.y * 0.35
      p = c
      const friction = Math.pow(0.9, dt / 16)
      v = { x: v.x * friction, y: v.y * friction }
      const speed = Math.hypot(v.x, v.y)
      if (speed < 0.02) {
        glide.current = null
        setLive(null)
        commit(d.id, { x: Math.round(p.x), y: Math.round(p.y) })
        return
      }
      setLive({ id: d.id, p, tilt: Math.max(-9, Math.min(9, v.x * 6)) })
      glide.current = requestAnimationFrame(step)
    }
    glide.current = requestAnimationFrame(step)
  }

  const onClick = (e: React.MouseEvent, entry: FloatEntry) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    entry.onOpen({ metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
  }

  const onIconMenu = (e: React.MouseEvent, entry: FloatEntry) => {
    e.preventDefault()
    e.stopPropagation()
    setSelected(entry.id)
    if (entry.menu?.length) openMenu(e.clientX, e.clientY, entry.menu)
  }

  const cleanUp = () => {
    clearPositions(scope)
    setSaved({})
  }

  const onFieldMenu = (e: React.MouseEvent) => {
    if (!draggable) return
    e.preventDefault()
    openMenu(e.clientX, e.clientY, [
      ...backgroundMenu,
      ...(backgroundMenu.length ? [{ separator: true } as MenuItem] : []),
      { label: 'Clean Up', onSelect: cleanUp },
    ])
  }

  // Windows grow to fit their icons; the desktop is a fixed surface.
  let contentH = 0
  if (free && !fill) {
    for (const e of entries) {
      const c = e.cell ?? DEFAULT_CELL
      contentH = Math.max(contentH, posOf(e).y + c.h + PAD)
    }
  }

  return (
    <div
      ref={ref}
      className={`float-field${free ? ' free' : ''}${fill ? ' fill' : ''} ${className}`}
      style={free && !fill ? { height: contentH } : undefined}
      onContextMenu={onFieldMenu}
      onPointerDown={e => {
        if (e.target === e.currentTarget) setSelected(null)
      }}
    >
      {entries.map((entry, i) => {
        const cell = entry.cell ?? DEFAULT_CELL
        const p = free ? posOf(entry) : null
        const isLive = live?.id === entry.id
        const z = order.indexOf(entry.id) + 1
        return (
          <button
            key={entry.id}
            type="button"
            className={`float-icon${isLive ? ' lifted' : ''}${selected === entry.id ? ' selected' : ''}`}
            style={{
              width: cell.w,
              height: cell.h,
              ...(p
                ? {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
                    zIndex: isLive ? 1000 : z,
                  }
                : {}),
              // stagger the idle bob so the field breathes rather than marches
              ['--bob-delay' as string]: `${-((i * 1.37) % 6)}s`,
              ['--tilt' as string]: `${isLive ? live!.tilt : 0}deg`,
            }}
            onPointerDown={e => onPointerDown(e, entry)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={e => onClick(e, entry)}
            onContextMenu={e => onIconMenu(e, entry)}
            onKeyDown={e => {
              if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && entry.menu?.length) {
                e.preventDefault()
                const r = e.currentTarget.getBoundingClientRect()
                openMenu(r.left + r.width / 2, r.top + r.height / 2, entry.menu)
              }
            }}
            aria-label={entry.ariaLabel || entry.label}
          >
            <span className="float-icon-body">
              <span className="float-icon-pic">{entry.icon}</span>
              {entry.label && <span className="float-icon-label">{entry.label}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
