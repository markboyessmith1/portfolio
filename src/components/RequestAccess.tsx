import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { site } from '../data/site'
import { requestAccess } from '../lib/access'

/* The email gate, shared by /portfolio, every locked case study, and the carousel (as a modal when a
   card is selected). One big field: an approved email is let straight in (onGranted); anyone else is
   told I'm reviewing it, and gets a note by email. Asking from a case study passes its slug. */

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'reviewing'; email: string } | { kind: 'error' }

type Props = { title: string; lede: ReactNode; slug?: string; notice?: ReactNode; onGranted?: () => void }

export function AccessForm({ title, lede, slug, notice, onGranted, autoFocus }: Props & { autoFocus?: boolean }) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    setState({ kind: 'sending' })
    try {
      const result = await requestAccess(email, slug, String(data.get('website') ?? ''))
      if (result === 'granted') onGranted?.()
      else setState({ kind: 'reviewing', email })
    } catch {
      setState({ kind: 'error' })
    }
  }

  if (state.kind === 'reviewing') {
    return (
      <div className="gate" role="status">
        <p className="gate__eyebrow">{title}</p>
        <h2 className="gate__title">Thanks, I’m reviewing your request.</h2>
        <p className="gate__lede">I’ll email <b>{state.email}</b> as soon as you’re approved. After that, entering your email here opens every case study.</p>
        <button type="button" className="gate__again" onClick={() => setState({ kind: 'idle' })}>Use a different email</button>
      </div>
    )
  }

  return (
    <form className="gate" onSubmit={submit}>
      <p className="gate__eyebrow">{title}</p>
      <h2 className="gate__title">{lede}</h2>
      {notice && <p className="gate__error" role="status">{notice}</p>}
      <label className="gate__field">
        <span className="visually-hidden">Email</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" placeholder="you@company.com" autoFocus={autoFocus} />
        <button type="submit" className="gate__send" disabled={state.kind === 'sending'} aria-label="Continue">
          {state.kind === 'sending' ? <span className="gate__spinner" aria-hidden /> : <span aria-hidden>→</span>}
        </button>
      </label>
      {/* honeypot: bots fill it, people never see it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="visually-hidden" aria-hidden />
      {state.kind === 'error'
        ? <p className="gate__error" role="alert">That didn’t go through. Please try again, or email <a href={`mailto:${site.resume.email}`}>{site.resume.email}</a>.</p>
        : <p className="gate__hint">Approved? You’re straight in. New here? I’ll review it and email you.</p>}
    </form>
  )
}

/** Full-page gate: /portfolio and a case study opened directly. */
export default function RequestAccess(props: Props) {
  return (
    <div className="request-wrap">
      <section className="request request--gate"><AccessForm {...props} /></section>
    </div>
  )
}

/** The gate over the carousel when a card is selected. Native <dialog>: focus is trapped, Esc closes. */
export function AccessDialog({ open, onClose, ...props }: Props & { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="gate-dialog"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }} // backdrop click
    >
      {open && (
        <div className="gate-dialog__panel">
          <button type="button" className="gate-dialog__close" onClick={onClose} aria-label="Close">×</button>
          <AccessForm {...props} autoFocus />
        </div>
      )}
    </dialog>
  )
}
