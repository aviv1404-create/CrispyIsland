'use client'

import { useRef, useState } from 'react'
import PixIcon from '@/components/PixIcon'
import { EVENTS } from '@/data/events'
import { folderOptions } from '@/lib/tree-ops'
import type { SiteEvent, Tree } from '@/lib/types'
import { slugify } from '@/lib/types'
import type { Op } from './useAdminStore'

/**
 * Admin: the Events app's posters. Add, edit, reorder and delete events, and
 * upload posters — same saving as everything else in the admin (live on save,
 * conflict-safe, works offline). Each event can point at a photo folder.
 */
export default function EventsEditor({
  tree,
  apply,
  uploadPoster,
  onClose,
  phone = false,
}: {
  tree: Tree
  apply: (op: Op) => void
  uploadPoster: (file: File) => Promise<string | null>
  onClose: () => void
  phone?: boolean
}) {
  const events = tree.events ?? EVENTS
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  // The first edit copies the bundled list into the saved content.
  const setEvents = (fn: (list: SiteEvent[]) => SiteEvent[]) =>
    apply(t => ({ ...t, events: fn(t.events ?? EVENTS) }))

  const move = (id: string, d: number) =>
    setEvents(list => {
      const i = list.findIndex(e => e.id === id)
      const j = i + d
      if (i < 0 || j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const add = () => {
    const id = `event-${Date.now().toString(36)}`
    setEvents(list => [{ id, title: 'New event' }, ...list])
    setEditing(id)
  }

  const current = editing ? events.find(e => e.id === editing) : undefined

  return (
    <div className={phone ? 'ma-scrim' : 'lightbox-share-backdrop'} onClick={onClose}>
      <section className={`eved${phone ? ' phone' : ''}`} role="dialog" aria-label="Events" onClick={e => e.stopPropagation()}>
        <header className="eved-head">
          {current ? (
            <button type="button" className="eved-icon" onClick={() => setEditing(null)} aria-label="Back to all events">
              <PixIcon name="arrow-left" size={18} />
            </button>
          ) : (
            <PixIcon name="ticket" size={22} />
          )}
          <strong>{current ? current.title || 'Event' : 'Events'}</strong>
          <button type="button" className="eved-icon" onClick={onClose} aria-label="Close">
            <PixIcon name="x" size={18} />
          </button>
        </header>

        {current ? (
          <EventForm
            key={current.id}
            ev={current}
            tree={tree}
            uploadPoster={uploadPoster}
            onChange={patch =>
              setEvents(list => list.map(e => (e.id === current.id ? cleanEvent({ ...e, ...patch }) : e)))
            }
            onDelete={() => setConfirmDel(current.id)}
          />
        ) : (
          <div className="eved-body">
            <p className="eved-note">Posters show in this order in the Events app. Newest first works best.</p>
            <button type="button" className="eved-add" onClick={add}>
              <PixIcon name="add-circle" size={18} /> Add event
            </button>
            <ul className="eved-list">
              {events.map((e, i) => (
                <li key={e.id}>
                  <button type="button" className="eved-row" onClick={() => setEditing(e.id)}>
                    <span className="eved-thumb">{e.poster ? <img src={e.poster} alt="" /> : <PixIcon name="ticket" size={24} />}</span>
                    <span className="eved-text">
                      <strong>{e.title}</strong>
                      <span>{[e.date, e.place].filter(Boolean).join(' · ') || 'No date yet'}</span>
                    </span>
                  </button>
                  <span className="eved-arrows">
                    <button type="button" disabled={i === 0} onClick={() => move(e.id, -1)} aria-label={`Move ${e.title} up`}>
                      <PixIcon name="arrow-up" size={16} />
                    </button>
                    <button type="button" disabled={i === events.length - 1} onClick={() => move(e.id, 1)} aria-label={`Move ${e.title} down`}>
                      <PixIcon name="arrow-down" size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {confirmDel && (
          <div className="eved-confirm">
            <p>Delete “{events.find(e => e.id === confirmDel)?.title}” from Events? Its photo folder is not touched.</p>
            <div>
              <button type="button" className="win-btn" onClick={() => setConfirmDel(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="win-btn primary"
                onClick={() => {
                  const id = confirmDel
                  setEvents(list => list.filter(e => e.id !== id))
                  setConfirmDel(null)
                  setEditing(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function cleanEvent(e: SiteEvent): SiteEvent {
  const out: SiteEvent = { id: e.id, title: e.title || 'Untitled event' }
  for (const k of ['date', 'place', 'about', 'poster', 'folderSlug'] as const) if (e[k]) out[k] = e[k]
  if (e.link?.href) out.link = { label: e.link.label || 'Link', href: e.link.href }
  return out
}

function EventForm({
  ev,
  tree,
  uploadPoster,
  onChange,
  onDelete,
}: {
  ev: SiteEvent
  tree: Tree
  uploadPoster: (file: File) => Promise<string | null>
  onChange: (patch: Partial<SiteEvent>) => void
  onDelete: () => void
}) {
  // Text saves when you leave a field, so typing doesn't save every letter.
  const [f, setF] = useState({
    title: ev.title,
    date: ev.date ?? '',
    place: ev.place ?? '',
    about: ev.about ?? '',
    linkLabel: ev.link?.label ?? '',
    linkHref: ev.link?.href ?? '',
  })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const commit = (k: keyof typeof f) => () => {
    if (k === 'linkLabel' || k === 'linkHref') {
      onChange({ link: f.linkHref ? { label: f.linkLabel || 'Link', href: f.linkHref } : undefined })
    } else onChange({ [k]: f[k] || undefined } as Partial<SiteEvent>)
  }
  const field = (k: keyof typeof f, label: string, opts: { area?: boolean; placeholder?: string } = {}) => (
    <label className="eved-field">
      <span>{label}</span>
      {opts.area ? (
        <textarea rows={3} value={f[k]} placeholder={opts.placeholder} onChange={e => setF({ ...f, [k]: e.target.value })} onBlur={commit(k)} />
      ) : (
        <input value={f[k]} placeholder={opts.placeholder} onChange={e => setF({ ...f, [k]: e.target.value })} onBlur={commit(k)} />
      )}
    </label>
  )
  const folders = folderOptions(tree)
  const folderId = ev.folderSlug ? tree.folders.find(x => x.slug === ev.folderSlug)?.id ?? '' : ''

  return (
    <div className="eved-body eved-form">
      <div className="eved-poster">
        {ev.poster ? <img src={ev.poster} alt="" /> : <span>No poster yet</span>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif"
          hidden
          onChange={async e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setBusy(true)
            const url = await uploadPoster(file)
            setBusy(false)
            if (url) onChange({ poster: url })
          }}
        />
        <button type="button" className="win-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : ev.poster ? 'Change poster' : 'Upload poster'}
        </button>
      </div>
      <div className="eved-fields">
        {field('title', 'Title')}
        <div className="eved-row2">
          {field('date', 'Date', { placeholder: '17.8.2025' })}
          {field('place', 'Place', { placeholder: 'Sira Bar, Tel Aviv' })}
        </div>
        {field('about', 'About', { area: true, placeholder: 'A line or two about the night' })}
        <label className="eved-field">
          <span>Photos from the night</span>
          <select
            value={folderId}
            onChange={e => {
              const fo = tree.folders.find(x => x.id === e.target.value)
              onChange({ folderSlug: fo ? slugify(fo.slug) : undefined })
            }}
          >
            <option value="">No photos yet</option>
            {folders.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="eved-row2">
          {field('linkLabel', 'Button text', { placeholder: 'Tickets' })}
          {field('linkHref', 'Button link', { placeholder: 'https://…' })}
        </div>
        <button type="button" className="eved-delete" onClick={onDelete}>
          <PixIcon name="trash" size={16} /> Delete event
        </button>
      </div>
    </div>
  )
}
