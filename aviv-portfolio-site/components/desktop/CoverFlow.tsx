'use client'

import { useEffect, useRef } from 'react'

export interface FlowItem {
  id: string
  src?: string
  title: string
  sub?: string
  /** a rotate-* class for photos turned in the admin */
  className?: string
}

/**
 * Cover Flow, iPod style: the current item faces you, its neighbours turn
 * away to each side with a mirror reflection underneath. ← → / swipe /
 * scroll wheel / clicking a side item moves; clicking (or Enter on) the
 * middle one opens it.
 */
export default function CoverFlow({
  items,
  index,
  onIndex,
  onOpen,
  active = true,
  shape = 'poster',
}: {
  items: FlowItem[]
  index: number
  onIndex: (i: number) => void
  onOpen: (i: number) => void
  /** listen to the keyboard (only the front window should) */
  active?: boolean
  shape?: 'poster' | 'photo'
}) {
  const at = Math.max(0, Math.min(index, items.length - 1))
  const go = (i: number) => onIndex(Math.max(0, Math.min(items.length - 1, i)))
  const goRef = useRef(go)
  goRef.current = go
  const openRef = useRef(onOpen)
  openRef.current = onOpen

  useEffect(() => {
    if (!active) return
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      if (e.key === 'ArrowLeft') (e.preventDefault(), goRef.current(at - 1))
      else if (e.key === 'ArrowRight') (e.preventDefault(), goRef.current(at + 1))
      else if (e.key === 'Enter') (e.preventDefault(), openRef.current(at))
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [active, at])

  // trackpad / wheel: one step per flick
  const wheelLock = useRef(0)
  const onWheel = (e: React.WheelEvent) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(d) < 8 || Date.now() < wheelLock.current) return
    wheelLock.current = Date.now() + 220
    go(at + (d > 0 ? 1 : -1))
  }
  const touch = useRef<number | null>(null)

  return (
    <div
      className={`cf cf-${shape}`}
      onWheel={onWheel}
      onTouchStart={e => (touch.current = e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touch.current == null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1) * (Math.abs(dx) > 220 ? 2 : 1))
      }}
      role="listbox"
      aria-label="Cover Flow"
      aria-activedescendant={items[at] ? `cf-${items[at].id}` : undefined}
    >
      <div className="cf-stage">
        {items.map((it, i) => {
          const d = i - at
          if (Math.abs(d) > 7) return null
          const side = Math.sign(d)
          const style: React.CSSProperties = {
            transform:
              d === 0
                ? 'translateX(-50%) translateZ(80px)'
                : `translateX(calc(-50% + ${side} * (var(--cf-gap) + ${Math.abs(d) - 1} * var(--cf-step)))) rotateY(${-side * 62}deg)`,
            zIndex: 100 - Math.abs(d),
            opacity: Math.abs(d) > 5 ? 0 : 1,
          }
          return (
            <button
              key={it.id}
              id={`cf-${it.id}`}
              type="button"
              role="option"
              aria-selected={d === 0}
              aria-label={it.title}
              className={`cf-item${d === 0 ? ' on' : ''}`}
              style={style}
              onClick={() => (d === 0 ? onOpen(i) : go(i))}
              tabIndex={d === 0 ? 0 : -1}
            >
              <span className="cf-art">
                {it.src ? (
                  <img src={it.src} alt="" draggable={false} className={it.className} loading={Math.abs(d) > 3 ? 'lazy' : 'eager'} />
                ) : (
                  <span className="cf-blank">{it.title}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {items[at] && (
        <div className="cf-caption" aria-live="polite">
          <strong>{items[at].title}</strong>
          {items[at].sub && <span>{items[at].sub}</span>}
        </div>
      )}
      {items.length > 1 && (
        <input
          className="cf-scrub"
          type="range"
          min={0}
          max={items.length - 1}
          value={at}
          onChange={e => go(Number(e.target.value))}
          aria-label="Scroll through"
        />
      )}
    </div>
  )
}
