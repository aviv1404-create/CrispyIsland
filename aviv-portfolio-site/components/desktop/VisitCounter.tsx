'use client'

import { useEffect, useState } from 'react'

const KEY = 'visit:counted'

/** Counts this visit once per browser tab session (nothing personal is sent). */
export function VisitPing({ skip }: { skip: boolean }) {
  useEffect(() => {
    if (skip) return
    try {
      if (sessionStorage.getItem(KEY)) return
      sessionStorage.setItem(KEY, '1')
    } catch {}
    fetch('/api/visits', { method: 'POST', keepalive: true }).catch(() => {})
  }, [skip])
  return null
}

type Stats = { total: number; today: number; week: number; days: { day: string; count: number }[] }

/**
 * The private visit counter in the About window — rendered only for the
 * signed-in admin, and the numbers come from an admin-only API.
 */
export default function VisitCounter() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState(false)
  const [off, setOff] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/visits', { cache: 'no-store' })
      .then(r => {
        if (r.status === 501) setOff(true)
        return r.ok ? r.json() : Promise.reject()
      })
      .then(setStats)
      .catch(() => setErr(true))
  }, [])

  const max = Math.max(1, ...(stats?.days.map(d => d.count) ?? [1]))
  return (
    <div className={`vc${open ? ' open' : ''}`}>
      <button type="button" className="vc-badge" onClick={() => setOpen(o => !o)} title="Only you can see this (signed in as admin)">
        <span className="vc-label">VISITS</span>
        <span className="vc-digits">{err ? '------' : String(stats?.total ?? 0).padStart(6, '0')}</span>
      </button>
      {open && (
        <div className="vc-panel">
          {err || !stats ? (
            <p>
              {off
                ? 'The counter is switched off. It needs the free “Upstash for Redis” add-on in Vercel (see the update notes).'
                : err
                  ? 'Couldn’t load the counter.'
                  : 'Loading…'}
            </p>
          ) : (
            <>
              <p>
                <strong>{stats.today}</strong> today · <strong>{stats.week}</strong> this week · <strong>{stats.total}</strong> all time
              </p>
              <div className="vc-bars" aria-label="Visits, last 14 days">
                {stats.days.map(d => (
                  <span key={d.day} title={`${d.day}: ${d.count}`} style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} />
                ))}
              </div>
              <small>Last 14 days · one visit = one browser session · your own visits aren’t counted · only you see this</small>
            </>
          )}
        </div>
      )}
    </div>
  )
}
