'use client'

import { useEffect, useState } from 'react'
import { PIRATE_POPUP } from '@/data/pirate'
import { GifPopup } from './SecretBubble'
import { collect, hasSticker } from '@/lib/stickers'

/** Fired by the DOS player when someone presses Play. */
export const GAME_PLAY_EVENT = 'crispy:game-play'
/** Fired to drop the skull right now (testing / previews). */
export const PIRATE_DROP_EVENT = 'crispy:pirate-drop'

/**
 * The pirate skull: each time someone presses Play on the DOS game, 1 in
 * PIRATE_POPUP.odds times it drops onto the desktop a few seconds later and
 * leads to the pirate port (/secret/pirate). `?pirate` in the URL makes it
 * show every time (for testing).
 */
export default function PirateBubble() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onPlay = () => {
      let forced = false
      try {
        forced = new URLSearchParams(window.location.search).has('pirate')
      } catch {}
      // found already: the skull is a sticker now and stops dropping in
      if (!forced && hasSticker('pirate')) return
      if (!forced && Math.random() >= 1 / PIRATE_POPUP.odds) return
      clearTimeout(timer)
      timer = setTimeout(() => setPos({ x: 8 + Math.random() * 20, y: 18 + Math.random() * 40 }), PIRATE_POPUP.delay)
    }
    const drop = () => setPos({ x: 8 + Math.random() * 20, y: 18 + Math.random() * 40 })
    window.addEventListener(GAME_PLAY_EVENT, onPlay)
    window.addEventListener(PIRATE_DROP_EVENT, drop)
    return () => {
      window.removeEventListener(GAME_PLAY_EVENT, onPlay)
      window.removeEventListener(PIRATE_DROP_EVENT, drop)
      clearTimeout(timer)
    }
  }, [])

  if (!pos) return null
  return (
    <GifPopup
      key={`${pos.x}`}
      variant="pirate"
      pos={pos}
      href="/secret/pirate"
      image={PIRATE_POPUP.image}
      hint={PIRATE_POPUP.hint}
      label="Follow the pirate to the secret port"
      onClose={() => setPos(null)}
      onOpen={() => {
        collect('pirate', { quiet: true })
        setPos(null)
      }}
    />
  )
}
