/* GET /api/admin/enter?t=… — Mark's sign-in link: sets the admin cookie and opens the approval list. */

import { COOKIE, redirect, setCookie, sign, TTL, verify } from '../_lib/core.js'

export async function GET(req: Request) {
  if (!verify(new URL(req.url).searchParams.get('t'), 'admin-link')) return redirect('/admin?error=link-expired')
  return redirect('/admin', [setCookie(COOKIE.admin, sign({ k: 'admin' }, TTL.admin), TTL.admin)])
}
