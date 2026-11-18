import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { StickyHue } from './miro/StickyNote'
import ChatCursor, { type ChatHue } from './miro/ChatCursor'
import './miro/palette.css'

/* Notes of praise for the team, tucked behind the keynote's glass card and
   poking out from its edges (so the glass rim bends them). When the section
   comes on screen they slide out from under the card, one after another, and
   hold. They sit at three depths (`z`): the further, the smaller and softer. Positions are % of the card; each slides out along `out` (the
   direction away from the card). Decorative (aria-hidden). Reduced motion:
   already out. Styles: .cele* in styles.css.

   With them, the keynote's speakers as cursors, in front of the glass: they glide
   in from beyond the card just after the notes, then idle (a small CSS drift, each
   on its own rhythm). Positions are % of the card (the arrow's tip). */

/** z: depth, 0 = nearest (sharp, a touch larger), 2 = furthest (smaller, softer, hazier) */
type Note = { x: number; y: number; r: number; hue: StickyHue; text: string; out: [number, number]; z: 0 | 1 | 2 }

const NOTES: Note[] = [
  { x: -11, y: 6, r: -8, hue: 'sunshine', text: 'Proudest launch I’ve been part of', out: [1, 0], z: 0 },
  { x: -13, y: 42, r: 5, hue: 'cyan', text: 'The canvas finally thinks with us', out: [1, 0], z: 2 },
  { x: -9, y: 74, r: -4, hue: 'orange', text: 'Shipped it! 🎉', out: [1, 0], z: 1 },
  { x: 97, y: 2, r: 7, hue: 'pink', text: 'Six months. Unreal. 🚀', out: [-1, 0], z: 1 },
  { x: 99, y: 38, r: -5, hue: 'moss', text: 'Huge kudos, design team 🙌', out: [-1, 0], z: 0 },
  { x: 96, y: 72, r: 6, hue: 'lilac', text: 'Customers are loving it already', out: [-1, 0], z: 2 },
  { x: 22, y: 90, r: 3, hue: 'lime', text: 'That keynote demo though 🔥', out: [0, -1], z: 2 },
  { x: 64, y: 92, r: -6, hue: 'coral', text: 'Best team. Thank you 💛', out: [0, -1], z: 0 },
]

type Cursor = { name: string; hue: ChatHue; x: number; y: number; from: [number, number] }

const CURSORS: Cursor[] = [
  { name: 'Andrey', hue: 'ocean', x: 9, y: 9, from: [-1, -1] },
  { name: 'Jeff', hue: 'moss', x: 88, y: 14, from: [1, -1] },
  { name: 'Kendra', hue: 'pink', x: 3, y: 58, from: [-1, 0] },
  { name: 'Łukasz', hue: 'teal', x: 95, y: 62, from: [1, 0] },
  { name: 'Mark', hue: 'lilac', x: 38, y: 95, from: [0, 1] },
  { name: 'Jake', hue: 'orange', x: 72, y: 90, from: [1, 1] },
]

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function LaunchCelebration() {
  const root = useRef<HTMLDivElement>(null)
  const [out, setOut] = useState(REDUCED)
  useEffect(() => {
    const el = root.current
    if (!el || REDUCED) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOut(true); io.disconnect() } }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <>
    <div className={`cele${out ? ' is-out' : ''}`} ref={root} aria-hidden>
      {NOTES.map((n, i) => (
        <div
          key={n.text}
          className={`cele__note cele__note--z${n.z}`}
          style={{
            left: `${n.x}%`, top: `${n.y}%`, '--r': `${n.r}deg`,
            '--in-x': `${n.out[0] * -70}%`, '--in-y': `${n.out[1] * -70}%`,
            transitionDelay: `${150 + i * 120}ms`,
            background: `var(--miro-${n.hue}-sticky-background)`,
          } as CSSProperties}
        >
          {n.text}
        </div>
      ))}
    </div>
    <div className={`cele-cursors${out ? ' is-out' : ''}`} aria-hidden>
      {CURSORS.map((c, i) => (
        <div
          key={c.name}
          className="cele-cursor"
          style={{
            left: `${c.x}%`, top: `${c.y}%`,
            '--from-x': `${c.from[0] * 160}px`, '--from-y': `${c.from[1] * 120}px`,
            transitionDelay: `${1100 + i * 140}ms`,
            animationDelay: `${-i * 1.7}s`, animationDuration: `${7 + (i % 3) * 1.6}s`,
          } as CSSProperties}
        >
          <ChatCursor name={c.name} hue={c.hue} say={null} />
        </div>
      ))}
    </div>
    </>
  )
}
