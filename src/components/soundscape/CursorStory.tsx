import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { REACTION_SRC } from '../miro/Reactions'
import { STICKY_BY_ID, CURSOR } from './palette'
import { HumanCursor } from './cursors'
import { IconChevronDown } from './icons'
import { sharedSoundscapeAudio, type ActionKind } from './audio'
import { REACTION_POOL, STICKY_COLORS } from './objects'
import { CAST } from './SoundscapeBoard'
import { docTop, scrollToY, scrollY } from './scroll'

/* One pinned scene, scroll-and-snap, the same five cursors throughout.

   Snap stop 1 — "It all starts with the cursors." Five cursors orbit the
   centred words on elliptical rings at the SAME diameter the object ring
   will use: evenly phased, each ellipse on its own tilt. You can pause here
   as long as you like — the orbits (and their swooshes, panned around the
   words as listener) just keep going.

   Snap stop 2 — one more scroll snaps down a viewport: the text swaps to
   "It's about the interactions." and the same cursors leave orbit and lay
   stickies and reactions out on that circle, in their own time.

   From there scrolling is free and smooth: the circle tips into 3D
   (rotateX → 30°) and a scrubbed sweep laps the perimeter — every piece
   bounces, glows and pings as the sweep passes. */

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// The five humans of the cast (Sidekick sits this one out)…
const FIVE = CAST.filter((c) => c.id !== 'sidekick').slice(0, 5)
// …joined in the first section by five more colleagues on wider, flatter
// orbits. They only orbit — when the laying starts, they drift off and
// leave the ring to the core five.
const GUESTS: { id: string; name: string; color: string }[] = [
  { id: 'mia', name: 'Mia', color: CURSOR.lime },
  { id: 'jonas', name: 'Jonas', color: CURSOR.moss },
  { id: 'sofia', name: 'Sofia', color: CURSOR.ocean },
  // In the prototype Leo's hue (`--colors-pink-cursor-border`) isn't defined
  // by the theme, so his cursor renders invisible (no fill, clear pill) —
  // kept as-is so the scene matches; give him a hue to bring him on stage.
  { id: 'leo', name: 'Leo', color: 'var(--colors-pink-cursor-border)' },
  { id: 'nadia', name: 'Nadia', color: CURSOR.coal },
]
const ORBITERS = [...FIVE, ...GUESTS]
const SLOTS = 12 // the core five lay two or three each
const angleOf = (i: number) => (i / SLOTS) * Math.PI * 2 - Math.PI / 2

// Geometry of the runway: three snap stops set two viewports apart — leaving
// a beat takes a real commitment of scroll, not a nudge — then the smooth
// stretch for the 360° sweep.
const BEAT_GAP_VH = 200
const TAIL_VH = 300
const TALL_VH = BEAT_GAP_VH * 2 + TAIL_VH
const SCROLLABLE_VH = TALL_VH - 100
const P_BEAT2 = BEAT_GAP_VH / SCROLLABLE_VH // beat 2: the laying
const P_BEAT3 = (BEAT_GAP_VH * 2) / SCROLLABLE_VH // beat 3: 3D, spin, 360° audio

// What the sweep plays per slot: the whole little kit — pings (sticky),
// high pops (vote), low boops (media's drop), pops (reaction) and plucks
// (shape) — cycling around the ring so the lap reads as a phrase.
const sweepSound = (j: number): ActionKind => (['sticky', 'vote', 'media', 'reaction', 'shape'] as const)[j % 5]!

type RingItem = { kind: 'sticky' | 'reaction'; color: string; reaction: keyof typeof REACTION_SRC }
const ITEMS: RingItem[] = Array.from({ length: SLOTS }, (_, i) => ({
  kind: i % 2 ? 'reaction' : 'sticky',
  color: STICKY_COLORS[i % STICKY_COLORS.length]!,
  reaction: REACTION_POOL[i % REACTION_POOL.length]!,
}))

const GHOST_TEXTS = ['warmer join chime', 'tempo from the room', 'quiet while reading', 'one note per move', 'key of the day', 'softer when we focus']

const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
// Ease-out-back: the incoming title lands with a bounce past its mark.
const easeBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)

export function CursorStory() {
  const tallRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const spaceRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const headARef = useRef<HTMLHeadingElement>(null)
  const headBRef = useRef<HTMLHeadingElement>(null)
  const headCRef = useRef<HTMLHeadingElement>(null)
  const itemEls = useRef<(HTMLDivElement | null)[]>([])
  const cursorEls = useRef<(HTMLDivElement | null)[]>([])
  const size = useRef({ w: 0, h: 0 })
  const progress = useRef(0)
  // Beat-3 sequencing: the scroll gate for the 360° title, and the moment the
  // dark landed — the title only rises once the black has settled.
  const cGateRef = useRef(0)
  const darkAtRef = useRef(0)
  const glowRef = useRef<HTMLDivElement>(null)
  // The turntable: once every piece is placed the ring slowly rotates.
  const spinRef = useRef(0)
  const sweepRef = useRef(0)
  const [placed, setPlaced] = useState<boolean[]>(() => Array.from({ length: SLOTS }, () => REDUCED))

  const arrowRef = useRef<HTMLDivElement>(null)
  // The arrow under the heading: at beat 1 it takes you to beat 2; at beat 2
  // it rides the whole smooth stretch out — tilt, sweep and all.
  const onArrow = () => {
    const tall = tallRef.current
    if (!tall) return
    const tallTop = docTop(tall)
    const vh = window.innerHeight
    const q = progress.current
    // Before stop 2's midpoint → stop 2; before stop 3's → stop 3; at beat 3
    // the arrow rides the whole 360° sweep out.
    const vhTo = q < P_BEAT2 * 0.5 ? BEAT_GAP_VH : q < (P_BEAT2 + P_BEAT3) / 2 ? BEAT_GAP_VH * 2 : SCROLLABLE_VH
    scrollToY(tallTop + (vhTo / 100) * vh, !REDUCED)
  }

  // Hovering a placed piece: its little ping, and a bounce on the spot.
  const pingItem = (j: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const pin = pinRef.current
    const plane = planeRef.current
    const inner = e.currentTarget.querySelector<HTMLElement>('[data-bounce]')
    if (inner) {
      inner.style.animation = 'none'
      void inner.offsetWidth // reflow so the animation retriggers
      inner.style.animation = 'ss-story-bounce 520ms cubic-bezier(0.34, 1.56, 0.64, 1)'
    }
    if (!pin || !plane) return
    const c = { x: pin.clientWidth / 2, y: pin.clientHeight / 2 }
    const r = plane.offsetWidth * 0.46
    const a = angleOf(j) + spinRef.current
    sharedSoundscapeAudio().playAction(sweepSound(j), { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }, c, 1.5, 2.2)
  }

  useEffect(() => {
    const tall = tallRef.current
    const pin = pinRef.current
    if (!tall || !pin) return
    const measure = () => (size.current = { w: pin.clientWidth, h: pin.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(pin)

    const centre = () => ({ x: size.current.w / 2, y: size.current.h / 2 })
    const ringR = () => (planeRef.current?.offsetWidth ?? 420) * 0.46
    const slotPx = (j: number) => {
      const c = centre()
      const r = ringR()
      const a = angleOf(j) + spinRef.current
      return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }
    }

    // ————— the five orbits: ring-diameter ellipses, own tilts, even phases —————
    // Radii hug 1× the ring radius so the orbit halo IS the circle the
    // objects will land on; the tilts fan the ellipses around the centre.
    const orbits = ORBITERS.map((_, i) => ({
      phase: (i / ORBITERS.length) * Math.PI * 2,
      tilt: (i / ORBITERS.length) * Math.PI,
      // The guests (i ≥ 5) ride wider, flatter — more elliptical — rings.
      rx: i < 5 ? 1.6 + (i % 3) * 0.12 : 2.0 + ((i - 5) % 3) * 0.16,
      ry: i < 5 ? 0.8 + (i % 2) * 0.1 : 0.5 + ((i - 5) % 2) * 0.09,
      // Brisk enough to be heard: the flyby law keys level to px/ms.
      speed: (0.00085 + i * 0.00005) * (i % 2 ? 1 : -1),
    }))
    const orbitPoint = (i: number, t: number) => {
      const o = orbits[i]!
      const c = centre()
      const r = ringR()
      // Keep the widest orbit inside the stage, whatever the viewport.
      const fit = Math.min(1, (size.current.w / 2 - 90) / (2.32 * r), (size.current.h / 2 - 60) / (1.9 * r))
      const a = o.phase + t * o.speed
      const ex = Math.cos(a) * o.rx * r * fit
      const ey = Math.sin(a) * o.ry * r * fit
      return {
        x: c.x + ex * Math.cos(o.tilt) - ey * Math.sin(o.tilt),
        y: c.y + (ex * Math.sin(o.tilt) + ey * Math.cos(o.tilt)) * 0.9,
      }
    }

    // ————— the laying choreography (runs once, at snap stop 2) —————
    // Each cursor's current duty: -1 orbit · slot index while laying · -2 done.
    const duty = FIVE.map(() => -1)
    const timers: number[] = []
    let dropsStarted = false
    let placedCount = REDUCED ? SLOTS : 0
    // The truth about what's down, synchronously (state is async) — it also
    // guards against a slot being placed twice (walk + catch-up racing).
    const placedLocal = ITEMS.map(() => REDUCED)
    const place = (j: number, gain = 1) => {
      if (placedLocal[j]) return
      placedLocal[j] = true
      placedCount++
      setPlaced((ps) => ps.map((v, idx) => (idx === j ? true : v)))
      sharedSoundscapeAudio().playAction(ITEMS[j]!.kind, slotPx(j), centre(), gain)
    }
    const startDrops = () => {
      if (dropsStarted) return
      dropsStarted = true
      FIVE.forEach((_, i) => {
        const t0 = i * 260
        // Your slots are every fifth around the ring: two or three each.
        const mine = [i, i + FIVE.length, i + FIVE.length * 2].filter((j) => j < SLOTS)
        mine.forEach((j, n) => {
          timers.push(window.setTimeout(() => (duty[i] = j), t0 + n * 1350))
          timers.push(
            window.setTimeout(() => {
              // Fading in as the swoosh fades out: quiet if the laying
              // starts early on the approach, full voice at stop 2.
              place(j, 1.5 * (0.4 + 0.6 * seg(progress.current, P_BEAT2 * 0.8, P_BEAT2)))
            }, t0 + n * 1350 + 950),
          )
        })
        timers.push(window.setTimeout(() => (duty[i] = -2), t0 + mine.length * 1350 + 50))
      })
    }
    // Scrolled past faster than the cursors can work? The drawing catches
    // up: the walk choreography is cancelled and the remaining pieces pop in
    // rapid-fire, so beat 3 always has its full spinning ring.
    // The arrival lap: once the ring is in 3D at beat 3, every piece pops
    // and pings again, one full self-playing round of hard-panned audio.
    let autoLapAt = 0
    let autoLapPrev = 0
    let autoLapDone = false
    let caughtUp = false
    const catchUp = () => {
      if (caughtUp) return
      caughtUp = true
      dropsStarted = true // the walk version stands down
      timers.forEach(clearTimeout)
      timers.length = 0
      duty.forEach((_, i) => (duty[i] = -2))
      ITEMS.forEach((_, j) => {
        if (!placedLocal[j]) timers.push(window.setTimeout(() => place(j, 0.9), j * 70))
      })
    }

    // Where each cursor waits in the wings before its entrance.
    const wingsAt = (i: number) => ({ x: i % 2 ? size.current.w + 60 : -60, y: (((i % 6) + 1) / 7) * size.current.h })
    // Entrances: two quiet seconds with just the words, then the cursors fly
    // in one after another and pick up their orbits.
    const ENTRY_DELAY = 2000
    const ENTRY_STAGGER = 300
    let enterBase = 0 // set when the scene first becomes visible

    // Spring-followed positions: orbit → laying → away, with no snaps.
    const pos = ORBITERS.map((_, i) => (REDUCED ? orbitPoint(i, 0) : wingsAt(i)))
    if (REDUCED)
      pos.forEach((pt, i) => {
        const el = cursorEls.current[i]
        if (el) el.style.transform = `translate(${pt.x}px, ${pt.y}px)`
      })

    let visible = false
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e!.isIntersecting
        // Out of view: clear the ring, everyone's duties and the entry clock,
        // so the whole scene — entrances included — redraws on every return.
        if (!visible && !REDUCED) {
          timers.forEach(clearTimeout)
          timers.length = 0
          dropsStarted = false
          caughtUp = false
          autoLapAt = 0
          autoLapPrev = 0
          autoLapDone = false
          placedLocal.fill(false)
          placedCount = 0
          spinRef.current = 0
          if (planeRef.current) planeRef.current.style.transform = ''
          duty.forEach((_, i) => (duty[i] = -1))
          enterBase = 0
          pos.forEach((pt, i) => Object.assign(pt, wingsAt(i)))
          setPlaced(Array.from({ length: SLOTS }, () => false))
        }
      },
      { threshold: 0.45 },
    )
    io.observe(pin)
    let raf = 0
    let prev = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(50, now - prev)
      prev = now
      if (!visible || REDUCED) return
      if (!enterBase) enterBase = now
      const p = progress.current
      const laying = p >= P_BEAT2 * 0.8
      // Past both snap beats: the cursors' part is over — they fly out.
      const past = p > P_BEAT2 + 0.1
      if (laying && !past) startDrops()
      const heard: { id: string; pos: { x: number; y: number } }[] = []
      for (let i = 0; i < ORBITERS.length; i++) {
        // Wait in the wings, then orbit; once the snap lands, duty rules —
        // the guests (i ≥ 5) have none, so laying sends them home.
        let target
        const d = i < FIVE.length ? duty[i]! : laying ? -2 : -1
        if (past || (laying && d === -2 && i >= FIVE.length)) {
          target = wingsAt(i)
        } else if (!laying || d === -1) {
          target = now - enterBase < ENTRY_DELAY + i * ENTRY_STAGGER ? wingsAt(i) : orbitPoint(i, now)
        } else if (d >= 0) {
          const s = slotPx(d)
          target = { x: s.x - 10, y: s.y - 14 }
        } else {
          target = { x: i % 2 ? size.current.w + 80 : -80, y: ((i + 1) / 6) * size.current.h }
        }
        const k = 1 - Math.exp(-dt / (laying ? 420 : 260))
        pos[i]!.x += (target.x - pos[i]!.x) * k
        pos[i]!.y += (target.y - pos[i]!.y) * k
        const el = cursorEls.current[i]
        if (el) el.style.transform = `translate(${pos[i]!.x}px, ${pos[i]!.y}px)`
        heard.push({ id: `story-${ORBITERS[i]!.id}`, pos: pos[i]! })
      }
      // The words are the listener. Boosted for the far listener, but
      // focused: beyond ~170px of the centre a cursor is silent, so the
      // swoosh only sounds on the close passes. The swoosh FADES OUT on the
      // way into stop 2 — section two belongs to the pings.
      const swooshMix = 1 - seg(p, P_BEAT2 * 0.7, P_BEAT2 * 0.98)
      if (p < P_BEAT2 + 0.09) sharedSoundscapeAudio().frame(heard, { ...centre(), inside: true }, now, 5 * swooshMix, 170)

      // The 360° title: gated on scroll AND on time since the lights went
      // out — black first, then (700ms later) the words rise with the bounce.
      if (headCRef.current) {
        const sinceDark = darkAtRef.current ? seg(now - darkAtRef.current, 700, 1250) : 0
        const k = Math.min(cGateRef.current, sinceDark)
        const e = easeBack(k)
        headCRef.current.style.opacity = String(Math.min(1, k * 1.6))
        headCRef.current.style.transform = `translateY(${(56 * (1 - e)).toFixed(1)}px)`
      }

      // At beat 3, with every piece down, the ring becomes a slow turntable
      // (the ramp eases the spin in). The plane spins;
      // each piece counter-rotates so its content stays upright, and carries
      // its live sweep lift/glow (written here, not in the scroll handler,
      // because spin moves the pieces between scroll events).
      if (placedCount >= SLOTS) spinRef.current += dt * 0.0001 * seg(p, P_BEAT3 * 0.93, P_BEAT3)
      const spin = spinRef.current
      const spinDeg = (spin * 180) / Math.PI
      if (planeRef.current) planeRef.current.style.transform = `rotate(${spinDeg.toFixed(2)}deg)`
      // The arrival lap starts a beat after stop 3 settles with the ring
      // complete, and runs one full round in ~4.5s (paused if you scroll up).
      const sweep = sweepRef.current
      let autoAngle = -1
      if (p >= P_BEAT3 - 0.05) {
        if (!autoLapDone && !autoLapAt && placedCount >= SLOTS) autoLapAt = now + 600
        if (autoLapAt && now >= autoLapAt && !autoLapDone) {
          autoAngle = ((now - autoLapAt) / 4500) * Math.PI * 2
          if (autoAngle >= Math.PI * 2) {
            autoLapDone = true
            autoAngle = -1
          }
        }
      }
      for (let j = 0; j < SLOTS; j++) {
        const el = itemEls.current[j]
        if (!el) continue
        const a = (((angleOf(j) + spin + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const dd = Math.min(Math.abs(a - sweep), Math.PI * 2 - Math.abs(a - sweep))
        let k = sweep > 0 && sweep < Math.PI * 2 ? Math.exp(-((dd / 0.42) ** 2)) : 0
        if (autoAngle >= 0) {
          const da = Math.min(Math.abs(a - autoAngle), Math.PI * 2 - Math.abs(a - autoAngle))
          k = Math.max(k, Math.exp(-((da / 0.42) ** 2)))
          // The lap head crossing this piece: pop's ping, panned HARD.
          if (a > autoLapPrev && a <= autoAngle) {
            sharedSoundscapeAudio().playAction(sweepSound(j), slotPx(j), centre(), 1.6, 2.6)
          }
        }
        el.style.transform = `translate(-50%, -50%) rotate(${(-spinDeg).toFixed(2)}deg) translateZ(${(k * 52).toFixed(1)}px) scale(${(1 + k * 0.18).toFixed(3)})`
        el.style.filter = k > 0.04 ? `drop-shadow(0 0 ${(k * 16).toFixed(0)}px rgba(255, 220, 74, ${(k * 0.9).toFixed(2)}))` : ''
      }
      if (autoAngle >= 0) autoLapPrev = autoAngle
    }
    raf = requestAnimationFrame(frame)

    // ————— past the snaps, scroll scrubs the 3D tilt and the ping sweep —————
    let srAf = 0
    let lastSweep = 0
    const paint = () => {
      srAf = 0
      const r = tall.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)))
      progress.current = p
      // Each title holds almost all the way to its stop, then the next lands
      // with an ease-back bounce as the snap settles.
      const g = P_BEAT3 - P_BEAT2
      const swapAB = seg(p, P_BEAT2 * 0.82, P_BEAT2)
      // Beat 2 → 3 is a staged exit: the old title leaves FIRST, then the
      // lights go out, and only once the black has settled does the 360°
      // title rise (time-sequenced in the frame loop, below).
      const bOut = seg(p, P_BEAT2 + g * 0.3, P_BEAT2 + g * 0.5)
      cGateRef.current = seg(p, P_BEAT2 + g * 0.85, P_BEAT3)
      if (headARef.current) {
        headARef.current.style.opacity = String(1 - swapAB)
        headARef.current.style.transform = `translateY(${(-34 * swapAB).toFixed(1)}px)`
      }
      if (headBRef.current) {
        const e = easeBack(swapAB)
        headBRef.current.style.opacity = String(Math.min(1, swapAB * 1.6) * (1 - bOut))
        headBRef.current.style.transform = `translateY(${(56 * (1 - e) - 34 * bOut).toFixed(1)}px)`
      }
      // Reduced motion has no frame loop: reveal the 360° title on scroll.
      if (REDUCED && headCRef.current) {
        headCRef.current.style.opacity = String(cGateRef.current)
        headCRef.current.style.transform = 'none'
      }
      // The arrow stays through all three beats, then bows out.
      if (arrowRef.current) arrowRef.current.style.opacity = String(1 - seg(p, P_BEAT3 + 0.03, P_BEAT3 + 0.09))
      // Past the cursors' exit with pieces still missing: catch the ring up.
      if (!REDUCED && p > P_BEAT2 + g * 0.55) catchUp()
      // The centre glow warms the first two vignettes, then breathes out
      // just ahead of the dark.
      if (glowRef.current) glowRef.current.style.opacity = String(1 - seg(p, P_BEAT2 + g * 0.35, P_BEAT2 + g * 0.55))
      // Riding into beat 3 the circle tips into 3D and zooms in a little —
      // and the lights go out (just after the old title left, well before
      // the new one arrives), staying dark through the final vignette.
      const into3 = seg(p, P_BEAT2 + g * 0.5, P_BEAT3)
      const page = tall.closest<HTMLElement>('[data-soundscape-page]')
      if (page) {
        const dark = p > P_BEAT2 + g * 0.55
        if (dark && page.dataset.dark !== 'true') darkAtRef.current = performance.now()
        if (!dark) darkAtRef.current = 0
        page.dataset.dark = dark ? 'true' : 'false'
      }
      const tilt = 30 * into3
      const zoom = 1 + 0.12 * into3
      if (spaceRef.current) spaceRef.current.style.transform = `perspective(1100px) scale(${zoom.toFixed(3)}) rotateX(${tilt.toFixed(2)}deg)`
      // …then the smooth-scroll stretch: the sweep laps the perimeter and
      // every piece bounces, glows and pings as it passes.
      const sweep = seg(p, P_BEAT3 + 0.07, 0.97) * Math.PI * 2
      sweepRef.current = sweep
      for (let j = 0; j < SLOTS; j++) {
        const a = (((angleOf(j) + spinRef.current + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        if (a > Math.min(lastSweep, sweep) && a <= Math.max(lastSweep, sweep) && lastSweep !== sweep) {
          sharedSoundscapeAudio().playAction(sweepSound(j), slotPx(j), centre(), 1.5, 2.6)
        }
        // Reduced motion has no frame loop: the scroll hand writes the
        // (spin-free) lift and glow directly.
        if (REDUCED) {
          const el = itemEls.current[j]
          if (!el) continue
          const d = Math.min(Math.abs(a - sweep), Math.PI * 2 - Math.abs(a - sweep))
          const k = sweep > 0 && sweep < Math.PI * 2 ? Math.exp(-((d / 0.42) ** 2)) : 0
          el.style.transform = `translate(-50%, -50%) translateZ(${(k * 52).toFixed(1)}px) scale(${(1 + k * 0.18).toFixed(3)})`
          el.style.filter = k > 0.04 ? `drop-shadow(0 0 ${(k * 16).toFixed(0)}px rgba(255, 220, 74, ${(k * 0.9).toFixed(2)}))` : ''
        }
      }
      lastSweep = sweep
    }
    const on = () => {
      if (!srAf) srAf = requestAnimationFrame(paint)
    }
    paint()
    document.addEventListener('scroll', on, { capture: true, passive: true })

    // ————— the stop-1 gate: snap alone lets momentum glide past, so wheel-
    // down AT the stop is held back — the scene stretches with rubber-band
    // resistance, bounces back if you ease off, and only a committed push
    // releases the scroll to stop 2. —————
    let pull = 0
    let settleT = 0
    const snapBack = () => {
      pull = 0
      const pinEl = pinRef.current
      if (pinEl) {
        pinEl.style.transition = 'transform 650ms cubic-bezier(0.34, 1.56, 0.64, 1)'
        pinEl.style.transform = ''
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (REDUCED) return
      const pinEl = pinRef.current
      if (!pinEl) return
      const tallTop = docTop(tall)
      if (Math.abs(scrollY() - tallTop) > 8 || e.deltaY <= 0) return
      e.preventDefault()
      pull += e.deltaY
      window.clearTimeout(settleT)
      if (pull > 560) {
        // Committed: release, straight to stop 2.
        snapBack()
        scrollToY(tallTop + window.innerHeight * (BEAT_GAP_VH / 100), true)
        return
      }
      // The stretch: sub-linear, so it visibly fights back.
      pinEl.style.transition = 'none'
      pinEl.style.transform = `translateY(${(-Math.pow(pull, 0.72)).toFixed(1)}px)`
      settleT = window.setTimeout(snapBack, 170)
    }
    window.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.clearTimeout(settleT)
      document.removeEventListener('scroll', on, { capture: true })
      cancelAnimationFrame(srAf)
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={tallRef} className="ss-story" style={{ height: `${TALL_VH}vh` }}>
      <div aria-hidden className="ss-story__anchor" style={{ top: 0 }} />
      <div aria-hidden className="ss-story__anchor" style={{ top: `${BEAT_GAP_VH}vh` }} />
      <div aria-hidden className="ss-story__anchor" style={{ top: `${BEAT_GAP_VH * 2}vh` }} />
      <div aria-hidden className="ss-story__free" style={{ top: `${BEAT_GAP_VH * 2}vh` }} />
      <div ref={pinRef} className="ss-story__pin" aria-label="It all starts with the cursors — then the interactions">
        <div ref={glowRef} className="ss-story__glow" aria-hidden />
        <h2 ref={headARef} className="ss-story__heading">
          It all starts with the cursors.
        </h2>
        <h2 ref={headBRef} className="ss-story__heading" style={{ opacity: 0 }} aria-hidden>
          And next, we wanted you to hear your collaborators interacting with the canvas.
        </h2>
        <h2 ref={headCRef} className="ss-story__heading" style={{ opacity: 0 }} aria-hidden>
          We wanted you to experience this as a 360° audio experience.
        </h2>
        <div ref={arrowRef} className="ss-story__arrow">
          <button type="button" className="ss-icon-btn" aria-label="Continue to the next part" onClick={onArrow}>
            <IconChevronDown />
          </button>
        </div>
        <div ref={spaceRef} className="ss-story__space">
          <div ref={planeRef} className="ss-story__plane">
            {ITEMS.map((item, j) =>
              placed[j] ? (
                <div
                  key={j}
                  ref={(el) => {
                    itemEls.current[j] = el
                  }}
                  onPointerEnter={pingItem(j)}
                  style={{
                    position: 'absolute',
                    left: `${50 + 46 * Math.cos(angleOf(j))}%`,
                    top: `${50 + 46 * Math.sin(angleOf(j))}%`,
                    transform: 'translate(-50%, -50%)',
                    animation: 'ss-story-settle 420ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
                    willChange: 'transform, filter',
                  }}
                >
                  <div data-bounce>
                    {item.kind === 'sticky' ? (
                      <div
                        className="ss-story__sticky"
                        style={{ backgroundColor: STICKY_BY_ID[item.color]?.fill, color: STICKY_BY_ID[item.color]?.text }}
                      >
                        <span aria-hidden>{GHOST_TEXTS[(j / 2) | 0]}</span>
                      </div>
                    ) : (
                      <img className="ss-story__reaction" src={REACTION_SRC[item.reaction]} alt="" />
                    )}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
        {ORBITERS.map((c, i) => (
          <div
            key={c.id}
            ref={(el) => {
              cursorEls.current[i] = el
            }}
            aria-hidden
            className="ss-cursor-slot"
            style={{ zIndex: 3 }}
          >
            <HumanCursor name={c.name} color={c.color} />
          </div>
        ))}
      </div>
    </div>
  )
}
