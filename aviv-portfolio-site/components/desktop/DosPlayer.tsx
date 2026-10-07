'use client'

import { useEffect, useRef, useState } from 'react'
import { JSDOS } from '@/data/games'

type DosHandle = { stop?: () => Promise<void> | void }
/** js-dos's CommandInterface — only the bit we use. Key codes: letters = ASCII, Enter 257, Esc 256. */
type DosCI = { sendKeyEvent: (keyCode: number, pressed: boolean) => void }

/** The on-screen keys for phones (the game is played with F, K, Enter and Esc). */
export const GAME_KEYS = {
  yes: { code: 70, key: 'f', label: 'YES', letter: 'F', hebrew: 'כ' },
  no: { code: 75, key: 'k', label: 'NO', letter: 'K', hebrew: 'ל' },
  enter: { code: 257, key: 'Enter', label: 'ENTER', letter: '↵', hebrew: '' },
  esc: { code: 256, key: 'Escape', label: 'ESC', letter: 'Esc', hebrew: '' },
} as const
type GameKey = keyof typeof GAME_KEYS
declare global {
  interface Window {
    Dos?: (el: HTMLElement, opts: Record<string, unknown>) => DosHandle
  }
}

let loader: Promise<void> | null = null
/** Load js-dos (script + styles) once, on first Play. */
function loadJsDos(): Promise<void> {
  if (window.Dos) return Promise.resolve()
  loader ??= new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = JSDOS.css
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = JSDOS.js
    s.async = true
    s.onload = () => (window.Dos ? resolve() : reject(new Error('js-dos did not start')))
    s.onerror = () => {
      loader = null
      reject(new Error('Could not load the DOS emulator'))
    }
    document.head.appendChild(s)
  })
  return loader
}

/**
 * A DOS machine in the page. Shows the game's cover with a Play button; the
 * emulator (a few MB) only downloads when someone actually presses Play.
 */
export default function DosPlayer({ bundle, cover, label }: { bundle: string; cover: string; label: string }) {
  const host = useRef<HTMLDivElement>(null)
  const handle = useRef<DosHandle | null>(null)
  const ci = useRef<DosCI | null>(null)

  // Press and release a key in the emulator. Falls back to a synthetic
  // keyboard event if the command interface isn't ready yet.
  const press = (k: GameKey) => {
    const { code, key } = GAME_KEYS[k]
    if (navigator.vibrate) navigator.vibrate(12)
    if (ci.current) {
      ci.current.sendKeyEvent(code, true)
      setTimeout(() => ci.current?.sendKeyEvent(code, false), 90)
      return
    }
    const target = host.current?.querySelector('canvas') ?? window
    const init = { key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, bubbles: true }
    target.dispatchEvent(new KeyboardEvent('keydown', init))
    setTimeout(() => target.dispatchEvent(new KeyboardEvent('keyup', init)), 90)
  }
  const [state, setState] = useState<'idle' | 'loading' | 'running' | 'error'>('idle')
  const [error, setError] = useState('')

  const start = async () => {
    setState('loading')
    // lets the pirate skull (PirateBubble) roll its dice
    window.dispatchEvent(new Event('crispy:game-play'))
    try {
      await loadJsDos()
      if (!host.current || !window.Dos) throw new Error('js-dos did not start')
      handle.current = window.Dos(host.current, {
        url: new URL(bundle, window.location.href).href,
        ...(JSDOS.pathPrefix ? { pathPrefix: JSDOS.pathPrefix } : {}),
        autoStart: true,
        kiosk: true,
        noCloud: true,
        theme: 'dark',
        onEvent: (event: string, arg?: unknown) => {
          if (event === 'ci-ready' && arg && typeof (arg as DosCI).sendKeyEvent === 'function') ci.current = arg as DosCI
        },
      })
      setState('running')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the game')
      setState('error')
    }
  }

  // Switch the machine off when the window closes.
  useEffect(
    () => () => {
      try {
        void handle.current?.stop?.()
      } catch {}
    },
    []
  )

  return (
    <div className={`dos${state === 'running' ? ' running' : ''}`}>
      <div ref={host} className="dos-screen" />
      {state === 'running' && (
        <button type="button" className="dos-esc" onPointerDown={e => { e.preventDefault(); press('esc') }} aria-label="Escape (go back)">
          ESC
        </button>
      )}
      {state !== 'running' && (
        <div className="dos-cover">
          <img src={cover} alt="" draggable={false} />
          <div className="dos-cover-shade">
            {state === 'error' ? (
              <>
                <p className="dos-msg">{error}. Check your connection and try again.</p>
                <button type="button" className="dos-play" onClick={start}>
                  Try again
                </button>
              </>
            ) : (
              <button type="button" className="dos-play" onClick={start} disabled={state === 'loading'} aria-label={`Play ${label}`}>
                {state === 'loading' ? 'Booting DOS…' : '▶ PLAY'}
              </button>
            )}
          </div>
        </div>
      )}
      {state === 'running' && (
        <div className="dos-keys" role="group" aria-label="Game keys">
          {(['yes', 'no', 'enter'] as const).map(k => {
            const g = GAME_KEYS[k]
            return (
              <button
                key={k}
                type="button"
                className={`keycap keycap-${k}`}
                onPointerDown={e => {
                  e.preventDefault()
                  press(k)
                }}
                aria-label={`${g.label} (${g.letter})`}
              >
                <span className="keycap-letter">{g.letter}</span>
                <strong>{g.label}</strong>
                {g.hebrew && <span className="keycap-he">{g.hebrew}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
