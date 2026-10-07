'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PLACEHOLDER_QUOTES, TICKER_DIRECTION, TICKER_SPEED } from '@/data/ticker'
import type { TickerSettings } from '@/lib/types'

type Quote = { sym: string; price: number; change: number }

/** Placeholder quotes whose prices drift a little every few seconds. */
function useDriftingQuotes(active: boolean): Quote[] {
  const [quotes, setQuotes] = useState<Quote[]>(() =>
    PLACEHOLDER_QUOTES.map((q, i) => ({ ...q, change: ((i * 37) % 11) / 10 - 0.45 }))
  )
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      setQuotes(qs =>
        qs.map(q => {
          if (Math.random() < 0.6) return q
          const move = q.price * (Math.random() - 0.48) * 0.006
          return { ...q, price: Math.max(0.01, q.price + move), change: q.change + move }
        })
      )
    }, 2500)
    return () => clearInterval(t)
  }, [active])
  return quotes
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * The green LED ticker under the menu, New York Stock Exchange style. Shows
 * Aviv's lines from the admin; with none written, placeholder stock quotes.
 */
export default function Ticker({ settings }: { settings?: TickerSettings }) {
  const pathname = usePathname()
  const messages = settings?.messages ?? []
  const on = settings?.on !== false
  const placeholder = messages.length === 0
  const quotes = useDriftingQuotes(on && placeholder)

  // Duration from the strip's real width, so the speed is the same whatever's written.
  const rowRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(40)
  useLayoutEffect(() => {
    const w = rowRef.current?.offsetWidth
    if (w) setDuration(Math.max(8, w / TICKER_SPEED))
  }, [messages.join('\n'), placeholder])

  if (!on || pathname?.startsWith('/secret') || pathname?.startsWith('/admin')) return null

  const items = placeholder
    ? quotes.map(q => (
        <span key={q.sym} className="tk-item">
          <b>{q.sym}</b> {fmt(q.price)}{' '}
          <span className={q.change >= 0 ? 'tk-up' : 'tk-down'}>
            {q.change >= 0 ? '▲' : '▼'}
            {fmt(Math.abs(q.change))}
          </span>
        </span>
      ))
    : messages.map((m, i) => (
        <span key={i} className="tk-item">
          {m}
        </span>
      ))

  // Repeat short content so one copy is always wider than the screen.
  const reps = Math.max(1, Math.ceil(12 / items.length))
  const row = (hidden: boolean) => (
    <div className="tk-row" ref={hidden ? undefined : rowRef} aria-hidden={hidden || undefined}>
      {Array.from({ length: reps }, (_, r) =>
        items.map((it, i) => (
          <span key={`${r}-${i}`} className="tk-cell">
            {it}
            <span className="tk-sep" aria-hidden="true">◆</span>
          </span>
        ))
      )}
    </div>
  )

  return (
    <div className={`tk${TICKER_DIRECTION === 'right' ? ' tk-rtl' : ''}`} role="marquee" aria-label={placeholder ? 'Ticker' : messages.join(' · ')}>
      <div className="tk-track" style={{ animationDuration: `${duration}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
