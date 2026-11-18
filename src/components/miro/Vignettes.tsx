import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import BoardChrome from './BoardChrome'
import ChatCursor, { type ChatHue } from './ChatCursor'
import { StickerStack } from './Reactions'
import type { StickyHue } from './StickyNote'
import './palette.css'
import { AI_STACK, type Section, type StackItem } from './aiStack'

/* Little looping board scenes for case-study panels, built from the miro
   pieces (cursors, stickies, reactions) on a dot-grid board. Each one is a
   short script of beats: `useBeat` steps through them and loops. Reduced
   motion: the last beat, held still. Decorative: the case copy tells the story. */

export type VignetteKey = 'prompt' | 'together' | 'catchup' | 'plan' | 'voice' | 'sort' | 'point' | 'investments' | 'spec' | 'decisions' | 'stack'

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Current beat of a looping script; `beats` are each beat's length in ms. */
function useBeat(beats: number[]) {
  const [beat, setBeat] = useState(REDUCED ? beats.length - 1 : 0)
  useEffect(() => {
    if (REDUCED) return
    const t = window.setTimeout(() => setBeat((b) => (b + 1) % beats.length), beats[beat])
    return () => window.clearTimeout(t)
  }, [beat]) // eslint-disable-line react-hooks/exhaustive-deps
  return beat
}

/** Like useBeat, but holds on the finished board a while before it loops (story boards). */
const ONCE_HOLD_MS = 3200
function useOnce(beats: number[]) {
  const [beat, setBeat] = useState(REDUCED ? beats.length : 0)
  useEffect(() => {
    if (REDUCED) return
    const t = beat >= beats.length
      ? window.setTimeout(() => setBeat(0), ONCE_HOLD_MS)
      : window.setTimeout(() => setBeat((b) => b + 1), beats[beat])
    return () => window.clearTimeout(t)
  }, [beat]) // eslint-disable-line react-hooks/exhaustive-deps
  return beat
}

/** Text typed in once `on`, after a short pause (the sticky lands first). */
function Typed({ text, on, delay = 260, ms = 30 }: { text: string; on: boolean; delay?: number; ms?: number }) {
  const [n, setN] = useState(REDUCED ? text.length : 0)
  useEffect(() => {
    if (REDUCED) return
    if (!on) return setN(0) // a looping board clears, to type it in again
    let i = 0, iv = 0
    const t = window.setTimeout(() => {
      iv = window.setInterval(() => { i++; setN(i); if (i >= text.length) window.clearInterval(iv) }, ms)
    }, delay)
    return () => { window.clearTimeout(t); window.clearInterval(iv) }
  }, [on]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{text.slice(0, n)}</>
}

/** A cursor parked at a % spot on the board; moving it glides. */
function At({ x, y, name, hue, say, glide }: { x: number; y: number; name: string; hue: ChatHue; say: string | null; /** its own `transition`, if not the usual glide */ glide?: string }) {
  return (
    <div className="vg__at" style={{ left: `${x}%`, top: `${y}%`, ...(glide ? { transition: glide } : {}) }}>
      <ChatCursor name={name} hue={hue} say={say} charMs={32} />
    </div>
  )
}

/** A small sticky that pops on when `on`. */
function Note({ x, y, hue, on, r = 0, d = 0, w = 13, children }: { x: number; y: number; hue: StickyHue; on: boolean; r?: number; d?: number; w?: number; children?: ReactNode }) {
  const style = {
    left: `${x}%`, top: `${y}%`, width: `${w}%`,
    background: `var(--miro-${hue}-sticky-background)`,
    color: hue === 'coal' ? 'var(--miro-sticky-text-on-dark)' : 'var(--miro-sticky-text)',
    '--r': `${r}deg`, transitionDelay: on ? `${d}ms` : '0ms',
  } as CSSProperties
  return <div className={`vg__note${on ? ' is-on' : ''}`} style={style}>{children}</div>
}

function Board({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`vignette board ${className}`} aria-hidden>{children}</div>
}

/* ---- prompt: type an idea, Sidekick builds it from stickies ---- */

// Mona Lisa, eight stickies wide. e = eyes (they get sunglasses).
const LISA = ['mmmssmmm', 'mmsoosmm', 'msoeeosm', 'msoooosm', 'mmsoosmm', 'mcccccmm', 'cccccccc']
const LISA_HUE: Record<string, StickyHue> = { m: 'moss', s: 'coal', o: 'orange', e: 'orange', c: 'coal' }
const PROMPTS = ['make the Mona Lisa out of sticky notes', 'give her sunglasses']

function Prompt() {
  // type, build, type, shades, hold
  const beat = useBeat([2600, 2800, 2000, 2600, 1800])
  const built = beat >= 1
  const shades = beat >= 3
  const draft = PROMPTS[beat >= 2 ? 1 : 0]
  const typing = beat === 0 || beat === 2
  return (
    <Board className="vg--prompt">
      <div className="vg__mosaic">
        {LISA.flatMap((row, y) => [...row].map((c, x) => {
          const hue: StickyHue = c === 'e' && shades ? 'coal' : LISA_HUE[c]
          return <i key={`${x}-${y}`} className={built ? 'is-on' : ''} style={{ background: `var(--miro-${hue}-sticky-background)`, transitionDelay: built && !shades ? `${(x + y) * 45}ms` : '0ms' }} />
        }))}
      </div>
      <At x={built ? 66 : 50} y={built ? (shades ? 30 : 58) : 70} name="Sidekick" hue="lilac" say={beat === 1 ? 'Placing 56 stickies…' : beat === 3 ? 'Much cooler 😎' : null} />
      <div className="vg__prompt">
        <span className={typing ? 'is-typing' : ''} key={draft}>{beat === 1 || beat === 3 || beat === 4 ? 'Ask Sidekick anything' : draft}</span>
      </div>
    </Board>
  )
}

/* ---- together: people and agents on one board ---- */

function Together() {
  const beat = useBeat([1600, 2400, 2400, 2600, 2000])
  return (
    <Board className="vg--together">
      <div className="vg__frame" style={{ left: '8%', top: '12%', width: '46%', height: '70%' }}><b>Service map</b></div>
      <Note x={12} y={22} hue="sunshine" on={beat >= 1} r={-3}>Checkout</Note>
      <Note x={33} y={22} hue="sunshine" on={beat >= 1} r={2} d={140}>Payments</Note>
      <Note x={12} y={50} hue="cyan" on={beat >= 2} r={1}>Auth</Note>
      <Note x={33} y={50} hue="cyan" on={beat >= 2} r={-2} d={140}>Orders</Note>
      <Note x={70} y={30} hue="pink" on={beat >= 3} r={4} w={16}>Do we need retries here?</Note>
      <At x={beat >= 1 ? 30 : 46} y={beat >= 1 ? 40 : 20} name="Sidekick" hue="lilac" say={beat === 1 ? 'Mapping the services' : null} />
      <At x={beat >= 2 ? 52 : 70} y={beat >= 2 ? 66 : 80} name="Claude" hue="claude" say={beat === 2 ? 'Adding auth and orders' : null} />
      <At x={beat >= 3 ? 84 : 90} y={beat >= 3 ? 52 : 12} name="Ana" hue="coral" say={beat === 4 ? 'Love it 🔥' : null} />
    </Board>
  )
}

/* ---- investments: the five bets, written onto the board one by one (holds, then loops) ---- */

const BETS: { x: number; y: number; hue: StickyHue; r: number; text: string }[] = [
  { x: 11, y: 24, hue: 'sunshine', r: -2, text: 'Engine and infrastructure' },
  { x: 39, y: 24, hue: 'cyan', r: 1.5, text: 'Context and tooling' },
  { x: 67, y: 24, hue: 'pink', r: -1, text: 'New interaction paradigms' },
  { x: 25, y: 54, hue: 'moss', r: 2, text: 'Trust and audit' },
  { x: 53, y: 54, hue: 'orange', r: -1.5, text: 'Strip out complexity' },
]

function Investments() {
  // frame, then a sticky every beat, then a reaction
  const beat = useOnce([700, 1500, 1400, 1500, 1300, 1400, 600])
  const at = Math.min(Math.max(beat - 1, 0), BETS.length - 1)
  const writing = beat >= 1 && beat <= BETS.length
  return (
    <Board className="vg--investments">
      <div className={`vg__frame vg__frame--fade${beat >= 0 ? ' is-on' : ''}`} style={{ left: '7%', top: '15%', width: '86%', height: '67%' }}><b>Five investments</b></div>
      {BETS.map((b, i) => (
        <Note key={b.text} x={b.x} y={b.y} hue={b.hue} r={b.r} w={22} on={beat > i}>
          <Typed text={b.text} on={beat > i} />
        </Note>
      ))}
      <At x={BETS[at].x + 16} y={BETS[at].y + 18} name="Sidekick" hue="lilac" say={writing ? (beat === 1 ? 'Writing up the plan' : null) : null} />
      <At x={beat > BETS.length ? 14 : 4} y={beat > BETS.length ? 74 : 92} name="Ana" hue="coral" say={beat > BETS.length ? 'Five it is 🙌' : null} />
    </Board>
  )
}

/* ---- spec: the vision prototype up top, spec sheets written out beneath it,
   one branched off for a complex flow, then engineering picks them up (holds, then loops) ---- */

const SPECS = [
  { x: 9, title: 'Entry points' },
  { x: 38, title: 'Prompt planning', branch: true },
  { x: 67, title: 'Agent states' },
]

function Spec() {
  // frame, prototype, three specs, the branch, the engineer
  const beat = useOnce([500, 1500, 1100, 1100, 1300, 1600, 600])
  const proto = beat >= 1
  const at = Math.min(Math.max(beat - 2, 0), SPECS.length - 1)
  return (
    <Board className="vg--spec">
      <div className={`vg__frame vg__frame--fade${beat >= 0 ? ' is-on' : ''}`} style={{ left: '7%', top: '9%', width: '86%', height: '38%' }}>
        <b>Vision prototype</b>
        <div className={`vg__proto${proto ? ' is-on' : ''}`}>
          <div className="vg__proto-bar"><i /><i /><i /></div>
          <div className="vg__proto-canvas">
            {['sunshine', 'cyan', 'pink', 'moss', 'sunshine', 'orange'].map((h, i) => (
              <i key={i} style={{ background: `var(--miro-${h}-sticky-background)`, transitionDelay: proto ? `${200 + i * 70}ms` : '0ms' }} />
            ))}
          </div>
          <div className="vg__proto-side"><i /><i /><i /><span /></div>
        </div>
      </div>
      <svg className="vg__links" viewBox="0 0 100 100" preserveAspectRatio="none">
        {SPECS.map((s, i) => (
          <path key={s.title} className={beat >= i + 2 ? 'is-on' : ''} d={`M50 47 C50 53 ${s.x + 12} 51 ${s.x + 12} 58`} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {SPECS.map((s, i) => (
        <div key={s.title} className={`vg__spec${beat >= i + 2 ? ' is-on' : ''}`} style={{ left: `${s.x}%` }}>
          <b><Typed text={s.title} on={beat >= i + 2} delay={180} ms={28} /></b>
          <span className="vg__spec-shot" />
          <i style={{ width: '92%' }} /><i style={{ width: '74%' }} /><i style={{ width: '84%' }} /><i style={{ width: '58%' }} />
          {s.branch && <em className={beat >= 5 ? 'is-on' : ''}>Branch ↗</em>}
        </div>
      ))}
      {/* Ana writes each spec, then settles on the branched one; Ben arrives under the last */}
      <At x={beat >= 5 ? 58 : beat >= 2 ? SPECS[at].x + 16 : 64} y={beat >= 5 ? 50 : beat >= 2 ? 72 : 32} name="Ana" hue="coral" say={beat === 1 ? 'Vision’s up to date' : beat === 2 ? 'Speccing it out' : beat === 5 ? 'Branching planning off' : null} />
      <At x={beat >= 6 ? 56 : 96} y={beat >= 6 ? 84 : 104} name="Ben" hue="cyan" say={beat >= 6 ? 'Exactly what I needed 🙌' : null} />
    </Board>
  )
}

/* ---- catchup: back from a break, Sidekick sums up ---- */

function Catchup() {
  const beat = useBeat([1400, 3600, 2200])
  const themes: [StickyHue, string][] = [['lime', 'Onboarding is slow'], ['ocean', 'Pricing confuses'], ['pink', 'Love the templates']]
  return (
    <Board className="vg--catchup">
      {themes.map(([h, t], i) => (
        <Note key={t} x={10 + i * 28} y={30} hue={h} on={beat >= 1} d={i * 160} r={[-3, 2, -1][i]} w={18}>
          {t}
          {beat >= 2 && i === 2 && <StickerStack size={30} items={[{ id: 0, kind: 'love', r: -8 }, { id: 1, kind: 'fire', r: 10 }]} />}
        </Note>
      ))}
      <At x={beat >= 1 ? 18 : 40} y={beat >= 1 ? 66 : 80} name="Sidekick" hue="lilac" say={beat >= 1 ? 'Welcome back! 3 themes came up while you were away' : null} />
    </Board>
  )
}

/* ---- plan: a thought becomes a plan, the plan becomes work ---- */

function Plan() {
  const beat = useBeat([1600, 2200, 2600, 2000])
  const rows = ['Research', 'Design', 'Build', 'Launch']
  return (
    <Board className="vg--plan">
      <Note x={8} y={16} hue="sunshine" on r={-4} w={24}>Launch a paid tier by Q3</Note>
      <div className={`vg__card${beat >= 1 ? ' is-on' : ''}`}>
        <b>Plan · 12 weeks</b>
        {rows.map((r, i) => (
          <span key={r} className={beat >= 2 ? 'is-done' : ''} style={{ transitionDelay: beat >= 2 ? `${i * 180}ms` : '0ms' }}>
            <i />{r}
          </span>
        ))}
      </div>
      <At x={beat >= 1 ? 36 : 30} y={beat >= 1 ? 76 : 44} name="Sidekick" hue="lilac" say={beat === 1 ? 'Here’s a plan. Run it?' : beat === 2 ? 'Making work items' : null} />
      <At x={beat >= 3 ? 82 : 92} y={beat >= 3 ? 70 : 90} name="Ben" hue="cyan" say={beat === 3 ? 'Ship it' : null} />
    </Board>
  )
}

/* ---- voice: talk to the board ---- */

function Voice() {
  const beat = useBeat([1800, 2600, 2200])
  return (
    <Board className="vg--voice">
      <Note x={20} y={20} hue="coral" on={beat >= 1} r={-2} w={20}>Ideas</Note>
      <Note x={44} y={22} hue="lime" on={beat >= 1} r={3} d={160} w={20}>Risks</Note>
      <Note x={68} y={18} hue="ocean" on={beat >= 1} r={-1} d={320} w={20}>Next steps</Note>
      <At x={40} y={52} name="You" hue="sunshine" say={beat === 0 ? 'Set up a retro with three columns' : null} />
      <div className={`vg__voice${beat === 0 ? ' is-live' : ''}`}>
        {Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 90}ms` }} />)}
      </div>
    </Board>
  )
}

/* ---- sort: write a sticky, it finds its own frame ---- */

function Sort() {
  const beat = useBeat([1600, 1400, 1800])
  const placed = beat >= 1
  return (
    <Board className="vg--sort">
      <div className="vg__frame" style={{ left: '6%', top: '14%', width: '40%', height: '58%' }}><b>Customers</b></div>
      <div className="vg__frame" style={{ left: '54%', top: '14%', width: '40%', height: '58%' }}><b>Team</b></div>
      <Note x={12} y={26} hue="sunshine" on r={-2} w={14}>Faster export</Note>
      <Note x={60} y={26} hue="sunshine" on r={2} w={14}>Fewer meetings</Note>
      <div className="vg__fly" style={{ left: placed ? '28%' : '42%', top: placed ? '44%' : '80%', transform: `rotate(${placed ? 3 : -6}deg)` }}>
        <Note x={0} y={0} hue="sunshine" on w={100}>Dark mode please</Note>
      </div>
      <span className={`vg__ms${beat >= 1 ? ' is-on' : ''}`}>sorted in 380 ms</span>
    </Board>
  )
}

/* ---- point: "here" and "this" mean what you're pointing at ---- */

function Point() {
  const beat = useBeat([1800, 2200, 2200])
  return (
    <Board className="vg--point">
      <Note x={18} y={28} hue={beat >= 2 ? 'ocean' : 'sunshine'} on r={-3} w={18}>Make this blue</Note>
      {[0, 1, 2, 3, 4].map((i) => <Note key={i} x={52 + (i % 3) * 13} y={22 + Math.floor(i / 3) * 22} hue="lilac" on={beat >= 1} d={i * 90} r={(i % 2 ? 3 : -3)} w={11} />)}
      <At x={beat === 0 ? 28 : 62} y={beat === 0 ? 40 : 46} name="You" hue="coral" say={beat === 0 ? 'Make this blue' : beat === 1 ? 'Add five stickies here' : null} />
    </Board>
  )
}

/** Not built from the miro pieces: the C26 Fall prototype's live "Big decisions, made
 *  together" scene (the prototype lands, people and agents gather, the board fills in),
 *  a self-contained page built by scripts/prototype-scenes/build.ts, under the new
 *  board chrome. The page's mouse position is passed in (a `scene-pointer` message,
 *  -1…1 across the viewport), so the scene drifts with the pointer anywhere on the page. */
function Decisions() {
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (REDUCED) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => frame.current?.contentWindow?.postMessage(
        { type: 'scene-pointer', x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 },
        window.location.origin,
      ))
    }
    window.addEventListener('mousemove', onMove)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove) }
  }, [])
  // the homepage's Miro AI film plays first; on its last frame the scene (loaded and held
  // on its first frame, `#hold`) is told to start and the film fades off it. Once per visit;
  // the scene loops on its own after that. Reduced motion: straight to the scene.
  const [intro, setIntro] = useState(!REDUCED)
  const [loaded, setLoaded] = useState(false)
  const film = useRef<HTMLVideoElement>(null)
  const start = () => {
    frame.current?.contentWindow?.postMessage({ type: 'scene-start' }, window.location.origin)
    setIntro(false)
  }
  // a reduced-motion visit, or the film failing: start the scene once it's loaded
  useEffect(() => { if (loaded && !intro) start() }, [loaded, intro])
  return (
    <div className={`vg vg--embed vg--intro${intro ? ' is-intro' : ''}`}>
      <iframe ref={frame} src="/media/ai/decisions.html#hold" onLoad={() => setLoaded(true)} title="A prototype lands on the board and the team, people and agents, gathers round it as the board fills in" />
      <BoardChrome />
      <video
        ref={film} className="vg__film" src="/media/quick17.mp4" muted playsInline autoPlay preload="auto" aria-hidden
        onEnded={start} onError={() => setIntro(false)}
      />
    </div>
  )
}

/* ---- stack: the team assembles Fig. 2 (the productecture) on the board, box for box as
   the figure has it (components/miro/aiStack.ts, generated from its SVG). The four cursors
   work at once: each fetches its sections from off the board and drags them in on a
   curve, from all sides, inside about five seconds, the piece held in Miro's selection
   frame while it moves. Then each draws its own arrows as marker strokes that wobble
   like a hand drew them, and Ana adds a couple of pen notes. Holds, then loops. ---- */

type Who = 'Sidekick' | 'Claude' | 'Ana' | 'Ben'
const WHO_HUE: Record<Who, ChatHue> = { Sidekick: 'lilac', Claude: 'claude', Ana: 'coral', Ben: 'cyan' }
type Placed = Exclude<Section, 'arrow'>
/** who drags it, from which way (a direction off the board), and its edge colour */
const SECTIONS: { sec: Placed; who: Who; from: [number, number]; edge: string }[] = [
  { sec: 'first', who: 'Sidekick', from: [-0.55, -1], edge: 'var(--miro-lilac-600)' },
  { sec: 'gateway', who: 'Sidekick', from: [-1, 0.5], edge: 'var(--miro-blue-450)' },
  { sec: 'third', who: 'Claude', from: [0.8, -1], edge: 'var(--miro-orange-600)' },
  { sec: 'context', who: 'Ana', from: [1, 0.35], edge: 'var(--miro-moss-600)' },
  { sec: 'behaviour', who: 'Ana', from: [-1, -0.3], edge: 'var(--miro-sunshine-600)' },
  { sec: 'trust', who: 'Ana', from: [1, 0.85], edge: 'var(--miro-pink-600)' },
  { sec: 'tools', who: 'Ben', from: [-0.45, 1], edge: 'var(--miro-cyan-600)' },
  { sec: 'apis', who: 'Ben', from: [0.7, 1], edge: 'var(--miro-cloud-500)' },
]
const EDGE = Object.fromEntries(SECTIONS.map((s) => [s.sec, s.edge])) as Record<Placed, string>
// centred on the main diagram (186–716 across, so x = 451), as if the Model gateway tag
// weren't there: it and the margin note hang out to the left (the svg doesn't clip)
const VB = { x: 451 - 380, y: 18, w: 760, h: 758 }
const OFF = 820 // how far off the board a section waits
// timings (ms). A cursor starts a section every CYCLE; the four start staggered
const FETCH = 520, DRAG = 1250, CYCLE = 1850, HOLD_SEL = 280
const START_AT: Record<Who, number> = { Ana: 150, Sidekick: 450, Claude: 800, Ben: 1100 }
const REACH = 340, DRAW = 460, ARROW_GAP = 120
// a drag moves its two axes on different curves, so the path bends; which axis leads
// alternates, so the pieces swing in from different angles
const EASE = ['cubic-bezier(0.25, 0.8, 0.25, 1)', 'cubic-bezier(0.6, 0.05, 0.35, 1)']
const glideOf = (ms: number, lead: number) => `left ${ms}ms ${EASE[lead]}, top ${ms}ms ${EASE[1 - lead]}`
const ARROWS = AI_STACK.filter((it): it is Extract<StackItem, { t: 'a' }> => it.t === 'a')
// who draws each arrow, in the figure's order: the first-party joins, the gateway, MCP,
// first party down, MCP down, the layers, then the tools to the APIs
const DRAWER: Who[] = ['Sidekick', 'Sidekick', 'Sidekick', 'Sidekick', 'Claude', 'Sidekick', 'Claude', 'Ana', 'Ana', 'Ana', 'Ben', 'Ben']
type Box = { x: number; y: number; w: number; h: number }
// each section's outline (all its boxes), for the selection frame and the grab point
const BOX = Object.fromEntries(SECTIONS.map(({ sec }) => {
  const rs = AI_STACK.filter((it): it is Extract<StackItem, { t: 'r' }> => it.t === 'r' && it.sec === sec)
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y))
  return [sec, { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y }]
})) as Record<Placed, Box>
const grabOf = (sec: Placed): [number, number] => { const b = BOX[sec]; return [b.x + b.w * 0.58, b.y + Math.min(14, b.h * 0.3)] }
const OFFSTAGE: Record<Who, [number, number]> = { Sidekick: [160, -140], Claude: [860, 90], Ana: [900, 520], Ben: [320, 920] }

// the script, worked out once: when each section is grabbed and lands, when each arrow
// draws, and every cursor's moves (time, where, how it glides)
type Move = [number, number[], string]
const SCRIPT = (() => {
  const grab: Record<string, number> = {}
  const moves: Record<Who, Move[]> = { Sidekick: [], Claude: [], Ana: [], Ben: [] }
  const busy: Record<Who, number> = { ...START_AT }
  SECTIONS.forEach(({ sec, who, from }, i) => {
    const t = busy[who], g = grabOf(sec), lead = i % 2
    moves[who].push([t, [g[0] + from[0] * OFF, g[1] + from[1] * OFF], `left ${FETCH}ms ease-in-out, top ${FETCH}ms ease-in-out`])
    grab[sec] = t + FETCH + 60
    moves[who].push([grab[sec], g, glideOf(DRAG, lead)])
    busy[who] = t + CYCLE
  })
  const placedBy = Math.max(...Object.values(grab)) + DRAG + HOLD_SEL
  // arrows: each cursor draws its own, one after another, all four at once
  const drawAt: number[] = []
  const pen: Record<Who, number> = { Sidekick: placedBy, Claude: placedBy + 150, Ana: placedBy + 300, Ben: placedBy + 450 }
  ARROWS.forEach((a, i) => {
    const who = DRAWER[i]!
    moves[who].push([pen[who], a.from, `left ${REACH}ms ease-in-out, top ${REACH}ms ease-in-out`])
    drawAt[i] = pen[who] + REACH + 40
    moves[who].push([drawAt[i], a.to, `left ${DRAW}ms cubic-bezier(0.32, 0.72, 0, 1), top ${DRAW}ms cubic-bezier(0.32, 0.72, 0, 1)`])
    pen[who] = drawAt[i] + DRAW + ARROW_GAP
  })
  const notes = Math.max(...Object.values(pen)) + 200
  // then everyone steps back off the labels to look, Ana to her note
  const back = 'left 900ms ease-in-out, top 900ms ease-in-out'
  moves.Ana.push([notes, [64, 560], back])
  moves.Sidekick.push([notes, [110, 170], back])
  moves.Claude.push([notes, [690, 312], back])
  moves.Ben.push([notes, [680, 762], back])
  return { grab, moves, drawAt, notes, end: notes + 4400 }
})()

/** ms since the script began, looping; reduced motion: the end, held */
function useScriptClock(end: number) {
  const [t, setT] = useState(REDUCED ? end : 0)
  useEffect(() => {
    if (REDUCED) return
    const t0 = performance.now()
    const id = window.setInterval(() => setT((performance.now() - t0) % end), 40)
    return () => window.clearInterval(id)
  }, [end])
  return t
}

/** Miro's selection frame round a piece being moved: a blue outline with round corner
 *  handles and side bars to stretch it by. In figure px. */
function Selection({ b }: { b: Box }) {
  const p = 5, x = b.x - p, y = b.y - p, w = b.w + p * 2, h = b.h + p * 2
  return (
    <g className="vg__sel">
      <rect x={x} y={y} width={w} height={h} rx={2} />
      {[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={4.5} />)}
      <rect className="vg__sel-bar" x={x + w / 2 - 9} y={y - 2.5} width={18} height={5} rx={2.5} />
      <rect className="vg__sel-bar" x={x + w / 2 - 9} y={y + h - 2.5} width={18} height={5} rx={2.5} />
      {h > 40 && <rect className="vg__sel-bar" x={x - 2.5} y={y + h / 2 - 9} width={5} height={18} rx={2.5} />}
      {h > 40 && <rect className="vg__sel-bar" x={x + w - 2.5} y={y + h / 2 - 9} width={5} height={18} rx={2.5} />}
    </g>
  )
}

/** A marker arrow from a to b (figure px): bowed a touch, overshooting slightly, with
 *  an open two-stroke head at the end (and the start, if `both`). Deterministic. */
function sketch(a: number[], b: number[], seed: number, both = false) {
  const [x1, y1] = a, [x2, y2] = b
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const bow = (seed % 2 ? 1 : -1) * Math.min(6, len * 0.08)
  const cx = x1 + dx * 0.5 + nx * bow, cy = y1 + dy * 0.5 + ny * bow
  const ex = x2 + (dx / len) * 1.5, ey = y2 + (dy / len) * 1.5
  const head = (tx: number, ty: number, fx: number, fy: number) => {
    const ang = Math.atan2(ty - fy, tx - fx), k = 8
    return ` M${tx - Math.cos(ang - 0.55) * k} ${ty - Math.sin(ang - 0.55) * k} L${tx} ${ty} L${tx - Math.cos(ang + 0.45) * k * 1.12} ${ty - Math.sin(ang + 0.45) * k * 1.12}`
  }
  // a double-headed arrow gets its start head first, so the pen begins where it lands
  return (both ? head(x1, y1, cx, cy).replace(' M', 'M') + ' M' : 'M') + `${x1 + nx * 0.8} ${y1 + ny * 0.8} Q${cx} ${cy} ${ex} ${ey}` + head(x2, y2, cx, cy)
}

function Stack() {
  const t = useScriptClock(SCRIPT.end)
  // figure px → % of the figure's box, for the cursors
  const P = ([x, y]: number[]) => ({ x: ((x! - VB.x) / VB.w) * 100, y: ((y! - VB.y) / VB.h) * 100 })
  const cursor = (who: Who) => {
    const m = [...SCRIPT.moves[who]].reverse().find(([at]) => at <= t)
    return { at: P(m ? m[1] : OFFSTAGE[who]), glide: m ? m[2] : 'none' }
  }
  const notes = t >= SCRIPT.notes
  const g = SCRIPT.grab
  const say: Record<Who, string | null> = {
    Sidekick: t >= g.first! && t < g.first! + 1500 ? 'Bringing in the first party' : null,
    Claude: t >= g.third! && t < g.third! + 1500 ? 'And here’s how I get in' : null,
    Ana: t >= g.context! && t < g.context! + 1500 ? 'Shared layers underneath' : notes && t < SCRIPT.notes + 2600 ? 'Same core for both 👌' : null,
    Ben: t >= g.tools! && t < g.tools! + 1500 ? 'Tools on the board APIs' : null,
  }
  return (
    <Board className="vg--stack">
      <div className="vg__fig" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
        <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} aria-hidden>
          {SECTIONS.map(({ sec, from }, i) => {
            const moving = t >= g[sec]!
            const lead = i % 2
            const dur = moving ? `${DRAG}ms` : '0ms'
            return (
              // two groups, one per axis, each on its own curve (as the cursor's left/top)
              <g key={sec} style={{ transform: moving ? 'none' : `translateX(${from[0] * OFF}px)`, transition: `transform ${dur} ${EASE[lead]}` }}>
                <g style={{ transform: moving ? 'none' : `translateY(${from[1] * OFF}px)`, transition: `transform ${dur} ${EASE[1 - lead]}` }}>
                  {AI_STACK.filter((it) => it.sec === sec).map((it, j) => it.t === 'r'
                    ? <rect key={j} x={it.x} y={it.y} width={it.w} height={it.h} rx={it.rx} strokeDasharray={it.dash ? '3 3' : undefined} style={{ stroke: EDGE[sec] }} />
                    : it.t === 't' && (
                      <text key={j} x={it.x} y={it.y} fontSize={it.s} fontWeight={it.fw} textAnchor="middle">
                        {it.lines.map(([dy, l], k) => <tspan key={k} x={it.x} dy={dy}>{l}</tspan>)}
                      </text>
                    ))}
                  {moving && t < g[sec]! + DRAG + HOLD_SEL && <Selection b={BOX[sec]} />}
                </g>
              </g>
            )
          })}
          {ARROWS.map((a, i) => {
            const on = t >= SCRIPT.drawAt[i]!
            return <path key={i} className={`vg__fig-ink${on ? ' is-on' : ''}`} pathLength={1} d={sketch(a.from, a.to, i, a.both)} style={{ transitionDuration: on ? `${DRAW}ms` : '0ms' }} />
          })}
          {/* pen notes in the margins */}
          <path className={`vg__fig-ink vg__fig-ink--pen${notes ? ' is-on' : ''}`} pathLength={1} d="M178 310 C170 330 174 420 170 478 C168 484 162 486 156 487 C162 489 168 492 169 500 C173 560 168 640 177 662" />
          <text className={`vg__fig-pen${notes ? ' is-on' : ''}`} x={150} y={487} textAnchor="middle" transform="rotate(-90 150 487)">one foundation</text>
          <text className={`vg__fig-pen vg__fig-pen--red${notes ? ' is-on' : ''}`} x={466} y={42} textAnchor="middle" transform="rotate(-2 466 42)">two ways in</text>
        </svg>
        {(Object.keys(WHO_HUE) as Who[]).map((who) => {
          const c = cursor(who)
          return <At key={who} x={c.at.x} y={c.at.y} name={who} hue={WHO_HUE[who]} say={say[who]} glide={c.glide} />
        })}
      </div>
    </Board>
  )
}

const VIGNETTES: Record<VignetteKey, () => ReactNode> = { prompt: Prompt, together: Together, catchup: Catchup, plan: Plan, voice: Voice, sort: Sort, point: Point, investments: Investments, spec: Spec, decisions: Decisions, stack: Stack }

export default function Vignette({ k }: { k: VignetteKey }) {
  const V = VIGNETTES[k]
  return <V />
}
