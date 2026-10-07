'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PixIcon from '@/components/PixIcon'

/**
 * The hidden way into the admin: click "Crispy" under the name on the About
 * window three times quickly and this little code box opens. The code is
 * Aviv's admin password (ADMIN_PASSWORD_AVIV in the Vercel settings) — it is
 * checked on the server and never lives in the site's code. Right code →
 * signed in and sent to /admin.
 *
 * In the chat preview there's no server, so `demoUrl` is used instead.
 */
export default function SecretLogin({ onClose, demoUrl }: { onClose: () => void; demoUrl?: string }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'wrong' | 'ok'>('idle')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || state === 'busy') return
    setState('busy')
    if (demoUrl) {
      setState('ok')
      setTimeout(() => window.open(demoUrl, '_blank', 'noopener'), 500)
      return
    }
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'aviv', password: code.trim() }),
    }).catch(() => null)
    if (res?.ok) {
      setState('ok')
      window.location.assign('/admin')
    } else {
      setState('wrong')
      setCode('')
      input.current?.focus()
    }
  }

  return createPortal(
    <div className="seclog-scrim" onClick={onClose}>
      <form className={`seclog${state === 'wrong' ? ' shake' : ''}`} onSubmit={submit} onClick={e => e.stopPropagation()}>
        <div className="win-titlebar">
          <button type="button" className="win-close" onClick={onClose} aria-label="Close" title="Close">
            <PixIcon name="x" size={13} />
          </button>
          <span className="win-title">Restricted</span>
        </div>
        <div className="seclog-body">
          <PixIcon name={state === 'ok' ? 'unlock' : 'lock'} size={48} />
          <label htmlFor="seclog-code">Enter code</label>
          <input
            ref={input}
            id="seclog-code"
            className="seclog-input"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={e => {
              setCode(e.target.value)
              if (state === 'wrong') setState('idle')
            }}
            maxLength={64}
            spellCheck={false}
          />
          <p className="seclog-msg" aria-live="polite">
            {state === 'wrong' ? 'ACCESS DENIED' : state === 'ok' ? 'ACCESS GRANTED' : state === 'busy' ? 'checking…' : demoUrl ? 'preview: any code opens the demo admin' : ' '}
          </p>
          <button type="submit" className="win-btn primary" disabled={!code || state === 'busy'}>
            Enter
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
