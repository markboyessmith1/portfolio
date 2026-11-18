/* POST /api/admin/login — emails Mark (ADMIN_EMAIL, never a caller-supplied address) a sign-in link to the approval list. */

import { config, json, origin, sendEmail, sign, TTL } from '../_lib/core.js'
import { mail } from '../_lib/email.js'

export async function POST(req: Request) {
  try {
    const link = `${origin(req)}/api/admin/enter?t=${sign({ k: 'admin-link' }, TTL.adminLink)}`
    const m = mail({ eyebrow: 'Portfolio', title: 'Sign in to review requests.', button: { href: link, label: 'Open the list' }, footnote: 'This link works for 24 hours. If you didn’t ask for it, ignore this email.' })
    await sendEmail(config.admin, 'Sign in to the approval list', m.html, { text: m.text })
  } catch (err) {
    console.error(err)
    return json({ error: 'send-failed' }, { status: 502 })
  }
  return json({ status: 'sent' })
}
