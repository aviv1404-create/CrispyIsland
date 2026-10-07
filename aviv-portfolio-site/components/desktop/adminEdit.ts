import type { Tree } from '@/lib/types'

/**
 * Apply one change to the live content straight from the desktop (admin
 * only — the API checks the session). Reads the latest tree, applies the
 * change, saves it; if someone saved in between, re-applies on top once.
 */
export async function adminApply(op: (tree: Tree) => Tree): Promise<Tree> {
  const read = async () => {
    const res = await fetch('/api/admin', { cache: 'no-store' })
    const body = (await res.json()) as { tree: Tree; rev: string; source: string }
    if (body.source === 'error') throw new Error("Can't reach the live content right now, so changes can't be saved.")
    return body
  }
  let { tree, rev } = await read()
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('/api/admin', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tree: op(tree), baseRev: rev }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) return body.tree as Tree
    if (res.status === 409 && body.tree) {
      tree = body.tree
      rev = body.rev
      continue
    }
    throw new Error(body.error || `Save failed (${res.status})`)
  }
  throw new Error('The site kept changing — try again.')
}
