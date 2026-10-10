'use client'

import { useState } from 'react'
import PixIcon from '@/components/PixIcon'
import type { Tree } from '@/lib/types'
import type { Op } from './useAdminStore'

/**
 * Admin: what the green ticker under the menu says. One line per message;
 * with no lines, the site shows placeholder stock quotes. Saves live, like
 * everything else in the admin.
 */
export default function TickerEditor({
  tree,
  apply,
  onClose,
  phone = false,
}: {
  tree: Tree
  apply: (op: Op) => void
  onClose: () => void
  phone?: boolean
}) {
  const current = tree.ticker ?? { on: true, messages: [] }
  const [text, setText] = useState(current.messages.join('\n'))
  const [on, setOn] = useState(current.on)
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  const dirty = on !== current.on || lines.join('\n') !== current.messages.join('\n')

  const save = () => {
    apply(t => ({ ...t, ticker: { on, messages: lines.slice(0, 20).map(l => l.slice(0, 200)) } }))
    onClose()
  }

  return (
    <div className={phone ? 'ma-scrim' : 'lightbox-share-backdrop'} onClick={onClose}>
      <section className={`eved tked${phone ? ' phone' : ''}`} role="dialog" aria-label="Ticker" onClick={e => e.stopPropagation()}>
        <header className="eved-head">
          <PixIcon name="line-chart" size={22} />
          <strong>Ticker</strong>
          <button type="button" className="eved-icon" onClick={onClose} aria-label="Close">
            <PixIcon name="x" size={18} />
          </button>
        </header>
        <div className="eved-body">
          <p className="eved-note">
            The green strip under the menu. One line = one message. Leave it empty to show the stock-market placeholder.
          </p>
          <label className="tked-switch">
            <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} /> Show the ticker on the site
          </label>
          <label className="eved-field">
            <span>Messages</span>
            <textarea
              rows={6}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'NEW: DARIACOOK photos are up\nTAPE EXCLUSIVE on the TV\nCRISPY TEXTILES drop soon'}
            />
          </label>
          <div className="tked-preview" aria-hidden="true">
            <div className="tk static">
              <div className="tk-track">
                <div className="tk-row">
                  {(lines.length ? lines : ['NYSE 19,842.17 ▲0.55', 'AAPL 227.52 ▲1.24', 'TSLA 248.91 ▼0.87']).map((l, i) => (
                    <span key={i} className="tk-cell">
                      <span className="tk-item">{l}</span>
                      <span className="tk-sep">◆</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="tked-actions">
            <button type="button" className="win-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="win-btn primary" onClick={save} disabled={!dirty}>
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
