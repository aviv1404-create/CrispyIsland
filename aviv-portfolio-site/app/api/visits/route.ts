import { CounterOff, readStats, recordVisit } from '@/lib/visits'
import { currentAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|lighthouse|headless|curl|wget|python|monitor/i

/** Count one visit. Bots and the signed-in admin aren't counted. */
export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 })
  if (await currentAdmin()) return new Response(null, { status: 204 })
  try {
    await recordVisit()
  } catch (err) {
    console.error('visits: could not record —', err instanceof Error ? err.message : err)
  }
  return new Response(null, { status: 204 })
}

/** The numbers — admin only. */
export async function GET() {
  if (!(await currentAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return Response.json(await readStats(), { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    if (err instanceof CounterOff) return Response.json({ error: err.message, off: true }, { status: 501 })
    return Response.json({ error: err instanceof Error ? err.message : 'Could not read visits' }, { status: 500 })
  }
}
