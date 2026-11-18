/* GET /api/admin/list → { people: [{ email, requestedAt, status, lastInbound? }] }
   Everyone who asked (requests audience) plus anyone approved directly, newest first.
   lastInbound is when they last emailed in (Resend inbound); the review screen marks those. */

import { addressOf, config, isAdmin, isoDate, json, listAudience, listMail } from '../_lib/core.js'

export async function GET(req: Request) {
  if (!isAdmin(req)) return json({ error: 'unauthorised' }, { status: 401 })
  try {
    const [requests, approved, inbound] = await Promise.all([
      listAudience(config.requests),
      listAudience(config.access),
      listMail('received', 2).catch((err) => { console.error(err); return [] }), // receiving not set up yet: list still works
    ])
    const lastIn = new Map<string, string>()
    for (const m of inbound) { const a = addressOf(m.from); const at = isoDate(m.created_at); if (!lastIn.has(a) || at > lastIn.get(a)!) lastIn.set(a, at) }
    const ok = new Set(approved.map((c) => c.email.toLowerCase()))
    const people = new Map<string, { email: string; requestedAt: string; status: 'approved' | 'pending'; lastInbound?: string }>()
    for (const c of [...approved, ...requests]) {
      const email = c.email.toLowerCase()
      const prev = people.get(email)
      // keep the earliest date we know of: when they first asked (or were approved)
      if (!prev || c.created_at < prev.requestedAt) people.set(email, { email, requestedAt: c.created_at, status: ok.has(email) ? 'approved' : 'pending', lastInbound: lastIn.get(email) })
    }
    const list = [...people.values()].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    return json({ people: list }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error(err)
    return json({ error: 'list-failed' }, { status: 502 })
  }
}
