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
  // arrow keys (js-dos key codes): moving through menus and lists
  up: { code: 265, key: 'ArrowUp', label: 'UP', letter: '▲', hebrew: '' },
  down: { code: 264, key: 'ArrowDown', label: 'DOWN', letter: '▼', hebrew: '' },
} as const
type GameKey = keyof typeof GAME_KEYS
type KeyDef = { code: number; key: string }

/** Digits for typing amounts: ASCII 48–57. */
const DIGIT = (d: number): KeyDef => ({ code: 48 + d, key: String(d) })
const MAX_AMOUNT = 99999
/** Holding ▲/▼ speeds up: the step grows the longer the finger stays down. */
const stepFor = (repeats: number) => (repeats < 10 ? 1 : repeats < 22 ? 10 : repeats < 34 ? 100 : 1000)

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
  const press = (k: GameKey | KeyDef) => {
    const { code, key } = typeof k === 'string' ? GAME_KEYS[k] : k
    if (navigator.vibrate) navigator.vibrate(12)
    if (ci.current) {
      ci.current.sendKeyEvent(code, true)
      setTimeout(() => ci.current?.sendKeyEvent(code, false), 90)
      return
    }
    const target = host.current?.querySelector('canvas') ?? window
    const init = { key, code: /^\d$/.test(key) ? `Digit${key}` : key.length === 1 ? `Key${key.toUpperCase()}` : key, bubbles: true }
    target.dispatchEvent(new KeyboardEvent('keydown', init))
    setTimeout(() => target.dispatchEvent(new KeyboardEvent('keyup', init)), 90)
  }
  const [state, setState] = useState<'idle' | 'loading' | 'running' | 'error'>('idle')
  const [error, setError] = useState('')
  /** the money switch is flipped: ▲/▼ dial an amount, ENTER types it into the game */
  const [money, setMoney] = useState(false)
  const [amount, setAmount] = useState(0)
  const hold = useRef<{ timer: ReturnType<typeof setTimeout> | null; repeats: number }>({ timer: null, repeats: 0 })
  const nudge = (dir: 1 | -1) => {
    const step = stepFor(hold.current.repeats)
    // a bigger step lands on round numbers (120 → 200, not 220)
    setAmount(a => Math.min(MAX_AMOUNT, Math.max(0, step > 1 ? (dir > 0 ? Math.floor(a / step) + 1 : Math.ceil(a / step) - 1) * step : a + dir)))
    if (navigator.vibrate) navigator.vibrate(6)
  }
  const startHold = (dir: 1 | -1) => {
    stopHold()
    hold.current.repeats = 0
    nudge(dir)
    const tick = (delay: number) => {
      hold.current.timer = setTimeout(() => {
        hold.current.repeats++
        nudge(dir)
        tick(Math.max(45, delay * 0.9))
      }, delay)
    }
    tick(380)
  }
  const stopHold = () => {
    if (hold.current.timer) clearTimeout(hold.current.timer)
    hold.current.timer = null
  }
  useEffect(() => stopHold, [])
  /** Type the amount into the game, digit by digit, then Enter. */
  const typeAmount = () => {
    const keys: KeyDef[] = [...String(amount)].map(d => DIGIT(Number(d)))
    keys.forEach((k, i) => setTimeout(() => press(k), i * 150))
    setTimeout(() => press('enter'), keys.length * 150 + 60)
  }
  const tap = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault()
    fn()
  }

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
        <div className={`dos-keys${money ? ' money' : ''}`} role="group" aria-label={money ? 'Amount keys' : 'Game keys'}>
          {/* the money switch: flick it up and ▲/▼ dial an amount instead */}
          <button
            type="button"
            role="switch"
            aria-checked={money}
            className={`dos-switch${money ? ' on' : ''}`}
            onPointerDown={tap(() => setMoney(m => !m))}
            aria-label={money ? 'Money mode on — switch back to the game keys' : 'Money mode: dial amounts with the arrows'}
          >
            <span className="dos-switch-track">
              <span className="dos-switch-lever" />
            </span>
            <span className="dos-switch-label">{money ? '$ ON' : '$'}</span>
          </button>
          <div className="dos-arrows">
            {(['up', 'down'] as const).map(k => (
              <button
                key={k}
                type="button"
                className={`keycap keycap-arrow keycap-${k}${money ? ' keycap-money' : ''}`}
                onPointerDown={e => {
                  e.preventDefault()
                  if (money) {
                    e.currentTarget.setPointerCapture?.(e.pointerId)
                    startHold(k === 'up' ? 1 : -1)
                  } else press(k)
                }}
                onPointerUp={stopHold}
                onPointerCancel={stopHold}
                onLostPointerCapture={stopHold}
                onContextMenu={e => e.preventDefault()}
                aria-label={money ? (k === 'up' ? 'More' : 'Less') : GAME_KEYS[k].label}
              >
                {money ? (k === 'up' ? '+' : '−') : GAME_KEYS[k].letter}
              </button>
            ))}
          </div>
          <div className="dos-flip" key={money ? 'money' : 'keys'}>
            {money ? (
              <>
                <button type="button" className="dos-amount" onPointerDown={tap(() => setAmount(0))} aria-label={`Amount ${amount} — tap to clear`} title="Tap to clear">
                  <span className="dos-amount-ghost" aria-hidden="true">88888</span>
                  <span className="dos-amount-digits">{amount}</span>
                </button>
                <button type="button" className="keycap keycap-enter" onPointerDown={tap(typeAmount)} aria-label={`Type ${amount} into the game`}>
                  <span className="keycap-letter">↵</span>
                  <strong>ENTER</strong>
                </button>
              </>
            ) : (
              (['yes', 'no', 'enter'] as const).map(k => {
                const g = GAME_KEYS[k]
                return (
                  <button key={k} type="button" className={`keycap keycap-${k}`} onPointerDown={tap(() => press(k))} aria-label={`${g.label} (${g.letter})`}>
                    <span className="keycap-letter">{g.letter}</span>
                    <strong>{g.label}</strong>
                    {g.hebrew && <span className="keycap-he">{g.hebrew}</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
