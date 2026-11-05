import { useState, type FormEvent } from 'react'
import { site } from '../data/site'

/* /portfolio: the portfolio is shared on request. A visitor enters their email and asks for a link;
   the request is emailed to Mark through FormSubmit's AJAX endpoint (the site
   is static, so a hosted form-to-email service does the sending). The case studies themselves live
   on at /work, unlisted, for Mark to share directly.

   FormSubmit asks the receiving address to confirm itself once: the first request sends an
   activation email to it, and requests are delivered after that link is clicked. */

const ENDPOINT = `https://formsubmit.co/ajax/${site.resume.email}`

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; email: string } | { kind: 'error' }

export default function PortfolioRequest() {
  const [state, setState] = useState<State>({ kind: 'idle' })

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    setState({ kind: 'sending' })
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Portfolio request from ${email}`,
          _template: 'table',
          _captcha: 'false',
          _replyto: email,
          email,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState({ kind: 'sent', email })
    } catch {
      setState({ kind: 'error' })
    }
  }

  return (
    <div className="request-wrap">
      <section className="request">
        <h1 className="request__title">Portfolio</h1>
        <p className="request__lede">
          My portfolio of case studies is shared on request. Enter your email and I’ll send you a link.
        </p>

        {state.kind === 'sent' ? (
          <p className="request__done" role="status">
            Thanks. I’ll send a link to <b>{state.email}</b> shortly.
          </p>
        ) : (
          <form className="request__form" onSubmit={submit}>
            {/* just the email, and the button beside it */}
            <div className="request__row">
              <label className="request__field">
                <span className="visually-hidden">Email</span>
                <input type="email" name="email" required autoComplete="email" placeholder="you@company.com" />
              </label>
              <button type="submit" className="request__send" disabled={state.kind === 'sending'}>
                {state.kind === 'sending' ? 'Sending…' : 'Request link'}
              </button>
            </div>
            {/* FormSubmit's honeypot: bots fill it, people never see it */}
            <input type="text" name="_honey" tabIndex={-1} autoComplete="off" className="visually-hidden" aria-hidden />
            {state.kind === 'error' && (
                <p className="request__error" role="alert">
                  That didn’t send. Please try again, or email <a href={`mailto:${site.resume.email}`}>{site.resume.email}</a>.
                </p>
              )}
          </form>
        )}
      </section>
    </div>
  )
}
