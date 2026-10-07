'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import PixIcon from '@/components/PixIcon'
import { folderIconFor, itemIconFor } from '@/components/desktop/icons'
import { itemThumb, rotClass } from '@/lib/types'
import type { Folder, Item, Tree } from '@/lib/types'
import {
  addFolder,
  childrenOf,
  crumbsFor,
  deepItemCount,
  deleteFolder,
  deleteItems,
  descendantIds,
  folderOptions,
  itemsOf,
  moveFolder,
  moveItem,
  moveItemTo,
  moveItemsTo,
  newId,
  reorderFolder,
  reorderItem,
  restoreDeleted,
  rotateItems,
  setCover,
  tagItems,
  updateFolder,
  updateItem,
} from '@/lib/tree-ops'
import IconPicker, { type IconTarget } from './IconPicker'
import PreviewPane from './PreviewPane'
import EventsEditor from './EventsEditor'
import { prepareFile, sendFile } from './uploads'
import { useDragSort } from './useDragSort'
import UploadTray from './UploadTray'
import type { UploadMode } from './uploads'
import { useAdminStore, type SaveState } from './useAdminStore'
import { useUploadQueue } from './useUploadQueue'

interface Props {
  initialTree: Tree
  initialRev: string
  uploadMode: UploadMode
  user: string
  readOnly?: boolean
  onSwitchView: () => void
}

type Sheet =
  | { kind: 'item'; id: string }
  | { kind: 'folder-menu' }
  | { kind: 'new-folder' }
  | { kind: 'rename' }
  | { kind: 'confirm-folder' }
  | { kind: 'bulk-move' }
  | { kind: 'bulk-tag' }
  | null

/**
 * The pocket admin: the same content and saving as the desktop admin, laid
 * out for one thumb. Big targets, a fixed action bar, sheets instead of
 * dialogs, Undo instead of "are you sure" for photos.
 */
export default function MobileAdmin({ initialTree, initialRev, uploadMode, user, readOnly = false, onSwitchView }: Props) {
  const router = useRouter()
  const { tree, apply, save, error, pending } = useAdminStore(initialTree, initialRev, readOnly)
  const uploads = useUploadQueue(uploadMode, apply)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [reorder, setReorder] = useState(false)
  const [iconFor, setIconFor] = useState<{ type: 'folder' | 'item'; id: string } | null>(null)
  const [undo, setUndo] = useState<{ label: string; folders: Folder[]; items: Item[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const folder = folderId ? tree.folders.find(f => f.id === folderId) : undefined
  // If the open folder disappears (deleted on another device), go home.
  useEffect(() => {
    if (folderId && !folder) go(null)
  }, [folderId, folder])

  const folders = childrenOf(tree, folderId)
  const items = folder ? itemsOf(tree, folder.id) : []
  const crumbs = crumbsFor(tree, folderId)
  const parentId = folder?.parentId ?? null

  // Leaving a folder ends Select and Reorder.
  const go = (id: string | null) => {
    setFolderId(id)
    setSelecting(false)
    setSelected(new Set())
    setReorder(false)
  }
  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const chosen = items.filter(i => selected.has(i.id)).map(i => i.id)
  const endSelect = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  // In Reorder mode, drag tiles with a finger (arrows still work too).
  const itemSort = useDragSort({
    group: 'm-items',
    ids: items.map(i => i.id),
    onMove: (id, to) => apply(t => reorderItem(t, id, to)),
    enabled: reorder && !readOnly,
    touchImmediate: true,
  })
  const folderSort = useDragSort({
    group: 'm-folders',
    ids: folders.map(f => f.id),
    onMove: (id, to) => apply(t => reorderFolder(t, id, to)),
    enabled: reorder && !readOnly && !folders.some(f => f.system),
    touchImmediate: true,
  })

  // ── Undo ─────────────────────────────────────────────
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const offerUndo = (label: string, f: Folder[], i: Item[]) => {
    clearTimeout(undoTimer.current)
    setUndo({ label, folders: f, items: i })
    undoTimer.current = setTimeout(() => setUndo(null), 7000)
  }

  const deleteItem = (item: Item) => {
    setSheet(null)
    apply(t => deleteItems(t, [item.id]))
    offerUndo('Photo deleted', [], [item])
  }

  const removeFolder = (f: Folder) => {
    const ids = new Set(descendantIds(tree, f.id))
    const gone = tree.folders.filter(x => ids.has(x.id))
    const goneItems = tree.items.filter(x => ids.has(x.folderId))
    setSheet(null)
    setFolderId(f.parentId)
    apply(t => deleteFolder(t, f.id))
    offerUndo(`“${f.name}” deleted`, gone, goneItems)
  }

  // ── Icon picker target ───────────────────────────────
  let iconTarget: IconTarget | null = null
  if (iconFor?.type === 'folder') {
    const f = tree.folders.find(x => x.id === iconFor.id)
    if (f) iconTarget = { type: 'folder', folder: f }
  } else if (iconFor?.type === 'item') {
    const it = tree.items.find(x => x.id === iconFor.id)
    if (it) iconTarget = { type: 'item', item: it }
  }
  const setIcon = (icon: string | undefined) => {
    const target = iconFor
    if (!target) return
    apply(t => (target.type === 'folder' ? updateFolder(t, target.id, { icon }) : updateItem(t, target.id, { icon })))
  }

  const signOut = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.refresh()
  }

  const sheetItem = sheet?.kind === 'item' ? tree.items.find(i => i.id === sheet.id) : undefined

  return (
    <div className="ma">
      {/* ── Top bar ── */}
      <header className="ma-top">
        {folder ? (
          <button type="button" className="ma-iconbtn" onClick={() => go(parentId)} aria-label="Back">
            <PixIcon name="arrow-left" size={20} />
          </button>
        ) : (
          <span className="ma-iconbtn" aria-hidden="true">
            <PixIcon name="smiley" size={22} />
          </span>
        )}
        <div className="ma-title">
          <strong>{folder ? folder.name : 'Your site'}</strong>
          {crumbs.length > 1 && <span>{crumbs.slice(0, -1).map(c => c.name).join(' › ')}</span>}
        </div>
        <SavePill save={save} pending={pending} />
        {folder && (
          <button type="button" className="ma-iconbtn" onClick={() => setPreview(true)} aria-label="Preview as visitors see it" title="Preview">
            <PixIcon name="viewfinder" size={20} />
          </button>
        )}
        {folder && (
          <button type="button" className="ma-iconbtn" onClick={() => setSheet({ kind: 'folder-menu' })} aria-label="Folder options">
            <PixIcon name="more" size={20} />
          </button>
        )}
      </header>

      {readOnly && (
        <p className="ma-banner">Can’t reach the live content right now, so editing is off. Nothing is lost — try again shortly.</p>
      )}
      {save === 'error' && error && <p className="ma-banner error">{error}</p>}

      <main className="ma-body">
        {!folder ? (
          // ── Home: the three sections ──
          <>
            <div className="ma-sections">
              {folders.map(f => (
                <button key={f.id} type="button" className="ma-section" onClick={() => go(f.id)}>
                  <PixIcon name={folderIconFor(f).name} size={44} />
                  <strong>{f.name}</strong>
                  <span>{deepItemCount(tree, f.id)} items</span>
                </button>
              ))}
            </div>
            <button type="button" className="ma-section ma-events" onClick={() => setEventsOpen(true)}>
              <PixIcon name="ticket" size={44} />
              <strong>Events</strong>
              <span>Posters for the Events app</span>
            </button>
            <div className="ma-home-links">
              <a href="/" target="_blank" rel="noopener">
                <PixIcon name="globe" size={18} /> View site
              </a>
              <button type="button" onClick={onSwitchView}>
                <PixIcon name="desktop" size={18} /> Computer view
              </button>
              <button type="button" onClick={signOut}>
                <PixIcon name="power" size={18} /> Sign out ({user})
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Subfolders ── */}
            {folders.length > 0 && (
              <ul className={`ma-folders${reorder ? ' sorting' : ''}`} onClickCapture={folderSort.onClickCapture}>
                {folders.map((f, i) => {
                  const sp = folderSort.itemProps(f.id)
                  return (
                  <li key={f.id} className={sp.className.trim() || undefined} data-sort-group={sp['data-sort-group']} data-sort-id={sp['data-sort-id']} onPointerDown={sp.onPointerDown}>
                    <button type="button" className="ma-folder" onClick={() => !reorder && go(f.id)}>
                      <PixIcon name={folderIconFor(f).name} size={30} />
                      <span className="ma-folder-name">
                        {f.name}
                        {!f.visible && <em> · hidden</em>}
                      </span>
                      <span className="ma-count">{deepItemCount(tree, f.id)}</span>
                    </button>
                    {reorder && (
                      <span className="ma-arrows">
                        <button type="button" disabled={i === 0} onClick={() => apply(t => moveFolder(t, f.id, -1))} aria-label={`Move ${f.name} up`}>
                          <PixIcon name="arrow-up" size={18} />
                        </button>
                        <button type="button" disabled={i === folders.length - 1} onClick={() => apply(t => moveFolder(t, f.id, 1))} aria-label={`Move ${f.name} down`}>
                          <PixIcon name="arrow-down" size={18} />
                        </button>
                      </span>
                    )}
                  </li>
                  )
                })}
              </ul>
            )}

            {/* ── Photos ── */}
            {items.length === 0 && folders.length === 0 ? (
              <div className="ma-empty">
                <PixIcon name="photo-camera" size={56} />
                <p>No photos here yet.</p>
                <button type="button" className="ma-primary" onClick={() => fileRef.current?.click()}>
                  Add photos
                </button>
              </div>
            ) : (
              <ul className={`ma-grid${reorder ? ' sorting' : ''}${selecting ? ' selecting' : ''}`} onClickCapture={itemSort.onClickCapture}>
                {items.map((item, i) => {
                  const sp = itemSort.itemProps(item.id)
                  const isSel = selected.has(item.id)
                  return (
                  <li
                    key={item.id}
                    className={`ma-tile${sp.className}${isSel ? ' selected' : ''}`}
                    data-sort-group={sp['data-sort-group']}
                    data-sort-id={sp['data-sort-id']}
                    onPointerDown={sp.onPointerDown}
                  >
                    <button
                      type="button"
                      className="ma-thumb"
                      onClick={() => {
                        if (reorder) return
                        if (selecting) toggle(item.id)
                        else setSheet({ kind: 'item', id: item.id })
                      }}
                      aria-label={selecting ? `${isSel ? 'Unselect' : 'Select'} ${item.title || 'photo'}` : item.title || 'Edit photo'}
                      aria-pressed={selecting ? isSel : undefined}
                    >
                      {itemThumb(item) ? <img src={itemThumb(item)} alt="" loading="lazy" className={rotClass(item)} draggable={false} /> : <PixIcon name={itemIconFor(item, folder)} size={40} />}
                      {folder.coverItemId === item.id && <span className="ma-badge">Cover</span>}
                      {selecting && (
                        <span className={`ma-check${isSel ? ' on' : ''}`} aria-hidden="true">
                          <PixIcon name={isSel ? 'check' : 'checkbox-empty'} size={16} />
                        </span>
                      )}
                    </button>
                    {reorder && (
                      <span className="ma-arrows over">
                        <button type="button" disabled={i === 0} onClick={() => apply(t => moveItem(t, item.id, -1))} aria-label="Move earlier">
                          <PixIcon name="arrow-left" size={18} />
                        </button>
                        <button type="button" disabled={i === items.length - 1} onClick={() => apply(t => moveItem(t, item.id, 1))} aria-label="Move later">
                          <PixIcon name="arrow-right" size={18} />
                        </button>
                      </span>
                    )}
                  </li>
                  )
                })}
              </ul>
            )}
            {reorder && (items.length > 1 || folders.length > 1) && <p className="ma-hint">Drag to reorder, or use the arrows.</p>}

            {uploads.jobs.length > 0 && <UploadTray queue={uploads} compact />}
          </>
        )}
      </main>

      {/* ── Bottom action bar ── */}
      {folder && selecting && (
        <nav className="ma-bar ma-selbar" aria-label="Selected photos">
          <span className="ma-selcount">
            <strong>{chosen.length}</strong> selected
            <button type="button" onClick={() => setSelected(chosen.length === items.length ? new Set() : new Set(items.map(i => i.id)))}>
              {chosen.length === items.length ? 'None' : 'All'}
            </button>
          </span>
          <button type="button" disabled={!chosen.length} onClick={() => apply(t => rotateItems(t, chosen, 1))}>
            <PixIcon name="rotate" size={24} className="pix-flip" />
            Turn
          </button>
          <button type="button" disabled={!chosen.length} onClick={() => setSheet({ kind: 'bulk-move' })}>
            <PixIcon name="folder-open" size={24} />
            Move
          </button>
          <button type="button" disabled={!chosen.length} onClick={() => setSheet({ kind: 'bulk-tag' })}>
            <PixIcon name="flag" size={24} />
            Tag
          </button>
          <button
            type="button"
            disabled={!chosen.length}
            onClick={() => {
              const gone = tree.items.filter(i => selected.has(i.id))
              apply(t => deleteItems(t, chosen))
              offerUndo(`${gone.length} ${gone.length === 1 ? 'photo' : 'photos'} deleted`, [], gone)
              endSelect()
            }}
          >
            <PixIcon name="trash" size={24} />
            Delete
          </button>
          <button type="button" className="on" onClick={endSelect}>
            <PixIcon name="check" size={24} />
            Done
          </button>
        </nav>
      )}

      {folder && !selecting && (
        <nav className="ma-bar" aria-label="Actions">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={readOnly}>
            <PixIcon name="add-circle" size={24} />
            Add photos
          </button>
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={readOnly}>
            <PixIcon name="photo-camera" size={24} />
            Camera
          </button>
          <button type="button" onClick={() => setSheet({ kind: 'new-folder' })} disabled={readOnly}>
            <PixIcon name="folder-add" size={24} />
            New folder
          </button>
          {items.length > 0 && !reorder && (
            <button type="button" onClick={() => setSelecting(true)}>
              <PixIcon name="checkbox" size={24} />
              Select
            </button>
          )}
          <button type="button" className={reorder ? 'on' : ''} onClick={() => setReorder(r => !r)} aria-pressed={reorder}>
            <PixIcon name="sort" size={24} />
            {reorder ? 'Done' : 'Reorder'}
          </button>
        </nav>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={e => {
          if (e.target.files && folder) uploads.add(e.target.files, folder.id)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={e => {
          if (e.target.files && folder) uploads.add(e.target.files, folder.id)
          e.target.value = ''
        }}
      />

      {/* ── Undo toast ── */}
      {undo && (
        <div className="ma-toast" role="status">
          <span>{undo.label}</span>
          <button
            type="button"
            onClick={() => {
              const u = undo
              apply(t => restoreDeleted(t, u.folders, u.items))
              setUndo(null)
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* ── Sheets ── */}
      {sheetItem && folder && (
        <ItemSheet
          item={sheetItem}
          tree={tree}
          isCover={folder.coverItemId === sheetItem.id}
          onChange={patch => apply(t => updateItem(t, sheetItem.id, patch))}
          onCover={() => apply(t => setCover(t, folder.id, sheetItem.id))}
          onIcon={() => setIconFor({ type: 'item', id: sheetItem.id })}
          onRotate={dir => apply(t => rotateItems(t, [sheetItem.id], dir))}
          onMove={to => {
            apply(t => moveItemTo(t, sheetItem.id, to))
            setSheet(null)
          }}
          onDelete={() => deleteItem(sheetItem)}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet?.kind === 'bulk-move' && folder && (
        <SheetFrame title={`Move ${chosen.length} ${chosen.length === 1 ? 'photo' : 'photos'} to…`} onClose={() => setSheet(null)}>
          <div className="ma-menu ma-pick">
            {folderOptions(tree)
              .filter(o => o.id !== folder.id)
              .map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    apply(t => moveItemsTo(t, chosen, o.id))
                    setSheet(null)
                    endSelect()
                  }}
                >
                  <PixIcon name="folder" size={20} /> {o.label}
                </button>
              ))}
          </div>
        </SheetFrame>
      )}

      {sheet?.kind === 'bulk-tag' && (
        <NameSheet
          title={`Tag ${chosen.length} ${chosen.length === 1 ? 'photo' : 'photos'}`}
          initial=""
          placeholder="Tag, e.g. portrait"
          action="Add tag"
          onCancel={() => setSheet(null)}
          onSubmit={tag => {
            apply(t => tagItems(t, chosen, tag))
            setSheet(null)
          }}
        />
      )}

      {eventsOpen && (
        <EventsEditor
          tree={tree}
          apply={apply}
          phone
          uploadPoster={async file => {
            try {
              return await sendFile(await prepareFile(file), uploadMode, () => {})
            } catch {
              return null
            }
          }}
          onClose={() => setEventsOpen(false)}
        />
      )}

      {preview && folder && <PreviewPane tree={tree} folderId={folder.id} onClose={() => setPreview(false)} />}

      {sheet?.kind === 'folder-menu' && folder && (
        <SheetFrame title={folder.name} onClose={() => setSheet(null)}>
          <div className="ma-menu">
            {!folder.system && (
              <button type="button" onClick={() => setSheet({ kind: 'rename' })}>
                <PixIcon name="pencil" size={20} /> Rename
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSheet(null)
                setPreview(true)
              }}
            >
              <PixIcon name="viewfinder" size={20} /> Preview as visitors see it
            </button>
            <button
              type="button"
              onClick={() => {
                setSheet(null)
                setIconFor({ type: 'folder', id: folder.id })
              }}
            >
              <PixIcon name={folderIconFor(folder).name} size={20} /> Change icon
            </button>
            {!folder.system && (
              <button
                type="button"
                onClick={() => {
                  apply(t => updateFolder(t, folder.id, { visible: !folder.visible }))
                  setSheet(null)
                }}
              >
                <PixIcon name={folder.visible ? 'lock' : 'unlock'} size={20} /> {folder.visible ? 'Hide from site' : 'Show on site'}
              </button>
            )}
            {!folder.system && (
              <button type="button" className="danger" onClick={() => setSheet({ kind: 'confirm-folder' })}>
                <PixIcon name="trash" size={20} /> Delete folder
              </button>
            )}
          </div>
        </SheetFrame>
      )}

      {sheet?.kind === 'confirm-folder' && folder && (
        <SheetFrame title={`Delete “${folder.name}”?`} onClose={() => setSheet(null)}>
          <p className="ma-note">
            This removes the folder and the {deepItemCount(tree, folder.id)} items inside it from the site. You’ll have a few seconds to undo.
          </p>
          <div className="ma-row">
            <button type="button" className="ma-secondary" onClick={() => setSheet(null)}>
              Cancel
            </button>
            <button type="button" className="ma-danger" onClick={() => removeFolder(folder)}>
              Delete
            </button>
          </div>
        </SheetFrame>
      )}

      {(sheet?.kind === 'new-folder' || sheet?.kind === 'rename') && folder && (
        <NameSheet
          title={sheet.kind === 'rename' ? 'Rename folder' : `New folder in ${folder.name}`}
          initial={sheet.kind === 'rename' ? folder.name : ''}
          action={sheet.kind === 'rename' ? 'Save' : 'Create'}
          onCancel={() => setSheet(null)}
          onSubmit={name => {
            if (sheet.kind === 'rename') {
              apply(t => updateFolder(t, folder.id, { name }))
            } else {
              const id = newId()
              apply(t => addFolder(t, folder.id, name, id))
            }
            setSheet(null)
          }}
        />
      )}

      {iconTarget && (
        <IconPicker
          tree={tree}
          target={iconTarget}
          onPick={name => setIcon(name)}
          onReset={() => setIcon(undefined)}
          onClose={() => setIconFor(null)}
        />
      )}
    </div>
  )
}

// ── Pieces ──────────────────────────────────────────────

function SavePill({ save, pending }: { save: SaveState; pending: number }) {
  const text =
    save === 'saving' ? 'Saving…' : save === 'saved' ? 'Saved' : save === 'offline' ? `Offline · ${pending}` : save === 'error' ? 'Not saved' : ''
  if (!text) return null
  return <span className={`ma-pill ${save}`}>{text}</span>
}

function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="ma-scrim" onClick={onClose}>
      <section className="ma-sheet" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <span className="ma-grab" aria-hidden="true" />
        <header className="ma-sheet-head">
          <strong>{title}</strong>
          <button type="button" className="ma-iconbtn" onClick={onClose} aria-label="Close">
            <PixIcon name="x" size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

function NameSheet({
  title,
  initial,
  action,
  placeholder = 'Folder name',
  onSubmit,
  onCancel,
}: {
  title: string
  initial: string
  action: string
  placeholder?: string
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial)
  return (
    <SheetFrame title={title} onClose={onCancel}>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (name.trim()) onSubmit(name.trim())
        }}
      >
        <input className="ma-input" value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} autoFocus enterKeyHint="done" />
        <div className="ma-row">
          <button type="button" className="ma-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="ma-primary" disabled={!name.trim()}>
            {action}
          </button>
        </div>
      </form>
    </SheetFrame>
  )
}

function ItemSheet({
  item,
  tree,
  isCover,
  onChange,
  onCover,
  onIcon,
  onRotate,
  onMove,
  onDelete,
  onClose,
}: {
  item: Item
  tree: Tree
  isCover: boolean
  onChange: (patch: Partial<Item>) => void
  onCover: () => void
  onIcon: () => void
  onRotate: (dir: 1 | -1) => void
  onMove: (folderId: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  // Text fields save when you leave them, so typing doesn't save every letter.
  const [title, setTitle] = useState(item.title)
  const [caption, setCaption] = useState(item.caption)
  const [tags, setTags] = useState(item.tags.join(', '))
  const options = folderOptions(tree).filter(o => o.id !== item.folderId)

  return (
    <SheetFrame title={item.kind === 'film' ? 'Film' : 'Photo'} onClose={onClose}>
      <div className="ma-preview">
        {itemThumb(item) ? <img src={itemThumb(item)} alt="" className={rotClass(item)} /> : <PixIcon name={itemIconFor(item, tree.folders.find(f => f.id === item.folderId))} size={64} />}
      </div>
      {item.kind === 'photo' && (
        <div className="ma-row ma-turn">
          <button type="button" className="ma-secondary" onClick={() => onRotate(-1)}>
            <PixIcon name="rotate" size={18} /> Turn left
          </button>
          <button type="button" className="ma-secondary" onClick={() => onRotate(1)}>
            <PixIcon name="rotate" size={18} className="pix-flip" /> Turn right
          </button>
        </div>
      )}

      <label className="ma-label" htmlFor="ma-title">Title</label>
      <input
        id="ma-title"
        className="ma-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => title !== item.title && onChange({ title })}
        placeholder="Untitled"
      />
      <label className="ma-label" htmlFor="ma-caption">Caption</label>
      <textarea
        id="ma-caption"
        className="ma-input"
        rows={2}
        value={caption}
        onChange={e => setCaption(e.target.value)}
        onBlur={() => caption !== item.caption && onChange({ caption })}
      />
      <label className="ma-label" htmlFor="ma-tags">Tags (comma separated)</label>
      <input
        id="ma-tags"
        className="ma-input"
        value={tags}
        onChange={e => setTags(e.target.value)}
        onBlur={() => onChange({ tags: tags.split(',').map(t => t.trim()).filter(Boolean) })}
      />

      <div className="ma-menu">
        <button type="button" onClick={onCover} disabled={isCover}>
          <PixIcon name="star" size={20} /> {isCover ? 'This is the folder cover' : 'Set as folder cover'}
        </button>
        <button type="button" onClick={onIcon}>
          <PixIcon name={itemIconFor(item, tree.folders.find(f => f.id === item.folderId))} size={20} /> Change icon
        </button>
        <label className="ma-move">
          <PixIcon name="folder-open" size={20} />
          <span>Move to…</span>
          <select value="" onChange={e => e.target.value && onMove(e.target.value)} aria-label="Move to folder">
            <option value="">Choose a folder</option>
            {options.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="danger" onClick={onDelete}>
          <PixIcon name="trash" size={20} /> Delete
        </button>
      </div>
    </SheetFrame>
  )
}
