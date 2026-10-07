'use client'

import { CLIENTS } from '@/data/clients'

/** An endless, slowly scrolling strip of client logos (pauses on hover). */
export default function ClientStrip() {
  if (!CLIENTS.length) return null
  // Repeat the list so the strip is always wider than the window, then twice
  // more so the loop is seamless.
  const reps = Math.max(2, Math.ceil(8 / CLIENTS.length))
  const run = Array.from({ length: reps }, () => CLIENTS).flat()
  const row = (hidden: boolean) => (
    <ul className="cs-row" aria-hidden={hidden || undefined}>
      {run.map((c, i) => {
        const inner = c.logo ? <img src={c.logo} alt={hidden ? '' : c.name || 'logo'} draggable={false} /> : <span>{c.name}</span>
        return (
          <li key={i} title={c.name || undefined}>
            {c.href && !hidden ? (
              <a href={c.href} target="_blank" rel="noopener">
                {inner}
              </a>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ul>
  )
  return (
    <div className="cs" role="region" aria-label="Worked with">
      <div className="cs-track" style={{ animationDuration: `${run.length * 3.5}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
