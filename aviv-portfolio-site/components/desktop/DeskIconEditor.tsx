'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import IconPicker, { type IconTarget } from '@/components/admin/IconPicker'
import type { PixName } from '@/components/PixIcon'
import { updateFolder, updateItem } from '@/lib/tree-ops'
import type { Tree } from '@/lib/types'
import { adminApply } from './adminEdit'

export type IconEdit = { type: 'folder' | 'item'; id: string }

/**
 * Admin only: right-click a folder or file on the desktop → "Change Icon…".
 * Opens the same icon picker as /admin; the choice is saved when you press
 * Done (or close it), then the desktop refreshes in place — music keeps going.
 */
export default function DeskIconEditor({
  tree,
  edit,
  onClose,
  toast,
}: {
  tree: Tree
  edit: IconEdit
  onClose: () => void
  toast: (msg: string) => void
}) {
  const router = useRouter()
  const folder = edit.type === 'folder' ? tree.folders.find(f => f.id === edit.id) : undefined
  const item = edit.type === 'item' ? tree.items.find(i => i.id === edit.id) : undefined
  const original = (folder ?? item)?.icon
  // undefined = not touched, null = back to default, string = new icon
  const [choice, setChoice] = useState<string | null | undefined>(undefined)
  if (!folder && !item) return null

  const shown = choice === undefined ? original : choice ?? undefined
  const target: IconTarget = folder ? { type: 'folder', folder: { ...folder, icon: shown } } : { type: 'item', item: { ...item!, icon: shown } }

  const finish = async () => {
    onClose()
    if (choice === undefined || (choice ?? undefined) === original) return
    const icon = choice ?? undefined
    try {
      await adminApply(t => (edit.type === 'folder' ? updateFolder(t, edit.id, { icon }) : updateItem(t, edit.id, { icon })))
      toast('Icon saved')
      router.refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the icon')
    }
  }

  return <IconPicker tree={tree} target={target} onPick={(n: PixName) => setChoice(n)} onReset={() => setChoice(null)} onClose={finish} />
}
