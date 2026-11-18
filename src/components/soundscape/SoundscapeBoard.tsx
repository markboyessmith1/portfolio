import { useEffect, useRef, useState, type ReactNode } from 'react'
import { REACTION_SRC } from '../miro/Reactions'
import { ACTOR_COLOR, CURSOR } from './palette'
import { HumanCursor, SidekickCursor } from './cursors'
import { IconChevronDown, IconSpeakerCross, IconSpeakerHigh } from './icons'
import { LivingTexture } from './LivingTexture'
import { sharedSoundscapeAudio, type ActionKind, type ScaleName, type SoundscapeAudio } from './audio'
import { createSoundBed, type BedStatus, type BedStyle, type SoundBed } from './bed'
import {
  MEDIA_TITLES, ObjectView, REACTION_POOL, SHAPE_LABELS, STICKER_POOL, STICKY_COLORS, STICKY_PX,
  STICKY_TEXTS, TEXT_TEXTS, type BoardObject, type ReactionKind,
} from './objects'
import { createStage, rand, type Gait, type Roamer, type Stage } from './roam'
import { docTop, scrollToY } from './scroll'

/* Soundscape — a board you can hear. The board pins to the viewport while
   the page scrolls through a session arc: a Lo-fi start (one-shot
   creation sounds only), down into the Lullaby bed as the room warms up, a
   crescendo of collaboration midway, then the Lo-fi bed as the work tapers
   off toward the bottom. Scroll position drives both the music (the rail on
   the right shows where you are) and the room itself — how briskly the
   cursors move and how often they make things.
   Reduced motion: the cursors hold still where they'd be mid-session;
   scrolling still switches beds. */

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export type CastMember = {
  id: string
  name: string
  color: string
  gait: Gait
  /** Where they swoop in from (normalised; off the board's edge). */
  from: { x: number; y: number }
  /** Where they sit under reduced motion (normalised). */
  rest: { x: number; y: number }
}

// Each person moves differently: Ana is quick and decisive, Ben drifts,
// Priya fidgets near her work, Marcus makes long crossings, Sidekick glides.
export const CAST: CastMember[] = [
  { id: 'ana', name: 'Ana', color: ACTOR_COLOR.ana, gait: { pace: 0.8, swoop: 0.5, fidget: 0.3, dwell: [500, 1600] }, from: { x: -0.06, y: 0.3 }, rest: { x: 0.22, y: 0.3 } },
  { id: 'ben', name: 'Ben', color: ACTOR_COLOR.ben, gait: { pace: 1.2, swoop: 0.8, fidget: 0.2, dwell: [900, 2400] }, from: { x: 0.35, y: 1.08 }, rest: { x: 0.44, y: 0.64 } },
  { id: 'priya', name: 'Priya', color: CURSOR.lilac, gait: { pace: 0.95, swoop: 0.35, fidget: 0.6, dwell: [400, 1300] }, from: { x: 1.04, y: 0.2 }, rest: { x: 0.68, y: 0.24 } },
  { id: 'marcus', name: 'Marcus', color: CURSOR.orange, gait: { pace: 1, swoop: 0.65, fidget: 0.1, dwell: [700, 2000] }, from: { x: 1.04, y: 0.78 }, rest: { x: 0.74, y: 0.7 } },
  { id: 'daniel', name: 'Daniel', color: CURSOR.teal, gait: { pace: 0.9, swoop: 0.45, fidget: 0.4, dwell: [600, 1800] }, from: { x: 0.7, y: -0.06 }, rest: { x: 0.14, y: 0.76 } },
  { id: 'sidekick', name: 'Sidekick', color: ACTOR_COLOR.sidekick, gait: { pace: 1.35, swoop: 0.9, fidget: 0.15, dwell: [1200, 2800] }, from: { x: -0.06, y: 0.7 }, rest: { x: 0.5, y: 0.4 } },
]

// What Sidekick says it's doing as it moves through the room.
const SIDEKICK_LABELS = ['Listening to the room', 'Sidekick', 'Picking up the tempo', 'Following Ana', 'Tuning the board', 'Sidekick']

// The journey meter: a column of thin ink bars with the LOOK of an equalizer
// but fixed lengths — each bar is the amount of collaboration at that point
// in the scroll (two undulations, then the collapse). Nothing animates but
// the light: scroll brightens the bars it has passed. Ink only, no shadows.
const RAIL_BARS = 52

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const SCALE_OPTIONS: { id: ScaleName; label: string }[] = [
  { id: 'majorPent', label: 'Major pentatonic' },
  { id: 'minorPent', label: 'Minor pentatonic' },
  { id: 'major', label: 'Major' },
  { id: 'dorian', label: 'Dorian' },
  { id: 'lydian', label: 'Lydian' },
  { id: 'aeolian', label: 'Natural minor' },
]

/** The session's planned shape: two undulations — the first peaking in the
 *  Lullaby stretch, the second in Lo-fi — then a collapse to silence at the
 *  bottom. Drives the room's energy, the beds AND the meter's bar profile. */
function journeyArc(p: number) {
  const bump = (c: number, w: number) => Math.exp(-(((p - c) / w) ** 2))
  const shape = Math.min(1, bump(0.45, 0.17) + 0.85 * bump(0.8, 0.12))
  // The collapse: whatever the humps say, the last stretch breathes out.
  return shape * Math.min(1, Math.max(0, (1 - p) / 0.1))
}

/** How many of each kind the board keeps before the oldest breathes out. */
const OBJECT_CAPS: Record<BoardObject['kind'], number> = { sticky: 6, text: 3, shape: 5, sticker: 5, media: 3 }

/** A native <select> dressed as the design system's medium Select trigger. */
function TuneSelect({ label, value, width, onChange, children }: { label: string; value: string; width: number; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <span className="ss-select" style={{ width }}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <IconChevronDown size={16} />
    </span>
  )
}

export function SoundscapeBoard() {
  const boardRef = useRef<HTMLElement>(null)
  const cursorEls = useRef<Record<string, HTMLDivElement | null>>({})
  const stageRef = useRef<Stage | null>(null)
  const roamers = useRef<Record<string, Roamer>>({})
  const size = useRef({ w: 0, h: 0 })
  const you = useRef({ x: 0, y: 0, inside: false })
  const [sidekickLabel, setSidekickLabel] = useState(SIDEKICK_LABELS[0]!)
  // The board's ears (sound-lab flyby, per cursor). Created with the board so
  // the frame loop can feed it, but silent — no AudioContext — until the
  // sound switch is pressed.
  const audio = useRef<SoundscapeAudio | null>(null)
  if (!audio.current) audio.current = sharedSoundscapeAudio()
  // Sound is on by default; the browser still requires one real gesture
  // (click/key — a wheel doesn't count as user activation) before audio can
  // run, so the first interaction unlocks it silently. Mute is top-right.
  const [soundOn, setSoundOn] = useState(true)
  const gestured = useRef(false)

  // How busy the room is (0..1): creations, votes and reactions feed it, and
  // it decays on the lab's curve. The bed's layers ride this number.
  const activity = useRef(0)
  const [bedStatus, setBedStatus] = useState<{ s: BedStatus; detail?: string }>({ s: 'idle' })
  const bed = useRef<SoundBed | null>(null)
  if (!bed.current)
    bed.current = createSoundBed({
      getActivity: () => activity.current,
      onStatus: (s, detail) => setBedStatus({ s, detail }),
    })
  // The viewer's tune (defaults: D major pentatonic, matching the engines).
  const [tuneKey, setTuneKey] = useState('D')
  const [tuneScale, setTuneScale] = useState<ScaleName>('majorPent')

  // Where the scroll journey is: which stage plays, and the intensity arc
  // (0 at the ends, 1 at the mid-page crescendo) the room's energy follows.
  // Two stages only: the journey opens on Lo-fi and resolves into Lullaby.
  const [zone, setZone] = useState<BedStyle>('lofi')
  // The bed holds off until the board vignette actually fills the viewport —
  // the story sections above keep their own soundscape until then.
  const [boardSeen, setBoardSeen] = useState(false)
  const boardSeenRef = useRef(boardSeen)
  boardSeenRef.current = boardSeen
  const arcRef = useRef(0)
  const tallRef = useRef<HTMLDivElement>(null)
  const barEls = useRef<(HTMLDivElement | null)[]>([])
  const progressRef = useRef(0)
  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn
  const zoneRef = useRef(zone)
  zoneRef.current = zone

  // What's been made. Creations are seconds apart, so React state is fine
  // here (unlike cursor positions, which move every frame).
  const [objects, setObjects] = useState<BoardObject[]>([])
  const objectsRef = useRef(objects)
  objectsRef.current = objects
  const [emotes, setEmotes] = useState<{ id: number; x: number; y: number; e: ReactionKind; dx: number }[]>([])

  // Where the sounds are heard from: your cursor, or the board's centre
  // while you're not on it.
  const listener = () => (you.current.inside ? you.current : { x: size.current.w / 2, y: size.current.h / 2 })

  const sound = (kind: ActionKind, pos: { x: number; y: number }) => {
    activity.current = Math.min(1, activity.current + 0.12)
    audio.current?.playAction(kind, pos, listener())
  }

  /** Add an object; over the kind's cap, the oldest of that kind fades out. */
  const addObject = (o: BoardObject) => {
    setObjects((os) => {
      const kept = [...os, o]
      const alive = kept.filter((x) => x.kind === o.kind && !x.gone)
      if (alive.length <= OBJECT_CAPS[o.kind]) return kept
      const oldest = alive[0]!
      window.setTimeout(() => setObjects((xs) => xs.filter((x) => x.id !== oldest.id)), 650)
      return kept.map((x) => (x.id === oldest.id ? { ...x, gone: true } : x))
    })
    sound(o.kind, o)
  }
  const patchObject = (id: number, patch: (o: BoardObject) => BoardObject) =>
    setObjects((os) => os.map((o) => (o.id === id ? patch(o) : o)))
  const emote = (pos: { x: number; y: number }, e: ReactionKind) => {
    const id = Math.random()
    setEmotes((es) => [...es, { id, x: pos.x, y: pos.y, e, dx: Math.round(rand(-30, 30)) }])
    window.setTimeout(() => setEmotes((es) => es.filter((x) => x.id !== id)), 1700)
  }

  // The dot grid stirs under the first three cursors and yours (the shader
  // takes four points); strength follows speed, easing back when still.
  const dotsFrame = useRef<((pts: Float32Array) => void) | null>(null)
  if (!dotsFrame.current) {
    const last = [0, 0, 0, 0].map(() => ({ x: 0, y: 0, s: 0, seen: false }))
    const ids = ['ana', 'sidekick', 'marcus']
    dotsFrame.current = (pts) => {
      const stage = stageRef.current
      const { w, h } = size.current
      if (!stage || !w) return
      for (let i = 0; i < 4; i++) {
        const r = i < 3 ? roamers.current[ids[i]!] : null
        const p = r ? { x: r.pos.x * w, y: r.pos.y * h } : you.current
        const present = r ? p.x > -40 && p.x < w + 40 && p.y > -40 && p.y < h + 40 : you.current.inside
        const l = last[i]!
        const speed = l.seen ? Math.hypot(p.x - l.x, p.y - l.y) : 0
        const target = present ? 0.22 + Math.min(0.78, speed / 7) : 0
        l.s += (target - l.s) * (target > l.s ? 0.25 : 0.06)
        l.x = p.x
        l.y = p.y
        l.seen = present
        pts.set([p.x / w, 1 - p.y / h, l.s, i], i * 4)
      }
    }
  }

  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    // Recreated here as well as in render: StrictMode's dev remount disposes
    // the first engine in cleanup before this second pass runs.
    if (!audio.current || audio.current.disposed) audio.current = sharedSoundscapeAudio()
    if (!bed.current)
      bed.current = createSoundBed({
        getActivity: () => activity.current,
        onStatus: (s, detail) => setBedStatus({ s, detail }),
      })
    // Sound is on by default, so TRY to start right away — browsers with an
    // engagement history for this site allow it without a gesture, and the
    // page then sounds from the first scroll. If the attempt is blocked the
    // context just stays suspended and the gesture unlock below finishes it.
    // If it RUNS, that is the browser's permission: count it as the unlock,
    // or the beds (gated on `gestured`) would stay silent for a viewer who
    // only ever scrolls.
    void audio.current?.enable().then(() => {
      if (audio.current?.running) gestured.current = true
    })

    // First real gesture unlocks the audio that's already "on".
    const unlock = () => {
      if (gestured.current) return
      gestured.current = true
      if (!soundOnRef.current) return
      void audio.current?.enable()
      if (boardSeenRef.current) void bed.current?.start(zoneRef.current)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    // Auto-decay, tightened from the lab's 0.985 so a contribution is gone
    // in about five seconds; the journey arc holds the floor up under it.
    const decay = window.setInterval(() => {
      activity.current = Math.max(activity.current * 0.97, arcRef.current * 0.5)
      if (activity.current < 0.005) activity.current = 0
    }, 120)
    const measure = () => (size.current = { w: board.clientWidth, h: board.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(board)

    const stage = createStage(() => size.current)
    stageRef.current = stage
    roamers.current = Object.fromEntries(
      CAST.map((c) => [c.id, { id: c.id, gait: c.gait, pos: { ...(REDUCED ? c.rest : c.from) }, leg: null, seed: rand(0, 100) }]),
    )

    // One loop places every cursor. The clock only runs while the board is
    // on screen; frame gaps are capped so a background tab doesn't lurch.
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e!.isIntersecting))
    io.observe(board)
    // Full view (not a sliver) is what starts the music.
    const ioFull = new IntersectionObserver(([e]) => setBoardSeen(e!.isIntersecting), { threshold: 0.9 })
    ioFull.observe(board)
    let raf = 0
    let prev = performance.now()
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(50, t - prev)
      prev = t
      if (!visible) return
      if (!REDUCED) stage.tick(dt)
      const heard: { id: string; pos: { x: number; y: number } }[] = []
      for (const c of CAST) {
        const el = cursorEls.current[c.id]
        if (!el) continue
        const p = stage.position(roamers.current[c.id]!)
        el.style.transform = `translate(${p.x}px, ${p.y}px)`
        heard.push({ id: c.id, pos: p })
      }
      // The same positions the DOM just got: a cursor swooping past your
      // pointer swooshes, panned to where it really is around you.
      audio.current?.frame(heard, you.current, t)
    }
    raf = requestAnimationFrame(frame)

    // Round-robin indexes per pool, so the room doesn't repeat itself.
    const take = (counters: Record<string, number>) => (k: string, n: number) => (counters[k] = ((counters[k] ?? Math.floor(Math.random() * n)) + 1) % n)
    const next = take({})
    const mk = (kind: BoardObject['kind'], pos: { x: number; y: number }, from?: { x: number; y: number }): BoardObject => {
      const base = {
        id: Date.now() + Math.random(),
        kind,
        x: pos.x,
        y: pos.y,
        from,
        r: rand(-5, 5),
        color: STICKY_COLORS[next('color', STICKY_COLORS.length)]!,
        text: '',
        votes: 0,
        reactions: [],
      }
      switch (kind) {
        case 'sticky':
          return { ...base, text: STICKY_TEXTS[next('sticky', STICKY_TEXTS.length)]! }
        case 'text':
          return { ...base, r: 0, text: TEXT_TEXTS[next('text', TEXT_TEXTS.length)]! }
        case 'shape':
          return { ...base, text: SHAPE_LABELS[next('label', SHAPE_LABELS.length)]!, shape: (['square', 'circle', 'diamond'] as const)[next('shape', 3)] }
        case 'sticker':
          return { ...base, r: rand(-12, 12), sticker: STICKER_POOL[next('sticker', STICKER_POOL.length)] }
        case 'media':
          return { ...base, r: rand(-3, 3), text: MEDIA_TITLES[next('media', MEDIA_TITLES.length)]!.title }
      }
    }

    // Where to put the next creation: of a handful of random candidates,
    // take the one farthest from every object already on the board
    // (best-candidate sampling) — the canvas fills evenly instead of
    // clumping where a cursor happens to linger.
    const pickFreeSpot = () => {
      const { w, h } = size.current
      const placed = objectsRef.current.filter((o) => !o.gone)
      let best = { x: rand(0.1, 0.82) * w, y: rand(0.12, 0.8) * h }
      let bestDist = -1
      for (let k = 0; k < 14; k++) {
        const cand = { x: rand(0.1, 0.82) * w, y: rand(0.12, 0.8) * h }
        const dist = placed.length ? Math.min(...placed.map((o) => Math.hypot(o.x - cand.x, o.y - cand.y))) : rand(0, 1)
        if (dist > bestDist) {
          bestDist = dist
          best = cand
        }
      }
      return best
    }

    if (!REDUCED) {
      // Each cursor runs its own script: wander, and every so often make
      // something where it stands — or walk over to someone else's work and
      // react to or vote on it. Weights keep the room mostly in motion.
      const behave = async (c: CastMember) => {
        const r = roamers.current[c.id]!
        while (stage.alive) {
          await stage.goTo(r, stage.pickSpot(r))
          if (!stage.alive) return
          // The arc sets the room's energy: long sleepy dwells and mostly
          // wandering at the quiet ends, brisk and busy at the crescendo.
          await stage.wait(rand(...c.gait.dwell) * (1.6 - arcRef.current))
          if (!stage.alive) return
          const here = () => ({ x: r.pos.x * size.current.w, y: r.pos.y * size.current.h })
          if (Math.random() < 0.62 - arcRef.current * 0.34) continue // just passing through
          const roll = Math.random()
          if (roll < 0.73) {
            // Walk to an open patch of canvas and set something down there —
            // it glides off the cursor's tip into place.
            const kind: BoardObject['kind'] =
              roll < 0.25 ? 'sticky' : roll < 0.39 ? 'text' : roll < 0.55 ? 'shape' : roll < 0.64 ? 'media' : 'sticker'
            const spot = pickFreeSpot()
            await stage.goTo(r, { x: spot.x - 28, y: spot.y - 36 })
            if (!stage.alive) return
            await stage.wait(rand(200, 450))
            const g = here()
            addObject(mk(kind, { x: g.x + 28, y: g.y + 36 }, g))
            await stage.wait(rand(500, 1100))
          } else {
            // Walk to someone's work and respond to it.
            const pool = objectsRef.current.filter((o) => !o.gone)
            const target = pool[Math.floor(Math.random() * pool.length)]
            if (!target) continue
            const vote = roll >= 0.9
            // Votes land on the top-left badge, reactions on the bottom-right.
            await stage.goTo(r, { x: target.x + (vote ? -STICKY_PX * 0.45 : STICKY_PX * 0.45), y: target.y + (vote ? -STICKY_PX * 0.4 : STICKY_PX * 0.42) })
            if (!stage.alive) return
            await stage.wait(250)
            if (vote) {
              patchObject(target.id, (o) => ({ ...o, votes: o.votes + 1 }))
              sound('vote', target)
            } else if (target.reactions.length < 3) {
              const kind = REACTION_POOL[Math.floor(Math.random() * REACTION_POOL.length)]!
              emote(here(), kind)
              patchObject(target.id, (o) =>
                o.reactions.length >= 3 ? o : { ...o, reactions: [...o.reactions, { id: Date.now() + Math.random(), kind, r: Math.round(rand(-12, 12)) }] },
              )
              sound('reaction', target)
            }
            await stage.wait(rand(400, 900))
          }
        }
      }
      // Staggered arrivals: people drift in one by one, then live their loops.
      CAST.forEach((c, i) => {
        void (async () => {
          await stage.wait(300 + i * 450)
          await behave(c)
        })()
      })
    } else {
      // Reduced motion: the room mid-session, already made — nothing moves.
      const seeded: [BoardObject['kind'], number, number][] = [
        ['text', 0.26, 0.18],
        ['sticky', 0.52, 0.3],
        ['sticky', 0.66, 0.52],
        ['shape', 0.2, 0.55],
        ['media', 0.82, 0.32],
        ['sticker', 0.38, 0.72],
        ['sticky', 0.78, 0.72],
      ]
      setObjects(
        seeded.map(([kind, nx, ny], i) => ({
          ...mk(kind, { x: nx * size.current.w, y: ny * size.current.h }),
          votes: i === 1 ? 3 : 0,
          reactions: i === 2 ? [{ id: 1, kind: 'love' as const, r: 6 }] : [],
        })),
      )
    }

    if (!REDUCED) {
      // Sidekick narrates now and then.
      void (async () => {
        let n = 0
        while (stage.alive) {
          await stage.wait(rand(3800, 6400))
          if (stage.alive) setSidekickLabel(SIDEKICK_LABELS[++n % SIDEKICK_LABELS.length]!)
        }
      })()
    }

    return () => {
      stage.dispose()
      stageRef.current = null
      cancelAnimationFrame(raf)
      io.disconnect()
      ioFull.disconnect()
      ro.disconnect()
      window.clearInterval(decay)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      audio.current?.dispose()
      audio.current = null
      bed.current?.dispose()
      bed.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll drives the journey: progress through the runway sets the arc and
  // picks the stage. rAF-coalesced like the Attitude page's pinned scenes.
  useEffect(() => {
    const tall = tallRef.current
    if (!tall) return
    // The bars' lengths are fixed: the collaboration profile at each point
    // of the journey, drawn once.
    barEls.current.forEach((el, i) => {
      if (el) el.style.width = `${(8 + journeyArc(i / (RAIL_BARS - 1)) * 38).toFixed(1)}px`
    })
    let raf = 0
    const measure = () => {
      raf = 0
      const r = tall.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)))
      arcRef.current = REDUCED ? 0 : journeyArc(p)
      progressRef.current = p
      // Only the light moves: a feathered edge brightens bars as you pass.
      for (let i = 0; i < RAIL_BARS; i++) {
        const el = barEls.current[i]
        if (!el) continue
        const lit = Math.min(1, Math.max(0, (p - i / (RAIL_BARS - 1)) * RAIL_BARS + 1))
        el.style.opacity = (0.16 + lit * 0.84).toFixed(3)
      }
      const z: BedStyle = p < 0.5 ? 'lofi' : 'lullaby'
      setZone((cur) => (cur === z ? cur : z))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    document.addEventListener('scroll', on, { capture: true, passive: true })
    return () => {
      document.removeEventListener('scroll', on, { capture: true })
      cancelAnimationFrame(raf)
    }
  }, [])

  // The stage the scroll landed on becomes the playing bed — sound allowing,
  // and only while the board vignette is in full view (leaving it lets the
  // bed stop and its reverb tail ring out).
  useEffect(() => {
    if (!boardSeen) {
      bed.current?.stop()
      return
    }
    if (!soundOn) return
    // A running engine counts as permission even if no click ever happened.
    if (audio.current?.running) gestured.current = true
    if (!gestured.current) return
    void bed.current?.start(zone)
  }, [zone, soundOn, boardSeen])

  // Clicking a stage on the rail scrolls the page to that part of the journey.
  const jump = (z: BedStyle) => {
    const tall = tallRef.current
    if (!tall) return
    const frac = { lofi: 0.16, lullaby: 0.72 }[z]
    scrollToY(docTop(tall) + frac * (tall.offsetHeight - window.innerHeight), !REDUCED)
  }

  return (
    <div ref={tallRef} className="ss-journey">
      <div className="ss-journey__pin">
        <section
          ref={boardRef}
          className="ss-board"
          aria-label="Soundscape board"
          onPointerMove={(e) => {
            const b = e.currentTarget.getBoundingClientRect()
            you.current = { x: e.clientX - b.left, y: e.clientY - b.top, inside: true }
          }}
          onPointerLeave={() => (you.current.inside = false)}
        >
          {!REDUCED && (
            <div aria-hidden className="ss-fill">
              <LivingTexture kind="dots" beforeFrame={dotsFrame.current!} />
            </div>
          )}

          {/* The work: everything the room has made, under the cursors. */}
          {objects.map((o) => (
            <ObjectView key={o.id} o={o} />
          ))}

          {emotes.map((m) => (
            <span key={m.id} aria-hidden style={{ position: 'absolute', zIndex: 6, left: m.x, top: m.y, ['--dx' as string]: `${m.dx}px` }}>
              <img className="ss-emote" src={REACTION_SRC[m.e]} alt="" />
            </span>
          ))}

          {CAST.map((c) => (
            // Plain wrappers: the loop writes their transform every frame.
            <div
              key={c.id}
              ref={(el) => {
                cursorEls.current[c.id] = el
              }}
              aria-hidden
              className="ss-cursor-slot"
              style={{ zIndex: 5 }}
            >
              {c.id === 'sidekick' ? <SidekickCursor label={sidekickLabel} /> : <HumanCursor name={c.name} color={c.color} />}
            </div>
          ))}

          {/* Mute — sound is on by default, this is the way out. */}
          <div className="ss-board__mute">
            <button
              type="button"
              className="ss-icon-btn"
              aria-pressed={!soundOn}
              aria-label={soundOn ? 'Mute' : 'Unmute'}
              onClick={() => {
                const next = !soundOn
                setSoundOn(next)
                gestured.current = true // the click itself is the unlock
                if (next) {
                  void audio.current?.enable()
                  bed.current?.setMuted(false)
                  // The zone effect (soundOn flipped) restarts the bed.
                } else {
                  void audio.current?.disable()
                  // Hard mute first — stop() alone lets notes ring out for ~10s
                  // through the reverb; mute must be silence now.
                  bed.current?.setMuted(true)
                  bed.current?.stop()
                }
              }}
            >
              {soundOn ? <IconSpeakerHigh /> : <IconSpeakerCross />}
            </button>
          </div>

          {/* The viewer's tune: pick a key and scale and the whole soundscape —
              pings, swooshes and beds — moves there, live. */}
          <div className="ss-board__tune">
            <TuneSelect
              label="Key"
              value={tuneKey}
              width={76}
              onChange={(v) => {
                setTuneKey(v)
                audio.current?.setKey(KEY_NAMES.indexOf(v as (typeof KEY_NAMES)[number]))
                bed.current?.setKey(KEY_NAMES.indexOf(v as (typeof KEY_NAMES)[number]))
              }}
            >
              {KEY_NAMES.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </TuneSelect>
            <TuneSelect
              label="Scale"
              value={tuneScale}
              width={190}
              onChange={(v) => {
                setTuneScale(v as ScaleName)
                audio.current?.setScale(v as ScaleName)
                bed.current?.setScale(v)
              }}
            >
              {SCALE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </TuneSelect>
          </div>

          {/* The journey meter: labels right-aligned against the bars. The bars
              draw the two undulations of the session; scroll lights them up and
              live contributions ripple the ones at the playhead. Clicking a
              stage scrolls you to it. */}
          <div className="ss-rail" aria-label="Soundscape journey">
            <div className="ss-rail__labels">
              {(
                [
                  ['lofi', 'Lo-fi'],
                  ['lullaby', 'Lullaby'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={zone === value ? 'ss-rail__label is-active' : 'ss-rail__label'}
                  aria-pressed={zone === value}
                  onClick={() => jump(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ss-rail__bars" aria-hidden>
              {Array.from({ length: RAIL_BARS }, (_, i) => (
                <div
                  key={i}
                  className="ss-rail__bar"
                  ref={(el) => {
                    barEls.current[i] = el
                  }}
                />
              ))}
            </div>
            {(bedStatus.s === 'loading' || bedStatus.s === 'error') && (
              <span className="ss-rail__status" role="status">
                {bedStatus.detail ?? 'loading…'}
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
