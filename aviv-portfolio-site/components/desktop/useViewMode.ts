'use client'

import { useSyncExternalStore } from 'react'

export type ViewMode = 'icons' | 'gallery' | 'list' | 'flow'

// The folder view mode is a site-wide preference kept in localStorage. That
// makes it an external store: useSyncExternalStore reads it without a
// post-mount setState, and renders 'icons' on the server so hydration matches.
const KEY = 'view_mode'
const listeners = new Set<() => void>()
let cached: ViewMode | null = null

function read(): ViewMode {
  if (cached) return cached
  let v: string | null = null
  try {
    v = localStorage.getItem(KEY)
  } catch {}
  cached = v === 'list' || v === 'gallery' || v === 'flow' ? v : 'icons'
  return cached
}

export function setViewMode(mode: ViewMode) {
  cached = mode
  try {
    localStorage.setItem(KEY, mode)
  } catch {}
  listeners.forEach(l => l())
}

export function useViewMode(): ViewMode {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => 'icons'
  )
}
