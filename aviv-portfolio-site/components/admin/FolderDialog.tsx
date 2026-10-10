'use client'

import { useState } from 'react'
import { folderOptions } from '@/lib/tree-ops'
import type { Folder, Tree } from '@/lib/types'

interface Props {
  tree: Tree
  /** Editing an existing folder, or undefined when creating a new one. */
  folder?: Folder
  /** Preselected parent when creating. */
  defaultParentId: string
  onCancel: () => void
  onSubmit: (name: string, parentId: string) => void
}

/** A7 — new / rename folder. The parent picker is how nesting happens. */
export default function FolderDialog({ tree, folder, defaultParentId, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(folder?.name ?? '')
  const [parentId, setParentId] = useState(folder?.parentId ?? defaultParentId)

  // A folder can't be moved inside itself.
  const options = folderOptions(tree, folder?.id)
  const editingRoot = folder?.system === true

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), parentId)
  }

  return (
    <div className="lightbox-share-backdrop" onClick={onCancel}>
      <form className="win-dialog" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <p className="win-dialog-title">{folder ? 'Rename folder' : 'New folder'}</p>

        <label className="win-dialog-label" htmlFor="folder-name">
          Name
        </label>
        <input
          id="folder-name"
          className="win-dialog-field"
          value={name}
          autoFocus
          onChange={e => setName(e.target.value)}
        />

        <label className="win-dialog-label" htmlFor="folder-parent">
          Inside
        </label>
        <select
          id="folder-parent"
          className="win-dialog-field"
          value={parentId}
          disabled={editingRoot}
          onChange={e => setParentId(e.target.value)}
        >
          {options.map(o => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <p className="win-dialog-note">
          {editingRoot
            ? 'Categories stay at the top level.'
            : 'Folders can nest as deep as you like.'}
        </p>

        <div className="win-dialog-actions">
          <button type="button" className="win-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="win-btn primary" disabled={!name.trim()}>
            {folder ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
