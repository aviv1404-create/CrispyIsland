'use client'

import { useEffect, useRef, useState } from 'react'
import { ALWAYS, BUBBLE, ODDS } from '@/data/secret'

const ROLL_KEY = 'secret:roll'

/**
 * The secret pop-up: 1 in ODDS visits, the goblin GIF runs onto the desktop
 * a moment after it opens and waits there. Clicking it goes to /secret. The roll
 * happens once per visit (per browser tab session), so moving around the
 * site doesn't re-roll it. `?secret` in the URL always shows it (for testing).
 */
export default function SecretBubble() {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 30, y: 30 })
  // once dragged, the goblin stays where it was dropped (px, not %)
  const [px, setPx] = useState<{ x: number; y: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)

  useEffect(() => {
    let lucky = false
    try {
      const forced = new URLSearchParams(window.location.search).has('secret')
      const prev = sessionStorage.getItem(ROLL_KEY)
      if (forced || ALWAYS) lucky = true
      else if (prev) lucky = prev === 'yes'
      else {
        lucky = Math.random() < 1 / ODDS
        sessionStorage.setItem(ROLL_KEY, lucky ? 'yes' : 'no')
      }
    } catch {
      lucky = Math.random() < 1 / ODDS
    }
    if (!lucky) return
    // somewhere in the middle-ish of the screen, never under the icons
    setPos({ x: 32 + Math.random() * 34, y: 16 + Math.random() * 40 })
    const t = setTimeout(() => setShow(true), 1800)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try {
      sessionStorage.setItem(ROLL_KEY, 'closed')
    } catch {}
  }

  // Drag it out of the way; a click without dragging still opens the page.
  const startDrag = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('.secret-bubble-x')) return
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    const sx = e.clientX
    const sy = e.clientY
    const ox = sx - r.left
    const oy = sy - r.top
    dragged.current = false
    const move = (ev: PointerEvent) => {
      if (!dragged.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
      if (!dragged.current) box.classList.add('dragging')
      dragged.current = true
      setPx({
        x: Math.min(Math.max(ev.clientX - ox, -r.width / 2), window.innerWidth - r.width / 2),
        y: Math.min(Math.max(ev.clientY - oy, 0), window.innerHeight - 40),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      box.classList.remove('dragging')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return (
    <div
      ref={boxRef}
      className={`secret-bubble${px ? ' moved' : ''}`}
      style={px ? { left: px.x, top: px.y } : { left: `${pos.x}%`, top: `${pos.y}%` }}
      onPointerDown={startDrag}
    >
      <a
        href="/secret"
        className="secret-bubble-hit"
        aria-label="Open the secret page"
        title={`${BUBBLE.hint} (drag to move)`}
        draggable={false}
        onClick={e => {
          // the click that ends a drag shouldn't open the page
          if (dragged.current) {
            e.preventDefault()
            dragged.current = false
          }
        }}
      >
        <img src={BUBBLE.image} alt="" className="secret-bubble-art" draggable={false} />
      </a>
      <button type="button" className="secret-bubble-x" onClick={dismiss} aria-label="Close the pop-up" title="Close">
        ×
      </button>
    </div>
  )
}
