import { useSyncExternalStore } from 'react'

/* Portfolio access, as the server sees it (api/session): one small shared store, so the carousel,
   the email gate and a case-study page all flip together the moment someone is let in.
   Under plain `vite` dev there are no /api functions (the SPA fallback answers with HTML), so dev
   treats everyone as granted; run `vercel dev` to exercise the real gate locally. */

export type Access = { granted: boolean; admin: boolean }

let current: Access | null = null
let pending: Promise<Access> | null = null
const listeners = new Set<() => void>()
const set = (a: Access) => { current = a; listeners.forEach((l) => l()) }

export function loadAccess(force = false): Promise<Access> {
  if (!pending || force) {
    pending = fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) throw new Error('no-api')
        return (await r.json()) as Access
      })
      .catch(() => (import.meta.env.DEV ? { granted: true, admin: true } : { granted: false, admin: false }))
      .then((a) => { set(a); return a })
  }
  return pending
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  if (!pending) loadAccess()
  return () => { listeners.delete(l) }
}

/** null while loading. */
export function useAccess(): Access | null {
  return useSyncExternalStore(subscribe, () => current, () => null)
}

/** granted: the server set the session cookie on this response, so they're in now. */
export type RequestResult = 'granted' | 'reviewing'

export async function requestAccess(email: string, slug?: string, website?: string): Promise<RequestResult> {
  const res = await fetch('/api/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, slug, website }),
  })
  if (!res.ok) throw new Error(String(res.status))
  const { status } = (await res.json()) as { status: RequestResult }
  if (status === 'granted') set({ granted: true, admin: current?.admin ?? false })
  return status
}
