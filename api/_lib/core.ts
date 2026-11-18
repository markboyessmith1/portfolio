/* Shared server code for portfolio access (files under api/_lib are not routes).

   The model:
   - Anyone can ask for access from any case study (or /portfolio). Asking adds them to the
     "requests" Resend audience and emails Mark an approve link.
   - Approving adds them to the "access" audience and emails them a sign-in link. That one
     approval covers every case study.
   - The sign-in link sets a long-lived signed cookie, so returning on the same browser is
     instant. On a new device, asking again with an approved email skips Mark entirely: a fresh
     sign-in link goes straight out.
   - Revoking removes them from the access audience; their cookie stops working on the next check.

   All state lives in Resend (two audiences), so there is no database. Secrets come only from
   environment variables. */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { mail } from './email.js'

const env = (name: string): string => {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

export const config = {
  get secret() { return env('ACCESS_SECRET') },
  get from() { return env('RESEND_FROM') },
  get admin() { return env('ADMIN_EMAIL').toLowerCase() },
  get requests() { return env('RESEND_REQUESTS_AUDIENCE_ID') },
  get access() { return env('RESEND_ACCESS_AUDIENCE_ID') },
}

/* ---------- signed tokens (HMAC-SHA256, base64url) ---------- */

export type Claims =
  | { k: 'approve'; e: string; s?: string } // Mark's approve link for a request
  | { k: 'access'; e: string; s?: string } // a visitor's sign-in link
  | { k: 'session'; e: string } // the visitor's cookie
  | { k: 'admin-link' } // Mark's sign-in link to the approval list
  | { k: 'admin' } // Mark's admin cookie

const DAY = 86_400

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url')
const mac = (data: string) => createHmac('sha256', config.secret).update(data).digest('base64url')

export function sign(claims: Claims, ttlSeconds: number): string {
  const body = b64(JSON.stringify({ ...claims, x: Math.floor(Date.now() / 1000) + ttlSeconds }))
  return `${body}.${mac(body)}`
}

export function verify<K extends Claims['k']>(token: string | null | undefined, kind: K): Extract<Claims, { k: K }> | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const want = Buffer.from(mac(body))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  try {
    const c = JSON.parse(Buffer.from(body, 'base64url').toString()) as Claims & { x: number }
    if (c.k !== kind || c.x < Date.now() / 1000) return null
    return c as unknown as Extract<Claims, { k: K }>
  } catch {
    return null
  }
}

export const TTL = {
  approve: 30 * DAY,
  access: 14 * DAY, // a sign-in link in an inbox; asking again sends a new one instantly
  session: 365 * DAY,
  adminLink: 1 * DAY,
  admin: 30 * DAY,
}

/* ---------- cookies ---------- */

export const COOKIE = { session: 'pa_session', admin: 'pa_admin' }

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

export function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

/* ---------- Resend (REST) ---------- */

async function resend(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    // Resend rejects requests without a User-Agent (403)
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'User-Agent': 'portfolio-access/1.0', ...init.headers },
  })
}

type SendOpts = { replyTo?: string; text?: string; headers?: Record<string, string> }

/** Sends one email; returns Resend's id. Replies land in Resend's inbound (RESEND_REPLY_TO, else RESEND_FROM). */
export async function sendEmail(to: string, subject: string, html: string, opts: SendOpts | string = {}) {
  const o: SendOpts = typeof opts === 'string' ? { replyTo: opts } : opts
  const replyTo = o.replyTo ?? process.env.RESEND_REPLY_TO
  const res = await resend('/emails', {
    method: 'POST',
    body: JSON.stringify({
      from: config.from, to: [to], subject, html,
      ...(o.text ? { text: o.text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(o.headers ? { headers: o.headers } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Resend email failed: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { id: string }).id
}

/* ---------- mailbox: sent + received, read back from Resend ---------- */

export type MailSummary = { id: string; from: string; to: string[]; subject: string; created_at: string; message_id?: string; last_event?: string }
export type MailFull = MailSummary & { html?: string | null; text?: string | null }

/** Pages through GET /emails (sent) or /emails/receiving (inbound), newest first. */
export async function listMail(box: 'sent' | 'received', maxPages = 5): Promise<MailSummary[]> {
  const base = box === 'sent' ? '/emails' : '/emails/receiving'
  const out: MailSummary[] = []
  let after: string | undefined
  for (let page = 0; page < maxPages; page++) {
    const q = new URLSearchParams({ limit: '100', ...(after ? { after } : {}) })
    const res = await resend(`${base}?${q}`)
    if (!res.ok) throw new Error(`Resend list ${box} failed: ${res.status}`)
    const body = (await res.json()) as { data: MailSummary[]; has_more?: boolean }
    out.push(...body.data.map((m) => ({ ...m, to: Array.isArray(m.to) ? m.to : [m.to] })))
    if (!body.has_more || body.data.length === 0) break
    after = body.data[body.data.length - 1].id
  }
  return out
}

export async function getMail(box: 'sent' | 'received', id: string): Promise<MailFull> {
  const res = await resend(box === 'sent' ? `/emails/${id}` : `/emails/receiving/${id}`)
  if (!res.ok) throw new Error(`Resend get ${box} failed: ${res.status}`)
  return (await res.json()) as MailFull
}

/** "Ada <ada@x.com>" → "ada@x.com" */
export const addressOf = (v: string) => normEmail(/<([^>]+)>/.exec(v)?.[1] ?? v)

/** Resend's sent list uses "2026-04-03 22:13:42.67+00", the received list ISO; make both ISO. */
export const isoDate = (v: string) => { const d = new Date(v.includes('T') ? v : v.replace(' ', 'T').replace(/\+00$/, 'Z')); return isNaN(+d) ? v : d.toISOString() }

export async function inAudience(audience: string, email: string): Promise<boolean> {
  const res = await resend(`/audiences/${audience}/contacts/${encodeURIComponent(email)}`)
  if (res.status === 404) return false
  if (!res.ok) throw new Error(`Resend contact lookup failed: ${res.status}`)
  const c = (await res.json()) as { unsubscribed?: boolean }
  return !c.unsubscribed
}

export async function addToAudience(audience: string, email: string) {
  const res = await resend(`/audiences/${audience}/contacts`, { method: 'POST', body: JSON.stringify({ email, unsubscribed: false }) })
  // an existing contact is fine: it's already there
  if (!res.ok && res.status !== 409) throw new Error(`Resend add contact failed: ${res.status} ${await res.text()}`)
}

export async function removeFromAudience(audience: string, email: string) {
  const res = await resend(`/audiences/${audience}/contacts/${encodeURIComponent(email)}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`Resend remove contact failed: ${res.status}`)
}

export type Contact = { email: string; created_at: string }

export async function listAudience(audience: string): Promise<Contact[]> {
  const out: Contact[] = []
  let after: string | undefined
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ limit: '100', ...(after ? { after } : {}) })
    const res = await resend(`/audiences/${audience}/contacts?${q}`)
    if (!res.ok) throw new Error(`Resend list contacts failed: ${res.status}`)
    const body = (await res.json()) as { data: (Contact & { id: string; unsubscribed?: boolean })[]; has_more?: boolean }
    for (const c of body.data) if (!c.unsubscribed) out.push({ email: c.email, created_at: c.created_at })
    if (!body.has_more || body.data.length === 0) break
    after = body.data[body.data.length - 1].id
  }
  return out
}

/* ---------- helpers ---------- */

export const normEmail = (v: unknown) => String(v ?? '').trim().toLowerCase()
export const isEmail = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
export const isSlug = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{1,64}$/.test(v)

export const origin = (req: Request) => new URL(req.url).origin
export const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } })
export const redirect = (to: string, cookies: string[] = []) => {
  const h = new Headers({ Location: to })
  for (const c of cookies) h.append('Set-Cookie', c)
  return new Response(null, { status: 302, headers: h })
}

/** Email the visitor a sign-in link that lands them on the case study they asked from. */
export async function sendAccessLink(req: Request, email: string, slug?: string) {
  const link = `${origin(req)}/api/access?t=${sign({ k: 'access', e: email, ...(slug ? { s: slug } : {}) }, TTL.access)}`
  const m = mail({
    preheader: 'Your link to my case studies.',
    eyebrow: 'Portfolio',
    title: 'You’re in.',
    lines: ['Thanks for your interest in my work. This link opens every case study, so have a look around.'],
    sign: true,
    button: { href: link, label: 'Open the portfolio' },
    footnote: 'Next time, just enter this email on any case study and you’ll go straight in.',
  })
  await sendEmail(email, 'You’re in: my case studies', m.html, { text: m.text })
}

export const isAdmin = (req: Request) => !!verify(readCookie(req, COOKIE.admin), 'admin')
