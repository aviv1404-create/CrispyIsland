import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTree, folderByPath, folderCover } from '@/lib/content'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ path: string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params
  const tree = await getTree()
  const folder = folderByPath(tree, path)
  if (!folder) return { title: 'Not found — Aviv Shmuelof' }

  const cover = folderCover(tree, folder)
  return {
    title: `${folder.name} — Aviv Shmuelof`,
    openGraph: {
      title: `${folder.name} — Aviv Shmuelof`,
      type: 'website',
      ...(cover ? { images: [cover] } : {}),
    },
  }
}

/**
 * V2 / V3 — any folder at any depth. The desktop opens it as a window from
 * the URL; this route only validates the path and supplies metadata.
 */
export default async function FolderPage({ params }: Props) {
  const { path } = await params
  const tree = await getTree()
  if (!folderByPath(tree, path)) notFound()
  return null
}
