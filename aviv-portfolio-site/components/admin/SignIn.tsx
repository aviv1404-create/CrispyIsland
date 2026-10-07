'use client'

import PixIcon from '@/components/PixIcon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: 'Google sign-in isn’t set up on this deployment yet.',
  bad_state: 'That sign-in attempt expired. Please try again.',
  cancelled: 'Google sign-in was cancelled.',
  no_code: 'Google didn’t return a sign-in code. Please try again.',
  exchange_failed: 'Google sign-in failed. Please try again.',
  unverified_email: 'That Google account has no verified email address.',
  not_allowed: 'That Google account doesn’t have access to this site.',
}

/** A1 — Google SSO, with the password form kept as a fallback. */
export default function SignIn({ oauthError }: { oauthError?: string }) {
  const router = useRouter()
  const [username, setUsername] = useState<'aviv' | 'dana'>('aviv')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    setBusy(false)

    if (res.ok) {
      setPassword('')
      router.refresh()
      return
    }

    setError('Wrong username or password')
    setPassword('')
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  return (
    <div className="win signin-win" style={{ maxWidth: 460 }}>
      <div className="win-titlebar">
        <a className="win-close" href="/" title="Back to the site" aria-label="Back to the site">
          <PixIcon name="x" size={13} />
        </a>
        <span className="win-title">crispyisland.com/admin</span>
      </div>

      <div className="win-body" style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <form className={`win-dialog${shake ? ' shake' : ''}`} onSubmit={submit}>
          <p className="win-dialog-title">Sign in</p>

          {/* A full document navigation, not a client-side route change: this
              endpoint sets the CSRF state cookie and redirects out to Google. */}
          <button
            type="button"
            className="google-btn"
            onClick={() => {
              window.location.href = '/api/admin/google/start'
            }}
          >
            <GoogleMark />
            Continue with Google
          </button>

          {oauthError && (
            <p className="win-dialog-error">
              {OAUTH_ERRORS[oauthError] ?? 'Google sign-in failed. Please try again.'}
            </p>
          )}

          <div className="signin-divider">
            <span>or</span>
          </div>

          <label className="win-dialog-label">Who&apos;s signing in?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['aviv', 'dana'] as const).map(u => (
              <button
                key={u}
                type="button"
                className={`win-btn${username === u ? ' primary' : ''}`}
                style={{ flex: 1, textTransform: 'capitalize' }}
                onClick={() => setUsername(u)}
              >
                {u}
              </button>
            ))}
          </div>

          <label className="win-dialog-label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            className="win-dialog-field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              setError('')
            }}
          />

          {error && <p className="win-dialog-error">{error}</p>}

          <div className="win-dialog-actions">
            <button type="submit" className="win-btn primary" disabled={busy}>
              {busy ? 'Checking…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>

      <div className="win-status">Invite-only. Unlisted URL.</div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.4h12.1c-.2 2-1.6 5-4.5 7l-.1.3 6.5 5 .5.1c4.1-3.8 6.6-9.4 6.6-15.7z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3
        .1-6.7 5.2-.1.3C7.9 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4 0-1.6.3-3.1.7-4.4v-.4l-6.8-5.3-.2.1C2.9 17 2 20.4 2 24s.9 7 2.5 10l7-5.6z" />
      <path fill="#EB4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.3 29.9 2 24 2 15.4 2 7.9 7 4.5 14l7 5.6c1.8-5.3 6.7-9.1 12.5-9.1z" />
    </svg>
  )
}
