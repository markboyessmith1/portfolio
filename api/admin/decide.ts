/* POST /api/admin/decide { email, action: 'approve' | 'revoke' }
   Approve: into the access audience and a sign-in link goes out. Revoke: out of it (their cookie stops working).
   Both keep them in the requests audience so they stay on the list. */

import { addToAudience, config, isAdmin, isEmail, json, normEmail, removeFromAudience, sendAccessLink } from '../_lib/core.js'

export async function POST(req: Request) {
  if (!isAdmin(req)) return json({ error: 'unauthorised' }, { status: 401 })
  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> } catch { return json({ error: 'bad-request' }, { status: 400 }) }
  const email = normEmail(body.email)
  if (!isEmail(email) || (body.action !== 'approve' && body.action !== 'revoke')) return json({ error: 'bad-request' }, { status: 400 })

  try {
    await addToAudience(config.requests, email)
    if (body.action === 'approve') {
      await addToAudience(config.access, email)
      await sendAccessLink(req, email)
    } else {
      await removeFromAudience(config.access, email)
    }
  } catch (err) {
    console.error(err)
    return json({ error: 'failed' }, { status: 502 })
  }
  return json({ status: body.action === 'approve' ? 'approved' : 'pending' })
}
