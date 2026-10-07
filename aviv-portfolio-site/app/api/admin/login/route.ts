import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, cookieOptions, createToken, verifyPassword } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}))

  if (typeof username !== 'string' || typeof password !== 'string' || !verifyPassword(username, password)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(username), cookieOptions)
  return Response.json({ ok: true, user: username })
}

/** Sign out. */
export async function DELETE() {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
  return Response.json({ ok: true })
}
