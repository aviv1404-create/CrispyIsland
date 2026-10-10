import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { authorizeUrl, googleConfigured, STATE_COOKIE } from '@/lib/google'
import { createState } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Kick off Google sign-in. */
export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return Response.redirect(new URL('/admin?error=google_not_configured', req.nextUrl.origin))
  }

  const state = createState()
  const store = await cookies()
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // the round trip should take seconds, not minutes
  })

  return Response.redirect(authorizeUrl(req.nextUrl.origin, state))
}
