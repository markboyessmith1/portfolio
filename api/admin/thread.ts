/* GET /api/admin/thread?email=… → { messages: [{ id, dir, subject, at, body, messageId }] }
   The whole conversation with one person, oldest first: what the site sent them and what they sent back
   (Resend's sent list + inbound list, filtered to that address, bodies fetched per message). */

import { addressOf, getMail, isAdmin, isEmail, isoDate, json, listMail, normEmail } from '../_lib/core.js'

const MAX = 40 // bodies are one request each; plenty for a hiring conversation

const plain = (html?: string | null) =>
  (html ?? '')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** Drop the quoted history under a reply ("On … wrote:" and "> " lines). */
const unquote = (text: string) => {
  const cut = text.search(/\n\s*On .{0,200}wrote:\s*\n/)
  return (cut > 0 ? text.slice(0, cut) : text).split('\n').filter((l) => !l.startsWith('>')).join('\n').trim()
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return json({ error: 'unauthorised' }, { status: 401 })
  const email = normEmail(new URL(req.url).searchParams.get('email'))
  if (!isEmail(email)) return json({ error: 'bad-request' }, { status: 400 })

  try {
    const [sent, received] = await Promise.all([listMail('sent'), listMail('received')])
    const picked = [
      ...sent.filter((m) => m.to.some((t) => addressOf(t) === email)).map((m) => ({ box: 'sent' as const, m })),
      ...received.filter((m) => addressOf(m.from) === email).map((m) => ({ box: 'received' as const, m })),
    ]
      .sort((a, b) => isoDate(b.m.created_at).localeCompare(isoDate(a.m.created_at)))
      .slice(0, MAX)

    const messages = await Promise.all(
      picked.map(async ({ box, m }) => {
        const full = await getMail(box, m.id)
        const text = full.text?.trim() || plain(full.html)
        return {
          id: m.id,
          dir: box === 'sent' ? 'out' : 'in',
          subject: m.subject,
          at: isoDate(m.created_at),
          body: box === 'received' ? unquote(text) : text,
          messageId: full.message_id ?? m.message_id ?? null,
          status: m.last_event ?? null,
        }
      }),
    )
    messages.sort((a, b) => a.at.localeCompare(b.at))
    return json({ messages }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error(err)
    return json({ error: 'thread-failed' }, { status: 502 })
  }
}
