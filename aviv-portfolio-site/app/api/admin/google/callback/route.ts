import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { adminForEmail, exchangeCode, googleConfigured, STATE_COOKIE } from '@/lib/google'
import { SESSION_COOKIE, cookieOptions, createToken, verifyState } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const fail = (reason: string) => Response.redirect(new URL(`/admin?error=${reason}`, origin))

  if (!googleConfigured()) return fail('google_not_configured')

  const store = await cookies()
  const clearState = () => store.set(STATE_COOKIE, '', { ...cookieOptions, maxAge: 0 })

  // The state must match the one we issued, and each state is single use.
  const returned = req.nextUrl.searchParams.get('state') ?? undefined
  const expected = store.get(STATE_COOKIE)?.value
  clearState()
  if (!returned || returned !== expected || !verifyState(returned)) return fail('bad_state')

  if (req.nextUrl.searchParams.get('error')) return fail('cancelled')
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return fail('no_code')

  const identity = await exchangeCode(code, origin)
  if (!identity) return fail('exchange_failed')
  if (!identity.emailVerified) return fail('unverified_email')

  // Only allowlisted Google accounts become admins. Everyone else is turned
  // away without any hint that /admin exists.
  const user = adminForEmail(identity.email)
  if (!user) return fail('not_allowed')

  store.set(SESSION_COOKIE, createToken(user), cookieOptions)
  return Response.redirect(new URL('/admin', origin))
}
