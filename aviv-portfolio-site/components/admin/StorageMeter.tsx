'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Usage {
  total: number
  used: number
  unused: number
  unusedCount: number
  files: number
  limit: number
}

const fmt = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(0, Math.round(bytes / 1024))} KB`

/** Wait at least this long between automatic re-reads (each read is a billed Blob listing). */
const MIN_GAP = 60_000

/**
 * The storage meter in /admin: how much of the plan's space the site uses.
 * It re-reads after uploads finish and a little after saves (deleted photos
 * are removed from the store ~30 s after the save). Files nothing on the site
 * points to any more are listed separately with a "Clean up" button.
 *
 * `bump` — change it to ask for a re-read (throttled).
 */
export default function StorageMeter({ bump, compact = false }: { bump?: number; compact?: boolean }) {
  const [u, setU] = useState<Usage | null>(null)
  const [err, setErr] = useState('')
  const [cleaning, setCleaning] = useState(false)
  const last = useRef(0)

  const load = useCallback(async (force = false) => {
    if (!force && Date.now() - last.current < MIN_GAP) return
    last.current = Date.now()
    try {
      const res = await fetch('/api/admin/storage', { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not read storage')
      setU(body)
      setErr('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read storage')
    }
  }, [])

  useEffect(() => {
    load(true)
  }, [load])

  // A change happened (upload finished / save): re-read once the store has caught up.
  useEffect(() => {
    if (!bump) return
    const t = setTimeout(() => load(), 35_000)
    return () => clearTimeout(t)
  }, [bump, load])

  const cleanUp = async () => {
    if (!u) return
    if (!confirm(`Delete ${u.unusedCount} file${u.unusedCount === 1 ? '' : 's'} (${fmt(u.unused)}) that the site doesn’t show? This can’t be undone.`)) return
    setCleaning(true)
    try {
      const res = await fetch('/api/admin/storage', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Clean-up failed')
      setU(body)
      last.current = Date.now()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Clean-up failed')
    } finally {
      setCleaning(false)
    }
  }

  const pct = u ? Math.min(100, (u.total / u.limit) * 100) : 0
  const level = pct >= 90 ? 'full' : pct >= 70 ? 'high' : 'ok'

  return (
    <div className={`sm${compact ? ' compact' : ''}`} aria-live="polite">
      <div className="sm-head">
        <strong>Storage</strong>
        <span>
          {u ? `${fmt(u.total)} of ${fmt(u.limit)} · ${pct < 1 && u.total > 0 ? '<1' : Math.round(pct)}%` : err ? '—' : 'Checking…'}
        </span>
        <button type="button" className="sm-refresh" onClick={() => load(true)} title="Check again" aria-label="Check storage again">
          ↻
        </button>
      </div>
      <div
        className={`sm-bar ${level}`}
        role="meter"
        aria-label="Storage used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      {err && <p className="sm-note error">{err}</p>}
      {u && level !== 'ok' && (
        <p className="sm-note warn">
          {level === 'full' ? 'Almost full — new uploads will fail soon.' : 'Getting full.'} Delete photos you don’t need, or move to bigger storage.
        </p>
      )}
      {u && u.unusedCount > 0 && (
        <p className="sm-note">
          {fmt(u.unused)} in {u.unusedCount} file{u.unusedCount === 1 ? '' : 's'} isn’t shown anywhere on the site.{' '}
          <button type="button" className="sm-clean" onClick={cleanUp} disabled={cleaning}>
            {cleaning ? 'Cleaning…' : 'Clean up'}
          </button>
        </p>
      )}
    </div>
  )
}
