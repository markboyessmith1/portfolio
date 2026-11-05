import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ChatCursor, { type ChatHue } from './miro/ChatCursor'
import { REACTION_SRC, type Reaction } from './miro/Reactions'

/* One sentence, centred across the case study, finished live by the room
   once it scrolls into view (after the c26 prototype's StatementReveal). It
   starts largely written; then it plays like a real session, in time rather
   than scroll: each step is someone either typing onto the end (people with
   a human rhythm, the agent fast and even) or selecting a word anywhere and
   typing over it, then commenting on it in cursor chat (the last comment
   stays up). The writer's cursor
   rides a caret in their colour; everyone else is busy, one reading along
   beside the caret, another hopping between words and dropping reactions.
   Scrolled well away, it resets and plays again next time. An invisible copy
   of the final sentence holds the block's size. Reduced motion: the final
   sentence, still. Styles: .statement* in styles.css. */

/** `say`: their cursor-chat comment, after the edit lands */
export type StatementStep =
  | { who: string; say?: string; append: string }
  | { who: string; say?: string; replace: string; with: string }
export type StatementScript = {
  /** already on the page when it comes into view */
  start: string
  /** who wrote the starting text */
  by: string
  steps: StatementStep[]
}

const HUES: ChatHue[] = ['coral', 'cyan', 'lilac', 'moss', 'orange']
const MOJIS: Reaction[] = ['love', 'fire', 'like', 'celebrate', 'mindblown']
const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
/** A writer with this name types like an agent: fast and even. */
const AGENT = 'Sidekick'

type State = { text: string; caret: number | null; sel: [number, number] | null; writer: string; says: Record<string, string | null> }
type Op =
  | { t: 'writer'; who: string; caret: number }
  | { t: 'type'; ch: string }
  | { t: 'sel'; from: number; to: number }
  | { t: 'cut' }
  | { t: 'say'; who: string; text: string | null }
  | { t: 'wait' }
type Timed = Op & { ms: number }
type Pt = { x: number; y: number }
type Moji = { id: number; x: number; y: number; kind: Reaction; dx: number; r: number }

/** Delay before each character: people type with rhythm, the agent evenly. */
const charMs = (who: string, ch: string) =>
  who === AGENT ? 28 : ch === ',' || ch === '.' ? 260 : ch === ' ' ? 70 : 60 + Math.random() * 60

/** The script as a timeline of small operations, each with its delay. */
function timeline(script: StatementScript): Timed[] {
  const ops: Timed[] = []
  const push = (op: Op, ms: number) => ops.push({ ...op, ms })
  let text = script.start
  script.steps.forEach((step, n) => {
    const at = 'append' in step ? text.length : text.indexOf(step.replace)
    if (at < 0) return
    push({ t: 'writer', who: step.who, caret: 'append' in step ? at : at + step.replace.length }, 700)
    let typed: string
    if ('append' in step) {
      typed = step.append
    } else {
      // drag a selection back across the word, hold it, cut it
      const end = at + step.replace.length
      for (let k = end - 1; k >= at; k--) push({ t: 'sel', from: k, to: end }, 60)
      push({ t: 'cut' }, 450)
      text = text.slice(0, at) + text.slice(end)
      typed = step.with
    }
    ;[...typed].forEach((ch, i) => push({ t: 'type', ch }, i === 0 ? 250 : charMs(step.who, ch)))
    text = 'append' in step ? text + typed : text.slice(0, at) + typed + text.slice(at)
    // the comment follows the edit; the last one stays up
    if (step.say) {
      push({ t: 'say', who: step.who, text: step.say }, 400)
      if (n < script.steps.length - 1) {
        push({ t: 'wait' }, 1600)
        push({ t: 'say', who: step.who, text: null }, 0)
      }
    }
  })
  return ops
}

function apply(s: State, op: Op): State {
  switch (op.t) {
    case 'writer': return { ...s, writer: op.who, caret: op.caret, sel: null }
    case 'type': {
      const c = s.caret ?? s.text.length
      return { ...s, text: s.text.slice(0, c) + op.ch + s.text.slice(c), caret: c + op.ch.length }
    }
    case 'sel': return { ...s, sel: [op.from, op.to], caret: null }
    case 'cut': {
      if (!s.sel) return s
      const [a, b] = s.sel
      return { ...s, text: s.text.slice(0, a) + s.text.slice(b), caret: a, sel: null }
    }
    case 'say': return { ...s, says: { ...s.says, [op.who]: op.text } }
    case 'wait': return s
  }
}

export default function StatementReveal({ script }: { script: StatementScript }) {
  const box = useRef<HTMLDivElement>(null)
  const live = useRef<HTMLSpanElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)
  const ops = useMemo(() => timeline(script), [script])
  const people = useMemo(() => [...new Set([script.by, ...script.steps.map((s) => s.who)])], [script])
  const hueOf = (who: string) => HUES[people.indexOf(who) % HUES.length]
  const ink = (who: string) => `var(--miro-${hueOf(who)}-cursor-border)`
  const blank = (): State => ({ text: script.start, caret: null, sel: null, writer: script.by, says: {} })
  const sentence = useMemo(() => ops.reduce(apply, blank()).text, [ops]) // eslint-disable-line react-hooks/exhaustive-deps
  const closer = script.steps[script.steps.length - 1]?.who ?? script.by

  const [state, setState] = useState<State>(REDUCED ? { ...blank(), text: sentence } : blank)
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(REDUCED)
  const [pos, setPos] = useState<Record<string, Pt>>({})
  const [mojis, setMojis] = useState<Moji[]>([])

  // start once the sentence is well into view; reset when it's scrolled far away
  useEffect(() => {
    if (REDUCED) return
    let raf = 0
    let armed = true
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = box.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      if (armed && r.top < vh * 0.6 && r.bottom > vh * 0.3) {
        armed = false
        setPlaying(true)
      } else if (!armed && (r.top > vh * 1.2 || r.bottom < -vh * 0.2)) {
        armed = true
        setPlaying(false)
        setDone(false)
        setState(blank())
        setPos({})
        setMojis([])
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // play the timeline
  useEffect(() => {
    if (!playing) return
    let i = 0
    let timer = 0
    const next = () => {
      if (i >= ops.length) {
        timer = window.setTimeout(() => setDone(true), 500)
        return
      }
      const op = ops[i++]
      timer = window.setTimeout(() => {
        setState((s) => apply(s, op))
        next()
      }, op.ms)
    }
    next()
    return () => window.clearTimeout(timer)
  }, [playing, ops])

  /** The box-relative position just after character `index` of the live text. */
  const pointAt = (index: number): (Pt & { h: number }) | null => {
    const root = live.current
    const b = box.current
    if (!root || !b || index < 1) return null
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let left = index
    let node = walker.nextNode() as Text | null
    while (node && left > node.length) {
      left -= node.length
      node = walker.nextNode() as Text | null
    }
    if (!node) return null
    const range = document.createRange()
    range.setStart(node, left - 1)
    range.setEnd(node, left)
    const r = range.getBoundingClientRect()
    const br = b.getBoundingClientRect()
    return { x: r.right - br.left, y: r.top - br.top, h: r.height }
  }

  // the writer rides the caret (or the selection's start); a watcher reads beside it
  useLayoutEffect(() => {
    const b = box.current
    if (!b || REDUCED || !playing) return
    const br = b.getBoundingClientRect()
    let at: Pt | null = null
    if (state.sel) {
      const p = pointAt(Math.max(1, state.sel[0]))
      if (p) at = { x: p.x + 4, y: p.y + p.h * 0.72 }
    } else if (caretRef.current) {
      const cr = caretRef.current.getBoundingClientRect()
      at = { x: cr.left - br.left + 6, y: cr.top - br.top + cr.height * 0.72 }
    }
    if (!at) return
    const here = at
    setPos((p) => {
      const nextPos = { ...p, [state.writer]: here }
      const watcher = people.find((x) => x !== state.writer)
      if (watcher && !done) nextPos[watcher] = { x: here.x - 90, y: here.y + 54 }
      return nextPos
    })
  }, [state, done, playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // whoever isn't writing or watching hops between words and reacts
  // (once it's done, everyone but the closer joins in)
  useEffect(() => {
    if (!playing || REDUCED) return
    const id = window.setInterval(() => {
      const len = live.current?.textContent?.length ?? 0
      if (len < 8) return
      const idle = people.filter((x) => x !== state.writer)
      const reactors = done ? people.filter((x) => x !== closer) : idle.slice(1)
      const who = reactors[Math.floor(Math.random() * reactors.length)]
      const p = who && pointAt(3 + Math.floor(Math.random() * (len - 4)))
      if (!who || !p) return
      setPos((q) => ({ ...q, [who]: { x: p.x + 2, y: p.y + p.h * 0.8 } }))
      const moji: Moji = {
        id: performance.now(),
        x: p.x,
        y: p.y - 6,
        kind: MOJIS[Math.floor(Math.random() * MOJIS.length)],
        dx: Math.round(Math.random() * 50 - 25),
        r: Math.round(Math.random() * 30 - 15),
      }
      // the sticker lands once the cursor has arrived
      window.setTimeout(() => {
        setMojis((m) => [...m, moji])
        window.setTimeout(() => setMojis((m) => m.filter((x) => x.id !== moji.id)), 1600)
      }, 450)
    }, done ? 900 : 1500)
    return () => window.clearInterval(id)
  }, [playing, done, state.writer]) // eslint-disable-line react-hooks/exhaustive-deps

  // the live text, split at the caret or around the selection
  const t = state.text
  const showCaret = !REDUCED && playing && !done && !state.sel && state.caret != null
  const pieces = state.sel ? (
    <>
      {t.slice(0, state.sel[0])}
      <span className="statement__sel" style={{ ['--who' as string]: ink(state.writer) }}>{t.slice(state.sel[0], state.sel[1])}</span>
      {t.slice(state.sel[1])}
    </>
  ) : showCaret ? (
    <>
      {t.slice(0, state.caret!)}
      <span ref={caretRef} className="statement__caret" style={{ background: ink(state.writer) }} />
      {t.slice(state.caret!)}
    </>
  ) : t

  // before it starts, the cursors wait around the edges
  const w = box.current?.offsetWidth ?? 800
  const h = box.current?.offsetHeight ?? 300
  const parked = (i: number): Pt => [{ x: w * 0.9, y: -50 }, { x: w * 0.08, y: h + 40 }, { x: w * 0.78, y: h + 70 }][i % 3]

  return (
    <div className="statement">
      {/* a div, not a p: the cursors inside it are block content */}
      <div className="statement__text" ref={box}>
        <span className="sr-only">{sentence}</span>
        <span className="statement__ghost" aria-hidden>{sentence}</span>
        <span className="statement__live" aria-hidden ref={live}>{pieces}</span>
        {mojis.map((m) => (
          <span key={m.id} aria-hidden className="statement__moji-at" style={{ left: m.x, top: m.y, ['--dx' as string]: `${m.dx}px`, ['--r' as string]: `${m.r}deg` }}>
            <img className="statement__moji" src={REACTION_SRC[m.kind]} alt="" />
          </span>
        ))}
        {!REDUCED && people.map((p, i) => {
          const at = pos[p] ?? parked(i)
          const say = state.says[p] ?? null
          return (
            <span key={p} aria-hidden className={`statement__cursor${p === state.writer && playing && !done ? ' is-writing' : ''}`} style={{ transform: `translate(${at.x}px, ${at.y}px)` }}>
              <ChatCursor name={p} hue={hueOf(p)} say={say} />
            </span>
          )
        })}
      </div>
    </div>
  )
}
