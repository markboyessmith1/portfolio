import { useCallback, useEffect, useRef, useState } from 'react'

/* A row of figure thumbnails under a section's copy (diagrams, tables). Each opens
   in a lightbox: a native modal <dialog>, so Escape closes it, focus stays inside
   and the page behind is inert. Several figures: step through them with the
   arrows (buttons or ← →). Clicking outside the picture closes it. Styles:
   .figures, .lightbox in styles.css. */

export type Figure = { src: string; alt: string; caption: string }

/** `start`: this row's first figure number (figures are numbered through the case) */
export default function Figures({ items, start = 1 }: { items: Figure[]; start?: number }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [at, setAt] = useState<number | null>(null)

  const open = (i: number) => { setAt(i); dialog.current?.showModal() }
  const close = useCallback(() => dialog.current?.close(), [])
  const step = useCallback((d: number) => setAt((i) => (i == null ? i : (i + d + items.length) % items.length)), [items.length])

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    const onClose = () => setAt(null)
    const onKey = (e: KeyboardEvent) => {
      if (items.length < 2) return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    }
    el.addEventListener('close', onClose)
    el.addEventListener('keydown', onKey)
    return () => { el.removeEventListener('close', onClose); el.removeEventListener('keydown', onKey) }
  }, [items.length, step])

  const shown = at == null ? null : items[at]
  return (
    <>
      <div className="figures">
        {items.map((f, i) => (
          <button type="button" className="figures__thumb" key={f.src} onClick={() => open(i)} aria-haspopup="dialog">
            <span className="figures__frame">
              <img src={f.src} alt="" loading="lazy" decoding="async" />
              <span className="figures__zoom" aria-hidden>
                <svg viewBox="0 0 16 16" width="14" height="14"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </span>
            <span className="figures__caption">
              <span className="figures__label">Fig. {start + i}</span>
              <b className="figures__title">{f.caption}</b>
            </span>
            <span className="sr-only">: open larger</span>
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={shown ? `Figure ${start + at!}: ${shown.caption}` : undefined}
        // a click on the backdrop (the dialog itself, outside its figure) closes it
        onClick={(e) => { if (e.target === e.currentTarget) close() }}
      >
        {shown && (
          <figure className="lightbox__figure" key={shown.src}>
            <img src={shown.src} alt={shown.alt} />
            <figcaption>
              <span className="lightbox__label">Fig. {start + at!}</span>
              <b>{shown.caption}</b>
              {items.length > 1 && <span className="lightbox__count">{at! + 1} / {items.length}</span>}
            </figcaption>
          </figure>
        )}
        <button type="button" className="lightbox__btn lightbox__close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
        {items.length > 1 && (
          <>
            <button type="button" className="lightbox__btn lightbox__prev" onClick={() => step(-1)} aria-label="Previous figure">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="lightbox__btn lightbox__next" onClick={() => step(1)} aria-label="Next figure">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </>
        )}
      </dialog>
    </>
  )
}
