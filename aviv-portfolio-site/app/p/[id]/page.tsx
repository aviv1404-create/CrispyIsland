import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTree, itemById, folderById } from '@/lib/content'
import { itemThumb } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

function describe(title: string, caption: string) {
  return [title, caption].filter(Boolean).join(' — ') || 'Photograph by Aviv Shmuelof'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const tree = await getTree()
  const item = itemById(tree, id)
  if (!item) return { title: 'Photo not found — Aviv Shmuelof' }

  const heading = describe(item.title, item.caption)
  const image = itemThumb(item)

  return {
    title: `${heading} — Aviv Shmuelof`,
    description: item.alt || heading,
    openGraph: {
      title: heading,
      description: item.alt || heading,
      type: 'article',
      ...(image ? { images: [{ url: image, alt: item.alt || heading }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: heading,
      ...(image ? { images: [image] } : {}),
    },
  }
}

/**
 * Single photo or film permalink — the target of Copy Link. The desktop opens
 * the item's folder with the item in front; this route validates and supplies
 * the share-card metadata.
 */
export default async function PhotoPage({ params }: Props) {
  const { id } = await params
  const tree = await getTree()
  const item = itemById(tree, id)
  if (!item || !folderById(tree, item.folderId)) notFound()
  return null
}
