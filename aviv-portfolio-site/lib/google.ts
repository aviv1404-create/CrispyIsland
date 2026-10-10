import type { AdminUser } from './session'

// Hand-rolled Google OAuth 2.0 (authorization code flow). Auth.js v5 doesn't
// reliably support Next 16 yet, and the whole flow slots into the signed
// session cookie we already have — so no extra dependency.

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export const STATE_COOKIE = 'aviv_oauth_state'
export const CALLBACK_PATH = '/api/admin/google/callback'

/**
 * Which Google accounts may administer the site, and which admin handle each
 * maps onto. Override with ADMIN_GOOGLE_EMAILS="someone@gmail.com:aviv,other@x:dana".
 */
function allowlist(): Record<string, AdminUser> {
  const raw = process.env.ADMIN_GOOGLE_EMAILS
  if (!raw) {
    return {
      'aviv1404@gmail.com': 'aviv',
      'dana.aronovich@gmail.com': 'dana',
    }
  }
  const out: Record<string, AdminUser> = {}
  for (const entry of raw.split(',')) {
    const [email, user] = entry.split(':').map(s => s.trim().toLowerCase())
    if (email && (user === 'aviv' || user === 'dana')) out[email] = user
  }
  return out
}

export function adminForEmail(email: string | undefined): AdminUser | null {
  if (!email) return null
  return allowlist()[email.trim().toLowerCase()] ?? null
}

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

/**
 * Absolute callback URL for this deployment — must match a URI registered in
 * Google Cloud *exactly*, or Google fails with `redirect_uri_mismatch`.
 *
 * Normally derived from the request origin, which is right on both localhost
 * and the custom domain. OAUTH_ORIGIN is an escape hatch for the case where a
 * proxy makes the request origin differ from the public URL (e.g. reaching the
 * site through its .vercel.app host instead of crispyisland.com).
 */
export function redirectUri(origin: string): string {
  const base = (process.env.OAUTH_ORIGIN || origin).replace(/\/$/, '')
  return `${base}${CALLBACK_PATH}`
}

export function authorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Always show the chooser so a shared browser can't silently reuse a session.
    prompt: 'select_account',
  })
  return `${AUTH_ENDPOINT}?${params}`
}

interface GoogleIdentity {
  email?: string
  emailVerified: boolean
}

/**
 * Exchange the one-time code for tokens and read the identity out of the
 * id_token. The token request is a direct server-to-server HTTPS call to
 * Google, so per Google's own guidance the id_token signature does not need
 * re-verifying here — but we still check audience and expiry.
 */
export async function exchangeCode(code: string, origin: string): Promise<GoogleIdentity | null> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) return null
  const { id_token: idToken } = (await res.json()) as { id_token?: string }
  if (!idToken) return null

  const payload = decodeJwtPayload(idToken)
  if (!payload) return null
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) return null
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null

  return {
    email: typeof payload.email === 'string' ? payload.email : undefined,
    // Google sends this as a boolean or the string "true" depending on the path.
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}
