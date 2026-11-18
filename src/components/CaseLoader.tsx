import { useEffect, useState } from 'react'
import { REACTION_SRC } from './miro/Reactions'

/* The case study's preloader. Before the page is shown, it fetches and decodes every
   picture the page will use (the ones in the page now, the ones its Storyboards and
   lightboxes add later, and any given in `urls`), waits for the fonts, and lets the
   3D cards draw a first frame (so their shaders compile now, not mid-scroll). Then
   it lifts away, out of a blur.

   It shows straight away and stays for at least MIN_MS, so it reads as a deliberate
   beat rather than a flash; never longer than MAX_MS. Styles: .case-loader */

const MIN_MS = 1000
const MAX_MS = 6000

// pictures the case draws later (Storyboard chapters, stickers, reactions)
const stickers = import.meta.glob<string>('../assets/stickers/*.png', { eager: true, import: 'default' })
const LATER = [...Object.values(REACTION_SRC), ...Object.values(stickers)]

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

function preload(src: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img.decode().catch(() => {}) // a missing picture never blocks the page
}

/** `onDone`: called once the loader has gone (the page then fades in) */
export default function CaseLoader({ id, urls = [], onDone }: { id: string; urls?: string[]; onDone?: () => void }) {
  const [phase, setPhase] = useState<'show' | 'out' | 'gone'>('show')
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(1)
  // the ring fills over the loader's time, never ahead of the real progress: a quick
  // load still sweeps round (and tilts) across its MIN_MS rather than jumping to full
  const [paced, setPaced] = useState(0)
  useEffect(() => {
    if (phase !== 'show') return
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const p = Math.min(100, ((performance.now() - t0) / (MIN_MS - 120)) * 100)
      setPaced(p)
      if (p < 100) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, id])

  useEffect(() => {
    let live = true
    setPhase('show'); setDone(0)
    const t0 = performance.now()
    const finish = () => {
      if (!live) return
      live = false
      window.clearTimeout(cap)
      setPhase('out')
    }
    const cap = window.setTimeout(finish, MAX_MS)
    ;(async () => {
      await nextFrame() // the page's own pictures are in the DOM now
      const inPage = [...document.querySelectorAll<HTMLImageElement>('.carousel img, .case-left img')].map((i) => i.currentSrc || i.src)
      const all = [...new Set([...inPage, ...urls, ...LATER].filter(Boolean))]
      setTotal(all.length + 1)
      const tick = () => live && setDone((d) => d + 1)
      await Promise.all([
        ...all.map((src) => preload(src).then(tick)),
        (document.fonts?.ready ?? Promise.resolve()).then(tick),
      ])
      // two frames: the 3D cards have drawn (and compiled) by now
      await nextFrame(); await nextFrame()
      // and it holds for at least MIN_MS
      const left = MIN_MS - (performance.now() - t0)
      if (left > 0) await new Promise((r) => window.setTimeout(r, left))
      finish()
    })()
    return () => { live = false; window.clearTimeout(cap) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // gone once it has lifted away (also if the transition never reports, e.g. reduced motion)
  useEffect(() => {
    if (phase !== 'out') return
    const t = window.setTimeout(() => setPhase('gone'), 700)
    return () => window.clearTimeout(t)
  }, [phase])
  useEffect(() => { if (phase === 'gone') onDone?.() }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null
  const pct = phase === 'out' ? 100 : Math.min(paced, (done / total) * 100)
  return (
    <div
      className={`case-loader${phase === 'out' ? ' is-out' : ''}`}
      style={{ '--p': pct } as React.CSSProperties}
      role="status"
      aria-live="polite"
      onTransitionEnd={(e) => { if (e.target === e.currentTarget && phase === 'out') setPhase('gone') }}
    >
      <div className="case-loader__ring" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  )
}
