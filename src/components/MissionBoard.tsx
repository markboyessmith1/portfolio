import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import ChatCursor, { type ChatHue } from './miro/ChatCursor'
import { REACTION_SRC, type Reaction } from './miro/Reactions'
import pointing from '../assets/stickers/pointing.png'
import armsCrossed from '../assets/stickers/arms-crossed.png'
import fistPump from '../assets/stickers/fist-pump.png'
import yes from '../assets/stickers/yes.png'
import secretSociety from '../assets/stickers/secret-society.png'

/* The mission, assembled on the board (after the c26 prototype's HeroBoard, the
   /portfolio hero). Its lines start off the board, each beyond a different edge. When
   the card comes into view the room builds it at once: each person (and Claude) goes
   off to fetch a line, selects it (the selection frame in their colour), carries it in
   to a stepped lock-up and lets go. Then Monika retypes the opening ("Turn the canvas
   into" → "Make the canvas"), Josh rings the key phrase with a marker, reactions are
   stamped on and the team's stickers are slapped round the card, all at once, spilling
   over its edges. The room stays alive: Claude tags along behind someone, a line is
   nudged and set back, someone reads along, an emoji floats up (the typefaces stay as
   set). You can grab any line too; Claude
   tidies it back after a moment. Scrolled well away, it resets and builds again next
   time. Reduced motion: the finished lock-up, still. Styles: .mission* in styles.css. */

export type MissionScript = {
  /** the mission as the lock-up's pieces, each one movable text block (`\n` breaks a
   *  block over lines) */
  lines: string[]
  /** a line that arrives reading `from`, retyped to its final text by `who` once built */
  retype?: { line: number; from: string; who: string; say?: string }
  /** who rings the key phrase */
  ringBy?: string
  /** the line ringed with a marker once it's built */
  ring?: number
  /** reaction stickers stamped on lines once built: line → stickers */
  stamps?: Record<number, Reaction[]>
  /** lines set in Apris (the prototype's display serif); the rest in the display sans */
  serif?: number[]
}

type ActorId = 'claude' | 'kasper' | 'monika' | 'josh' | 'mark'
type Holder = ActorId | 'you'
type Pt = { x: number; y: number }
/** `caret`: where the typing caret sits in the text, while someone's typing into it */
type Piece = { text: string; x: number; y: number; r: number; dur: number; held: Holder | null; caret?: number }
type Actor = Pt & { dur: number; say: string | null }

/** The team's die-cut stickers, round the card's edges and over them (% of the card),
 *  clear of the lock-up in the middle; slapped on all at once (a few ms apart) once it's built. */
const TEAM: { src: string; style: CSSProperties; r: number }[] = [
  { src: fistPump, style: { top: '-5%', left: '-8%', width: '21%' }, r: -7 },
  { src: secretSociety, style: { top: '-5%', right: '-7%', width: '26%' }, r: 9 },
  { src: armsCrossed, style: { top: '74%', right: '-9%', width: '20%' }, r: 6 },
  { src: pointing, style: { bottom: '-6%', left: '-8%', width: '22%' }, r: -9 },
  { src: yes, style: { bottom: '-8%', left: '36%', width: '20%' }, r: 5 },
]

const ACTORS: { id: ActorId; name: string; hue: ChatHue }[] = [
  { id: 'claude', name: 'Claude', hue: 'claude' },
  { id: 'kasper', name: 'Kasper', hue: 'coral' },
  { id: 'monika', name: 'Monika', hue: 'cyan' },
  { id: 'josh', name: 'Josh', hue: 'moss' },
  { id: 'mark', name: 'Mark', hue: 'orange' },
]
const HUMANS: ActorId[] = ['kasper', 'monika', 'josh', 'mark']
const idOf = (name: string): ActorId => ACTORS.find((a) => a.name === name)?.id ?? 'monika'
const INK: Record<Holder, string> = {
  claude: '#D97757', // Claude's terracotta (ChatCursor's 'claude')
  kasper: 'var(--miro-coral-cursor-border)',
  monika: 'var(--miro-cyan-cursor-border)',
  josh: 'var(--miro-moss-cursor-border)',
  mark: 'var(--miro-orange-cursor-border)',
  you: '#4262ff',
}
/** the lock-up's step: each piece's indent, in ems */
const INDENT = [0, 1.2, 0.45, 1.6, 0.8]
/** where each line starts: off the board past one edge (a direction from its place:
 *  x in board widths, y in 0.6 board heights), tilted */
const FROM: { dx: number; dy: number; r: number }[] = [
  { dx: 0.2, dy: -1.2, r: -5 },
  { dx: -1, dy: 0.1, r: 5 },
  { dx: 1, dy: -0.1, r: -4 },
  { dx: -0.5, dy: 1, r: 4 },
  { dx: 0.55, dy: 1, r: -5 },
]
/** who fetches which line (everyone at once, a beat apart) */
const CREW: { who: ActorId; line: number; after: number; say?: string }[] = [
  { who: 'claude', line: 0, after: 0, say: 'Setting the mission' },
  { who: 'kasper', line: 1, after: 150 },
  { who: 'josh', line: 2, after: 250 },
  { who: 'mark', line: 3, after: 350 },
  { who: 'monika', line: 4, after: 450 },
]
const MOJIS: Reaction[] = ['love', 'fire', 'like', 'celebrate', 'mindblown']
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** A freehand marker loop round a w×h box (the prototype's): a tilted, wobbly ellipse
 *  that starts upper-left, runs clockwise and overshoots its start like a pen stroke.
 *  Returns the path, its points (to ride) and the padding beyond the box. */
function markerLoop(w: number, h: number) {
  const pad = Math.round(h * 0.3)
  const cx = pad + w / 2
  const cy = pad + h * 0.48
  const rx = w / 2 + pad * 0.6
  const ry = h / 2 + pad * 0.35
  const tilt = (-3 * Math.PI) / 180
  const pts: Pt[] = []
  for (let i = 0; i <= 90; i++) {
    const t = i / 90
    const a = -2.45 + (Math.PI * 2 + 0.55) * t
    const k = 1 + 0.03 * Math.sin(3 * a + 0.8) + 0.02 * Math.sin(5 * a) + 0.07 * t * t
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * ry * k
    pts.push({ x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) })
  }
  const f = (v: number) => v.toFixed(1)
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    d += ` Q ${f(pts[i].x)} ${f(pts[i].y)} ${f((pts[i].x + pts[i + 1].x) / 2)} ${f((pts[i].y + pts[i + 1].y) / 2)}`
  }
  d += ` L ${f(pts[pts.length - 1].x)} ${f(pts[pts.length - 1].y)}`
  return { d, pad, pts }
}

export default function MissionBoard({ script }: { script: MissionScript }) {
  const root = useRef<HTMLDivElement>(null)
  const ghosts = useRef<(HTMLSpanElement | null)[]>([])
  const pieceEls = useRef<(HTMLDivElement | null)[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [font, setFont] = useState(0)
  const [run, setRun] = useState(0)
  const [pieces, setPieces] = useState<Piece[]>([])
  const offstage = (): Record<ActorId, Actor> =>
    Object.fromEntries(ACTORS.map((a, i) => [a.id, { x: -140, y: 80 + i * 110, dur: 0, say: null }])) as Record<ActorId, Actor>
  const [actors, setActors] = useState<Record<ActorId, Actor>>(offstage)
  const [ring, setRing] = useState(REDUCED ? 1 : 0)
  const [stamped, setStamped] = useState(REDUCED)
  const [emotes, setEmotes] = useState<{ id: number; x: number; y: number; kind: Reaction; dx: number }[]>([])
  const serif = script.lines.map((_, i) => !!script.serif?.includes(i))
  const piecesRef = useRef(pieces)
  piecesRef.current = pieces
  const actorsRef = useRef(actors)
  actorsRef.current = actors
  const settled = useRef(false)
  const n = script.lines.length
  const startText = (i: number) => (script.retype?.line === i ? script.retype.from : script.lines[i])

  // the board's size
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // the type size: as large as fits, the stepped lock-up inside the board's gutters
  useLayoutEffect(() => {
    const el = root.current
    if (!el || !size.w) return
    const gutter = size.w * 0.09
    const rows = script.lines.reduce((k, l) => k + l.split('\n').length, 0)
    let f = Math.min(size.w * 0.085, (size.h * 0.62) / rows)
    el.style.setProperty('--mission-f', `${f}px`)
    const need = Math.max(...script.lines.map((_, i) => INDENT[i % INDENT.length] * f + (ghosts.current[i]?.offsetWidth ?? 0)))
    if (need > size.w - gutter * 2) f *= (size.w - gutter * 2) / need
    el.style.setProperty('--mission-f', `${f}px`)
    setFont(f)
  }, [size, n, script.lines, script.serif])

  /** a line's place in the lock-up (from the final lines' measured widths) */
  const target = (i: number): Pt => {
    const f = font || 40
    const widths = script.lines.map((_, k) => INDENT[k % INDENT.length] * f + (ghosts.current[k]?.offsetWidth ?? f * 6))
    const blockW = Math.max(...widths)
    // pieces stack by their own heights (a block runs over several lines), a hair apart
    const gap = f * 0.04
    const hs = script.lines.map((l, k) => ghosts.current[k]?.offsetHeight ?? f * l.split('\n').length)
    const total = hs.reduce((a, b) => a + b, 0) + gap * (n - 1)
    let y = (size.h - total) / 2 - size.h * 0.03
    for (let k = 0; k < i; k++) y += hs[k] + gap
    return { x: (size.w - blockW) / 2 + INDENT[i % INDENT.length] * f, y }
  }
  const box = (i: number) => {
    const el = pieceEls.current[i]
    return { w: el?.offsetWidth ?? 200, h: el?.offsetHeight ?? font }
  }

  // lay the pieces out: scattered (or in place, once built or reduced)
  useEffect(() => {
    if (!size.w || !font) return
    setPieces((prev) =>
      script.lines.map((_, i) => {
        if (REDUCED || settled.current) return { text: prev[i]?.text ?? script.lines[i], ...target(i), r: 0, dur: 0, held: null }
        const f = FROM[i % FROM.length]
        const t = target(i)
        return { text: startText(i), x: t.x + f.dx * size.w, y: t.y + f.dy * size.h * 0.6, r: f.r, dur: 0, held: null }
      }),
    )
    // the cursors wait off the board too, out past the lines they'll fetch
    if (!REDUCED && !settled.current) {
      setActors((a) => {
        const next = { ...a }
        for (const c of CREW) {
          const f = FROM[c.line % FROM.length]
          const t = target(c.line)
          next[c.who] = { ...a[c.who], x: t.x + f.dx * size.w * 1.15 + 40, y: t.y + f.dy * size.h * 0.75 + 20, dur: 0 }
        }
        return next
      })
    }
  }, [size, font, run]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (i: number, p: Partial<Piece>) => setPieces((ps) => ps.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const move = (id: ActorId, p: Pt, dur: number, say?: string | null) =>
    // on the board, clear of the right edge so the name pill fits; off it, wherever
    setActors((a) => ({ ...a, [id]: { x: p.x > size.w ? p.x : Math.min(p.x, size.w - 120), y: p.y, dur, say: say === undefined ? a[id].say : say } }))
  const emote = (p: Pt, kind: Reaction) => {
    const id = performance.now() + Math.random()
    setEmotes((e) => [...e, { id, x: p.x, y: p.y, kind, dx: Math.round(Math.random() * 50 - 25) }])
    window.setTimeout(() => setEmotes((e) => e.filter((x) => x.id !== id)), 1700)
  }

  // start once the card is well into view; reset when it's scrolled far away
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (REDUCED) return
    let raf = 0
    let armed = true
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const r = root.current?.getBoundingClientRect()
      if (!r) return
      const vh = window.innerHeight
      if (armed && r.top < vh * 0.6 && r.bottom > vh * 0.3) {
        armed = false
        setPlaying(true)
      } else if (!armed && (r.top > vh * 1.2 || r.bottom < -vh * 0.2)) {
        armed = true
        settled.current = false
        setPlaying(false)
        setRing(0)
        setStamped(false)
        setEmotes([])
        setActors(offstage())
        setRun((k) => k + 1)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* ————— the build, then the room's life ————— */
  useEffect(() => {
    if (!playing || !size.w || !font || REDUCED) return
    let alive = true
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
    const grip = (i: number): Pt => {
      const p = piecesRef.current[i]
      const b = box(i)
      return { x: p.x + b.w * 0.55, y: p.y + b.h * 0.62 }
    }
    // walk to a line, select it, carry it to `to`, let go
    const carry = async (who: ActorId, i: number, to: Pt, say?: string | null) => {
      const p = piecesRef.current[i]
      if (!p || !alive) return
      const g = grip(i)
      move(who, g, 800, say)
      await sleep(860)
      if (!alive) return
      patch(i, { held: who })
      await sleep(220)
      patch(i, { x: to.x, y: to.y, r: 0, dur: 1000 })
      move(who, { x: to.x + g.x - p.x, y: to.y + g.y - p.y }, 1000)
      await sleep(1080)
      if (!alive) return
      patch(i, { held: null })
    }
    // select a line and type over it
    const retype = async () => {
      const rt = script.retype
      if (!rt || !alive) return
      const who = idOf(rt.who)
      // at the block's first line, where the edit is
      const first = () => { const p = piecesRef.current[rt.line]; return { x: p.x + box(rt.line).w * 0.45, y: p.y + font * 0.75 } }
      move(who, first(), 650, null)
      await sleep(700)
      // only what differs is retyped: the text both share at the end stays put
      const from = piecesRef.current[rt.line].text
      const to = script.lines[rt.line]
      let keep = 0
      while (keep < Math.min(from.length, to.length) && from[from.length - 1 - keep] === to[to.length - 1 - keep]) keep++
      const tail = from.slice(from.length - keep)
      let head = from.slice(0, from.length - keep)
      patch(rt.line, { held: who, caret: head.length })
      await sleep(450)
      while (head.length && alive) {
        head = head.slice(0, -1)
        patch(rt.line, { text: head + tail, caret: head.length })
        await sleep(40)
      }
      for (const ch of to.slice(0, to.length - keep)) {
        if (!alive) return
        head += ch
        patch(rt.line, { text: head + tail, caret: head.length })
        await sleep(ch === ' ' ? 70 : 55 + Math.random() * 50)
      }
      patch(rt.line, { caret: undefined })
      if (rt.say) move(who, first(), 300, rt.say)
      await sleep(900)
      patch(rt.line, { held: null })
      await sleep(900)
      move(who, { x: size.w * 0.2, y: size.h * 0.86 }, 1200, null)
    }
    // ring a line with a marker: the stroke draws in behind the cursor riding it
    const drawRing = async (who: ActorId, i: number) => {
      const p = piecesRef.current[i]
      const b = box(i)
      const loop = markerLoop(b.w, b.h)
      const at = (t: number) => {
        const q = loop.pts[Math.min(loop.pts.length - 1, Math.round(t * (loop.pts.length - 1)))]
        return { x: p.x - loop.pad + q.x, y: p.y - loop.pad + q.y }
      }
      move(who, at(0), 600, null)
      await sleep(650)
      const t0 = performance.now()
      await new Promise<void>((done) => {
        const step = (now: number) => {
          if (!alive) return done()
          const k = Math.min(1, (now - t0) / 1300)
          const t = 0.5 - Math.cos(Math.PI * k) / 2
          setRing(t)
          move(who, at(t), 0)
          if (k < 1) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      })
    }

    const build = async () => {
      await sleep(300)
      await Promise.all(CREW.map(async (c) => {
        await sleep(c.after)
        if (c.line < n) await carry(c.who, c.line, target(c.line), c.say)
      }))
      if (!alive) return
      settled.current = true
      // everyone steps back off the words, Claude clearing its status
      move('claude', { x: size.w * 0.66, y: size.h * 0.1 }, 1200, null)
      move('kasper', { x: size.w * 0.12, y: size.h * 0.84 }, 1200)
      move('mark', { x: size.w * 0.6, y: size.h * 0.88 }, 1200)
      await retype()
      if (!alive) return
      if (script.ring !== undefined) {
        const by = idOf(script.ringBy ?? 'Josh')
        await drawRing(by, script.ring)
        if (!alive) return
        emote({ x: actorsRef.current[by].x, y: actorsRef.current[by].y }, 'celebrate')
      }
      setStamped(true)
    }

    const life = async () => {
      let k = 0
      while (alive) {
        await sleep(2600)
        if (!alive) return
        const pick = k++ % 5
        const line = Math.floor(Math.random() * n)
        if (pick === 0) {
          // Claude tags along behind someone
          const who = HUMANS[Math.floor(Math.random() * HUMANS.length)]
          const p = { x: size.w * (0.15 + Math.random() * 0.55), y: size.h * (0.15 + Math.random() * 0.7) }
          move(who, p, 1400)
          move('claude', { x: p.x + 60, y: p.y + 54 }, 1900, `Following ${ACTORS.find((a) => a.id === who)!.name}`)
        } else if (pick === 1) {
          // someone nudges a line, then sets it back
          const who = HUMANS[Math.floor(Math.random() * HUMANS.length)]
          const t = target(line)
          await carry(who, line, { x: t.x + 16, y: t.y - 10 })
          await sleep(500)
          await carry(who, line, t)
        } else if (pick === 2) {
          // Claude reads along
          const t = target(line)
          move('claude', { x: t.x + box(line).w * 0.4, y: t.y + box(line).h + 6 }, 1500, ['Reading along', 'Drafting the signals', 'Sharing with the teams'][k % 3])
        } else if (pick === 3) {
          // a reaction floats up off a line
          const who = HUMANS[Math.floor(Math.random() * HUMANS.length)]
          const t = target(line)
          const at = { x: t.x + box(line).w * (0.3 + Math.random() * 0.5), y: t.y + box(line).h * 0.7 }
          move(who, at, 700)
          await sleep(700)
          emote({ x: at.x, y: at.y - 10 }, MOJIS[Math.floor(Math.random() * MOJIS.length)])
        } else {
          for (const who of [HUMANS[Math.floor(Math.random() * HUMANS.length)], 'claude' as ActorId]) {
            move(who, { x: size.w * (0.1 + Math.random() * 0.6), y: size.h * (0.1 + Math.random() * 0.8) }, 1600, who === 'claude' ? null : undefined)
          }
        }
      }
    }
    void build().then(() => life())
    return () => { alive = false }
  }, [playing, size.w, size.h, font, run]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ————— you can grab a line too ————— */
  const drag = useRef<{ i: number; ox: number; oy: number } | null>(null)
  const local = (e: React.PointerEvent) => {
    const r = root.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onDown = (i: number) => (e: React.PointerEvent) => {
    const p = local(e)
    const piece = piecesRef.current[i]
    drag.current = { i, ox: p.x - piece.x, oy: p.y - piece.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    patch(i, { held: 'you', dur: 0, r: 0 })
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = local(e)
    patch(d.i, { x: p.x - d.ox, y: p.y - d.oy })
  }
  const onUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    patch(d.i, { held: null })
    if (REDUCED) {
      patch(d.i, { ...target(d.i), dur: 600 })
      return
    }
    // Claude notices and tidies it back into the lock-up
    window.setTimeout(() => {
      const w = piecesRef.current[d.i]
      if (!w || w.held) return
      const b = box(d.i)
      const g = { x: w.x + b.w * 0.55, y: w.y + b.h * 0.62 }
      move('claude', g, 700, 'Tidying up')
      window.setTimeout(() => {
        const t = target(d.i)
        patch(d.i, { held: 'claude', x: t.x, y: t.y, r: 0, dur: 1000 })
        move('claude', { x: t.x + g.x - w.x, y: t.y + g.y - w.y }, 1000)
        window.setTimeout(() => {
          patch(d.i, { held: null })
          move('claude', { x: t.x + g.x - w.x + 30, y: t.y + g.y - w.y + 40 }, 900, null)
        }, 1080)
      }, 900)
    }, 1800)
  }

  const ringLine = script.ring
  const ringBox = ringLine !== undefined && pieceEls.current[ringLine] ? box(ringLine) : null
  const loop = ringBox ? markerLoop(ringBox.w, ringBox.h) : null

  return (
    <div className="mission">
    <div className="mission__clip" ref={root} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <p className="sr-only">{script.lines.join(' ')}</p>
      {/* the final lines, unseen: their widths set the lock-up */}
      <div className="mission__ghosts" aria-hidden>
        {script.lines.map((l, i) => <span key={i} ref={(el) => { ghosts.current[i] = el }} className={`mission__piece${serif[i] ? ' is-serif' : ''}`}>{l}</span>)}
      </div>
      {pieces.map((p, i) => (
        <div
          key={i}
          aria-hidden
          className="mission__at"
          onPointerDown={onDown(i)}
          style={{
            zIndex: p.held ? 4 : 2,
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`,
            transition: p.dur ? `transform ${p.dur}ms ${EASE}` : 'none',
          }}
        >
          <div ref={(el) => { pieceEls.current[i] = el }} className={`mission__piece${serif[i] ? ' is-serif' : ''}`}>
            {p.caret === undefined ? p.text : (
              <>{p.text.slice(0, p.caret)}<span className="mission__caret" style={{ background: INK[p.held ?? 'monika'] }} />{p.text.slice(p.caret)}</>
            )}
            {stamped && script.stamps?.[i] && (
              <span className="mission__stamps">
                {script.stamps[i].map((r, k) => (
                  <img key={k} src={REACTION_SRC[r]} alt="" style={{ '--r': `${(k % 2 ? 1 : -1) * (8 + k * 4)}deg`, animationDelay: `${300 + k * 140 + i * 200}ms` } as CSSProperties} />
                ))}
              </span>
            )}
            {i === ringLine && loop && ringBox && (
              <svg className="mission__ring" width={ringBox.w + loop.pad * 2} height={ringBox.h + loop.pad * 2} style={{ top: -loop.pad, left: -loop.pad }}>
                <path d={loop.d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} style={{ opacity: ring > 0 ? 1 : 0 }} />
              </svg>
            )}
            {p.held && (
              <span className="mission__sel" style={{ color: INK[p.held] }}><i /><i /><i /><i /></span>
            )}
          </div>
        </div>
      ))}
      {!REDUCED && ACTORS.map((a) => {
        const s = actors[a.id]
        return (
          <div key={a.id} aria-hidden className="mission__cursor" style={{ transform: `translate(${s.x}px, ${s.y}px)`, transition: s.dur ? `transform ${s.dur}ms ${EASE}` : 'none' }}>
            <ChatCursor name={a.name} hue={a.hue} say={s.say} />
          </div>
        )
      })}
      {emotes.map((m) => (
        <span key={m.id} aria-hidden className="mission__emote-at" style={{ left: m.x, top: m.y, ['--dx' as string]: `${m.dx}px` }}>
          <img className="mission__emote" src={REACTION_SRC[m.kind]} alt="" />
        </span>
      ))}
    </div>
    {/* the team's stickers spill over the card's edges: drawn on the pinned layer above
        the board (the storyboard's board clips what's inside it), or here without one */}
    {stamped && (() => {
      const team = (
        <div className="mission__team" aria-hidden>
          {TEAM.map((t, i) => (
            <img key={i} src={t.src} alt="" draggable={false} style={{ ...t.style, '--r': `${t.r}deg`, animationDelay: `${400 + [0, 70, 30, 100, 50][i % 5]}ms` } as CSSProperties} />
          ))}
        </div>
      )
      const pin = root.current?.closest('.storyboard__pin')
      return pin ? createPortal(team, pin) : team
    })()}
    </div>
  )
}
