/* POST /api/admin/send { email, subject, body, inReplyTo? }
   A message from Mark, written on the review screen. Plain text in, simple HTML out. Replies thread
   when inReplyTo carries the Message-ID of their last email, and come back through Resend's inbound. */

import { isAdmin, isEmail, json, normEmail, sendEmail } from '../_lib/core.js'
import { letter } from '../_lib/email.js'

export async function POST(req: Request) {
  if (!isAdmin(req)) return json({ error: 'unauthorised' }, { status: 401 })
  let b: Record<string, unknown>
  try { b = (await req.json()) as Record<string, unknown> } catch { return json({ error: 'bad-request' }, { status: 400 }) }

  const email = normEmail(b.email)
  const subject = String(b.subject ?? '').trim().slice(0, 200)
  const body = String(b.body ?? '').trim().slice(0, 20_000)
  const inReplyTo = typeof b.inReplyTo === 'string' && /^<[^<>\s]{3,300}>$/.test(b.inReplyTo) ? b.inReplyTo : undefined
  if (!isEmail(email) || !subject || !body) return json({ error: 'bad-request' }, { status: 400 })

  try {
    const id = await sendEmail(email, subject, letter(body).html, {
      text: body,
      ...(inReplyTo ? { headers: { 'In-Reply-To': inReplyTo, References: inReplyTo } } : {}),
    })
    return json({ status: 'sent', id })
  } catch (err) {
    console.error(err)
    return json({ error: 'send-failed' }, { status: 502 })
  }
}
