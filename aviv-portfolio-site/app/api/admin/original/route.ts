import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * For the photo optimizer in the admin: hands back one of the site's own
 * stored photos, in case the browser isn't allowed to download it straight
 * from storage (cross-site rules). Admin only, and only our own store's files.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const url = new URL(request.url).searchParams.get('url') ?? ''
  if (!/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/uploads\//i.test(url)) {
    return Response.json({ error: 'Not a photo from this site' }, { status: 400 })
  }
  const res = await fetch(url)
  if (!res.ok || !res.body) return Response.json({ error: `Couldn't read it (${res.status})` }, { status: 502 })
  return new Response(res.body, {
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream', 'Cache-Control': 'no-store' },
  })
}
