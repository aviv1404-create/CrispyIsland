'use client'

import { useEffect, useState } from 'react'
import { PIRATE_POPUP } from '@/data/pirate'
import { GifPopup } from './SecretBubble'

/** Fired by the DOS player when someone presses Play. */
export const GAME_PLAY_EVENT = 'crispy:game-play'

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
      if (!forced && Math.random() >= 1 / PIRATE_POPUP.odds) return
      clearTimeout(timer)
      timer = setTimeout(() => setPos({ x: 8 + Math.random() * 20, y: 18 + Math.random() * 40 }), PIRATE_POPUP.delay)
    }
    window.addEventListener(GAME_PLAY_EVENT, onPlay)
    return () => {
      window.removeEventListener(GAME_PLAY_EVENT, onPlay)
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
    />
  )
}
