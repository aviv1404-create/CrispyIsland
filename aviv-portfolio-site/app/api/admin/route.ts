import { NextRequest } from 'next/server'
import { loadTree, saveTree, treeRev } from '@/lib/content'
import { normalizeTree, TreeError } from '@/lib/normalize'
import { currentAdmin, requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Read the tree. Public — this is the same content the public pages render. */
export async function GET() {
  const [{ tree, source }, user] = await Promise.all([loadTree(), currentAdmin()])
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
    return Response.json({ ok: true, tree, rev: await treeRev(tree) })
  } catch (err) {
    if (err instanceof TreeError) {
      return Response.json({ error: err.message }, { status: 400 })
    }
    console.error('tree save failed', err)
    return Response.json({ error: 'Save failed' }, { status: 500 })
  }
}
