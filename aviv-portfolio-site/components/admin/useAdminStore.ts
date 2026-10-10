'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tree } from '@/lib/types'

/**
 * The admin's copy of the content tree, with saving that holds up on a phone:
 *
 * - Every change is an *operation* (tree → tree), applied to the screen at once.
 * - Saves carry the fingerprint of the tree they were based on. If another
 *   device saved in between, the server refuses (409) and returns the latest
 *   tree; we re-run the pending operations on top of it and save again, so
 *   nobody's edits are overwritten.
 * - If the connection drops, operations wait in a queue and are sent when the
 *   phone is back online.
 */

export type Op = (tree: Tree) => Tree
export type SaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

export function useAdminStore(initialTree: Tree, initialRev: string, readOnly: boolean) {
  const router = useRouter()
  const [tree, setTree] = useState(initialTree)
  const [save, setSave] = useState<SaveState>('idle')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(0)

  // Server truth + operations not yet confirmed by the server.
  const base = useRef<{ tree: Tree; rev: string }>({ tree: initialTree, rev: initialRev })
  const queue = useRef<Op[]>([])
  const flushing = useRef(false)

  const replay = () => queue.current.reduce((t, op) => op(t), base.current.tree)

  const flush = useCallback(async () => {
    if (flushing.current || queue.current.length === 0) return
    flushing.current = true
    setSave('saving')
    setError('')

    // A couple of retries covers a conflict with a save made a moment ago.
    for (let attempt = 0; attempt < 3; attempt++) {
      const ops = queue.current.slice()
      const next = ops.reduce((t, op) => op(t), base.current.tree)
      let res: Response
      try {
        res = await fetch('/api/admin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tree: next, baseRev: base.current.rev }),
        })
      } catch {
        // Network down: keep everything queued and try again when we're back.
        flushing.current = false
        setSave('offline')
        setPending(queue.current.length)
        return
      }

      const body = await res.json().catch(() => ({}))
      if (res.status === 409 && body.tree) {
        base.current = { tree: body.tree, rev: body.rev }
        setTree(replay())
        continue
      }
      if (!res.ok) {
        // Rejected outright (validation, storage down): drop the batch so the
        // screen matches what's really saved, and say why.
        queue.current = queue.current.slice(ops.length)
        setTree(replay())
        flushing.current = false
        setSave('error')
        setError(body.error ?? 'Save failed')
        setPending(queue.current.length)
        return
      }

      base.current = { tree: body.tree, rev: body.rev }
      queue.current = queue.current.slice(ops.length)
      setTree(replay())
      setPending(queue.current.length)
      if (queue.current.length) continue
      flushing.current = false
      setSave('saved')
      setTimeout(() => setSave(s => (s === 'saved' ? 'idle' : s)), 2000)
      router.refresh()
      return
    }

    flushing.current = false
    setSave('error')
    setError('The site kept changing while saving. Reload and try again.')
  }, [router])

  /** Apply a change now and save it. */
  const apply = useCallback(
    (op: Op) => {
      if (readOnly) {
        setSave('error')
        setError("Editing is off: the live content can't be reached right now.")
        return
      }
      queue.current.push(op)
      setPending(queue.current.length)
      setTree(t => op(t))
      void flush()
    },
    [flush, readOnly]
  )

  // Send anything queued while offline as soon as the connection returns.
  useEffect(() => {
    const retry = () => void flush()
    window.addEventListener('online', retry)
    const timer = setInterval(() => {
      if (queue.current.length && !flushing.current) retry()
    }, 15000)
    return () => {
      window.removeEventListener('online', retry)
      clearInterval(timer)
    }
  }, [flush])

  // Don't let the page close with unsaved changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (queue.current.length) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  return { tree, apply, save, error, pending, setError, setSave }
}
