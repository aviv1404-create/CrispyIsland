'use client'

/**
 * Which stickers this visitor has found (data/stickers.ts), kept in their
 * browser. collect() saves one and tells the desktop, which slaps it on.
 */
const KEY = 'stickers:found'
/** Fired on window whenever a sticker is collected (detail: { id }). */
export const STICKER_EVENT = 'crispy:sticker'

export function foundStickers(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, number>
  } catch {
    return {}
  }
}

export function hasSticker(id: string): boolean {
  return !!foundStickers()[id]
}

/**
 * Save a found sticker. `quiet`: don't slap it on right now — used when the
 * click also leaves the desktop (goblin → dungeon), so the sticker slaps on
 * when the visitor comes back to the desktop instead of while they're away.
 */
export function collect(id: string, { quiet = false } = {}) {
  const all = foundStickers()
  if (all[id]) return
  all[id] = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
  if (!quiet) window.dispatchEvent(new CustomEvent(STICKER_EVENT, { detail: { id } }))
}

/** For testing: forget every sticker. */
export function resetStickers() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(`${KEY}:shown`)
    localStorage.removeItem('stickers:pos')
  } catch {}
  window.dispatchEvent(new CustomEvent(STICKER_EVENT, { detail: { id: null } }))
}

/** Stickers that have already had their "slap on" animation. */
export function shownStickers(): string[] {
  try {
    return JSON.parse(localStorage.getItem(`${KEY}:shown`) || '[]') as string[]
  } catch {
    return []
  }
}
export function markShown(ids: string[]) {
  try {
    localStorage.setItem(`${KEY}:shown`, JSON.stringify(ids))
  } catch {}
}
