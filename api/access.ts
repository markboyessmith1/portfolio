/* GET /api/access?t=… — the visitor's sign-in link.
   Checks they're still approved, sets the year-long session cookie, and opens the case study they asked from. */

import { config, COOKIE, inAudience, redirect, setCookie, sign, TTL, verify } from './_lib/core.js'

export async function GET(req: Request) {
  const claims = verify(new URL(req.url).searchParams.get('t'), 'access')
  if (!claims) return redirect('/portfolio?link=expired')
  try {
    if (!(await inAudience(config.access, claims.e))) return redirect('/portfolio?link=revoked')
  } catch (err) {
    console.error(err)
    return redirect('/portfolio?link=error')
  }
  const session = sign({ k: 'session', e: claims.e }, TTL.session)
  return redirect(claims.s ? `/work/${claims.s}` : '/', [setCookie(COOKIE.session, session, TTL.session)])
}
