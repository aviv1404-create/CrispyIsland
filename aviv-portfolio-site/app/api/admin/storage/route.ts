import { loadTree } from '@/lib/content'
import { requireAdmin } from '@/lib/session'
import { cleanUnused, storageUsage } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/** How full the store is — for the meter in /admin. Admin only. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  const { tree, source } = await loadTree()
  if (source === 'error') return Response.json({ error: "Can't reach the store right now" }, { status: 503 })
  try {
    return Response.json(await storageUsage(tree), { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not read storage' }, { status: 500 })
  }
}

/** "Clean up": delete stored files the site no longer shows. Admin only. */
export async function POST() {
  const denied = await requireAdmin()
  if (denied) return denied
  // Never clean against a stand-in tree — that would delete real photos.
  const { tree, source } = await loadTree()
  if (source === 'error') return Response.json({ error: "Can't reach the store right now" }, { status: 503 })
  try {
    const removed = await cleanUnused(tree)
    return Response.json({ removed, ...(await storageUsage(tree)) }, { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Clean-up failed' }, { status: 500 })
  }
}
