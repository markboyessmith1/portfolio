import { useEffect, useRef, useState, type CSSProperties } from 'react'
import ChatCursor from './miro/ChatCursor'
import { markerLoop } from './miro/markerLoop'
import { REACTION_SRC, type Reaction } from './miro/Reactions'
import Chars from './Chars'

/* The resume's "Currently Head of AI Design at Miro." line, with a moment from
   the canvas. Once it's on screen:
     1. a Miro cursor glides in, drags across "Head of AI Design" (Miro's yellow
        swept along behind it) and types a note in cursor chat underneath;
     2. a second collaborator drops in, draws a rough marker loop around "Miro"
        (the cursor rides the pen), then goes round placing reactions — each
        sticker lands under the cursor as it arrives, some piled over each
        other and over the words.
   Once settled both cursors keep drifting, like hands resting on a mouse, and
   have a short exchange in cursor chat, after which they both fall quiet.
   Reduced motion: the highlight, note, loop and stickers simply show. */

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

type Step = 'off' | 'arrive' | 'select' | 'say'
type Pos = { x: number; y: number; ms: number }

/** the stickers the second cursor places, in order: where (fractions of the line box: x of its
    width, y of its height), a tilt and a size — scattered round the words, not in a row */
/** each sticker sits beside the words, never on them: `on` names what it's beside ("Miro", the
    highlighted role, or the line's start), `side` whether it's above or below the text, `at` how far
    along that word (0 its left edge, 1 its right) the sticker's centre falls */
type Anchor = 'company' | 'role' | 'start'
const STAMPS: { kind: Reaction; on: Anchor; side: 'above' | 'below'; at: number; r: number; size: number }[] = [
  { kind: 'mindblown', on: 'company', side: 'above', at: 0.7, r: -10, size: 40 }, // up off "Miro", over the loop
  { kind: 'love', on: 'role', side: 'above', at: 0.15, r: 12, size: 48 },         // over the start of the highlight
  { kind: 'fire', on: 'start', side: 'below', at: 0.5, r: -14, size: 42 },        // tucked under "Currently"
]
/** clear space between a sticker and the text it sits beside */
const GAP = 4
/** where a sticker goes (its top left, in the line box), given the words' boxes; `dx`/`dy` nudge
    it, but the result never comes nearer the text than GAP */
type Box = { left: number; right: number; top: number; bottom: number }
const placeStamp = (s: (typeof STAMPS)[number], words: Record<Anchor, Box>, text: Box, dx = 0, dy = 0) => {
  const w = words[s.on]
  const x = w.left + (w.right - w.left) * s.at - s.size / 2 + dx
  const y = s.side === 'above'
    ? Math.min(text.top - GAP - s.size, text.top - GAP - s.size + dy)
    : Math.max(text.bottom + GAP, text.bottom + GAP + dy)
  return { x, y }
}
/** the second collaborator */
const SECOND = { name: 'Ana', hue: 'coral' as const }
/** the two cursors' exchange once things settle: who speaks (0 the Miro cursor, 1 the second) and what */
const EXCHANGE: [0 | 1, string][] = [
  [1, 'We have to watch what we say…'],
  [0, 'Yeah… he told us only to say nice things.'],
  [1, 'Okay… maybe we just shouldn’t say anything.'],
  [0, 'Yeah. You should see how many credits he spent on this thing…'],
]

/** `from`: where this line's characters pick up in the hero's colour-in (see Chars) */
export default function CurrentRole({ role, company, note, by, from = 0 }: { role: string; company: string; note: string; by: string; from?: number }) {
  // the line's pieces, numbered on from one another for the colour-in
  const a = 'Currently ', b2 = ' at ', at1 = from + a.length, at2 = at1 + role.length, at3 = at2 + b2.length, at4 = at3 + company.length
  const line = useRef<HTMLDivElement>(null)
  const pick = useRef<HTMLSpanElement>(null)
  const word = useRef<HTMLSpanElement>(null)
  const loopPath = useRef<SVGPathElement>(null)
  const [step, setStep] = useState<Step>(REDUCED ? 'say' : 'off')
  const [one, setOne] = useState<Pos | null>(null)
  const [two, setTwo] = useState<Pos | null>(null)
  // what each cursor is saying right now (the Miro cursor's note is its resting line)
  const [say1, setSay1] = useState<string | null>(REDUCED ? note : null)
  const [say2, setSay2] = useState<string | null>(null)
  // how much of the loop is drawn (0–1), and the stickers placed so far (px, in the line box)
  const [drawn, setDrawn] = useState(REDUCED ? 1 : 0)
  // (`move`: how long the sticker takes to glide to where it is, once the cursors start dragging them)
  const [placed, setPlaced] = useState<{ kind: Reaction; x: number; y: number; r: number; size: number; move?: number }[]>([])
  const placedNow = useRef(placed)
  placedNow.current = placed
  // the loop is drawn at the word's real size
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = word.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.offsetWidth, h: el.offsetHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const loop = box.w ? markerLoop(box.w, box.h) : null

  // the text's box and the words the stickers sit beside, in the line box's coordinates
  const measure = () => {
    const el = line.current!, b = el.getBoundingClientRect()
    const local = (r: DOMRect): Box => ({ left: r.left - b.left, right: r.right - b.left, top: r.top - b.top, bottom: r.bottom - b.top })
    const text = local(el.querySelector('p')!.getBoundingClientRect())
    const role = local(pick.current!.getBoundingClientRect())
    const company = local(word.current!.getBoundingClientRect())
    // "Currently": from the line's start up to the role
    const start = { ...text, right: Math.max(text.left + 40, role.left - 8) }
    return { text, words: { company, role, start } as Record<Anchor, Box> }
  }

  // reduced motion: everything in place, no cursors
  useEffect(() => {
    if (!REDUCED || !line.current) return
    const { text, words } = measure()
    setPlaced(STAMPS.map((s) => ({ kind: s.kind, ...placeStamp(s, words, text), r: s.r, size: s.size })))
  }, [])

  // the resting drift, layered on top of each placed position; the two hands on their own rhythms
  const drift1 = useRef<HTMLSpanElement>(null)
  const drift2 = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (REDUCED || step !== 'say') return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const t = (now - t0) / 1000
      const x1 = 7 * Math.sin(t * 0.9) + 3 * Math.sin(t * 2.3 + 1.1)
      const y1 = 5 * Math.sin(t * 1.3 + 0.6) + 2 * Math.sin(t * 2.9)
      const x2 = 6 * Math.sin(t * 1.1 + 2.4) + 3 * Math.sin(t * 2.7 + 0.3)
      const y2 = 6 * Math.sin(t * 0.8 + 1.7) + 2 * Math.sin(t * 3.1 + 2.2)
      if (drift1.current) drift1.current.style.transform = `translate(${x1.toFixed(1)}px, ${y1.toFixed(1)}px)`
      if (drift2.current) drift2.current.style.transform = `translate(${x2.toFixed(1)}px, ${y2.toFixed(1)}px)`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step])

  useEffect(() => {
    const el = line.current
    if (!el || REDUCED) return
    let alive = true
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      void (async () => {
        const b = el.getBoundingClientRect()
        const local = (r: DOMRect) => ({ left: r.left - b.left, top: r.top - b.top, right: r.right - b.left, bottom: r.bottom - b.top })
        const p = local(pick.current!.getBoundingClientRect())

        // 1. the Miro cursor: in from the right, across the title, then the note
        setOne({ x: b.width + 160, y: p.bottom + 66, ms: 0 })
        await sleep(60)
        setOne({ x: p.left, y: p.bottom - 4, ms: 900 })
        setStep('arrive')
        await sleep(1040)
        if (!alive) return
        setStep('select')
        setOne({ x: p.right, y: p.bottom - 4, ms: 700 })
        await sleep(850)
        if (!alive) return
        setStep('say')
        setSay1(note)
        await sleep(note.length * 55 + 700)
        if (!alive) return

        // 2. the second cursor: down from above to the start of the loop …
        const path = loopPath.current
        const at = (t: number) => {
          const pt = path!.getPointAtLength(path!.getTotalLength() * t)
          // the screen point and the line's box measured together, now: the page may have
          // scrolled since `b` was taken, and mixing the two would throw the cursor off by that much
          const q = new DOMPoint(pt.x, pt.y).matrixTransform(path!.getScreenCTM()!)
          const now = el.getBoundingClientRect()
          return { x: q.x - now.left, y: q.y - now.top }
        }
        const start = path ? at(0) : { x: b.width * 0.6, y: 0 }
        setTwo({ x: start.x + 80, y: -180, ms: 0 })
        await sleep(60)
        setTwo({ ...start, ms: 800 })
        await sleep(880)
        if (!alive) return
        // … round "Miro" with the marker, riding the pen
        if (path) {
          const dur = 1300
          const t0 = performance.now()
          await new Promise<void>((done) => {
            const tick = (now: number) => {
              if (!alive) return done()
              const k = Math.min(1, (now - t0) / dur)
              const t = 0.5 - Math.cos(Math.PI * k) / 2
              setDrawn(t)
              setTwo({ ...at(t), ms: 0 })
              if (k < 1) requestAnimationFrame(tick)
              else done()
            }
            requestAnimationFrame(tick)
          })
        }
        await sleep(300)

        // … then round the line placing reactions: each lands under the cursor as it arrives
        const geo = measure()
        for (const s of STAMPS) {
          if (!alive) return
          const { x, y } = placeStamp(s, geo.words, geo.text)
          setTwo({ x: x + s.size * 0.6, y: y + s.size * 0.7, ms: 620 })
          await sleep(660)
          setPlaced((ps) => [...ps, { kind: s.kind, x, y, r: s.r, size: s.size }])
          await sleep(220)
        }
        // and rest just left of the last one (the fire, on the left), where it talks from
        const last = STAMPS[STAMPS.length - 1], lastAt = placeStamp(last, geo.words, geo.text)
        setTwo({ x: lastAt.x - 36, y: lastAt.y + last.size * 0.7, ms: 700 })

        // from here on, for as long as the page is open, the two keep fiddling with the stickers:
        // taking turns, one goes to a sticker, picks it up and drags it a little way, re-tilted,
        // never far from where it was first placed. Runs alongside the exchange
        void (async () => {
          let who: 0 | 1 = 0
          await sleep(1600)
          while (alive) {
            const go = who ? setTwo : setOne
            const i = Math.floor(Math.random() * STAMPS.length)
            const s = STAMPS[i], cur = placedNow.current[i]
            if (!cur) break
            const grip = (x: number, y: number) => ({ x: x + s.size * 0.55, y: y + s.size * 0.6 })
            go({ ...grip(cur.x, cur.y), ms: 900 })
            await sleep(1000)
            if (!alive) return
            // a nudge of up to ±24px along and ±10px away from the text, never onto it (placeStamp
            // clamps the side towards the words); measured afresh in case the line has reflowed
            const now = measure()
            const { x, y } = placeStamp(s, now.words, now.text, (Math.random() - 0.5) * 48, (Math.random() - 0.5) * 20)
            const r = s.r + (Math.random() - 0.5) * 18
            const move = 1000
            setPlaced((ps) => ps.map((p, j) => (j === i ? { ...p, x, y, r, move } : p)))
            go({ ...grip(x, y), ms: move })
            await sleep(move + 2200 + Math.random() * 2400)
            who = (1 - who) as 0 | 1
          }
        })()

        // 3. a beat, then their exchange, each line answering the last; then both fall quiet
        await sleep(2200)
        // each reply starts while the last is still up (it closes a beat later), like a real chat
        const says = [setSay1, setSay2]
        const spoke = [0, 0]
        for (const [i, [who, line]] of EXCHANGE.entries()) {
          if (!alive) return
          says[who](line)
          spoke[who] = i
          const other = (1 - who) as 0 | 1
          // the last line stays up long enough to finish reading before it closes
          window.setTimeout(() => { if (alive && spoke[other] < i) says[other](null) }, 3200)
          await sleep(line.length * 75 + 2400)
        }
        if (!alive) return
        await sleep(4500)
        setSay1(null)
        setSay2(null)
      })()
    }, { rootMargin: '0px 0px -25% 0px' })
    io.observe(el)
    return () => { alive = false; io.disconnect() }
  }, [note])

  const cursorStyle = (p: Pos): CSSProperties => ({ transform: `translate(${p.x}px, ${p.y}px)`, transition: p.ms ? `transform ${p.ms}ms ${EASE}` : 'none' })

  return (
    // a div, not a <p>: the cursor's chat bubble is block content
    <div className={`resume__current is-${step}`} ref={line}>
      <p>
        <Chars text={a} from={from} /><span className="resume__current-pick" ref={pick}><Chars text={role} from={at1} /></span><Chars text={b2} from={at2} />
        <span className="resume__current-word" ref={word}>
          <Chars text={company} from={at3} />
          {loop && (
            <svg
              className="resume__current-loop"
              aria-hidden
              width={box.w + loop.pad * 2}
              height={box.h + loop.pad * 2}
              viewBox={`0 0 ${box.w + loop.pad * 2} ${box.h + loop.pad * 2}`}
              style={{ top: -loop.pad, left: -loop.pad }}
            >
              <path ref={loopPath} d={loop.d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawn} style={{ opacity: drawn > 0 ? 1 : 0 }} />
            </svg>
          )}
        </span>
        <Chars text="." from={at4} />
      </p>
      <span className="resume__current-stamps" aria-hidden>
        {placed.map((st, i) => (
          <img key={i} src={REACTION_SRC[st.kind]} alt="" style={{ left: st.x, top: st.y, width: st.size, height: st.size, '--r': `${st.r}deg`, '--move': `${st.move ?? 0}ms` } as CSSProperties} />
        ))}
      </span>
      {(one || REDUCED) && (
        <span className="resume__current-cursor" aria-hidden style={one && !REDUCED ? cursorStyle(one) : undefined}>
          <span className="resume__current-drift" ref={drift1}>
            <ChatCursor name={by} hue="sunshine" say={say1} charMs={55} />
          </span>
        </span>
      )}
      {two && (
        <span className="resume__current-cursor" aria-hidden style={cursorStyle(two)}>
          <span className="resume__current-drift" ref={drift2}>
            <ChatCursor name={SECOND.name} hue={SECOND.hue} say={say2} charMs={50} />
          </span>
        </span>
      )}
    </div>
  )
}
