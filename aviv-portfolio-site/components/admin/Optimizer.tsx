'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { updateItem } from '@/lib/tree-ops'
import type { PhotoItem, Tree } from '@/lib/types'
import { sendVariants, type UploadMode } from './uploads'
import type { Op } from './useAdminStore'

/** Photos to give smaller copies: every photo file that doesn't have them yet. */
function needsCopies(tree: Tree, skip: Set<string>): PhotoItem[] {
  return tree.items.filter(
    (i): i is PhotoItem => i.kind === 'photo' && !!i.src && !i.youtubeUrl && !i.px && !skip.has(i.id) && !/\.gif($|\?)/i.test(i.src)
  )
}

const SKIP_KEY = 'optimizer:skip'
const loadSkip = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(SKIP_KEY) || '[]'))
  } catch {
    return new Set<string>()
  }
}
/** Get a stored photo: straight from storage, or through the site if the browser won't allow that. */
async function download(src: string): Promise<Blob> {
  try {
    const res = await fetch(src, { mode: 'cors' })
    if (res.ok) return await res.blob()
  } catch {}
  const res = await fetch(`/api/admin/original?url=${encodeURIComponent(src)}`)
  if (!res.ok) throw new Error(String(res.status))
  return res.blob()
}

/** save to the site every few photos, not after each one */
const BATCH = 6

/**
 * The "file update" for photos uploaded before it existed. Opening the admin
 * starts it by itself: each photo without smaller copies is downloaded once,
 * shrunk on this device, and its copies uploaded. Runs quietly in the
 * background (pauses while new uploads are going), shows its progress, and
 * picks up where it stopped next time the admin is opened.
 */
export default function Optimizer({
  tree,
  apply,
  mode,
  paused: busy,
  readOnly,
  compact = false,
}: {
  tree: Tree
  apply: (op: Op) => void
  mode: UploadMode
  /** new uploads are running — wait for them */
  paused: boolean
  readOnly: boolean
  compact?: boolean
}) {
  const [skip, setSkip] = useState<Set<string>>(() => new Set())
  const [on, setOn] = useState(true)
  const [done, setDone] = useState(0)
  const [failed, setFailed] = useState(0)
  const [current, setCurrent] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const total = useRef(0)
  const working = useRef(false)
  const treeRef = useRef(tree)
  treeRef.current = tree

  useEffect(() => setSkip(loadSkip()), [])
  const todo = useMemo(() => needsCopies(tree, skip), [tree, skip])

  useEffect(() => {
    if (readOnly || !on || busy || working.current) return
    const queue = needsCopies(treeRef.current, skip)
    if (!queue.length) return
    working.current = true
    total.current = Math.max(total.current, done + queue.length)
    let cancelled = false
    const pending: { id: string; patch: Partial<PhotoItem> }[] = []
    const flush = () => {
      if (!pending.length) return
      const batch = pending.splice(0)
      apply(t => batch.reduce((acc, b) => updateItem(acc, b.id, b.patch), t))
    }
    ;(async () => {
      // a moment's pause so opening the admin stays snappy
      await new Promise(r => setTimeout(r, 2500))
      for (const photo of queue) {
        if (cancelled) break
        setCurrent(photo.id)
        try {
          const patch = await sendVariants(await download(photo.src), mode)
          if (!patch.px) throw new Error('unreadable')
          pending.push({ id: photo.id, patch })
          setDone(d => d + 1)
        } catch {
          // remember it so it isn't retried every time (Clean list: reset below)
          setSkip(s => {
            const next = new Set(s).add(photo.id)
            try {
              localStorage.setItem(SKIP_KEY, JSON.stringify([...next]))
            } catch {}
            return next
          })
          setFailed(f => f + 1)
        }
        if (pending.length >= BATCH) flush()
      }
      flush()
      setCurrent(null)
      working.current = false
      if (!cancelled) setFinished(true)
    })()
    return () => {
      cancelled = true
      flush()
      working.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, busy, readOnly])

  if (readOnly) return null
  const count = total.current || todo.length
  if (!todo.length && !working.current) {
    if (!finished) return null
    return (
      <div className={`opt${compact ? ' compact' : ''} done`} role="status">
        <span className="opt-label">✓ Photos optimized{failed ? ` · ${failed} couldn’t be read` : ''}</span>
        {failed > 0 && (
          <button
            type="button"
            className="opt-btn"
            onClick={() => {
              try {
                localStorage.removeItem(SKIP_KEY)
              } catch {}
              setSkip(new Set())
              setFailed(0)
              setFinished(false)
            }}
          >
            Try again
          </button>
        )}
      </div>
    )
  }
  const pct = count ? Math.round((done / count) * 100) : 0
  return (
    <div className={`opt${compact ? ' compact' : ''}`} role="status" aria-live="polite">
      <span className="opt-label">
        {busy ? 'Optimizing waits for uploads…' : on ? `Optimizing photos ${Math.min(done + 1, count)}/${count}` : `Optimizing paused · ${todo.length} left`}
      </span>
      <span className="opt-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      <button type="button" className="opt-btn" onClick={() => setOn(v => !v)} title={on ? 'Pause' : 'Resume'}>
        {on ? '❚❚' : '▶'}
      </button>
      {current === null && on && !busy && <span className="opt-wait" />}
    </div>
  )
}
