import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

// Signed, expiring session cookie. Replaces the previous scheme, which kept the
// admin password in localStorage and replayed it in the body of every write.

export const SESSION_COOKIE = 'aviv_admin'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14 // 14 days

const USERS = ['aviv', 'dana'] as const
export type AdminUser = (typeof USERS)[number]

function passwordFor(user: string): string | undefined {
  if (user === 'aviv') return process.env.ADMIN_PASSWORD_AVIV
  if (user === 'dana') return process.env.ADMIN_PASSWORD_DANA
  return undefined
}

/**
 * Signing key. Prefers an explicit SESSION_SECRET; otherwise derives one from
 * the admin passwords so the site works without adding a new env var — the
 * trade-off is that changing a password invalidates existing sessions.
 * A random per-boot fallback keeps `next build` from crashing when neither is
 * set (sessions simply don't survive a restart in that case).
 */
let ephemeralSecret: string | undefined
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  const derived = `${process.env.ADMIN_PASSWORD_AVIV ?? ''}:${process.env.ADMIN_PASSWORD_DANA ?? ''}`
  if (derived !== ':') return derived
  ephemeralSecret ??= randomBytes(32).toString('hex')
  return ephemeralSecret
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Constant-time string compare that tolerates length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** One-time CSRF state for the OAuth round trip: random value + HMAC over it. */
export function createState(): string {
  const nonce = randomBytes(16).toString('base64url')
  return `${nonce}.${signature(nonce)}`
}

export function verifyState(state: string | undefined): boolean {
  if (!state) return false
  const [nonce, sig] = state.split('.')
  if (!nonce || !sig) return false
  return safeEqual(sig, signature(nonce))
}

export function verifyPassword(user: string, password: string): user is AdminUser {
  const expected = passwordFor(user)
  if (!expected || !password) return false
  return safeEqual(password, expected)
}

export function createToken(user: AdminUser): string {
  const payload = `${user}.${Date.now() + MAX_AGE_SECONDS * 1000}`
  return `${payload}.${signature(payload)}`
}

export function verifyToken(token: string | undefined): AdminUser | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [user, expiry, sig] = parts

  if (!safeEqual(sig, signature(`${user}.${expiry}`))) return null
  if (!USERS.includes(user as AdminUser)) return null
  if (!Number(expiry) || Number(expiry) < Date.now()) return null

  return user as AdminUser
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
} as const

/** The signed-in admin for this request, or null. Server-side only. */
export async function currentAdmin(): Promise<AdminUser | null> {
  const store = await cookies()
  return verifyToken(store.get(SESSION_COOKIE)?.value)
}

/**
 * Guard for route handlers. Returns a 401 Response when not signed in, so
 * callers can `const denied = await requireAdmin(); if (denied) return denied`.
 */
export async function requireAdmin(): Promise<Response | null> {
  const user = await currentAdmin()
  if (user) return null
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
