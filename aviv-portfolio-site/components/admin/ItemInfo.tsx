'use client'

import PixIcon from '@/components/PixIcon'
import { useEffect, useRef, useState } from 'react'
import { itemThumb, rotClass } from '@/lib/types'
import type { FilmItem, Item, Still } from '@/lib/types'
import { newId } from '@/lib/tree-ops'

interface Props {
  item: Item
  isCover: boolean
  onChange: (patch: Partial<Item>) => void
  onSetCover: () => void
  /** turn a photo 90° (1 = clockwise) */
  onRotate?: (dir: 1 | -1) => void
  onDelete: () => void
  onClose: () => void
  uploadFile: (file: File) => Promise<string | null>
}

/** A6 — Get Info. Metadata autosaves; captions and tags feed search. */
export default function ItemInfo({
  item,
  isCover,
  onChange,
  onSetCover,
  onRotate,
  onDelete,
  onClose,
  uploadFile,
}: Props) {
  const [tagText, setTagText] = useState(item.tags.join(', '))
  const stillRef = useRef<HTMLInputElement>(null)

  // Tags are edited as free text and committed on blur, so the field is reset
  // when a different item is opened. Adjusting during render beats an effect.
  const [shownId, setShownId] = useState(item.id)
  if (shownId !== item.id) {
    setShownId(item.id)
    setTagText(item.tags.join(', '))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const film = item.kind === 'film' ? (item as FilmItem) : null

  const commitTags = () => {
    onChange({ tags: tagText.split(',').map(t => t.trim()).filter(Boolean) })
  }

  const addStill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !film) return
    const url = await uploadFile(file)
    if (url) {
      const still: Still = { id: newId(), src: url, caption: '' }
      onChange({ stills: [...film.stills, still] } as Partial<Item>)
    }
    if (stillRef.current) stillRef.current.value = ''
  }

  return (
    <div className="lightbox-share-backdrop" onClick={onClose}>
      <div className="admin-info" onClick={e => e.stopPropagation()}>
        <div className="win-titlebar">
          <button type="button" className="win-close" onClick={onClose} title="Close" aria-label="Close">
            <PixIcon name="x" size={13} />
          </button>
          <span className="win-title">{item.title || 'Untitled'} — Get Info</span>
        </div>

        <div className="admin-info-body">
          <div className="admin-info-preview">
            {itemThumb(item) ? (
              <img src={itemThumb(item)} alt={item.alt} className={rotClass(item)} />
            ) : (
              <span className="item-tile-blank">{item.kind === 'film' ? 'FILM' : 'PHOTO'}</span>
            )}
          </div>

          <div className="admin-info-fields">
            <Field label="Title" value={item.title} onChange={v => onChange({ title: v })} />
            <Field
              label={film ? 'Synopsis' : 'Caption'}
              value={item.caption}
              onChange={v => onChange({ caption: v })}
              multiline
            />
            <Field
              label="Tags"
              value={tagText}
              onChange={setTagText}
              onBlur={commitTags}
              placeholder="portrait, film"
            />
            <Field label="Alt text" value={item.alt} onChange={v => onChange({ alt: v })} />

            {film && (
              <>
                <div className="admin-info-row">
                  <Field label="Duration" value={film.duration} onChange={v => onChange({ duration: v } as Partial<Item>)} />
                  <Field
                    label="Year"
                    value={film.year ? String(film.year) : ''}
                    onChange={v => onChange({ year: Number(v) || undefined } as Partial<Item>)}
                  />
                </div>
                <Field label="Video URL" value={film.videoUrl} onChange={v => onChange({ videoUrl: v } as Partial<Item>)} placeholder="https://youtube.com/watch?v=… or vimeo.com/…" />
                <div className="admin-info-row">
                  <Field label="Director" value={film.director} onChange={v => onChange({ director: v } as Partial<Item>)} />
                  <Field label="Producer" value={film.producer} onChange={v => onChange({ producer: v } as Partial<Item>)} />
                </div>
                <div className="admin-info-row">
                  <Field label="Cinematographer" value={film.cinematographer} onChange={v => onChange({ cinematographer: v } as Partial<Item>)} />
                  <Field label="Editor" value={film.editor} onChange={v => onChange({ editor: v } as Partial<Item>)} />
                </div>
                <Field label="Production company" value={film.productionCompany} onChange={v => onChange({ productionCompany: v } as Partial<Item>)} />

                <label className="win-dialog-label">Awards</label>
                {film.awards.map((award, i) => (
                  <div key={i} className="admin-chip">
                    <span>{award}</span>
                    <button
                      className="admin-chip-x"
                      onClick={() => onChange({ awards: film.awards.filter((_, j) => j !== i) } as Partial<Item>)}
                      aria-label="Remove award"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <AwardAdder onAdd={a => onChange({ awards: [...film.awards, a] } as Partial<Item>)} />

                <label className="win-dialog-label">Stills</label>
                <div className="admin-stills">
                  {film.stills.map(s => (
                    <div key={s.id} className="admin-still">
                      <img src={s.src} alt="" />
                      <button
                        className="admin-chip-x"
                        onClick={() => onChange({ stills: film.stills.filter(x => x.id !== s.id) } as Partial<Item>)}
                        aria-label="Remove still"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <input ref={stillRef} type="file" accept="image/*" hidden onChange={addStill} />
                <button className="win-btn" onClick={() => stillRef.current?.click()}>
                  Add still
                </button>
              </>
            )}

            <div className="admin-info-actions">
              {onRotate && item.kind === 'photo' && (
                <>
                  <button className="win-btn" onClick={() => onRotate(-1)} title="Turn left" aria-label="Turn photo left">
                    <PixIcon name="rotate" size={14} /> Left
                  </button>
                  <button className="win-btn" onClick={() => onRotate(1)} title="Turn right" aria-label="Turn photo right">
                    <PixIcon name="rotate" size={14} className="pix-flip" /> Right
                  </button>
                </>
              )}
              <button className="win-btn" onClick={onSetCover} disabled={isCover}>
                {isCover ? 'Folder cover' : 'Set as cover'}
              </button>
              <button className="win-btn" onClick={onDelete}>
                Delete
              </button>
              <button className="win-btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>

        <div className="win-status">Changes save automatically</div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label className="win-dialog-label">{label}</label>
      {multiline ? (
        <textarea
          className="win-dialog-field"
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
        />
      ) : (
        <input
          className="win-dialog-field"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
    </div>
  )
}

function AwardAdder({ onAdd }: { onAdd: (a: string) => void }) {
  const [text, setText] = useState('')
  const commit = () => {
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        className="win-dialog-field"
        value={text}
        placeholder="Best Short Film — Jerusalem Film Festival 2023"
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
      />
      <button className="win-btn" onClick={commit}>
        Add
      </button>
    </div>
  )
}
