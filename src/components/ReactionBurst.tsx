import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { REACTION_SRC, REACTIONS, type Reaction } from './miro/Reactions'

/* Miro reactions erupting from a card while its clip plays: from `from` seconds into the
   card's video until the clip ends, reactions spawn at random around the card's centre and
   wiggle up the page, each with its own rise, pace, sway and spin, so the stream reads as
   organic rather than as a pattern. Rendered into a positioned ancestor (the grid) rather than
   the card, so they aren't clipped by its rounded corners and carry on up past it.
   Off under reduced motion. Styles in styles.css (.burst). */

type Bubble = { id: number; kind: Reaction; x: number; y: number; style: CSSProperties }

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ReactionBurst({ card, from = 3 }: { card: RefObject<HTMLElement | null>; from?: number }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    const el = card.current
    const video = el?.querySelector('video')
    if (!el || !video || REDUCED) return
    let timer: number | undefined
    let on = false

    const spawn = () => {
      // the card's centre, in the grid's coordinates (the grid is the offset parent)
      const cx = el.offsetLeft + el.offsetWidth / 2
      const cy = el.offsetTop + el.offsetHeight / 2
      const b: Bubble = {
        id: nextId.current++,
        kind: REACTIONS[Math.floor(Math.random() * REACTIONS.length)],
        x: cx + rand(-0.18, 0.18) * el.offsetWidth,
        y: cy + rand(-0.08, 0.12) * el.offsetHeight,
        style: {
          '--size': `${rand(28, 48)}px`,
          '--rise': `${rand(320, 640)}px`,
          '--dur': `${rand(4.5, 7)}s`,
          '--sway': `${rand(10, 28) * (Math.random() < 0.5 ? -1 : 1)}px`,
          '--sway-dur': `${rand(1.3, 2.3)}s`,
          '--spin': `${rand(-18, 18)}deg`,
          '--drift': `${rand(-40, 40)}px`,
        } as CSSProperties,
      }
      setBubbles(bs => [...bs, b])
      // bursty: mostly quick, now and then a short breath
      timer = window.setTimeout(spawn, Math.random() < 0.15 ? rand(800, 1300) : rand(240, 520))
    }
    const start = () => { if (!on) { on = true; spawn() } }
    const stop = () => { on = false; clearTimeout(timer) }

    const onTime = () => {
      if (video.currentTime >= from && !video.paused && !video.ended) start()
      else if (video.currentTime < from) stop()
    }
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('pause', stop)
    video.addEventListener('ended', stop)
    return () => {
      stop()
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('pause', stop)
      video.removeEventListener('ended', stop)
    }
  }, [card, from])

  const drop = (id: number) => setBubbles(bs => bs.filter(b => b.id !== id))

  return (
    <div className="burst" aria-hidden>
      {bubbles.map(b => (
        <span key={b.id} className="burst__rise" style={{ ...b.style, left: b.x, top: b.y }} onAnimationEnd={e => { if (e.target === e.currentTarget) drop(b.id) }}>
          <img className="burst__sway" src={REACTION_SRC[b.kind]} alt="" />
        </span>
      ))}
    </div>
  )
}
