'use client'

import { useEffect, useRef, useState } from 'react'
import { JSDOS } from '@/data/games'

type DosHandle = { stop?: () => Promise<void> | void }
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
  const [state, setState] = useState<'idle' | 'loading' | 'running' | 'error'>('idle')
  const [error, setError] = useState('')

  const start = async () => {
    setState('loading')
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
    <div className="dos">
      <div ref={host} className="dos-screen" />
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
    </div>
  )
}
