'use client'

import { useRef, useState } from 'react'
import PixIcon from '@/components/PixIcon'
import { TAPES } from '@/data/tv'
import { getEmbedUrl } from '@/lib/video'
import type { Tree, TvTape, TvVideo } from '@/lib/types'
import type { Op } from './useAdminStore'

const COLORS = ['#e8322a', '#2a6be8', '#f2c12e', '#35b04a', '#9b3de8', '#ff7a1a', '#e8e2d0', '#000000']
const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/**
 * Admin: the TV app's channels. Each channel is a VHS tape on the shelf with
 * its own videos — YouTube/Vimeo links or uploaded video files — played one
 * after another, in order or shuffled. Saves live, like the rest of the admin.
 */
export default function TvEditor({
  tree,
  apply,
  uploadVideo,
  onClose,
  phone = false,
}: {
  tree: Tree
  apply: (op: Op) => void
  /** uploads one video file, reporting progress 0–1; resolves to its URL */
  uploadVideo: (file: File, onProgress: (f: number) => void) => Promise<string | null>
  onClose: () => void
  phone?: boolean
}) {
  const tapes = tree.tv?.tapes ?? TAPES
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  // The first edit copies the starting list into the saved content.
  const setTapes = (fn: (list: TvTape[]) => TvTape[]) => apply(t => ({ ...t, tv: { tapes: fn(t.tv?.tapes ?? TAPES) } }))
  const patchTape = (id: string, patch: Partial<TvTape>) => setTapes(list => list.map(t => (t.id === id ? { ...t, ...patch } : t)))
  const move = (id: string, d: number) =>
    setTapes(list => {
      const i = list.findIndex(t => t.id === id)
      const j = i + d
      if (i < 0 || j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const add = () => {
    const id = newId('ch')
    setTapes(list => [...list, { id, title: 'NEW TAPE', color: COLORS[list.length % COLORS.length], videos: [], order: 'list' }])
    setEditing(id)
  }

  const current = editing ? tapes.find(t => t.id === editing) : undefined

  return (
    <div className={phone ? 'ma-scrim' : 'lightbox-share-backdrop'} onClick={onClose}>
      <section className={`eved tved${phone ? ' phone' : ''}`} role="dialog" aria-label="TV channels" onClick={e => e.stopPropagation()}>
        <header className="eved-head">
          {current ? (
            <button type="button" className="eved-icon" onClick={() => setEditing(null)} aria-label="Back to all channels">
              <PixIcon name="arrow-left" size={18} />
            </button>
          ) : (
            <PixIcon name="tv" size={22} />
          )}
          <strong>{current ? current.title : 'TV channels'}</strong>
          <button type="button" className="eved-icon" onClick={onClose} aria-label="Close">
            <PixIcon name="x" size={18} />
          </button>
        </header>

        {current ? (
          <ChannelForm
            key={current.id}
            tape={current}
            onPatch={patch => patchTape(current.id, patch)}
            uploadVideo={uploadVideo}
            onDelete={() => setConfirmDel(current.id)}
          />
        ) : (
          <div className="eved-body">
            <p className="eved-note">Each tape on the TV shelf is a channel. Open one to add videos — YouTube or Vimeo links, or upload a video file.</p>
            <button type="button" className="eved-add" onClick={add}>
              <PixIcon name="add-circle" size={18} /> Add channel
            </button>
            <ul className="eved-list">
              {tapes.map((t, i) => (
                <li key={t.id}>
                  <button type="button" className="eved-row" onClick={() => setEditing(t.id)}>
                    <span className="tved-spine" style={{ background: t.color }}>
                      {t.art ? <img src={t.art} alt="" /> : null}
                    </span>
                    <span className="eved-text">
                      <strong>
                        CH {String(i + 1).padStart(2, '0')} · {t.title}
                      </strong>
                      <span>
                        {t.videos.length ? `${t.videos.length} video${t.videos.length > 1 ? 's' : ''}` : 'No videos yet'}
                        {t.videos.length > 1 ? (t.order === 'shuffle' ? ' · shuffle' : ' · in order') : ''}
                      </span>
                    </span>
                  </button>
                  <span className="eved-arrows">
                    <button type="button" disabled={i === 0} onClick={() => move(t.id, -1)} aria-label={`Move ${t.title} up`}>
                      <PixIcon name="arrow-up" size={16} />
                    </button>
                    <button type="button" disabled={i === tapes.length - 1} onClick={() => move(t.id, 1)} aria-label={`Move ${t.title} down`}>
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
            <p>Delete the “{tapes.find(t => t.id === confirmDel)?.title}” channel and its video list?</p>
            <div>
              <button type="button" className="win-btn" onClick={() => setConfirmDel(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="win-btn primary"
                onClick={() => {
                  const id = confirmDel
                  setTapes(list => list.filter(t => t.id !== id))
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

function ChannelForm({
  tape,
  onPatch,
  uploadVideo,
  onDelete,
}: {
  tape: TvTape
  onPatch: (patch: Partial<TvTape>) => void
  uploadVideo: (file: File, onProgress: (f: number) => void) => Promise<string | null>
  onDelete: () => void
}) {
  const [title, setTitle] = useState(tape.title)
  const [sub, setSub] = useState(tape.sub ?? '')
  const [link, setLink] = useState('')
  const [linkErr, setLinkErr] = useState('')
  const [upload, setUpload] = useState<{ name: string; p: number } | null>(null)
  const [upErr, setUpErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const setVideos = (videos: TvVideo[]) => onPatch({ videos })
  const addLink = () => {
    const url = link.trim()
    if (!url) return
    if (!getEmbedUrl(url)) {
      setLinkErr('That doesn’t look like a YouTube or Vimeo link.')
      return
    }
    setVideos([...tape.videos, { id: newId('v'), url }])
    setLink('')
    setLinkErr('')
  }
  const moveVideo = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= tape.videos.length) return
    const next = [...tape.videos]
    ;[next[i], next[j]] = [next[j], next[i]]
    setVideos(next)
  }

  return (
    <div className="eved-body eved-form tved-form">
      <div className="eved-fields">
        <div className="eved-row2">
          <label className="eved-field">
            <span>Name on the tape</span>
            <input value={title} maxLength={40} onChange={e => setTitle(e.target.value)} onBlur={() => onPatch({ title: title.trim() || 'TAPE' })} />
          </label>
          <label className="eved-field">
            <span>Small text</span>
            <input value={sub} maxLength={40} placeholder="2026" onChange={e => setSub(e.target.value)} onBlur={() => onPatch({ sub: sub.trim() || undefined })} />
          </label>
        </div>
        <div className="eved-field">
          <span>Tape colour</span>
          <div className="tved-colors">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={c === tape.color ? 'on' : ''}
                style={{ background: c }}
                onClick={() => onPatch({ color: c })}
                aria-label={`Colour ${c}`}
                aria-pressed={c === tape.color}
              />
            ))}
          </div>
        </div>
        <div className="eved-field">
          <span>Play the videos</span>
          <div className="tved-order" role="group" aria-label="Play order">
            <button type="button" className={tape.order !== 'shuffle' ? 'on' : ''} onClick={() => onPatch({ order: 'list' })}>
              ▶ One after another
            </button>
            <button type="button" className={tape.order === 'shuffle' ? 'on' : ''} onClick={() => onPatch({ order: 'shuffle' })}>
              🔀 Shuffle
            </button>
          </div>
        </div>

        <div className="eved-field">
          <span>Videos on this channel</span>
          {tape.videos.length === 0 && <p className="eved-note">No videos yet — the TV shows static on this channel.</p>}
          <ol className="tved-videos">
            {tape.videos.map((v, i) => {
              const kind = getEmbedUrl(v.url)?.provider ?? 'file'
              return (
                <li key={v.id}>
                  <span className={`tved-kind ${kind}`}>{kind === 'youtube' ? 'YouTube' : kind === 'vimeo' ? 'Vimeo' : 'File'}</span>
                  <input
                    className="tved-vtitle"
                    defaultValue={v.title ?? ''}
                    placeholder={kind === 'file' ? decodeURIComponent(v.url.split('/').pop() ?? 'video') : v.url.replace(/^https?:\/\/(www\.)?/, '')}
                    aria-label="Video title (optional)"
                    onBlur={e => {
                      const t = e.target.value.trim()
                      if (t !== (v.title ?? '')) setVideos(tape.videos.map(x => (x.id === v.id ? { ...x, title: t || undefined } : x)))
                    }}
                  />
                  <span className="eved-arrows">
                    <button type="button" disabled={i === 0} onClick={() => moveVideo(i, -1)} aria-label="Move video up">
                      <PixIcon name="arrow-up" size={14} />
                    </button>
                    <button type="button" disabled={i === tape.videos.length - 1} onClick={() => moveVideo(i, 1)} aria-label="Move video down">
                      <PixIcon name="arrow-down" size={14} />
                    </button>
                    <button type="button" onClick={() => setVideos(tape.videos.filter(x => x.id !== v.id))} aria-label="Remove video">
                      <PixIcon name="trash" size={14} />
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="eved-field">
          <span>Add a YouTube or Vimeo link</span>
          <div className="tved-add">
            <input
              value={link}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={e => {
                setLink(e.target.value)
                setLinkErr('')
              }}
              onKeyDown={e => e.key === 'Enter' && addLink()}
            />
            <button type="button" className="win-btn primary" onClick={addLink} disabled={!link.trim()}>
              Add
            </button>
          </div>
          {linkErr && <p className="tved-err">{linkErr}</p>}
        </div>

        <div className="eved-field">
          <span>…or upload a video file (MP4 works everywhere)</span>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
            hidden
            onChange={async e => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setUpErr('')
              setUpload({ name: file.name, p: 0 })
              try {
                const url = await uploadVideo(file, p => setUpload({ name: file.name, p }))
                if (url) setVideos([...tape.videos, { id: newId('v'), url, title: file.name.replace(/\.[^.]+$/, '') }])
                else setUpErr('Upload failed.')
              } catch (err) {
                setUpErr(err instanceof Error ? err.message : 'Upload failed.')
              }
              setUpload(null)
            }}
          />
          <button type="button" className="win-btn" onClick={() => fileRef.current?.click()} disabled={!!upload}>
            {upload ? `Uploading ${upload.name}… ${Math.round(upload.p * 100)}%` : 'Upload video'}
          </button>
          {upErr && <p className="tved-err">{upErr}</p>}
        </div>

        <button type="button" className="eved-delete" onClick={onDelete}>
          <PixIcon name="trash" size={16} /> Delete channel
        </button>
      </div>
    </div>
  )
}
