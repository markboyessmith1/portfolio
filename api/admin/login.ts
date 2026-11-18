/* POST /api/admin/login — emails Mark (ADMIN_EMAIL, never a caller-supplied address) a sign-in link to the approval list. */

import { config, emailHtml, json, origin, sendEmail, sign, TTL } from '../_lib/core.js'

export async function POST(req: Request) {
  try {
    const link = `${origin(req)}/api/admin/enter?t=${sign({ k: 'admin-link' }, TTL.adminLink)}`
    await sendEmail(config.admin, 'Sign in to the approval list', emailHtml(['Here’s your link to the portfolio approval list. It works for 24 hours.'], { href: link, label: 'Open the approval list' }))
  } catch (err) {
    console.error(err)
    return json({ error: 'send-failed' }, { status: 502 })
  }
  return json({ status: 'sent' })
}
