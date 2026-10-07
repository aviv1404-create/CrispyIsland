'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import FolderDialog from './FolderDialog'
import ItemInfo from './ItemInfo'
import { useAdminStore } from './useAdminStore'
import UploadTray from './UploadTray'
import { useUploadQueue } from './useUploadQueue'
import { prepareFile, sendFile, type UploadMode } from './uploads'
import IconPicker, { type IconTarget } from './IconPicker'
import PreviewPane from './PreviewPane'
import EventsEditor from './EventsEditor'
import { useDragSort } from './useDragSort'
import PixIcon from '@/components/PixIcon'
import { folderIconFor, itemIconFor } from '@/components/desktop/icons'
import { itemThumb, rotClass } from '@/lib/types'
import type { Folder, Item, Tree } from '@/lib/types'
import {
  addFolder,
  addItemsToFront,
  blankPhoto,
  childrenOf,
  crumbsFor,
  deepItemCount,
  deleteFolder,
  deleteItems,
  folderOptions,
  itemsOf,
  moveFolder,
  moveItem,
  moveItemsTo,
  reorderFolder,
  reorderItem,
  rotateItems,
  setCover,
  tagItems,
  updateFolder,
  updateItem,
} from '@/lib/tree-ops'


interface Props {
  initialTree: Tree
  /** fingerprint of initialTree, for conflict-safe saves */
  initialRev: string
  uploadMode: UploadMode
  user: string
  /** The live tree couldn't be read, so what's on screen is only a stand-in. */
  readOnly?: boolean
}

/** A2–A8. Edits are live the moment they save — there is no publish step. */
export default function AdminApp({ initialTree, initialRev, uploadMode, user, readOnly = false, onSwitchView }: Props & { onSwitchView?: () => void }) {
  const router = useRouter()
  const { tree, apply, save, error, pending, setError, setSave } = useAdminStore(initialTree, initialRev, readOnly)
  const uploads = useUploadQueue(uploadMode, apply)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [infoId, setInfoId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'new' | 'rename' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<
    { kind: 'folder'; folder: Folder } | { kind: 'item'; item: Item } | null
  >(null)
  const [iconFor, setIconFor] = useState<{ type: 'folder' | 'item'; id: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  // ── Select many ──
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDelete, setBulkDelete] = useState(false)
  const [tagText, setTagText] = useState('')

  const folder = folderId ? tree.folders.find(f => f.id === folderId) : undefined
  const folders = childrenOf(tree, folderId)
  const items = folder ? itemsOf(tree, folder.id) : []
  const crumbs = crumbsFor(tree, folderId)
  const infoItem = infoId ? tree.items.find(i => i.id === infoId) : undefined

  // Leaving a folder clears the selection.
  const openFolder = (id: string | null) => {
    setFolderId(id)
    setSelecting(false)
    setSelected(new Set())
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

  // ── Drag to reorder ──
  const itemSort = useDragSort({
    group: 'items',
    ids: items.map(i => i.id),
    onMove: (id, to) => apply(t => reorderItem(t, id, to)),
    enabled: !selecting && !readOnly,
  })
  const folderSort = useDragSort({
    group: 'folders',
    ids: folders.map(f => f.id),
    onMove: (id, to) => apply(t => reorderFolder(t, id, to)),
    enabled: !readOnly && !folders.some(f => f.system),
  })

  // The icon picker's target, read fresh from the tree so its preview updates.
  let iconTarget: IconTarget | null = null
  if (iconFor?.type === 'folder') {
    const f = tree.folders.find(x => x.id === iconFor.id)
    if (f) iconTarget = { type: 'folder', folder: f }
  } else if (iconFor?.type === 'item') {
    const it = tree.items.find(x => x.id === iconFor.id)
    if (it) iconTarget = { type: 'item', item: it }
  }
  const setIcon = (icon: string | undefined) => {
    if (!iconFor) return
    const target = iconFor
    apply(t =>
      target.type === 'folder' ? updateFolder(t, target.id, { icon }) : updateItem(t, target.id, { icon })
    )
  }

  /** One-off upload (posters, stills) — same pipeline as photo uploads. */
  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const prepared = await prepareFile(file)
        return await sendFile(prepared, uploadMode, () => {})
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
        setSave('error')
        return null
      }
    },
    [uploadMode, setError, setSave]
  )

  /** A4 — upload straight into the open folder; new files land at the front. */
  const handleFiles = (files: FileList | null) => {
    if (!files?.length || !folder) return
    uploads.add(files, folder.id)
    if (fileRef.current) fileRef.current.value = ''
  }

  const signOut = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.refresh()
  }

  const status = (() => {
    const up = uploads.jobs.filter(j => j.status !== 'done')
    if (uploads.busy) return `Uploading ${uploads.jobs.filter(j => j.status === 'done').length + 1} of ${uploads.jobs.length}…`
    if (up.some(j => j.status === 'error')) return `${up.length} upload${up.length === 1 ? '' : 's'} failed — see below`
    if (save === 'offline') return `Offline — ${pending} change${pending === 1 ? '' : 's'} will save when you reconnect`
    if (save === 'saving') return 'Saving…'
    if (save === 'error') return error || 'Save failed'
    if (save === 'saved') return 'Saved — changes are live'
    const count = folders.length + items.length
    return `${count} ${count === 1 ? 'item' : 'items'} · signed in as ${user}`
  })()

  return (
    <div className="win">
      <div className="win-titlebar">
        <a className="win-close" href="/" title="Exit to the site" aria-label="Exit admin, back to the site">
          <PixIcon name="x" size={13} />
        </a>
        <span className="win-title">
          {folder ? `${folder.name} — Editing` : 'Aviv Shmuelof — Editing'}
        </span>
      </div>

      {readOnly && (
        <div className="admin-banner">
          Can’t reach the live content right now, so this is a stand-in copy and editing is
          switched off. Nothing here has been lost — reload in a moment.
        </div>
      )}

      {/* Edit toolbar */}
      <div className="win-toolbar">
        {folderId && (
          <button
            className="win-back"
            onClick={() => openFolder(folder?.parentId ?? null)}
            aria-label="Back"
          >
            ‹
          </button>
        )}

        <nav className="win-crumbs" aria-label="Breadcrumb">
          <button className="admin-crumb" onClick={() => openFolder(null)}>
            Aviv Shmuelof
          </button>
          {crumbs.map((c, i) => (
            <span key={c.id}>
              <span className="win-crumb-sep">▸</span>
              {i === crumbs.length - 1 ? (
                <span className="win-crumb-current">{c.name}</span>
              ) : (
                <button className="admin-crumb" onClick={() => openFolder(c.id)}>
                  {c.name}
                </button>
              )}
            </span>
          ))}
        </nav>

        <div className="admin-actions">
          <button
            className="win-btn"
            onClick={() => setDialog('new')}
            disabled={!folderId && folders.length === 0}
            title={folderId ? 'New folder here' : 'Open a category first'}
          >
            ＋ New Folder
          </button>
          {folder && !folder.system && (
            <button className="win-btn" onClick={() => setDialog('rename')}>
              Rename
            </button>
          )}
          {folder && (
            <button className="win-btn" onClick={() => setIconFor({ type: 'folder', id: folder.id })}>
              <PixIcon name={folderIconFor(folder).name} size={14} /> Folder Icon
            </button>
          )}
          {folder && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={e => handleFiles(e.target.files)}
              />
              <button className="win-btn" onClick={() => fileRef.current?.click()} disabled={false}>
                Upload
              </button>
            </>
          )}
          {folder && !folder.system && (
            <button
              className="win-btn"
              onClick={() => setConfirmDelete({ kind: 'folder', folder })}
            >
              Delete Folder
            </button>
          )}
          {folder && items.length > 0 && (
            <button
              className={`win-btn${selecting ? ' on' : ''}`}
              onClick={() => (selecting ? endSelect() : setSelecting(true))}
              aria-pressed={selecting}
              title="Pick several photos to turn, move, tag or delete together"
            >
              <PixIcon name="checkbox" size={14} /> {selecting ? 'Done selecting' : 'Select'}
            </button>
          )}
          {folder && (
            <button className="win-btn" onClick={() => setPreview(true)} title="See this folder the way visitors will">
              <PixIcon name="viewfinder" size={14} /> Preview
            </button>
          )}
          {!folderId && (
            <button className="win-btn" onClick={() => setEventsOpen(true)} title="Posters in the Events app">
              <PixIcon name="ticket" size={14} /> Events
            </button>
          )}
          <Link className="win-btn" href="/" target="_blank">
            View site ↗
          </Link>
          <button className="win-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Body — subfolders then items */}
      <div
        className="win-body"
        onDragOver={e => {
          if (folder) e.preventDefault()
        }}
        onDrop={e => {
          if (!folder) return
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
      >
        {folders.length === 0 && items.length === 0 && (
          <p className="win-empty">
            {folder ? 'Empty folder — upload photos or create a subfolder.' : 'No categories.'}
          </p>
        )}

        {folders.length > 0 && (
          <div className="folder-grid" onClickCapture={folderSort.onClickCapture}>
            {folders.map((f, i) => {
              const sp = folderSort.itemProps(f.id)
              return (
              <div key={f.id} className={`admin-folder${sp.className}`} data-sort-group={sp['data-sort-group']} data-sort-id={sp['data-sort-id']} onPointerDown={sp.onPointerDown}>
                <button className="folder-tile" onClick={() => openFolder(f.id)}>
                  <span className="admin-pix">
                    <PixIcon name={folderIconFor(f).name} size={64} />
                  </span>
                  <span className="folder-label">
                    {f.name}
                    <span className="folder-meta">{deepItemCount(tree, f.id) || '—'}</span>
                  </span>
                </button>
                <button
                  className="admin-mini wide admin-icon-btn"
                  onClick={() => setIconFor({ type: 'folder', id: f.id })}
                >
                  <PixIcon name={folderIconFor(f).name} size={14} /> Icon
                </button>
                {!f.system && (
                  <div className="admin-reorder">
                    <button
                      className="admin-mini"
                      disabled={i === 0}
                      onClick={() => apply(t => moveFolder(t, f.id, -1))}
                      aria-label="Move folder earlier"
                    >
                      ←
                    </button>
                    <button
                      className="admin-mini"
                      disabled={i === folders.length - 1}
                      onClick={() => apply(t => moveFolder(t, f.id, 1))}
                      aria-label="Move folder later"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className={`item-grid${folders.length > 0 ? ' spaced' : ''}${selecting ? ' selecting' : ''}`} onClickCapture={itemSort.onClickCapture}>
            {items.map((item, i) => {
              const sp = itemSort.itemProps(item.id)
              const isSel = selected.has(item.id)
              return (
              <div
                key={item.id}
                className={`admin-item${sp.className}${isSel ? ' selected' : ''}`}
                data-sort-group={sp['data-sort-group']}
                data-sort-id={sp['data-sort-id']}
                onPointerDown={sp.onPointerDown}
              >
                <div
                  className={`item-tile${item.kind === 'film' ? ' poster' : ''}`}
                  onClick={e => {
                    if (selecting) toggle(item.id)
                    else if (e.metaKey || e.ctrlKey || e.shiftKey) {
                      setSelecting(true)
                      toggle(item.id)
                    } else setInfoId(item.id)
                  }}
                  title={selecting ? undefined : 'Click for info · drag to reorder · Ctrl/⌘-click to select'}
                >
                  {selecting && (
                    <span className={`admin-check${isSel ? ' on' : ''}`} aria-hidden="true">
                      <PixIcon name={isSel ? 'checkbox' : 'checkbox-empty'} size={18} />
                    </span>
                  )}
                  {itemThumb(item) ? (
                    <img src={itemThumb(item)} alt={item.alt} loading="lazy" className={rotClass(item)} draggable={false} />
                  ) : (
                    <span className="item-tile-blank">
                      {item.kind === 'film' ? 'FILM' : 'PHOTO'}
                    </span>
                  )}
                  {folder?.coverItemId === item.id && <span className="admin-cover-flag">Cover</span>}
                  <span className={`admin-item-icon${item.icon ? ' custom' : ''}`} title={item.icon ? `Custom icon: ${item.icon}` : 'Default icon'}>
                    <PixIcon name={itemIconFor(item, folder)} size={22} />
                  </span>
                </div>

                <div className="admin-item-bar">
                  <button
                    className="admin-mini"
                    disabled={i === 0}
                    onClick={() => apply(t => moveItem(t, item.id, -1))}
                    aria-label="Move earlier"
                  >
                    ←
                  </button>
                  <button className="admin-mini wide" onClick={() => setInfoId(item.id)}>
                    Info
                  </button>
                  <button
                    className="admin-mini wide"
                    onClick={() => setIconFor({ type: 'item', id: item.id })}
                    aria-label="Change icon"
                  >
                    Icon
                  </button>
                  {item.kind === 'photo' && (
                    <button
                      className="admin-mini"
                      onClick={() => apply(t => rotateItems(t, [item.id], 1))}
                      aria-label="Turn photo right"
                      title="Turn right"
                    >
                      <PixIcon name="rotate" size={13} className="pix-flip" />
                    </button>
                  )}
                  <button
                    className="admin-mini"
                    onClick={() => setConfirmDelete({ kind: 'item', item })}
                    aria-label="Delete"
                  >
                    ×
                  </button>
                  <button
                    className="admin-mini"
                    disabled={i === items.length - 1}
                    onClick={() => apply(t => moveItem(t, item.id, 1))}
                    aria-label="Move later"
                  >
                    →
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {selecting && (
        <div className="admin-bulk" role="toolbar" aria-label="Selected photos">
          <strong>{chosen.length} selected</strong>
          <button className="win-btn" onClick={() => setSelected(chosen.length === items.length ? new Set() : new Set(items.map(i => i.id)))}>
            {chosen.length === items.length ? 'Select none' : 'Select all'}
          </button>
          <span className="admin-bulk-sep" />
          <button className="win-btn" disabled={!chosen.length} onClick={() => apply(t => rotateItems(t, chosen, -1))} title="Turn left">
            <PixIcon name="rotate" size={14} /> Left
          </button>
          <button className="win-btn" disabled={!chosen.length} onClick={() => apply(t => rotateItems(t, chosen, 1))} title="Turn right">
            <PixIcon name="rotate" size={14} className="pix-flip" /> Right
          </button>
          <select
            className="admin-bulk-select"
            value=""
            disabled={!chosen.length}
            onChange={e => {
              const to = e.target.value
              if (!to) return
              apply(t => moveItemsTo(t, chosen, to))
              endSelect()
            }}
            aria-label="Move selected photos to a folder"
          >
            <option value="">Move to…</option>
            {folderOptions(tree)
              .filter(o => o.id !== folder?.id)
              .map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
          </select>
          <form
            className="admin-bulk-tag"
            onSubmit={e => {
              e.preventDefault()
              if (!tagText.trim() || !chosen.length) return
              const t0 = tagText
              apply(t => tagItems(t, chosen, t0))
              setTagText('')
            }}
          >
            <input value={tagText} onChange={e => setTagText(e.target.value)} placeholder="Add tag" aria-label="Tag to add to selected photos" />
            <button className="win-btn" type="submit" disabled={!chosen.length || !tagText.trim()}>
              Tag
            </button>
          </form>
          <button className="win-btn" disabled={!chosen.length} onClick={() => setBulkDelete(true)}>
            <PixIcon name="trash" size={14} /> Delete
          </button>
          <button className="win-btn primary" onClick={endSelect}>
            Done
          </button>
        </div>
      )}

      {uploads.jobs.length > 0 && <UploadTray queue={uploads} />}

      <div className={`win-status${save === 'error' ? ' error' : ''}`}>
        {status}
        {onSwitchView && (
          <button type="button" className="admin-switch" onClick={onSwitchView}>
            Phone view
          </button>
        )}
      </div>

      {/* A7 */}
      {dialog && (
        <FolderDialog
          tree={tree}
          folder={dialog === 'rename' ? folder : undefined}
          defaultParentId={folderId ?? tree.folders.find(f => f.system)!.id}
          onCancel={() => setDialog(null)}
          onSubmit={(name, parentId) => {
            if (dialog === 'rename' && folder) {
              apply(t => updateFolder(t, folder.id, { name, parentId }))
            } else {
              apply(t => addFolder(t, parentId, name))
            }
            setDialog(null)
          }}
        />
      )}

      {/* A6 */}
      {infoItem && (
        <ItemInfo
          item={infoItem}
          isCover={folder?.coverItemId === infoItem.id}
          onChange={patch => apply(t => updateItem(t, infoItem.id, patch))}
          onSetCover={() => folder && apply(t => setCover(t, folder.id, infoItem.id))}
          onRotate={dir => apply(t => rotateItems(t, [infoItem.id], dir))}
          onDelete={() => {
            setInfoId(null)
            setConfirmDelete({ kind: 'item', item: infoItem })
          }}
          onClose={() => setInfoId(null)}
          uploadFile={uploadFile}
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

      {eventsOpen && (
        <EventsEditor tree={tree} apply={apply} uploadPoster={uploadFile} onClose={() => setEventsOpen(false)} />
      )}

      {preview && folder && <PreviewPane tree={tree} folderId={folder.id} onClose={() => setPreview(false)} />}

      {bulkDelete && (
        <div className="lightbox-share-backdrop" onClick={() => setBulkDelete(false)}>
          <div className="win-dialog" onClick={e => e.stopPropagation()}>
            <p className="win-dialog-title">
              Delete {chosen.length} {chosen.length === 1 ? 'photo' : 'photos'}?
            </p>
            <p className="win-dialog-note">They come off the public site right away. This cannot be undone.</p>
            <div className="win-dialog-actions">
              <button className="win-btn" onClick={() => setBulkDelete(false)}>
                Cancel
              </button>
              <button
                className="win-btn primary"
                onClick={() => {
                  apply(t => deleteItems(t, chosen))
                  setBulkDelete(false)
                  endSelect()
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A8 */}
      {confirmDelete && (
        <div className="lightbox-share-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="win-dialog" onClick={e => e.stopPropagation()}>
            <p className="win-dialog-title">
              {confirmDelete.kind === 'folder'
                ? `Delete “${confirmDelete.folder.name}”?`
                : 'Delete this photo?'}
            </p>
            <p className="win-dialog-note">
              {confirmDelete.kind === 'folder'
                ? `This also deletes its subfolders and all ${deepItemCount(tree, confirmDelete.folder.id)} items inside. This cannot be undone.`
                : 'It comes off the public site right away. This cannot be undone.'}
            </p>
            <div className="win-dialog-actions">
              <button className="win-btn" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="win-btn primary"
                onClick={() => {
                  if (confirmDelete.kind === 'folder') {
                    const parent = confirmDelete.folder.parentId
                    apply(t => deleteFolder(t, confirmDelete.folder.id))
                    setFolderId(parent)
                  } else {
                    apply(t => deleteItems(t, [confirmDelete.item.id]))
                  }
                  setConfirmDelete(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
