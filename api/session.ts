/* GET /api/session → { granted, admin }
   Granted means a valid session cookie for an email still in the access audience (so revoking
   takes effect on the next visit). Mark's admin cookie counts as granted too. */

import { config, COOKIE, inAudience, isAdmin, json, readCookie, verify } from './_lib/core.js'

export async function GET(req: Request) {
  let admin = false
  let claims: ReturnType<typeof verify<'session'>> = null
  try {
    admin = isAdmin(req)
    claims = verify(readCookie(req, COOKIE.session), 'session')
  } catch (err) {
    // missing ACCESS_SECRET: nobody is signed in, but answer cleanly so the site still renders its gates
    console.error(err)
  }
  let granted = admin
  if (!granted && claims) {
    try { granted = await inAudience(config.access, claims.e) } catch (err) {
      console.error(err)
      granted = true // Resend hiccup: trust the signed cookie rather than lock out an approved visitor
    }
  }
  return json({ granted, admin }, { headers: { 'Cache-Control': 'private, no-store' } })
}
