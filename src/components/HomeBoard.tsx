import { useEffect, useRef, useState } from 'react'
import ChatCursor, { type ChatHue } from './miro/ChatCursor'
import { addSticker, board, MAX_STICKERS, stickerCount, useStickers } from '../board'
import { FloatingEmote, StickerStack, type Reaction } from './miro/Reactions'

/* The home page as a live board (ported from the c26 prototype's HeroBoard):
   collaborators' cursors wander the page, stamp Miro reaction stickers on the
   first portfolio piece and send reactions floating up, and the backdrop's dot grid
   stirs wherever a cursor (yours included) moves. Reduced motion: no cursors,
   the stickers are simply there. */

type ActorId = 'ana' | 'ben' | 'claude'
type Actor = { x: number; y: number; dur: number; say: string | null }
type Pt = { x: number; y: number }

const ACTORS: { id: ActorId; name: string; hue: ChatHue }[] = [
  { id: 'ana', name: 'Ana', hue: 'coral' },
  { id: 'ben', name: 'Ben', hue: 'cyan' },
  { id: 'claude', name: 'Claude', hue: 'claude' },
]
// what the room stamps on the first portfolio piece, in order
const STAMPS: Reaction[] = ['fire', 'love', 'celebrate']
const CLAUDE_LINES = ['Reading the room…', 'Drafting next steps', 'Pulling the case studies together']

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** The sticker target: reactions overlap on the card's corner like real stickers. */
export function Stickers() {
  return <StickerStack items={useStickers()} />
}

export default function HomeBoard() {
  const [actors, setActors] = useState<Record<ActorId, Actor>>({
    ana: { x: -80, y: 200, dur: 0, say: null },
    ben: { x: -80, y: 480, dur: 0, say: null },
    claude: { x: -80, y: 340, dur: 0, say: null },
  })
  const [away, setAway] = useState(false)
  const [emotes, setEmotes] = useState<{ id: number; x: number; y: number; e: Reaction; dx: number }[]>([])
  const actorEls = useRef<Partial<Record<ActorId, HTMLDivElement | null>>>({})
  const actorsRef = useRef(actors)
  actorsRef.current = actors

  // the backdrop fades its dots in while the board is up
  useEffect(() => {
    board.active = true
    if (REDUCED) for (const k of STAMPS) addSticker(k)
    return () => {
      board.active = false
      board.points.fill(0)
    }
  }, [])

  // Feed the dot shader: strength follows speed, so a still cursor leaves a
  // faint halo and a moving one stirs the grid, easing back when it stops.
  useEffect(() => {
    if (REDUCED) return
    const you = { x: 0, y: 0, inside: false }
    const onMove = (e: PointerEvent) => Object.assign(you, { x: e.clientX, y: e.clientY, inside: true })
    const onLeave = () => (you.inside = false)
    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('pointerleave', onLeave)
    const last = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, s: 0, seen: false }))
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const W = window.innerWidth
      const H = window.innerHeight
      for (let i = 0; i < 4; i++) {
        let x = you.x
        let y = you.y
        let present = you.inside
        if (i < 3) {
          const r = actorEls.current[ACTORS[i].id]?.getBoundingClientRect()
          x = r?.left ?? 0
          y = r?.top ?? 0
          present = !!r && x > -40 && x < W + 40
        }
        const l = last[i]
        const speed = l.seen ? Math.hypot(x - l.x, y - l.y) : 0
        const target = present ? 0.22 + Math.min(0.78, speed / 7) : 0
        l.s += (target - l.s) * (target > l.s ? 0.25 : 0.06)
        Object.assign(l, { x, y, seen: present })
        board.points.set([x / W, 1 - y / H, l.s, 0], i * 4)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  /* ---- choreography */
  useEffect(() => {
    if (REDUCED) return
    let alive = true
    const timers: number[] = []
    const sleep = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)))
    // keep the name pill on screen
    const move = (id: ActorId, p: Pt | null, dur: number, say?: string | null) =>
      p && setActors((a) => ({
        ...a,
        [id]: { ...a[id], x: Math.max(8, Math.min(p.x, window.innerWidth - 230)), y: Math.max(80, Math.min(p.y, window.innerHeight - 60)), dur, say: say === undefined ? a[id].say : say },
      }))
    const say = (id: ActorId, text: string | null) => setActors((a) => ({ ...a, [id]: { ...a[id], say: text } }))
    const emote = (p: Pt, e: Reaction) => {
      const id = Math.random()
      setEmotes((es) => [...es, { id, x: p.x, y: p.y, e, dx: Math.round(Math.random() * 60 - 30) }])
      timers.push(window.setTimeout(() => setEmotes((es) => es.filter((x) => x.id !== id)), 1700))
    }
    // the room only works on the first two portfolio pieces: somewhere inside
    // one of them, measured live so it follows scroll. null when neither is on
    // screen, and the cursor stays put.
    const cards = () =>
      [...document.querySelectorAll('.carousel__track .carousel__item')].slice(0, 2)
        .map((el) => el.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r && r.bottom > 120 && r.top < window.innerHeight - 120)
    const wander = (): Pt | null => {
      const rs = cards()
      if (!rs.length) return null
      const r = rs[Math.floor(Math.random() * rs.length)]
      return { x: r.left + r.width * (0.12 + Math.random() * 0.6), y: Math.max(r.top, 80) + (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 80)) * (0.15 + Math.random() * 0.65) }
    }

    // walk to the first portfolio piece's sticker corner and stamp the next reaction
    const stamp = async (id: ActorId) => {
      const n = stickerCount()
      const el = document.querySelector('.carousel__track .stickers')
      if (n >= MAX_STICKERS || !el) return
      const r = el.getBoundingClientRect()
      move(id, { x: r.right - 24 - n * 26, y: r.top + 18 }, 700)
      await sleep(760)
      if (alive) addSticker(STAMPS[n])
    }

    const run = async () => {
      // everyone drifts in
      move('ana', wander(), 1400)
      await sleep(300)
      move('claude', wander(), 1600, 'Joining the board')
      await sleep(300)
      move('ben', wander(), 1500)
      await sleep(1600)
      say('claude', null)
      await stamp('ana')
      let n = 0
      while (alive) {
        await sleep(2600)
        if (!alive || document.hidden) continue
        const pick = n++ % 5
        if (pick === 0) {
          // Claude tags along behind Ben
          const p = wander()
          move('ben', p, 1400)
          move('claude', p && { x: p.x + 70, y: p.y + 60 }, 1900, 'Following Ben')
        } else if (pick === 1) {
          if (stickerCount() < MAX_STICKERS) await stamp(Math.random() < 0.5 ? 'ben' : 'ana')
          else move('ana', wander(), 1400)
        } else if (pick === 2) {
          const p = wander()
          if (p) move('claude', p, 1600, CLAUDE_LINES[n % CLAUDE_LINES.length])
        } else if (pick === 3) {
          const who = Math.random() < 0.5 ? 'ana' : 'ben'
          const p = wander()
          if (!p) continue
          move(who, p, 1200)
          await sleep(1300)
          if (alive) emote(actorsRef.current[who], (['celebrate', 'love', 'fire', 'wave'] as const)[n % 4])
        } else {
          say('claude', null)
          move('ben', wander(), 1500)
          move('ana', wander(), 1700)
        }
      }
    }
    // with both cards scrolled away, the room steps out instead of hovering over other content
    const check = () => setAway(!cards().length)
    window.addEventListener('scroll', check, { passive: true })
    void run()
    return () => {
      window.removeEventListener('scroll', check)
      alive = false
      timers.forEach(window.clearTimeout)
    }
  }, [])

  if (REDUCED) return null
  return (
    <div className={`home-board${away ? ' is-away' : ''}`} aria-hidden>
      {ACTORS.map(({ id, name, hue }) => {
        const a = actors[id]
        return (
          <div
            key={id}
            ref={(el) => {
              actorEls.current[id] = el
            }}
            className="home-board__cursor"
            style={{ transform: `translate(${a.x}px, ${a.y}px)`, transition: a.dur ? `transform ${a.dur}ms ${EASE}` : 'none' }}
          >
            <ChatCursor name={name} hue={hue} say={a.say} />
          </div>
        )
      })}
      {emotes.map((m) => (
        <FloatingEmote key={m.id} kind={m.e} dx={m.dx} style={{ position: 'absolute', left: m.x, top: m.y }} />
      ))}
    </div>
  )
}
