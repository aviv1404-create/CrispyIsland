import { after, NextRequest } from 'next/server'
import { getTree, loadTree, saveTree, treeRev } from '@/lib/content'
import { normalizeTree, TreeError } from '@/lib/normalize'
import { deleteIfStillUnused, removedUrls } from '@/lib/storage'
import { currentAdmin, requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Read the tree. Public — this is the same content the public pages render.
 * Only the signed-in admin gets a fresh (uncached, billed) read of the store;
 * everyone else gets the cached copy, so this URL can't burn Blob operations.
 */
export async function GET() {
  const user = await currentAdmin()
  if (!user) {
    const tree = await getTree()
    return Response.json({ tree, user, source: 'cache', rev: await treeRev(tree) })
  }
  const { tree, source } = await loadTree()
  return Response.json({ tree, user, source, rev: await treeRev(tree) })
}

/** Replace the tree. Admin only. Edits go live immediately — there is no publish step. */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  // If the live tree can't be read right now, whatever the browser is holding
  // is the bundled seed, not real content. Writing it back would wipe Aviv's
  // work, so refuse until the read path recovers.
  const { tree: current, source, error } = await loadTree()
  if (source === 'error') {
    return Response.json(
      { error: `Can't reach the live content right now, so saving is blocked to avoid overwriting it. (${error})` },
      { status: 503 }
    )
  }

  try {
    // Body is { tree, baseRev } from the admin, or a bare tree (older clients).
    const body = await req.json()
    const wrapped = body && typeof body === 'object' && 'tree' in body && !('folders' in body)
    const baseRev: string | undefined = wrapped ? body.baseRev : undefined

    // Someone else saved since this client last loaded: hand back the latest
    // tree so the client can re-apply its change on top, rather than overwrite.
    const currentRev = await treeRev(current)
    if (baseRev && baseRev !== currentRev) {
      return Response.json(
        { error: 'The site changed on another device.', conflict: true, tree: current, rev: currentRev },
        { status: 409 }
      )
    }

    const tree = normalizeTree(wrapped ? body.tree : body)
    await saveTree(tree)

    // Whatever was taken off the site (a deleted photo, a replaced poster…)
    // is deleted from the store too, so storage only holds what's shown.
    // It runs after the response, 30 seconds later, against the latest
    // content — so an "Undo" in the meantime keeps the file. A failure here
    // never fails the save; "Clean up" in the storage meter catches leftovers.
    const removed = removedUrls(current, tree)
    if (removed.length) {
      after(async () => {
        await new Promise(r => setTimeout(r, 30_000))
        const latest = await loadTree()
        if (latest.source === 'error') return
        await deleteIfStillUnused(removed, latest.tree).catch(err => console.error('could not delete removed files', err))
      })
    }
    return Response.json({ ok: true, tree, rev: await treeRev(tree) })
  } catch (err) {
    if (err instanceof TreeError) {
      return Response.json({ error: err.message }, { status: 400 })
    }
    console.error('tree save failed', err)
    return Response.json({ error: 'Save failed' }, { status: 500 })
  }
}
