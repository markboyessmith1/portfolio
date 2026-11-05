import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import ChatCursor, { type ChatHue } from './ChatCursor'
import { StickerStack } from './Reactions'
import type { StickyHue } from './StickyNote'
import './palette.css'

/* Little looping board scenes for case-study panels, built from the miro
   pieces (cursors, stickies, reactions) on a dot-grid board. Each one is a
   short script of beats: `useBeat` steps through them and loops. Reduced
   motion: the last beat, held still. Decorative: the case copy tells the story. */

export type VignetteKey = 'prompt' | 'together' | 'catchup' | 'plan' | 'voice' | 'sort' | 'point'

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

/** A cursor parked at a % spot on the board; moving it glides. */
function At({ x, y, name, hue, say }: { x: number; y: number; name: string; hue: ChatHue; say: string | null }) {
  return (
    <div className="vg__at" style={{ left: `${x}%`, top: `${y}%` }}>
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

const VIGNETTES: Record<VignetteKey, () => ReactNode> = { prompt: Prompt, together: Together, catchup: Catchup, plan: Plan, voice: Voice, sort: Sort, point: Point }

export default function Vignette({ k }: { k: VignetteKey }) {
  const V = VIGNETTES[k]
  return <V />
}
