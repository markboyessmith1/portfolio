/* GET /api/approve?t=… — the button in Mark's request email.
   Adds the visitor to the access audience, emails them their link, and lands Mark on the approval list. */

import { addToAudience, config, redirect, sendAccessLink, verify } from './_lib/core.js'

export async function GET(req: Request) {
  const claims = verify(new URL(req.url).searchParams.get('t'), 'approve')
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
