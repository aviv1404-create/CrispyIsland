import { NextRequest } from 'next/server'
import { LIMITS, addEntry, clean, readEntries, removeEntry } from '@/lib/guestbook'
import { currentAdmin, requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** The newest guestbook entries. Public. */
export async function GET() {
  try {
    const [entries, admin] = await Promise.all([readEntries(), currentAdmin()])
    return Response.json({ entries, admin: !!admin })
  } catch {
    return Response.json({ entries: [], error: 'Guestbook is resting. Try again later.' }, { status: 503 })
  }
}

// One post per visitor every 30 s, and at most 20 an hour (per server instance).
const recent = new Map<string, number[]>()
function tooSoon(ip: string): boolean {
  const now = Date.now()
  const times = (recent.get(ip) ?? []).filter(t => now - t < 3_600_000)
  if (times.length && now - times[times.length - 1] < 30_000) return true
  if (times.length >= 20) return true
  times.push(now)
  recent.set(ip, times)
  if (recent.size > 5000) recent.clear()
  return false
}

/** Sign the guestbook: { name, message }. No login. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  // Hidden "website" field: people never fill it, bots do.
  if (body?.website) return Response.json({ ok: true })

  const name = clean(body?.name, LIMITS.name)
  const message = clean(body?.message, LIMITS.message)
  if (!name || !message) return Response.json({ error: 'Write a name and a message.' }, { status: 400 })
  if ((message.match(/https?:\/\//g) ?? []).length > 2) {
    return Response.json({ error: 'Too many links in one message.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooSoon(ip)) return Response.json({ error: 'Slow down! Try again in a bit.' }, { status: 429 })

  try {
    const entry = await addEntry(name, message)
    return Response.json({ ok: true, entry })
  } catch {
    return Response.json({ error: 'Could not sign the guestbook right now.' }, { status: 503 })
  }
}

/** Remove an entry. Admin only (signed in at /admin). */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const id = new URL(req.url).searchParams.get('id') ?? ''
  try {
    await removeEntry(id)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Could not delete' }, { status: 400 })
  }
}
