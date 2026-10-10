import { localStoreEnabled } from './content'

/**
 * A private visitor counter, shown only to the signed-in admin (About window).
 * Counts PEOPLE: each browser is counted once ever ("visitors"), and once per
 * day ("today"). The browser remembers that it was counted (localStorage);
 * nothing personal is stored or sent — no IP, no email, no cookies, no ID —
 * just counts. Visits (one per browser tab session) are kept too.
 *
 * Storage, best first:
 *   1. Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN, e.g. from the
 *      Vercel Marketplace "Upstash for Redis" integration) — one atomic INCR
 *      per visit, free tier is plenty.
 *   2. Local dev: data/visits.local.json.
 *   Without Redis the counter is simply off. It used to fall back to one Vercel
 *   Blob write per visit, but every write is a billed "advanced operation" and
 *   the Hobby plan only includes 2,000 a month — that helped get the content
 *   store suspended (Oct 2026). Never count visits in Blob again.
 */

export interface VisitStats {
  /** different people (browsers) ever */
  people: number
  /** different people today */
  today: number
  /** people per day, summed over the last 7 days */
  week: number
  /** visits (browser sessions) ever */
  visits: number
  /** people per day, last 14 days, oldest first */
  days: { day: string; count: number }[]
}

/** What this browser says about itself (from VisitPing). */
export interface VisitKind {
  /** never counted before in this browser */
  newPerson: boolean
  /** not counted yet today */
  newToday: boolean
}

const day = (d = new Date()) => d.toISOString().slice(0, 10)
const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => day(new Date(Date.now() - (n - 1 - i) * 86_400_000)))

const redis = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}
async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const r = redis()!
  const res = await fetch(r.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${r.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  return ((await res.json()) as { result: unknown }).result
}

const LOCAL_FILE = 'data/visits.local.json'
async function localRead(): Promise<Record<string, number>> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), LOCAL_FILE), 'utf-8'))
  } catch {
    return {}
  }
}

export async function recordVisit(kind: VisitKind): Promise<void> {
  const today = day()
  if (redis()) {
    await redisCmd(['INCR', 'visits:total'])
    if (kind.newPerson) await redisCmd(['INCR', 'people:total'])
    if (kind.newToday) await redisCmd(['INCR', `people:day:${today}`])
    return
  }
  if (localStoreEnabled()) {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const all = await localRead()
    all.visits = (all.visits ?? 0) + 1
    if (kind.newPerson) all.people = (all.people ?? 0) + 1
    if (kind.newToday) all[today] = (all[today] ?? 0) + 1
    await fs.writeFile(path.join(process.cwd(), LOCAL_FILE), JSON.stringify(all, null, 2))
    return
  }
  // No Redis: the counter is off (see the note at the top).
}

/** Thrown by readStats() when no counter storage is set up. */
export class CounterOff extends Error {}

export async function readStats(): Promise<VisitStats> {
  const days14 = lastDays(14)
  const build = (perDay: Record<string, number>, people: number, visits: number): VisitStats => {
    const days = days14.map(d => ({ day: d, count: perDay[d] ?? 0 }))
    return { people, visits, today: perDay[day()] ?? 0, week: days.slice(-7).reduce((a, b) => a + b.count, 0), days }
  }

  if (redis()) {
    const [people, visits, ...counts] = (await redisCmd(['MGET', 'people:total', 'visits:total', ...days14.map(d => `people:day:${d}`)])) as (string | null)[]
    return build(Object.fromEntries(days14.map((d, i) => [d, Number(counts[i]) || 0])), Number(people) || 0, Number(visits) || 0)
  }
  if (localStoreEnabled()) {
    const all = await localRead()
    return build(all, all.people ?? 0, all.visits ?? 0)
  }

  throw new CounterOff('The visit counter needs Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN).')
}
