/* POST /api/request { email, slug?, website? }
   Approved → signed in on the spot: the session cookie is set on this response → { status: 'granted' }.
   Otherwise → { status: 'reviewing' }. The first time an email asks, it goes into the requests audience,
   Mark gets an approve link, and the visitor gets a short "I'm reviewing it" note (replies to it land in
   Resend's inbound and show on the review screen). Asking again while pending sends nothing new. */

import {
  addToAudience, config, COOKIE, emailHtml, inAudience, isEmail, isSlug, json, normEmail, origin, sendEmail, setCookie, sign, TTL,
} from './_lib/core.js'

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad-request' }, { status: 400 }) }

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
    await Promise.all([
      sendEmail(
        config.admin,
        `Portfolio request from ${email}`,
        emailHtml(
          [`${email} asked for access${slug ? ` from /work/${slug}` : ''}.`, 'Approving lets them in with their email on any case study.', `Review screen: ${origin(req)}/admin`],
          { href: approve, label: `Approve ${email}` },
        ),
        email,
      ),
      sendEmail(
        email,
        'Thanks for your interest',
        emailHtml([
          'Thanks for asking to see my work. I review every request personally and will email you as soon as you’re approved.',
          'Once you are, entering this email on any case study opens it. Feel free to reply with a note about what you’re hiring for.',
          'Mark',
        ]),
      ),
    ])
    return json({ status: 'reviewing' })
  } catch (err) {
    console.error(err)
    return json({ error: 'send-failed' }, { status: 502 })
  }
}
