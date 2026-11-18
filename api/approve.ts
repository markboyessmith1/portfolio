/* /api/approve?t=… — the button in Mark's request email.
   GET only shows a one-tap confirm page; POST does the approving (adds the visitor to the access
   audience, emails them their link, lands Mark on the approval list). The split matters because mail
   security scanners open links in emails on their own, and a bare GET must never grant access. */

import { addToAudience, config, redirect, sendAccessLink, verify } from './_lib/core.js'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const claimsOf = (req: Request) => {
  const t = new URL(req.url).searchParams.get('t')
  return { t, claims: verify(t, 'approve') }
}

export function GET(req: Request) {
  const { t, claims } = claimsOf(req)
  if (!claims || !t) return redirect('/admin?error=link-expired')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Approve ${esc(claims.e)}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;font:16px/1.5 system-ui,-apple-system,sans-serif;letter-spacing:-0.01em}
  main{width:min(460px,100% - 32px)}
  h1{font-size:24px;font-weight:500;margin:0 0 8px}
  p{margin:0 0 24px;color:#444}
  button{font:inherit;border:0;border-radius:999px;background:#111;color:#fff;padding:12px 22px;cursor:pointer}
  a{color:#444;margin-left:16px}
</style></head><body><main>
<h1>Approve ${esc(claims.e)}?</h1>
<p>They’ll get an email with a link that opens every case study${claims.s ? `, starting at /work/${esc(claims.s)}` : ''}.</p>
<form method="post" action="/api/approve?t=${encodeURIComponent(t)}"><button type="submit">Approve and send link</button><a href="/admin">Not now</a></form>
</main></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const { claims } = claimsOf(req)
  if (!claims) return redirect('/admin?error=link-expired')
  try {
    await addToAudience(config.access, claims.e)
    await sendAccessLink(req, claims.e, claims.s)
  } catch (err) {
    console.error(err)
    return redirect('/admin?error=send-failed')
  }
  return redirect(`/admin?approved=${encodeURIComponent(claims.e)}`)
}
