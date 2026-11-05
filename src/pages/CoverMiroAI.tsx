import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChatCursor, CreationToolbar, type ChatHue, type StickyHue } from '../components/miro'
import { Axis, drift } from '../components/miro/cameraRig'
import { toCanvas } from 'html-to-image'
import WaveBoard, { TUNE, type BoardFrame, type BoardHandle, type Panel } from '../components/miro/WaveBoard'

/* The Miro AI card's cover, as a recordable scene (/cover/miro-ai, outside the
   site chrome). feature-video/scenes/miro-ai-cover.ts drives it: it calls
   window.__start() (the camera settles on the canvas, toolbar centred), then
   clicks the toolbar, picks the Workshop skill and types the prompt for real.
   Sending it plays the build: the field fills with ink as the camera leans in,
   then a straight cut to the board, tight on each frame as the room's cursors
   lay the workshop out, then the camera rises to an overview where the frames read as blocks
   (semantic zoom). Abstract on purpose: plain stickies and grey bars stand in
   for the words.

   The camera is a gimbal rig (cameraRig.ts) run per frame: inertial springs,
   banking into pans, a handheld float, and real depth (layers sit at
   different Z, so every swing has parallax). Zoom is CSS `zoom`, not a
   transform scale: under the 3D tilt Chrome rasters scaled layers at 1x, while
   zoom lays the content out at full size, so close-ups stay sharp. */


type Pt = { x: number; y: number }
type Cam = { x: number; scale: number; ms: number }
type Kind = 'grid' | 'cluster' | 'vote' | 'timeline'
// world units, origin at the middle of the screen; frames run left to right
const FRAMES: { kind: Kind; hue: StickyHue; w: number }[] = [
  { kind: 'grid', hue: 'sunshine', w: 300 },
  { kind: 'cluster', hue: 'cyan', w: 380 },
  { kind: 'vote', hue: 'pink', w: 300 },
  { kind: 'timeline', hue: 'lime', w: 420 },
]
const GAP = 60
const FRAME_H = 340
const FRAME_Y = -FRAME_H / 2
const frameX = FRAMES.reduce<number[]>((xs, _, i) => [...xs, i ? xs[i - 1] + FRAMES[i - 1].w + GAP : -560], [])
const midOf = (i: number) => frameX[i] + FRAMES[i].w / 2

/** Pieces inside each frame (world units, relative to the frame). */
type Piece = { x: number; y: number; w: number; h: number; shape: 'note' | 'bar' | 'dot' }
function piecesOf(i: number): Piece[] {
  const f = FRAMES[i]
  const note = (x: number, y: number, s = 76): Piece => ({ x, y, w: s, h: s, shape: 'note' })
  switch (f.kind) {
    case 'grid':
      return [note(28, 64), note(116, 64), note(204, 64), note(28, 152), note(116, 152), note(204, 152)]
    case 'cluster':
      return [note(30, 70, 64), note(84, 96, 64), note(40, 150, 64), note(220, 66, 64), note(276, 104, 64), note(232, 170, 64), note(150, 236, 64)]
    case 'vote':
      return [note(30, 64, 110), note(160, 64, 110), note(30, 190, 110), note(160, 190, 110),
        { x: 112, y: 76, w: 16, h: 16, shape: 'dot' }, { x: 94, y: 76, w: 16, h: 16, shape: 'dot' }, { x: 242, y: 202, w: 16, h: 16, shape: 'dot' }]
    case 'timeline':
      return [
        { x: 28, y: 76, w: 180, h: 26, shape: 'bar' }, { x: 120, y: 124, w: 200, h: 26, shape: 'bar' },
        { x: 210, y: 172, w: 170, h: 26, shape: 'bar' }, { x: 300, y: 220, w: 96, h: 26, shape: 'bar' },
      ]
  }
}
const center = (i: number, p: Piece): Pt => ({ x: frameX[i] + p.x + p.w / 2, y: FRAME_Y + p.y + p.h / 2 })

const ACTORS: { id: string; name: string; hue: ChatHue; enter: Pt }[] = [
  { id: 'sidekick', name: 'Sidekick', hue: 'lilac', enter: { x: 0, y: 700 } },
  { id: 'ana', name: 'Ana', hue: 'coral', enter: { x: -900, y: -700 } },
  { id: 'ben', name: 'Ben', hue: 'cyan', enter: { x: 300, y: -800 } },
  { id: 'claude', name: 'Claude', hue: 'claude', enter: { x: 900, y: 700 } },
]
type Actor = Pt & { say: string | null; ms: number }
const CREW = ['ana', 'ben', 'claude', 'sidekick']

const SKILLS = ['Workshop', 'Brainstorm', 'Retro', 'Plan']
let played = false

/** Depth of field for a zoom level: blur strength and the sharp band (as % of the screen). */
function dof(s: number, U = 1) {
  const k = Math.min(1, Math.max(0, (s - 1) / 1.8)) // 0 at the board view, 1 in the tightest close-up
  // the close-ups take the full blur and the tightest focus; the board view a third of it
  return {
    '--dof-blur': `${(TUNE.focusBlur * (0.35 + 0.65 * k) * U).toFixed(2)}px`,
    '--dof-in': `${(TUNE.focusSize * (1.3 - 0.5 * k)).toFixed(1)}%`,
    '--dof-out': `${((TUNE.focusSize + TUNE.focusFeather) * (1.3 - 0.4 * k)).toFixed(1)}%`,
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Soft shapes on the near plane (screen px, before parallax). */
const BOKEH: { x: number; y: number; s: number; hue: StickyHue }[] = [
  { x: -40, y: 90, s: 150, hue: 'sunshine' },
  { x: 560, y: 40, s: 110, hue: 'cyan' },
  { x: 980, y: 760, s: 170, hue: 'pink' },
  { x: 1500, y: 120, s: 130, hue: 'lime' },
  { x: 2050, y: 820, s: 150, hue: 'sunshine' },
]
/** The board as WaveBoard draws it (world units). */
const LAYOUT: BoardFrame[] = FRAMES.map((f, i) => ({
  x: frameX[i], y: FRAME_Y, w: f.w, h: FRAME_H, hue: f.hue,
  pieces: piecesOf(i).map((p, j) => ({ ...p, r: p.shape === 'note' ? ((i + j) % 3) * 2 - 2 : 0 })),
}))
const TITLE = { x: frameX[0], y: FRAME_Y - 96, w: 420, h: 40 }

/** The build's framing: right in on the frames as the camera dollies along. */
const CLOSE = 1.75
/** A frame lands every BEAT ms. */
const BEAT = 2700
/** Cursor travel: a soft ease-in-out, so chained moves flow into each other. */
const GLIDE = 'cubic-bezier(0.37, 0, 0.25, 1)'
const BOARD_MID = (frameX[0] + frameX[FRAMES.length - 1] + FRAMES[FRAMES.length - 1].w) / 2
/** The scene is designed at 720 × 960 (the card) and scales to fill any screen,
    so the recorder can capture it at full resolution (headless Chrome's
    screencast ignores the device pixel ratio: it records CSS pixels). */
const unit = () => Math.min(innerWidth / 720, innerHeight / 960)

export default function CoverMiroAI() {
  // after the front-on opening the view tips onto an angle and the UI turns to lit acrylic
  const [lit, setLit] = useState(false)
  // the main character: a Miro cursor that rides the recorder's moves (its own
  // drawn arrow is hidden; see .cover ~ #demo-cursor)
  const [me, setMe] = useState<{ x: number; y: number; down: boolean; on: boolean }>({ x: -200, y: -200, down: false, on: true })
  // the build is under way: the near plane of the parallax comes in
  const [building, setBuilding] = useState(false)
  // when each frame landed (its surface ripples from then)
  const [landed, setLanded] = useState<(number | null)[]>(() => FRAMES.map(() => null))
  const [sent, setSent] = useState(false)
  const [bar, setBar] = useState<'center' | 'gone'>('center')
  const [headAt, setHeadAt] = useState<number | null>(null)
  // the cut: everything from the toolbar shot is gone in the same frame (no fades)
  const [cut, setCut] = useState(false)
  const [placedAt, setPlacedAt] = useState<Record<string, number>>({})
  const [actors, setActors] = useState<Record<string, Actor>>(() =>
    Object.fromEntries(ACTORS.map((a) => [a.id, { ...a.enter, say: null, ms: 0 }])),
  )
  const move = (id: string, p: Pt, ms = 900, say: string | null = null) =>
    setActors((s) => ({ ...s, [id]: { ...p, ms, say } }))
  const hush = (id: string, after: number) =>
    window.setTimeout(() => setActors((s) => ({ ...s, [id]: { ...s[id], say: null } })), after)

  /* ---- the rig ----
     lens: zoom (as ln s, so zooms feel even) and the point held at the centre,
     in the zoom layer's units; tilt: 0 front-on, 1 the full angle; world: the
     canvas camera (x, scale) the build pans with; accent: scripted swooshes */
  const rig = useRef({
    ls: new Axis(0), fx: new Axis(0), fy: new Axis(0), tilt: new Axis(0),
    cx: new Axis(0), ck: new Axis(1), accent: new Axis(0), lean: new Axis(0), dip: new Axis(0),
  }).current
  const coverEl = useRef<HTMLDivElement>(null)
  const board = useRef<BoardHandle>(null)
  const lensEl = useRef<HTMLDivElement>(null)
  const zoomEl = useRef<HTMLDivElement>(null)
  const worldEl = useRef<HTMLDivElement>(null)
  const fgEl = useRef<HTMLDivElement>(null)
  const dofEl = useRef<HTMLElement>(null)
  const meZoomEl = useRef<HTMLDivElement>(null)
  const meSpaceEl = useRef<HTMLDivElement>(null)
  const accentBack = useRef(0)
  /** A dolly: the canvas camera's x follows these keys ([seconds, x], absolute
      time) so the move never stops between frames; the spring rounds the corners. */
  const track = useRef<[number, number][] | null>(null)
  /** A swing of the camera angle into a move; it floats back past centre on its own. */
  const swoosh = (deg: number, hold: number) => {
    rig.accent.aim(deg, 0.45, 0.55)
    window.clearTimeout(accentBack.current)
    accentBack.current = window.setTimeout(() => rig.accent.aim(0, 0.9, 0.45), hold)
  }
  const setCam = (c: Cam) => { rig.cx.aim(c.x, c.ms / 1000, 0.72); rig.ck.aim(c.scale, c.ms / 1000, 0.8) }

  useEffect(() => {
    let raf = 0, last = performance.now(), prevX = 0, prevLs = 0
    const t0 = last
    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(1 / 20, (now - last) / 1000)
      last = now
      // substeps keep the stiff springs stable on a slow frame
      const keys = track.current
      if (keys) {
        const t = now / 1000
        const j = keys.findIndex(([kt]) => kt > t)
        rig.cx.to = j < 0 ? keys[keys.length - 1][1] : j === 0 ? keys[0][1]
          : keys[j - 1][1] + (keys[j][1] - keys[j - 1][1]) * ((t - keys[j - 1][0]) / (keys[j][0] - keys[j - 1][0]))
      }
      for (let i = 0; i < 4; i++) for (const a of Object.values(rig)) a.step(dt / 4)
      const U = unit()
      const s = Math.exp(rig.ls.x), fx = rig.fx.x, fy = rig.fy.x, k = rig.ck.x, cx = rig.cx.x, tilt = rig.tilt.x
      // inertia you can feel: the head banks into a pan and dips into a push,
      // lagging behind the move on its own spring, then floats level again
      const X = (cx * k + fx) * s // the pan, in design px
      const vx = dt ? (X - prevX) / dt : 0, vz = dt ? (rig.ls.x - prevLs) / dt : 0
      prevX = X; prevLs = rig.ls.x
      rig.lean.aim(Math.max(-3.5, Math.min(3.5, -vx * 0.0035)), 0.6, 0.6)
      rig.dip.aim(Math.max(-2.5, Math.min(2.5, -vz * 1.4)), 0.55, 0.62)
      const t = (now - t0) / 1000
      const hand = Math.min(1, tilt * 1.4) // front-on is locked off; the float comes with the angle
      const swing = rig.accent.x + rig.lean.x
      const yaw = -20 * tilt + swing + hand * 0.8 * drift(t, [0.07, 0.13, 0.29])
      const pitch = 16 * tilt + rig.dip.x + hand * 0.55 * drift(t + 9, [0.05, 0.11, 0.23])
      const roll = 4 * tilt - 0.2 * swing + hand * 0.35 * drift(t + 21, [0.04, 0.09, 0.19])
      const bx = U * hand * 3 * drift(t + 4, [0.06, 0.15]), by = U * hand * 2.4 * drift(t + 15, [0.05, 0.12])
      if (coverEl.current) coverEl.current.style.perspective = `${(TUNE.perspective * U).toFixed(0)}px`
      if (lensEl.current) lensEl.current.style.transform = `translate(${bx.toFixed(2)}px, ${by.toFixed(2)}px) rotateX(${pitch.toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg)`
      if (zoomEl.current) {
        zoomEl.current.style.zoom = (s * U).toFixed(4)
        zoomEl.current.style.translate = `${(-fx).toFixed(2)}px ${(-fy).toFixed(2)}px`
      }
      if (worldEl.current) worldEl.current.style.transform = `scale(${k.toFixed(4)}) translateX(${(-cx).toFixed(2)}px)`
      if (meZoomEl.current) {
        meZoomEl.current.style.zoom = (s * U).toFixed(4)
        // Mark's cursor lies on the canvas too: the lens's angle, in the scene's perspective
        meZoomEl.current.style.transform = `rotateX(${pitch.toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg)`
      }
      if (meSpaceEl.current) meSpaceEl.current.style.perspective = `${(TUNE.perspective * U).toFixed(0)}px`
      // the near layer slides faster than the board: parallax on every pan
      if (fgEl.current) {
        fgEl.current.style.zoom = U.toFixed(4)
        fgEl.current.style.translate = `${(-X * 0.55).toFixed(1)}px 0`
      }
      if (dofEl.current) for (const [p, v] of Object.entries(dof(s, U))) dofEl.current.style.setProperty(p, v)
      // semantic zoom: far enough out, frames read as labelled blocks
      // the toolbar's cards are drawn by the board too (same material as the frames):
      // measure where they sit in the zoom layer, off the tilt, once a frame
      const bar = document.querySelector<HTMLElement>('.cover__bar')
      const panels: Panel[] = []
      if (board.current && bar && lensEl.current && !bar.classList.contains('is-gone')) {
        const ct = bar.querySelector('.ct')!
        const els = ct.classList.contains('ct--compose') ? [...bar.querySelectorAll<HTMLElement>('.ct__tools-shell, .ct__compose')] : [ct as HTMLElement]
        const was = lensEl.current.style.transform
        lensEl.current.style.transform = 'none'
        const sU = s * U
        for (const el of els) {
          const r = el.getBoundingClientRect()
          const x = fx + (r.left - innerWidth / 2) / sU, y = fy + (r.top - innerHeight / 2) / sU
          panels.push({ x: x / k + cx, y: y / k, w: r.width / sU / k, h: r.height / sU / k, r: parseFloat(getComputedStyle(el).borderRadius) || 16, z: 30 / k })
        }
        lensEl.current.style.transform = was
      }
      board.current?.panels(panels)
      // the board is WebGL: hand it the same camera, this frame
      board.current?.render({ W: innerWidth, H: innerHeight, P: TUNE.perspective * U, bx, by, pitch, yaw, roll, z: s * U, fx, fy, k, cx, far: s * k < 0.72 })
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [rig])

  useEffect(() => {
    type Drawn = { move: (x: number, y: number) => void; press: (on: boolean) => void }
    const hook = window.setInterval(() => {
      const c = (window as unknown as { __cursor?: Drawn & { hooked?: boolean } }).__cursor
      if (!c || c.hooked) return
      const { move, press } = c
      c.move = (x, y) => { move(x, y); setMe((m) => ({ ...m, x, y })) }
      c.press = (on) => { press(on); setMe((m) => ({ ...m, down: on })) }
      c.hooked = true
      window.clearInterval(hook)
    }, 30)
    ;(window as unknown as Record<string, unknown>).__hideMe = () => setMe((m) => ({ ...m, on: false }))
    return () => window.clearInterval(hook)
  }, [])

  /** Where an element sits in the zoom layer's units (measured off the tilt). */
  const place = (sel: string) => {
    const lens = lensEl.current!
    const was = lens.style.transform
    lens.style.transform = 'none'
    const r = document.querySelector(sel)!.getBoundingClientRect()
    lens.style.transform = was
    const s = Math.exp(rig.ls.x) * unit()
    const at = (sx: number, sy: number) => ({ x: rig.fx.x + (sx - innerWidth / 2) / s, y: rig.fy.x + (sy - innerHeight / 2) / s })
    return { ...at(r.left + r.width / 2, r.top + r.height / 2), left: at(r.left, r.top).x, right: at(r.right, r.top).x, w: r.width / s, h: r.height / s }
  }

  /* The toolbar ripples too: it's live DOM (the recorder clicks and types into
     it), so for a ripple it's photographed and handed to the board as a sheet in
     exactly its place; the DOM copy goes invisible (still clickable) until the
     wave has eased out, then takes over again. */
  const fontCSS = useRef<Promise<string> | null>(null)
  /** Inter (latin), inlined: the snapshot renders in isolation and can't read Google's stylesheet itself. */
  const embedInter = async () => {
    const link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css2"]')
    if (!link) return ''
    const css = await (await fetch(link.href)).text()
    const latin = css.split('/*').filter((b) => b.startsWith(' latin */') && b.includes("'Inter'")).map((b) => b.slice(b.indexOf('@font-face')))
    const inline = await Promise.all(latin.map(async (face) => {
      const url = face.match(/url\((https:[^)]+)\)/)?.[1]
      if (!url) return face
      const blob = await (await fetch(url)).blob()
      const data = await new Promise<string>((done) => { const r = new FileReader(); r.onload = () => done(r.result as string); r.readAsDataURL(blob) })
      return face.replace(url, data)
    }))
    return inline.join('\n')
  }
  const skinTimer = useRef(0)
  const rippleToolbar = async (len: number) => {
    const el = document.querySelector<HTMLElement>('.cover__bar .ct')
    const bar = document.querySelector<HTMLElement>('.cover__bar')
    if (!el || !bar || !board.current) return
    const q = place('.cover__bar .ct')
    fontCSS.current ??= embedInter().catch(() => '')
    const sharp = Math.min(4, Math.exp(rig.ls.x) * unit() * devicePixelRatio * 1.25)
    const image = await toCanvas(el, { pixelRatio: sharp, fontEmbedCSS: await fontCSS.current, width: q.w, height: q.h })
    // the acrylic's backdrop blur can't be photographed: firm up its translucency
    // so the board's dots don't show through sharper than they do in the DOM
    const g = image.getContext('2d')!
    const px = g.getImageData(0, 0, image.width, image.height)
    for (let i = 3; i < px.data.length; i += 4) px.data[i] = Math.min(255, px.data[i] * 1.9)
    g.putImageData(px, 0, 0)
    const k = rig.ck.x
    board.current.skin({ image, x: q.left / k + rig.cx.x, y: (q.y - q.h / 2) / k, w: q.w / k, h: q.h / k, z: 30 / k, r: parseFloat(getComputedStyle(el).borderRadius) || 16, at: performance.now() / 1000, len })
    // the hand-over is a cut, both ways (no fade: two toolbars would show)
    bar.style.transition = 'none'
    bar.style.opacity = '0'
    window.clearTimeout(skinTimer.current)
    skinTimer.current = window.setTimeout(unskin, len * 1000)
  }
  // embed the font up front, so a ripple can go up the moment it's called
  useEffect(() => { fontCSS.current ??= embedInter().catch(() => '') }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const unskin = () => {
    window.clearTimeout(skinTimer.current)
    board.current?.skin(null)
    const bar = document.querySelector<HTMLElement>('.cover__bar')
    if (bar) { bar.style.opacity = ''; requestAnimationFrame(() => { bar.style.transition = '' }) }
  }

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    // the recorder drives the camera beats once the screencast is rolling:
    // open right in on the toolbar's tools (a cut) …
    w.__start = () => {
      const p = place('.cover__bar .ct')
      rig.ls.snap(Math.log(3)); rig.fx.snap(p.left + 70); rig.fy.snap(p.y)
    }
    // … a slow lateral dolly across it to the AI field, tipping onto the angle …
    w.__pan = (ms: number) => {
      setLit(true)
      rig.tilt.aim(1, 2.2, 0.62)
      const p = place('.cover__bar .ct')
      rig.ls.aim(Math.log(2.6), ms / 1000 * 1.15, 0.8)
      swoosh(-2, 900)
      // a wave runs along the toolbar, and the camera rides it: the target travels
      // at the wave's own speed, just behind the crest, from the tools to the field
      void rippleToolbar(2.9)
      const from = rig.fx.x, to = p.right - 120, t0 = performance.now() + 450
      rig.fx.aim(from, 0.7, 0.85)
      const ride = () => {
        const x = Math.min(to, from + Math.max(0, (performance.now() - t0) / 1000) * TUNE.speed * 0.95)
        rig.fx.to = x
        if (x < to) requestAnimationFrame(ride)
      }
      requestAnimationFrame(ride)
    }
    // … and ease back enough to read the skills over the composer
    w.__compose = (ms: number) => {
      // prompt mode: square up to it, face-on and centred (no tilt, roll or float)
      rig.tilt.aim(0, ms / 1000 * 1.5, 0.8)
      rig.accent.aim(0, 0.6, 0.8)
      rig.ls.aim(Math.log(1.4), ms / 1000 * 1.4, 0.72)
      rig.fx.aim(0, ms / 1000 * 1.3, 0.7)
      rig.fy.aim(-20, ms / 1000 * 1.3, 0.7)
      // once the composer has opened out, centre exactly on the chat bar
      window.setTimeout(() => {
        const c = place('.cover__bar .ct__field')
        rig.fx.aim(c.x, 0.8, 0.8)
        rig.fy.aim(c.y, 0.8, 0.8)
      }, 450)
    }
  }, [rig])

  // ?play: the page runs the recorder's script itself, for watching in a browser
  // (same beats and timings as feature-video/scenes/miro-ai-cover.ts). Reload to replay.
  useEffect(() => {
    // once per page load (StrictMode mounts effects twice in dev)
    if (!new URLSearchParams(location.search).has('play') || played) return
    played = true
    const w = window as unknown as Record<string, (ms?: number) => void>
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)
    let at = { x: innerWidth - 3, y: innerHeight * 0.55 }
    const glide = (x: number, y: number, ms: number) => new Promise<void>((done) => {
      const from = at, t0 = performance.now()
      const step = (now: number) => {
        const k = ease(Math.min(1, (now - t0) / ms))
        at = { x: from.x + (x - from.x) * k, y: from.y + (y - from.y) * k }
        setMe((m) => ({ ...m, x: at.x, y: at.y }))
        if (k < 1) requestAnimationFrame(step); else done()
      }
      requestAnimationFrame(step)
    })
    const click = async () => { setMe((m) => ({ ...m, down: true })); await sleep(70); setMe((m) => ({ ...m, down: false })) }
    const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect()
    const input = () => document.querySelector<HTMLInputElement>('.ct__field input')!
    // React tracks the value itself: set it through the native setter, then announce it
    const setValue = (v: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), v)
      input().dispatchEvent(new Event('input', { bubbles: true }))
    }
    ;(async () => {
      await sleep(900)
      w.__start()
      setMe((m) => ({ ...m, ...at }))
      await sleep(600)
      w.__pan(2600)
      await sleep(2700)
      const f = box('.ct__field input')
      await glide(Math.min(f.right - 90, innerWidth - 60), f.top + f.height / 2, 800)
      await sleep(200)
      await click()
      input().focus()
      w.__compose(900)
      await sleep(1800)
      const k = box('[data-skill="Workshop"]')
      await glide(k.left + k.width / 2, k.top + k.height / 2, 520)
      await sleep(250)
      await click()
      document.querySelector<HTMLButtonElement>('[data-skill="Workshop"]')!.click()
      await sleep(350)
      for (const ch of 'plan our Q3 launch') { setValue(input().value + ch); await sleep(45) }
      await sleep(450)
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await sleep(300)
      await glide(innerWidth * 0.8, innerHeight * 0.7, 900)
      w.__hideMe()
    })()
  }, [])

  const build = async () => {
    // 1. the prompt goes in: the field fills with ink and the camera leans into it
    setSent(true)
    const field = place('.cover__bar .ct__field')
    rig.ls.aim(rig.ls.x + 0.32, 0.55, 0.85)
    rig.fx.aim(field.x, 0.55, 0.85)
    rig.fy.aim(field.y, 0.55, 0.85)
    swoosh(1.75, 350)
    await sleep(800)
    // 2. a straight cut to the board, tight on the first frame (title in shot)
    setBar('gone')
    setCut(true)
    rig.cx.snap(midOf(0)); rig.ck.snap(1)
    rig.ls.snap(Math.log(CLOSE)); rig.fx.snap(0); rig.fy.snap(0)
    rig.tilt.snap(0.7); rig.accent.snap(0); rig.lean.snap(0); rig.dip.snap(0)
    setBuilding(true)
    setHeadAt(performance.now() / 1000)
    move('sidekick', { x: midOf(0), y: 140 }, 700, 'On it')
    hush('sidekick', 1300)
    // 3. one continuous dolly along the board: a frame lands every BEAT, and the
    //    camera glides through each as the crew fills it, never stopping
    const t0 = performance.now() + 700
    const landAt = (i: number) => t0 + i * BEAT
    track.current = [
      [t0 / 1000, midOf(0) - 60],
      ...FRAMES.map((_, i) => [(landAt(i) + BEAT * 0.55) / 1000, midOf(i)] as [number, number]),
      [(landAt(FRAMES.length - 1) + BEAT * 1.1) / 1000, midOf(FRAMES.length - 1) + 30],
    ]
    rig.cx.aim(rig.cx.x, 1.1, 0.9)
    rig.ls.aim(Math.log(CLOSE), 1.6, 0.8)
    const when = (t: number, fn: () => void) => window.setTimeout(fn, Math.max(0, t - performance.now()))
    // the crew flows: each cursor glides from sticky to sticky, dropping one as it
    // arrives and already moving on to the next (moves overlap, nobody waits)
    const pos: Record<string, Pt> = Object.fromEntries(CREW.map((id) => [id, actors[id]]))
    const glide = (id: string, to: Pt) => {
      const d = Math.hypot(to.x - pos[id].x, to.y - pos[id].y)
      const ms = Math.round(Math.min(1100, Math.max(420, d * 1.5)))
      pos[id] = to
      move(id, to, ms)
      return ms
    }
    FRAMES.forEach((fr, i) => {
      // Sidekick draws the frame in from its corner just before it lands
      when(landAt(i) - 450, () => move('sidekick', { x: frameX[i] + fr.w - 30, y: FRAME_Y + 14 }, 600))
      when(landAt(i), () => {
        setLanded((l) => l.map((t, j) => (j === i ? performance.now() / 1000 : t)))
      })
      const ps = piecesOf(i)
      CREW.slice(0, 3).forEach((id, c) => {
        const mine = ps.map((p, j) => ({ p, j })).filter(({ j }) => (j + i) % 3 === c)
        when(landAt(i) + 280 + c * 140, async () => {
          for (const { p, j } of mine) {
            const c = center(i, p)
            const ms = glide(id, { x: c.x + 14, y: c.y + 14 })
            await sleep(ms * 0.62) // the sticky drops as the cursor eases in…
            setPlacedAt((s) => ({ ...s, [`${i}-${j}`]: performance.now() / 1000 }))
            await sleep(ms * 0.12) // …and it is already on its way
          }
        })
      })
      if (i === 1) when(landAt(i) + 1500, () => { setActors((s) => ({ ...s, ana: { ...s.ana, say: 'Love this 🔥' } })); hush('ana', 1300) })
    })
    await sleep(landAt(FRAMES.length - 1) + BEAT - performance.now())
    track.current = null
    move('sidekick', { x: midOf(FRAMES.length - 1), y: FRAME_Y + FRAME_H + 60 }, 800, 'Ready when you are')
    await sleep(1100)
    // 4. rise to the overview: the frames collapse to labelled blocks (semantic zoom)
    setCam({ x: BOARD_MID, scale: 1, ms: 2600 })
    rig.ls.aim(Math.log(0.4), 2.8, 0.8)
    rig.tilt.aim(0.5, 2.8, 0.7)
    swoosh(2.5, 900)
  }

  // the toolbar is DOM: it takes the board's material in CSS, from the same settings
  const az = (TUNE.lightAz * Math.PI) / 180
  const material = {
    // the light's falloff runs away from where it comes from (board y runs down)
    '--key-angle': `${((Math.atan2(-Math.cos(az), Math.sin(az)) * 180) / Math.PI).toFixed(1)}deg`,
    '--key-x': `${(-Math.cos(az) * 1.5).toFixed(2)}px`,
    '--key-y': `${(-Math.sin(az) * 1.5).toFixed(2)}px`,
    '--key-shade': (TUNE.diffuse * 0.5).toFixed(3),
    '--key-rim': TUNE.bevel.toFixed(2),
    '--paper-grain': Math.min(1, TUNE.paperGrain * 14 + TUNE.paperTooth * 0.12).toFixed(3),
    '--paper-freq': Math.min(4, Math.max(0.4, 0.9 / TUNE.paperScale)).toFixed(2),
  } as CSSProperties

  return (
    <div ref={coverEl} style={material} className={`cover${lit ? ' is-lit' : ''}${building ? ' is-building' : ''}${sent ? ' is-sent' : ''}`}>
      {/* the board: WebGL, under the DOM scene, on the same camera */}
      <WaveBoard ref={board} frames={LAYOUT} head={TITLE} landed={landed} placedAt={placedAt} headAt={headAt} />
      <div className="cover__lens" ref={lensEl}>
        {/* the zoom layer: everything on the canvas, held around the focus */}
        <div className="cover__zoom" ref={zoomEl}>
          <div className="cover__world" ref={worldEl}>
            {/* cursors live on the canvas, a layer above the board */}
            {ACTORS.map((a) => {
              const s = actors[a.id]
              return (
                <div key={a.id} className="cover__actor" style={{ left: s.x, top: s.y, transition: `left ${s.ms}ms ${GLIDE}, top ${s.ms}ms ${GLIDE}` }}>
                  <ChatCursor name={a.name} hue={a.hue} say={s.say} charMs={28} />
                </div>
              )
            })}
          </div>
          <div className={`cover__bar is-${bar}`}>
            <CreationToolbar placeholder="Ask Sidekick" composePlaceholder="Pick a skill or describe it" skills={SKILLS} onSend={() => void build()} />
          </div>
        </div>
        {/* out-of-focus shapes close to the lens: the near plane of the parallax */}
        <div className="cover__fg" ref={fgEl} aria-hidden>
          {BOKEH.map((b, i) => <i key={i} style={{ left: b.x, top: b.y, width: b.s, height: b.s, background: `var(--miro-${b.hue}-sticky-background)` }} />)}
        </div>
      </div>
      {/* depth of field: sharp at the focus (the screen centre), soft away from it;
          the closer the shot, the stronger the blur and the shallower the focus */}
      <i className="cover__dof" ref={dofEl} />
      {/* the same perspective as the scene, from the screen centre */}
      <div className="cover__me-space" ref={meSpaceEl}>
        <div className={`cover__me${me.down ? ' is-down' : ''}${me.on ? '' : ' is-off'}${cut ? ' is-cut' : ''}`} style={{ translate: `${me.x}px ${me.y}px` }}>
          {/* Mark's cursor is in screen space, so it takes the close-up's zoom here */}
          <div className="cover__me-zoom" ref={meZoomEl}>
            <ChatCursor name="Mark" hue="ocean" say={null} />
          </div>
        </div>
      </div>
    </div>
  )
}
