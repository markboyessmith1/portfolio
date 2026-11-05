import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import ChatCursor, { type ChatHue } from './miro/ChatCursor'
import { FloatingEmote, REACTION_SRC, type Reaction } from './miro/Reactions'
import { markerLoop } from './miro/markerLoop'

/* The Miro case study's opening panel (ported from the c26 prototype's
   HeroBoard header): the headline's words are text objects on a dot-grid
   board. Collaborators' cursors pick them up (selection reticule in their
   colour) and set them into a stepped lock-up, Ana circles "Miro." with a
   marker, the room stamps reactions on the words, then keeps nudging them
   about. Grab any word yourself and Claude tidies it back after a moment.
   Reduced motion: everything starts in place, no cursors. */

type Pt = { x: number; y: number }
type ActorId = 'ana' | 'ben' | 'claude'
type Holder = ActorId | 'you'
type Actor = { x: number; y: number; dur: number; say: string | null }
type Word = {
  id: string
  text: string
  /** the essence paragraph: one movable block under the headline */
  block?: boolean
  /** set in the display sans instead of Apris */
  sans?: boolean
  x: number
  y: number
  r: number
  /** scale: the essence starts small and grows into place */
  s: number
  dur: number
  heldBy: Holder | null
}

const ESSENCE = 'Everything changed. Except why we get together. We make that part matter.'
// "No place like Miro." (ids are layout slots: feels · like / again · miro)
const WORDS: Pick<Word, 'id' | 'text' | 'block' | 'sans'>[] = [
  { id: 'feels', text: 'No' },
  { id: 'like', text: 'place', sans: true },
  { id: 'again', text: 'like' },
  { id: 'miro', text: 'Miro.', sans: true },
  { id: 'essence', text: ESSENCE, block: true },
]
const HEAD = WORDS.filter((w) => !w.block).map((w) => w.id)
// where the words lie before they're set: pushed out to the edges
const SCATTER: Record<string, Pt & { r: number }> = {
  feels: { x: 0.55, y: 0.7, r: -7 },
  like: { x: 0.04, y: 0.62, r: 6 },
  miro: { x: 0.3, y: 0.3, r: 5 },
  again: { x: 0.58, y: 0.06, r: -4 },
}
const ESSENCE_START_SCALE = 0.45
// reactions the room leaves on the words, stamped on each word's corner
const WORD_REACTIONS: Record<string, Reaction[]> = {
  miro: ['fire', 'fire', 'love'],
  like: ['celebrate'],
  feels: ['mindblown'],
  essence: ['like', 'fire'],
}

const ACTORS: { id: ActorId; name: string; hue: ChatHue }[] = [
  { id: 'ana', name: 'Ana', hue: 'coral' },
  { id: 'ben', name: 'Ben', hue: 'cyan' },
  { id: 'claude', name: 'Claude', hue: 'claude' },
]
// reticule colours: the cursor rims, and Miro's selection blue for you
const HOLDER_COLOR: Record<Holder, string> = {
  ana: 'var(--miro-coral-cursor-border)',
  ben: 'var(--miro-cyan-cursor-border)',
  claude: '#D97757',
  you: '#4262FF',
}

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'


export default function CaseBoard() {
  const stageRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [words, setWords] = useState<Word[]>([])
  const wordsRef = useRef(words)
  wordsRef.current = words
  const [actors, setActors] = useState<Record<ActorId, Actor>>({
    ana: { x: -80, y: 120, dur: 0, say: null },
    ben: { x: -80, y: 400, dur: 0, say: null },
    claude: { x: -80, y: 260, dur: 0, say: null },
  })
  const actorsRef = useRef(actors)
  actorsRef.current = actors
  const sizeRef = useRef(size)
  sizeRef.current = size
  const [emotes, setEmotes] = useState<{ id: number; x: number; y: number; e: Reaction; dx: number }[]>([])
  // stickers arrive once the headline is set
  const [stickers, setStickers] = useState(REDUCED)
  // Ana's marker loop around "Miro.": 0 = not drawn, 1 = complete
  const [circle, setCircle] = useState(REDUCED ? 1 : 0)
  const circlePath = useRef<SVGPathElement>(null)
  // the "Miro." box, tracked so the loop is drawn at its real size
  const [miroBox, setMiroBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = wordRefs.current.miro
    if (!el) return
    const ro = new ResizeObserver(() => setMiroBox({ w: el.offsetWidth, h: el.offsetHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [words.length])
  const loop = miroBox.w ? markerLoop(miroBox.w, miroBox.h) : null

  // Headline size: as large as the board allows. The lock-up is ~4.3 words
  // wide and ~3.7 lines tall, and the essence needs room underneath.
  const fontPx = useRef(0)
  const gutter = Math.max(24, size.w * 0.08)
  useLayoutEffect(() => {
    if (!size.w || !stageRef.current) return
    const byWidth = (size.w - gutter * 2) / 4.3
    const byHeight = (size.h * 0.55) / 3.7
    fontPx.current = Math.round(Math.max(40, Math.min(byWidth, byHeight)))
    stageRef.current.style.setProperty('--board-word', `${fontPx.current}px`)
  }, [size, gutter])

  const measure = (id: string) => {
    const el = wordRefs.current[id]
    const fs = fontPx.current || 100
    const text = WORDS.find((w) => w.id === id)!.text
    return { w: el?.offsetWidth || text.length * fs * 0.52, h: el?.offsetHeight || fs * 1.05 }
  }
  // the lock-up: "place" starts where "No" ends, "like" tucks under "No",
  // "Miro." hangs under "place", lines almost touching
  const target = useCallback(
    (id: string): Pt => {
      const F = measure('feels')
      const L = measure('like')
      const A = measure('again')
      const x0 = gutter
      const y0 = size.h * 0.08
      const pos: Record<string, Pt> = {
        feels: { x: x0, y: y0 },
        like: { x: x0 + F.w * 0.97, y: y0 + F.h * 0.8 },
        again: { x: x0 + F.w * 0.26, y: y0 + F.h * 0.8 + L.h * 0.8 },
        miro: { x: x0 + F.w * 0.97, y: y0 + F.h * 0.8 + L.h * 0.8 + A.h * 0.86 },
      }
      const E = measure('essence')
      pos.essence = { x: x0, y: Math.min(pos.miro.y + measure('miro').h + 32, size.h - E.h - gutter) }
      return pos[id]
    },
    // measure() reads live refs; the layout only changes with the board
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size, gutter],
  )
  const patchWord = (id: string, patch: Partial<Word>) => setWords((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  const layoutAll = (dur: number) => setWords((ws) => ws.map((w) => (w.heldBy === 'you' ? w : { ...w, ...target(w.id), r: 0, s: 1, dur })))
  // cursors keep clear of the right edge so their name pill fits
  const moveActor = (id: ActorId, p: Pt, dur: number, say?: string | null) =>
    setActors((a) => ({ ...a, [id]: { x: Math.min(p.x, sizeRef.current.w - 120), y: p.y, dur, say: say === undefined ? a[id].say : say } }))
  // where a cursor takes hold of a word
  const grip = (w: Word): Pt => {
    const el = wordRefs.current[w.id]
    return { x: w.x + (el?.offsetWidth ?? 200) * 0.55 * w.s, y: w.y + (el?.offsetHeight ?? 120) * 0.6 * w.s }
  }
  const emote = (p: Pt, e: Reaction) => {
    const id = Math.random()
    setEmotes((es) => [...es, { id, x: p.x, y: p.y, e, dx: Math.round(Math.random() * 60 - 30) }])
    window.setTimeout(() => setEmotes((es) => es.filter((x) => x.id !== id)), 1700)
  }

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // first measure: scatter the words (or set them, when reduced); after
  // that, a resize re-sets the lock-up
  const settled = useRef(false)
  useEffect(() => {
    if (!size.w) return
    setWords((prev) =>
      WORDS.map((w) => {
        const old = prev.find((p) => p.id === w.id)
        if (old) return settled.current ? { ...old, ...target(w.id), r: 0, s: 1, dur: 0 } : old
        if (REDUCED) return { ...w, ...target(w.id), r: 0, s: 1, dur: 0, heldBy: null }
        if (w.block) return { ...w, ...target(w.id), r: 0, s: ESSENCE_START_SCALE, dur: 0, heldBy: null }
        const sc = SCATTER[w.id]
        return { ...w, x: sc.x * size.w, y: sc.y * size.h, r: sc.r, s: 1, dur: 0, heldBy: null }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  /* ————— choreography ————— */
  // Widths are only true once Apris has loaded, so wait for fonts first.
  useEffect(() => {
    if (!size.w) return
    let alive = true
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
    const find = (id: string) => wordsRef.current.find((x) => x.id === id)

    // an actor walks to a word, selects it, carries it to `to`, lets go
    const carry = async (actor: ActorId, id: string, to: Pt, say?: string | null) => {
      const w = find(id)
      if (!w || !alive || w.heldBy) return
      const g = grip(w)
      moveActor(actor, g, 700, say)
      await sleep(760)
      if (!alive || find(id)?.heldBy) return
      patchWord(id, { heldBy: actor })
      await sleep(220)
      patchWord(id, { ...to, r: 0, s: 1, dur: 1000 })
      moveActor(actor, { x: to.x + g.x - w.x, y: to.y + g.y - w.y }, 1000)
      await sleep(1080)
      if (alive) patchWord(id, { heldBy: null })
    }
    // an actor grabs a block's bottom-right corner and drags it out to full size
    const resize = async (actor: ActorId, id: string) => {
      const w = find(id)
      const el = wordRefs.current[id]
      if (!w || !el || !alive) return
      moveActor(actor, { x: w.x + el.offsetWidth * w.s, y: w.y + el.offsetHeight * w.s }, 700)
      await sleep(760)
      if (!alive) return
      patchWord(id, { heldBy: actor })
      await sleep(220)
      patchWord(id, { s: 1, dur: 1100 })
      moveActor(actor, { x: w.x + el.offsetWidth, y: w.y + el.offsetHeight }, 1100)
      await sleep(1180)
      if (alive) patchWord(id, { heldBy: null })
    }
    // an actor circles "Miro." with a marker: the stroke draws in behind the
    // cursor, which rides the path point by point
    const drawCircle = async (actor: ActorId) => {
      const path = circlePath.current
      const stage = stageRef.current
      if (!path || !stage || !alive) return
      const len = path.getTotalLength()
      const at = (t: number): Pt => {
        const pt = path.getPointAtLength(len * t)
        const m = path.getScreenCTM()
        const b = stage.getBoundingClientRect()
        if (!m) return { x: 0, y: 0 }
        const q = new DOMPoint(pt.x, pt.y).matrixTransform(m)
        return { x: q.x - b.left, y: q.y - b.top }
      }
      moveActor(actor, at(0), 600)
      await sleep(650)
      const dur = 1300
      const t0 = performance.now()
      await new Promise<void>((done) => {
        const step = (now: number) => {
          if (!alive) return done()
          const k = Math.min(1, (now - t0) / dur)
          // near-constant pen speed, softened at the ends
          const t = 0.5 - Math.cos(Math.PI * k) / 2
          setCircle(t)
          moveActor(actor, at(t), 0)
          if (k < 1) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      })
    }

    const intro = async () => {
      patchWord('essence', { ...target('essence'), dur: 0 })
      await sleep(1200) // let the card's spin land first
      await Promise.all([
        (async () => {
          await carry('ana', 'feels', target('feels'))
          await carry('ana', 'again', target('again'))
        })(),
        (async () => {
          await sleep(300)
          await carry('claude', 'miro', target('miro'), 'Setting the headline')
        })(),
        (async () => {
          await sleep(500)
          await carry('ben', 'like', target('like'))
          await resize('ben', 'essence')
        })(),
      ])
      if (!alive) return
      settled.current = true
      setStickers(true)
      layoutAll(600)
      moveActor('claude', { x: sizeRef.current.w * 0.62, y: sizeRef.current.h * 0.82 }, 1200, null)
      await sleep(900)
      await drawCircle('ana')
      if (alive) emote(actorsRef.current.ana, 'celebrate')
    }

    // then the room keeps nudging words about and setting them back
    const idle = async () => {
      let n = 0
      while (alive) {
        await sleep(2400)
        if (!alive) return
        const { w: W, h: H } = sizeRef.current
        const wander = (): Pt => ({ x: W * (0.2 + Math.random() * 0.6), y: H * (0.2 + Math.random() * 0.65) })
        const pick = n++ % 6
        if (pick === 0 || pick === 2) {
          const id = HEAD[Math.floor(Math.random() * HEAD.length)]
          const who: ActorId = pick === 0 ? 'ana' : 'ben'
          const t = target(id)
          await carry(who, id, { x: t.x + 14 + Math.random() * 30, y: t.y - 10 - Math.random() * 24 })
          await sleep(600)
          await carry(who, id, target(id))
        } else if (pick === 1) {
          const t = target('essence')
          await carry('ana', 'essence', { x: t.x + 18, y: t.y - 12 })
          await sleep(500)
          await carry('ana', 'essence', target('essence'))
        } else if (pick === 3) {
          const p = wander()
          moveActor('ben', p, 1400)
          moveActor('claude', { x: p.x + 60, y: p.y + 50 }, 1900, 'Following Ben')
        } else if (pick === 4) {
          // someone sends a reaction floating up
          const who: ActorId = Math.random() < 0.5 ? 'ana' : 'ben'
          emote(actorsRef.current[who], (['love', 'fire', 'celebrate'] as const)[n % 3])
        } else {
          moveActor('claude', wander(), 1600, ['Reading the room…', 'Drafting next steps', null][n % 3])
        }
      }
    }

    void document.fonts?.ready.then(() => {
      if (!alive) return
      if (settled.current || REDUCED) {
        settled.current = true
        layoutAll(0)
        if (REDUCED) return
      }
      void (settled.current ? idle() : intro().then(idle))
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w > 0])

  /* ————— grab a word ————— */
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null)
  const tidy = useRef<Record<string, number>>({})
  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    const b = stageRef.current!.getBoundingClientRect()
    const w = wordsRef.current.find((x) => x.id === id)!
    drag.current = { id, ox: e.clientX - b.left - w.x, oy: e.clientY - b.top - w.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    window.clearTimeout(tidy.current[id])
    patchWord(id, { heldBy: 'you', dur: 0, r: 0, s: 1 })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const b = stageRef.current!.getBoundingClientRect()
    patchWord(d.id, { x: e.clientX - b.left - d.ox, y: e.clientY - b.top - d.oy })
  }
  const onPointerUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    patchWord(d.id, { heldBy: null })
    if (REDUCED) return
    // Claude notices and tidies the word back into the headline
    tidy.current[d.id] = window.setTimeout(() => {
      const w = wordsRef.current.find((x) => x.id === d.id)
      if (!w || w.heldBy) return
      const g = grip(w)
      moveActor('claude', g, 700, 'Tidying up')
      tidy.current[d.id] = window.setTimeout(() => {
        if (wordsRef.current.find((x) => x.id === d.id)?.heldBy) return
        const t = target(d.id)
        patchWord(d.id, { heldBy: 'claude', ...t, dur: 1000 })
        moveActor('claude', { x: t.x + g.x - w.x, y: t.y + g.y - w.y }, 1000)
        tidy.current[d.id] = window.setTimeout(() => {
          patchWord(d.id, { heldBy: null })
          moveActor('claude', { x: t.x + g.x - w.x, y: t.y + g.y - w.y }, 0, null)
        }, 1080)
      }, 900)
    }, 1800)
  }
  useEffect(() => () => Object.values(tidy.current).forEach(clearTimeout), [])

  return (
    <div className="board" ref={stageRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <h2 className="visually-hidden">No place like Miro.</h2>
      <p className="visually-hidden">{ESSENCE}</p>
      {words.map((w) => (
        <div
          key={w.id}
          aria-hidden
          className="board__pos"
          onPointerDown={onPointerDown(w.id)}
          style={{
            zIndex: w.heldBy ? 4 : 2,
            transform: `translate(${w.x}px, ${w.y}px) rotate(${w.r}deg) scale(${w.s})`,
            transition: w.dur ? `transform ${w.dur}ms ${EASE}` : 'none',
          }}
        >
          <div
            ref={(el) => {
              wordRefs.current[w.id] = el
            }}
            className={`board__word${w.block ? ' is-block' : ''}${w.sans ? ' is-sans' : ''}`}
          >
            {w.text}
            {stickers && WORD_REACTIONS[w.id] && (
              <span className="board__stickers">
                {WORD_REACTIONS[w.id].map((r, k) => (
                  <img
                    key={k}
                    src={REACTION_SRC[r]}
                    alt=""
                    style={{ '--r': `${(k % 2 ? 1 : -1) * (8 + k * 4)}deg`, animationDelay: `${300 + k * 140 + HEAD.concat('essence').indexOf(w.id) * 260}ms` } as CSSProperties}
                  />
                ))}
              </span>
            )}
            {w.heldBy && (
              <div className="board__reticule" style={{ color: HOLDER_COLOR[w.heldBy] }}>
                <i />
                <i />
                <i />
                <i />
              </div>
            )}
            {w.id === 'miro' && loop && (
              // lives inside the word, so it follows nudges and drags
              <svg
                className="board__loop"
                width={miroBox.w + loop.pad * 2}
                height={miroBox.h + loop.pad * 2}
                viewBox={`0 0 ${miroBox.w + loop.pad * 2} ${miroBox.h + loop.pad * 2}`}
                style={{ top: -loop.pad, left: -loop.pad }}
              >
                <path ref={circlePath} d={loop.d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circle} style={{ opacity: circle > 0 ? 1 : 0 }} />
              </svg>
            )}
          </div>
        </div>
      ))}
      {!REDUCED &&
        ACTORS.map(({ id, name, hue }) => {
          const a = actors[id]
          return (
            <div
              key={id}
              aria-hidden
              className="board__actor"
              style={{ transform: `translate(${a.x}px, ${a.y}px)`, transition: a.dur ? `transform ${a.dur}ms ${EASE}` : 'none' }}
            >
              <ChatCursor name={name} hue={hue} say={a.say} />
            </div>
          )
        })}
      {emotes.map((m) => (
        <FloatingEmote key={m.id} kind={m.e} dx={m.dx} style={{ position: 'absolute', zIndex: 6, left: m.x, top: m.y }} />
      ))}
    </div>
  )
}
