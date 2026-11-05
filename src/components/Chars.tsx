import type { CSSProperties } from 'react'

/* Text split into one span per character, numbered on from `from`, so CSS can colour them in one
   after another (see .resume.is-hero in styles.css: each waits --c steps). The whole string is
   the accessible name; the split spans are hidden from assistive tech so it isn't read letter
   by letter. */
export default function Chars({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span className="chars" aria-hidden>
        {[...text].map((c, i) => (
          <span key={i} className="ch" style={{ '--c': from + i } as CSSProperties}>{c}</span>
        ))}
      </span>
    </>
  )
}
