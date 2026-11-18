import { useCallback, useEffect, useRef, useState } from 'react'

/* A band row of three principles side by side: each a silent looping clip in a
   bordered, rounded 16:9 tile, then its title and description run together as one
   inline paragraph (title in bold). The clips play only while the row is on screen.
   Each tile opens its clip in the lightbox (the same native <dialog> and .lightbox
   styles as components/Figures: Escape or a click outside closes it, ← → or the
   arrows step through the three). Reduced motion: no autoplay, just the posters
   (the lightbox clip still plays: the visitor asked for it). Styles: .principles-row */

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export type Principle = { title: string; body: string; video: string; poster?: string }

export default function PrinciplesRow({ items }: { items: Principle[] }) {
  const row = useRef<HTMLUListElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [at, setAt] = useState<number | null>(null)

  // the row's loops: only while it's on screen
  useEffect(() => {
    const el = row.current
    if (!el || REDUCED) return
    const videos = [...el.querySelectorAll('video')]
    const io = new IntersectionObserver(([e]) => {
      for (const v of videos) {
        if (e.isIntersecting) void v.play().catch(() => {})
        else v.pause()
      }
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [items])

  const open = (i: number) => { setAt(i); dialog.current?.showModal() }
  const close = useCallback(() => dialog.current?.close(), [])
  const step = useCallback((d: number) => setAt((i) => (i == null ? i : (i + d + items.length) % items.length)), [items.length])

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    const onClose = () => setAt(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    }
    el.addEventListener('close', onClose)
    el.addEventListener('keydown', onKey)
    return () => { el.removeEventListener('close', onClose); el.removeEventListener('keydown', onKey) }
  }, [step])

  const shown = at == null ? null : items[at]
  return (
    <>
      <ul className="principles-row" ref={row}>
        {items.map((p, i) => (
          <li className="principles-row__item" key={p.title}>
            <button type="button" className="principles-row__tile" onClick={() => open(i)} aria-haspopup="dialog" aria-label={`${p.title}: open the clip larger`}>
              <video src={p.video} poster={p.poster} muted loop playsInline preload="metadata" aria-hidden />
              <span className="figures__zoom" aria-hidden>
                <svg viewBox="0 0 16 16" width="14" height="14"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </button>
            <p className="principles-row__text"><b>{p.title}.</b> {p.body}</p>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={shown ? `Principle: ${shown.title}` : undefined}
        // a click on the backdrop (the dialog itself, outside its figure) closes it
        onClick={(e) => { if (e.target === e.currentTarget) close() }}
      >
        {shown && (
          <figure className="lightbox__figure" key={shown.video}>
            <video src={shown.video} poster={shown.poster} muted loop playsInline autoPlay aria-label={shown.title} />
            <figcaption>
              <b>{shown.title}</b>
              <span className="lightbox__count">{at! + 1} / {items.length}</span>
            </figcaption>
          </figure>
        )}
        <button type="button" className="lightbox__btn lightbox__close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
        <button type="button" className="lightbox__btn lightbox__prev" onClick={() => step(-1)} aria-label="Previous principle">
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="lightbox__btn lightbox__next" onClick={() => step(1)} aria-label="Next principle">
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </dialog>
    </>
  )
}
