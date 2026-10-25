import { useState, type FormEvent } from 'react'
import { site } from '../data/site'
import Reveal from './Reveal'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Wire this to your form backend (Formspree, Resend, a Vercel Function...).
    setSent(true)
  }
  return (
    <Reveal as="section" className="section">
      <div id="contact" className="row">
        <div className="stack stack--tight">
          <h2 className="title">{site.contact.title}</h2>
          <p className="lede muted">{site.contact.subtitle}</p>
        </div>
        {sent ? (
          <p className="lede">Thanks. I'll get back to you soon.</p>
        ) : (
          <form className="form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" required />
            </div>
            <button className="btn" type="submit">Submit</button>
          </form>
        )}
      </div>
    </Reveal>
  )
}
