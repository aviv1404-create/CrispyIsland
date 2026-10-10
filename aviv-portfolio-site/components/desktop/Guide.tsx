'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GUIDE, GUIDE_STEPS, type GuideSpot, type GuideSprite } from '@/data/guide'

const SEEN_KEY = 'guide:seen'
/** Fired by the desktop's right-click menu ("Show the guide"). */
export const GUIDE_EVENT = 'crispy:guide'

type Phase = 'off' | 'hello' | 'tour' | 'leaving'
type Pos = { x: number; y: number }

const W = Math.round((GUIDE.height * 92) / 131)
const H = GUIDE.height
const SPEED = 420 // px per second
const MAX_WALK = 2600 // ms — long trips just go a bit faster

/**
 * A small stick-figure guide for first-time visitors. He never blocks
 * anything: he stands in a corner, talks in speech bubbles, and only does the
 * tour if clicked. "×" sends him away for good (until "Show the guide").
 */
export default function Guide({ enabled }: { enabled: boolean }) {
  const [phase, setPhase] = useState<Phase>('off')
  const [pos, setPos] = useState<Pos>({ x: -120, y: 0 })
  const [dur, setDur] = useState(0)
  const [sprite, setSprite] = useState<GuideSprite>('walk')
  const [flip, setFlip] = useState(false)
  const [walking, setWalking] = useState(false)
  const [step, setStep] = useState(-1)
  const [bubble, setBubble] = useState(false)
  const posRef = useRef(pos)
  posRef.current = pos
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const spot = useCallback((s: GuideSpot): Pos => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    // home: the bottom-left corner, just right of the Instagram/TikTok icons
    const tt = document.querySelector('[data-entry="tiktok"]')?.getBoundingClientRect()
    const corner = { x: tt && tt.width && tt.left < vw / 2 ? tt.right + 10 : 18, y: vh - H - 16 }
    const near = (sel: string, side: 'left' | 'right'): Pos | null => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (!r.width) return null
      return { x: side === 'left' ? r.left - W - 8 : r.right + 8, y: r.bottom - H }
    }
    const p =
      s === 'corner'
        ? corner
        : s === 'center'
          ? { x: vw / 2 - W / 2, y: vh / 2 - H / 2 }
          : s === 'icons'
            ? near('[data-entry="f:cinema"]', 'left') ?? corner
            : s === 'tv'
              ? near('[data-entry="tv"]', 'left') ?? corner
              : near('.mp', 'right') ?? corner
    return { x: Math.min(Math.max(8, p.x), vw - W - 8), y: Math.min(Math.max(70, p.y), vh - H - 8) }
  }, [])

  // Walk somewhere, then call `then`.
  const walkTo = useCallback((to: Pos, then: () => void) => {
    const from = posRef.current
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    if (dist < 4) return then()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = reduce ? 0 : Math.min(MAX_WALK, Math.max(500, (dist / SPEED) * 1000))
    setFlip(GUIDE.walkFacesLeft ? to.x > from.x : to.x < from.x)
    setSprite('walk')
    setWalking(true)
    setBubble(false)
    setDur(ms)
    setPos(to)
    later(() => {
      setWalking(false)
      setFlip(false)
      then()
    }, ms + 30)
  }, [])

  const hello = useCallback(() => {
    clearTimers()
    setStep(-1)
    setPos({ x: -W - 20, y: window.innerHeight - H - 16 })
    setDur(0)
    setPhase('hello')
    later(() => walkTo(spot('corner'), () => {
      setSprite('wave')
      setBubble(true)
      // after a while the wave stops and the bubble tucks away — he just waits
      later(() => setSprite('point'), 4000)
      later(() => setBubble(false), 14000)
    }), 60)
  }, [spot, walkTo])

  // First visit only, a few seconds after the site opens.
  useEffect(() => {
    if (!enabled || !GUIDE.enabled) return
    let seen = false
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1'
      localStorage.setItem(SEEN_KEY, '1')
    } catch {}
    const forced = new URLSearchParams(window.location.search).has('guide')
    if (seen && !forced) return
    const t = setTimeout(hello, GUIDE.delay)
    return () => clearTimeout(t)
  }, [enabled, hello])

  // "Show the guide" from the desktop menu.
  useEffect(() => {
    if (!enabled) return
    const show = () => hello()
    window.addEventListener(GUIDE_EVENT, show)
    return () => window.removeEventListener(GUIDE_EVENT, show)
  }, [enabled, hello])

  useEffect(() => () => clearTimers(), [])

  const say = (i: number) => {
    clearTimers()
    const s = GUIDE_STEPS[i]
    setStep(i)
    setPhase('tour')
    const talk = () => {
      setSprite(s.sprite)
      setBubble(true)
    }
    if (s.to) walkTo(spot(s.to), talk)
    else talk()
  }

  const leave = () => {
    clearTimers()
    setBubble(false)
    setPhase('leaving')
    setSprite('wave')
    later(() => walkTo({ x: -W - 30, y: posRef.current.y }, () => setPhase('off')), 700)
  }

  if (!enabled || phase === 'off') return null

  const cur = step >= 0 ? GUIDE_STEPS[step] : null
  const last = step === GUIDE_STEPS.length - 1
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  // the bubble opens toward the middle of the screen
  const bubbleLeft = pos.x + W / 2 < vw / 2
  // near the top of the screen the bubble hangs below him instead
  const below = pos.y < 170

  return (
    <div
      className={`guide${walking ? ' walking' : ''}`}
      style={{ left: pos.x, top: pos.y, width: W, height: H, transitionDuration: `${dur}ms` }}
    >
      {bubble && (phase === 'hello' || cur) && (
        <div className={`guide-bubble ${bubbleLeft ? 'to-right' : 'to-left'}${below ? ' below' : ''}`} role="status" aria-live="polite">
          <button type="button" className="guide-x" onClick={leave} aria-label="Send the guide away" title="Bye">
            ×
          </button>
          <p>{phase === 'hello' ? GUIDE.hello : cur!.text}</p>
          <div className="guide-actions">
            {phase === 'hello' ? (
              <>
                <button type="button" onClick={leave}>No thanks</button>
                <button type="button" className="go" onClick={() => say(0)}>Sure!</button>
              </>
            ) : (
              <>
                <span className="guide-count">
                  {step + 1}/{GUIDE_STEPS.length}
                </span>
                <button type="button" className="go" onClick={() => (last ? leave() : say(step + 1))}>
                  {last ? 'Bye!' : 'Next ›'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        className="guide-body"
        onClick={() => {
          if (phase === 'hello') {
            if (bubble) say(0)
            else setBubble(true)
          } else if (phase === 'tour' && !walking) setBubble(b => !b)
        }}
        aria-label={phase === 'hello' ? 'Start the tour' : 'Guide'}
        title={phase === 'hello' ? 'Click me for a quick tour' : undefined}
      >
        <img src={GUIDE.sprites[sprite]} alt="" draggable={false} style={{ transform: flip ? 'scaleX(-1)' : undefined }} />
      </button>
    </div>
  )
}
