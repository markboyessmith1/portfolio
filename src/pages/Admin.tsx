import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

/* /admin: the review screen. Everyone who has asked for portfolio access, newest first; pick someone
   to see their request, approve or revoke, read the whole email thread (what the site sent and what
   they replied, both read back from Resend) and write to them. "New message" writes to anyone.
   Signing in is a link emailed to ADMIN_EMAIL (api/admin/login), so there is no password; the request
   emails' Approve buttons land here too. */

type Person = { email: string; requestedAt: string; status: 'approved' | 'pending'; lastInbound?: string }
type Message = { id: string; dir: 'in' | 'out'; subject: string; at: string; body: string; messageId: string | null; status: string | null }
type View = { kind: 'loading' } | { kind: 'signed-out' } | { kind: 'list'; people: Person[] } | { kind: 'error' }
type Thread = { kind: 'loading' } | { kind: 'ready'; messages: Message[] } | { kind: 'error' }
type Filter = 'pending' | 'replied' | 'approved' | 'all'

const ERRORS: Record<string, string> = {
  'link-expired': 'That link has expired.',
  'send-failed': 'Approved, but the email to them didn’t send. Approve again from the list.',
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const post = (url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export default function Admin() {
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [login, setLogin] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [filter, setFilter] = useState<Filter>('pending')
  const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const selected = params.get('p') // the open person, kept in the URL so a refresh stays put
  const composing = params.get('new') !== null

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/list', { cache: 'no-store' })
      if (res.status === 401) return setView({ kind: 'signed-out' })
      if (!res.ok) throw new Error()
      const { people } = (await res.json()) as { people: Person[] }
      setView({ kind: 'list', people })
    } catch {
      setView({ kind: 'error' })
    }
  }, [])
  useEffect(() => { load() }, [load])

  // landing from an email's Approve button: say so, and open that person
  useEffect(() => {
    const approved = params.get('approved')
    const error = ERRORS[params.get('error') ?? '']
    if (approved) setFlash({ tone: 'ok', text: `Approved ${approved}. They can now enter with their email, and a link is on its way.` })
    else if (error) setFlash({ tone: 'err', text: error })
    if (approved || error) setParams(approved ? { p: approved } : {}, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (email: string | null, opts: { compose?: boolean } = {}) =>
    setParams(opts.compose ? { new: '' } : email ? { p: email } : {}, { replace: false })

  const setStatus = (email: string, status: Person['status']) =>
    setView((v) => (v.kind === 'list' ? { ...v, people: v.people.map((p) => (p.email === email ? { ...p, status } : p)) } : v))

  const sendLogin = async () => {
    setLogin('sending')
    try { setLogin((await post('/api/admin/login', {})).ok ? 'sent' : 'error') } catch { setLogin('error') }
  }

  if (view.kind !== 'list') {
    return (
      <div className="request-wrap">
        <section className="request">
          <h1 className="request__title">Review</h1>
          {flash && <p className={flash.tone === 'ok' ? 'request__done' : 'request__error'} role="status">{flash.text}</p>}
          {view.kind === 'loading' && <p className="request__lede">Loading…</p>}
          {view.kind === 'error' && <p className="request__error" role="alert">Couldn’t load the list. <button className="approvals__retry" onClick={load}>Retry</button></p>}
          {view.kind === 'signed-out' && (
            <>
              <p className="request__lede">Sign in with a link sent to your email.</p>
              <div className="request__form">
                {login === 'sent'
                  ? <p className="request__done" role="status">Check your inbox for the sign-in link.</p>
                  : <button className="request__send approvals__signin" onClick={sendLogin} disabled={login === 'sending'}>{login === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>}
                {login === 'error' && <p className="request__error" role="alert">That didn’t send. Please try again.</p>}
              </div>
            </>
          )}
        </section>
      </div>
    )
  }

  const people = view.people
  const replied = (p: Person) => !!p.lastInbound
  const counts: Record<Filter, number> = {
    pending: people.filter((p) => p.status === 'pending').length,
    replied: people.filter(replied).length,
    approved: people.filter((p) => p.status === 'approved').length,
    all: people.length,
  }
  const shown = filter === 'all' ? people : filter === 'replied' ? people.filter(replied) : people.filter((p) => p.status === filter)
  const person = people.find((p) => p.email === selected)

  return (
    <div className={`review${selected || composing ? ' has-detail' : ''}`}>
      <aside className="review__list">
        <header className="review__head">
          <h1>Review</h1>
          <button className="review__new" onClick={() => pick(null, { compose: true })}>New message</button>
        </header>
        <div className="approvals__tabs" role="tablist">
          {(['pending', 'replied', 'approved', 'all'] as const).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'is-on' : undefined} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)} <span>{counts[f]}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="review__empty">{filter === 'pending' ? 'Nothing waiting.' : 'No one here yet.'}</p>
        ) : (
          <ul className="review__people">
            {shown.map((p) => (
              <li key={p.email}>
                <button className={`review__person${p.email === selected ? ' is-on' : ''}`} onClick={() => pick(p.email)}>
                  <span className="review__who">{p.email}</span>
                  <span className="review__meta">
                    {replied(p) && <i className="review__dot" title={`Emailed ${when(p.lastInbound!)}`} />}
                    {day(p.requestedAt)}
                    <b className={`approvals__status approvals__status--${p.status}`}>{p.status === 'approved' ? 'Approved' : 'Pending'}</b>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="review__detail">
        {flash && (
          <p className={`review__flash review__flash--${flash.tone}`} role="status">
            {flash.text} <button onClick={() => setFlash(null)} aria-label="Dismiss">×</button>
          </p>
        )}
        {composing ? (
          <Composer key="new" onSent={(to) => { setFlash({ tone: 'ok', text: `Sent to ${to}.` }); pick(people.some((p) => p.email === to) ? to : null) }} />
        ) : selected ? (
          <Detail
            key={selected}
            email={selected}
            person={person}
            onBack={() => pick(null)}
            onStatus={(status) => setStatus(selected, status)}
            onFlash={setFlash}
          />
        ) : (
          <p className="review__empty review__empty--detail">Pick someone to review their request and conversation.</p>
        )}
      </section>
    </div>
  )
}

function Detail({ email, person, onBack, onStatus, onFlash }: {
  email: string
  person?: Person
  onBack: () => void
  onStatus: (s: Person['status']) => void
  onFlash: (f: { tone: 'ok' | 'err'; text: string } | null) => void
}) {
  const [thread, setThread] = useState<Thread>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)

  const loadThread = useCallback(async () => {
    setThread({ kind: 'loading' })
    try {
      const res = await fetch(`/api/admin/thread?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      setThread({ kind: 'ready', ...((await res.json()) as { messages: Message[] }) })
    } catch {
      setThread({ kind: 'error' })
    }
  }, [email])
  useEffect(() => { loadThread() }, [loadThread])

  const decide = async (action: 'approve' | 'revoke') => {
    setBusy(true)
    onFlash(null)
    try {
      if (!(await post('/api/admin/decide', { email, action })).ok) throw new Error()
      onStatus(action === 'approve' ? 'approved' : 'pending')
      onFlash({ tone: 'ok', text: action === 'approve' ? `Approved ${email}. They’ve been emailed a link.` : `Revoked ${email}.` })
      if (action === 'approve') loadThread()
    } catch {
      onFlash({ tone: 'err', text: `Couldn’t ${action} ${email}. Please try again.` })
    } finally {
      setBusy(false)
    }
  }

  const lastIn = thread.kind === 'ready' ? [...thread.messages].reverse().find((m) => m.dir === 'in') : undefined
  const replySubject = useMemo(() => (lastIn ? (/^re:/i.test(lastIn.subject) ? lastIn.subject : `Re: ${lastIn.subject}`) : 'Your portfolio request'), [lastIn])

  return (
    <div className="review__card">
      <header className="review__card-head">
        <button className="review__back" onClick={onBack} aria-label="Back to list">←</button>
        <div className="review__card-who">
          <h2>{email}</h2>
          {person && (
            <p>
              Asked {day(person.requestedAt)} · <b className={`approvals__status approvals__status--${person.status}`}>{person.status === 'approved' ? 'Approved' : 'Pending'}</b>
            </p>
          )}
        </div>
        {person && (person.status === 'pending'
          ? <button className="request__send" disabled={busy} onClick={() => decide('approve')}>{busy ? 'Approving…' : 'Approve'}</button>
          : <button className="approvals__revoke" disabled={busy} onClick={() => decide('revoke')}>{busy ? '…' : 'Revoke'}</button>)}
      </header>

      <div className="review__thread" aria-live="polite">
        {thread.kind === 'loading' && <p className="review__empty">Loading conversation…</p>}
        {thread.kind === 'error' && <p className="request__error">Couldn’t load the conversation. <button className="approvals__retry" onClick={loadThread}>Retry</button></p>}
        {thread.kind === 'ready' && thread.messages.length === 0 && <p className="review__empty">No emails with them yet.</p>}
        {thread.kind === 'ready' && thread.messages.map((m) => (
          <article key={m.id} className={`msg msg--${m.dir}`}>
            <header>
              <b>{m.dir === 'in' ? email : 'You'}</b>
              <span>{when(m.at)}{m.dir === 'out' && m.status ? ` · ${m.status.replace(/_/g, ' ')}` : ''}</span>
            </header>
            <p className="msg__subject">{m.subject}</p>
            <div className="msg__body">{m.body}</div>
          </article>
        ))}
      </div>

      <Composer
        key={`${email}:${lastIn?.id ?? ''}`}
        to={email}
        subject={replySubject}
        inReplyTo={lastIn?.messageId ?? undefined}
        onSent={() => { onFlash({ tone: 'ok', text: `Sent to ${email}.` }); loadThread() }}
      />
    </div>
  )
}

function Composer({ to, subject = '', inReplyTo, onSent }: { to?: string; subject?: string; inReplyTo?: string; onSent: (to: string) => void }) {
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const email = String(data.get('to') ?? to ?? '').trim()
    setState('sending')
    try {
      const res = await post('/api/admin/send', { email, subject: data.get('subject'), body: data.get('body'), inReplyTo })
      if (!res.ok) throw new Error()
      form.reset()
      setState('idle')
      onSent(email.toLowerCase())
    } catch {
      setState('error')
    }
  }

  return (
    <form className={`composer${to ? '' : ' composer--new'}`} onSubmit={submit}>
      {!to && <h2 className="composer__title">New message</h2>}
      {!to && (
        <label className="request__field">
          <span>To</span>
          <input type="email" name="to" required placeholder="name@company.com" autoFocus />
        </label>
      )}
      <label className="request__field">
        <span>Subject</span>
        <input name="subject" required defaultValue={subject} />
      </label>
      <label className="request__field">
        <span className="visually-hidden">Message</span>
        <textarea name="body" required rows={to ? 4 : 10} placeholder={to ? `Write to ${to}…` : 'Write your message…'} />
      </label>
      <div className="composer__foot">
        {state === 'error' && <p className="request__error" role="alert">That didn’t send. Please try again.</p>}
        <button type="submit" className="request__send" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  )
}
