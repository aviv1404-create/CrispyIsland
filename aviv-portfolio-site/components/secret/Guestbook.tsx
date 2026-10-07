'use client'

import { useEffect, useState } from 'react'

interface Entry {
  id: string
  name: string
  message: string
  at: string
}

const LOCAL_KEY = 'guestbook:demo'
const LIMITS = { name: 40, message: 500 }

/**
 * Old-school guestbook: a name and a message, no login. Saved on the server
 * (/api/guestbook). Signed in as admin, each entry gets a delete button.
 * When there's no server (the chat preview), it falls back to this browser.
 */
export default function Guestbook({ icon }: { icon: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [admin, setAdmin] = useState(false)
  const [offline, setOffline] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [trap, setTrap] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const readLocal = (): Entry[] => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
    } catch {
      return []
    }
  }

  useEffect(() => {
    fetch('/api/guestbook', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setEntries(d.entries ?? [])
        setAdmin(!!d.admin)
      })
      .catch(() => {
        setOffline(true)
        setEntries(readLocal())
      })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !message.trim() || state === 'busy') return
    setState('busy')
    setError('')
    if (offline) {
      const entry = { id: `local-${Date.now()}`, name: name.trim(), message: message.trim(), at: new Date().toISOString() }
      const all = [entry, ...readLocal()].slice(0, 80)
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
      } catch {}
      setEntries(all)
      setMessage('')
      setState('done')
      return
    }
    const res = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message, website: trap }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (res?.ok && data?.entry) {
      setEntries(list => [data.entry, ...list])
      setMessage('')
      setState('done')
    } else {
      setError(data?.error || 'Could not sign right now. Try again later.')
      setState('error')
    }
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/guestbook?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) setEntries(list => list.filter(e => e.id !== id))
  }

  const when = (iso: string) => {
    const d = new Date(iso)
    return isNaN(+d) ? '' : `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
  }

  return (
    <div className="gb">
      <form className="gb-form" onSubmit={submit}>
        <label>
          <span>Your name:</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={LIMITS.name} required />
        </label>
        <label>
          <span>Message:</span>
          <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={LIMITS.message} rows={3} required />
        </label>
        {/* bots fill this in, people never see it */}
        <input className="gb-trap" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} name="website" aria-hidden="true" />
        <div className="gb-actions">
          <button type="submit" className="s90-btn" disabled={state === 'busy'}>
            {state === 'busy' ? 'Signing…' : '~ Sign the guestbook ~'}
          </button>
          <span className="gb-msg" aria-live="polite">
            {state === 'done' ? 'THANK U 4 SIGNING!!' : state === 'error' ? error : `${message.length}/${LIMITS.message}`}
          </span>
        </div>
        {offline && <p className="gb-note">(preview: messages are only saved in this browser)</p>}
      </form>

      {entries.length === 0 ? (
        <p className="gb-empty">Nobody signed yet... be the first!!</p>
      ) : (
        <ol className="gb-list">
          {entries.map(e => (
            <li key={e.id}>
              <div className="gb-head">
                <img src={icon} alt="" />
                <strong dir="auto">{e.name}</strong>
                <span>{when(e.at)}</span>
                {admin && (
                  <button type="button" className="gb-del" onClick={() => remove(e.id)} title="Delete this entry">
                    delete
                  </button>
                )}
              </div>
              <p dir="auto">{e.message}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
