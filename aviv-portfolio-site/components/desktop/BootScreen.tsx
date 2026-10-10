'use client'

import { useEffect, useRef, useState } from 'react'
import { BOOT } from '@/data/boot'

/**
 * A short fake "loading" screen on the first visit of a session: the Crispy
 * Island logo and a counter running 1% → 100%, then it fades into the site.
 * Click / any key skips it. Optional intro sound in data/boot.ts — browsers
 * only allow sound after a click, so it plays if the visitor clicks to skip
 * or has already interacted (it never blocks the site).
 */
export default function BootScreen() {
  const [show, setShow] = useState(false)
  const [pct, setPct] = useState(1)
  const [leaving, setLeaving] = useState(false)
  const skipRef = useRef<() => void>(() => {})

  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem('boot:seen') === '1'
      sessionStorage.setItem('boot:seen', '1')
    } catch {}
    if (seen && !BOOT.everyTime) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    setShow(true)

    let audio: HTMLAudioElement | null = null
    if (BOOT.sound) {
      audio = new Audio(BOOT.sound)
      audio.volume = BOOT.volume
      audio.play().catch(() => {})
    }

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / BOOT.ms)
      // uneven, like a real progress bar: quick, a stall, then a rush
      const eased = t < 0.35 ? t * 1.6 : t < 0.6 ? 0.56 + (t - 0.35) * 0.3 : 0.635 + (t - 0.6) * 0.9125
      setPct(Math.max(1, Math.min(100, Math.round(eased * 100))))
      if (t < 1) raf = requestAnimationFrame(tick)
      else finish()
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setPct(100)
      setTimeout(() => setLeaving(true), 150)
      setTimeout(() => setShow(false), 650)
    }
    const skip = () => {
      if (audio && audio.paused) audio.play().catch(() => {})
      cancelAnimationFrame(raf)
      finish()
    }
    skipRef.current = skip
    raf = requestAnimationFrame(tick)
    window.addEventListener('keydown', skip)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', skip)
    }
  }, [])

  if (!show) return null
  return (
    <div className={`boot${leaving ? ' out' : ''}`} onClick={() => skipRef.current()} role="status" aria-label={`Loading ${pct}%`}>
      <img className="boot-logo" src={BOOT.logo} alt="CrispyIsland" draggable={false} />
      <div className="boot-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="boot-pct">{pct}%</div>
      <div className="boot-hint">{BOOT.text}</div>
    </div>
  )
}
