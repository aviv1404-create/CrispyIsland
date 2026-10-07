'use client'

import type { useUploadQueue } from './useUploadQueue'

type Queue = ReturnType<typeof useUploadQueue>

/** Per-file upload progress, with Retry for anything that failed. */
export default function UploadTray({ queue, compact = false }: { queue: Queue; compact?: boolean }) {
  const { jobs, retry, retryAll, remove, clearFinished, busy } = queue
  const done = jobs.filter(j => j.status === 'done').length
  const failed = jobs.filter(j => j.status === 'error').length

  return (
    <section className={`upl${compact ? ' compact' : ''}`} aria-label="Uploads" aria-live="polite">
      <header className="upl-head">
        <strong>
          {busy ? `Uploading… ${done} of ${jobs.length}` : failed ? `${failed} failed` : `${done} uploaded`}
        </strong>
        <span className="upl-actions">
          {failed > 0 && (
            <button type="button" onClick={retryAll}>
              Retry all
            </button>
          )}
          {!busy && done > 0 && (
            <button type="button" onClick={clearFinished}>
              Clear
            </button>
          )}
        </span>
      </header>
      <ul className="upl-list">
        {jobs.map(j => (
          <li key={j.id} className={`upl-row ${j.status}`}>
            <img src={j.preview} alt="" />
            <span className="upl-info">
              <span className="upl-name">{j.name}</span>
              {j.status === 'error' ? (
                <span className="upl-error">{j.error}</span>
              ) : (
                <span className="upl-bar">
                  <span style={{ width: `${Math.round(j.progress * 100)}%` }} />
                </span>
              )}
            </span>
            {j.status === 'error' && (
              <span className="upl-row-actions">
                <button type="button" onClick={() => retry(j.id)}>
                  Retry
                </button>
                <button type="button" onClick={() => remove(j.id)} aria-label={`Remove ${j.name}`}>
                  ×
                </button>
              </span>
            )}
            {j.status === 'done' && <span className="upl-ok" aria-label="Uploaded">✓</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
