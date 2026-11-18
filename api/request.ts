/* POST /api/request { email, slug?, website? }
   Approved → signed in on the spot: the session cookie is set on this response → { status: 'granted' }.
   Otherwise → { status: 'reviewing' }. The first time an email asks, it goes into the requests audience,
   Mark gets an approve link, and the visitor gets a short "I'm reviewing it" note (replies to it land in
   Resend's inbound and show on the review screen). Asking again while pending sends nothing new. */

import {
  addToAudience, config, COOKIE, inAudience, isEmail, isSlug, json, normEmail, origin, sendEmail, setCookie, sign, TTL,
} from './_lib/core.js'
import { mail } from './_lib/email.js'

// "miro-ai" -> "Miro AI"-ish label for the request email
const site = (slug: string) => slug.split('-').map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ')

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> } catch { return json({ error: 'bad-request' }, { status: 400 }) }

  // honeypot: people never see this field, bots fill it. Pretend it worked.
  if (body.website) return json({ status: 'reviewing' })

  const email = normEmail(body.email)
  if (!isEmail(email)) return json({ error: 'invalid-email' }, { status: 400 })
  const slug = isSlug(body.slug) ? body.slug : undefined

  try {
    if (await inAudience(config.access, email)) {
      const session = sign({ k: 'session', e: email }, TTL.session)
      return json({ status: 'granted' }, { headers: { 'Set-Cookie': setCookie(COOKIE.session, session, TTL.session), 'Cache-Control': 'no-store' } })
    }

    if (await inAudience(config.requests, email)) return json({ status: 'reviewing' })

    await addToAudience(config.requests, email)
    const approve = `${origin(req)}/api/approve?t=${sign({ k: 'approve', e: email, ...(slug ? { s: slug } : {}) }, TTL.approve)}`
    const where = slug ? site(slug) : null
    const toMark = mail({
      preheader: `${email} would like to see your case studies.`,
      eyebrow: 'Portfolio request',
      title: `${email} would like to see your work.`,
      lines: [where ? `They asked from the ${where} case study.` : 'They asked from the portfolio page.', 'Approving sends them a link that opens every case study.'],
      button: { href: approve, label: 'Review and approve' },
      footnote: 'Reply to write to them directly. Everyone who’s asked is on your review screen at /admin.',
    })
    const toThem = mail({
      preheader: 'I’ll be in touch as soon as you’re approved.',
      eyebrow: 'Portfolio',
      title: 'Thanks for asking.',
      lines: [
        'I look at every request myself, and I’ll email you as soon as you’re in.',
        'If you like, reply and tell me a bit about what you’re working on.',
      ],
      sign: true,
    })
    await Promise.all([
      sendEmail(config.admin, `Portfolio request from ${email}`, toMark.html, { replyTo: email, text: toMark.text }),
      sendEmail(email, 'Thanks for asking to see my work', toThem.html, { text: toThem.text }),
    ])
    return json({ status: 'reviewing' })
  } catch (err) {
    console.error(err)
    return json({ error: 'send-failed' }, { status: 502 })
  }
}
