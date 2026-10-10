'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { addItemsToFront, blankPhoto } from '@/lib/tree-ops'
import type { PhotoItem } from '@/lib/types'
import { prepareFile, sendFile, type UploadMode } from './uploads'
import type { Op } from './useAdminStore'

export interface UploadJob {
  id: string
  name: string
  folderId: string
  preview: string
  status: 'waiting' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  file: File
}

const CONCURRENCY = 2

/**
 * A queue of photo uploads with per-file progress and Retry. Each finished
 * photo is added to its folder (at the front) the moment it lands, so a dropped
 * connection mid-batch never loses the ones that already made it.
 */
export function useUploadQueue(mode: UploadMode, apply: (op: Op) => void) {
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const jobsRef = useRef<UploadJob[]>([])
  const running = useRef(0)

  const update = (id: string, patch: Partial<UploadJob>) => {
    jobsRef.current = jobsRef.current.map(j => (j.id === id ? { ...j, ...patch } : j))
    setJobs(jobsRef.current)
  }

  const pump = useCallback(() => {
    while (running.current < CONCURRENCY) {
      const job = jobsRef.current.find(j => j.status === 'waiting')
      if (!job) return
      running.current++
      update(job.id, { status: 'uploading', progress: 0, error: undefined })
      ;(async () => {
        try {
          const prepared = await prepareFile(job.file)
          const url = await sendFile(prepared, mode, p => update(job.id, { progress: p }))
          const photo: PhotoItem = {
            ...blankPhoto(job.folderId, url, 0),
            ...(prepared.width && prepared.height ? { width: prepared.width, height: prepared.height } : {}),
          }
          apply(t => addItemsToFront(t, job.folderId, [photo]))
          update(job.id, { status: 'done', progress: 1 })
        } catch (e) {
          update(job.id, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed' })
        } finally {
          running.current--
          pump()
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, apply])

  const add = useCallback(
    (files: FileList | File[], folderId: string) => {
      const list = Array.from(files).map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        folderId,
        preview: URL.createObjectURL(file),
        status: 'waiting' as const,
        progress: 0,
        file,
      }))
      jobsRef.current = [...jobsRef.current, ...list]
      setJobs(jobsRef.current)
      pump()
    },
    [pump]
  )

  const retry = useCallback(
    (id: string) => {
      update(id, { status: 'waiting', progress: 0, error: undefined })
      pump()
    },
    [pump]
  )

  const retryAll = useCallback(() => {
    for (const j of jobsRef.current) if (j.status === 'error') update(j.id, { status: 'waiting', progress: 0 })
    pump()
  }, [pump])

  const remove = useCallback((id: string) => {
    const job = jobsRef.current.find(j => j.id === id)
    if (job) URL.revokeObjectURL(job.preview)
    jobsRef.current = jobsRef.current.filter(j => j.id !== id)
    setJobs(jobsRef.current)
  }, [])

  const clearFinished = useCallback(() => {
    for (const j of jobsRef.current) if (j.status === 'done') URL.revokeObjectURL(j.preview)
    jobsRef.current = jobsRef.current.filter(j => j.status !== 'done')
    setJobs(jobsRef.current)
  }, [])

  // Uploads already in the queue resume when the connection comes back.
  useEffect(() => {
    const back = () => {
      for (const j of jobsRef.current) {
        if (j.status === 'error' && /connection|network|fetch/i.test(j.error ?? '')) {
          update(j.id, { status: 'waiting' })
        }
      }
      pump()
    }
    window.addEventListener('online', back)
    return () => window.removeEventListener('online', back)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pump])

  const busy = jobs.some(j => j.status === 'waiting' || j.status === 'uploading')
  return { jobs, add, retry, retryAll, remove, clearFinished, busy }
}
