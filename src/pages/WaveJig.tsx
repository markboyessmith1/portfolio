import { useEffect, useRef, useState, type CSSProperties } from 'react'
import WaveBoard, { TUNE, type BoardFrame, type BoardHandle, type Tune } from '../components/miro/WaveBoard'

/* A jig for the cover's board surface (/cover/jig): the WaveBoard on its own,
   with sliders for the wave, the light and the shadows, and a camera to look
   at it from. Land a frame, watch the stickies drop, tune, then copy the
   settings into TUNE (components/miro/WaveBoard.tsx). */

const note = (x: number, y: number, s = 76) => ({ x, y, w: s, h: s, shape: 'note' as const, r: 0 })
const FRAMES: BoardFrame[] = [
  {
    x: -340, y: -170, w: 300, h: 340, hue: 'sunshine',
    pieces: [note(28, 64), note(116, 64), note(204, 64), note(28, 152), note(116, 152), note(204, 152)].map((p, j) => ({ ...p, r: (j % 3) * 2 - 2 })),
  },
  {
    x: 40, y: -170, w: 300, h: 340, hue: 'pink',
    pieces: [
      note(30, 64, 110), note(160, 64, 110), note(30, 190, 110), note(160, 190, 110),
      { x: 112, y: 76, w: 16, h: 16, shape: 'dot' as const, r: 0 }, { x: 94, y: 76, w: 16, h: 16, shape: 'dot' as const, r: 0 },
    ].map((p, j) => ({ ...p, r: p.shape === 'note' ? (j % 3) * 2 - 2 : 0 })),
  },
]
const TITLE = { x: -340, y: -266, w: 420, h: 40 }

type Range = [key: keyof Tune, label: string, min: number, max: number, step: number]
const GROUPS: [string, Range[]][] = [
  ['Wave', [
    ['amp', 'Height', 0, 40, 0.5],
    ['speed', 'Speed', 20, 600, 5],
    ['width', 'Band width', 10, 220, 1],
    ['wavelength', 'Wavelength', 30, 300, 1],
    ['decay', 'Decay', 0.05, 3, 0.05],
  ]],
  ['Light & material', [
    ['lightAz', 'Light direction', 0, 360, 1],
    ['lightEl', 'Light height', 5, 90, 1],
    ['diffuse', 'Slope shading', 0, 1.2, 0.01],
    ['specular', 'Glint strength', 0, 1, 0.01],
    ['shine', 'Glossiness', 2, 200, 1],
    ['ambient', 'Fill (sky + bounce)', 0, 1, 0.01],
    ['bounce', 'Bounce warmth', 0, 1, 0.01],
    ['falloff', 'Light falloff', 0, 0.6, 0.01],
    ['roll', 'Edge roll-off', 0, 30, 0.5],
    ['occlusion', 'Contact darkening', 0, 1, 0.01],
  ]],
  ['Paper', [
    ['paperGrain', 'Grain', 0, 0.2, 0.005],
    ['paperFibre', 'Fibres', 0, 0.15, 0.005],
    ['paperTooth', 'Tooth (bump)', 0, 2, 0.01],
    ['paperScale', 'Grain size', 0.2, 6, 0.05],
  ]],
  ['Focus', [
    ['focusBlur', 'Blur', 0, 20, 0.25],
    ['focusSize', 'Sharp area %', 0, 120, 1],
    ['focusFeather', 'Feather %', 1, 150, 1],
  ]],
  ['Canvas surface', [
    ['dotSize', 'Dot size', 0, 4, 0.05],
    ['dotGap', 'Dot spacing', 8, 80, 1],
    ['dotInk', 'Dot darkness', 0, 0.6, 0.01],
  ]],
  ['Stickies', [
    ['noteShadow', 'Contact shadow', 0, 0.6, 0.01],
    ['noteSoft', 'Softness at rest', 0, 12, 0.1],
    ['noteBloom', 'Penumbra per px', 0, 1.5, 0.01],
    ['dropHeight', 'Drop height', 0, 120, 1],
    ['shadowReach', 'Shadow reach', 0, 3, 0.05],
    ['noteThickness', 'Thickness', 0, 8, 0.25],
  ]],
  ['Frames', [
    ['frameShadow', 'Ambient shadow', 0, 0.4, 0.005],
    ['frameSoft', 'Ambient softness', 0, 60, 1],
    ['frameContact', 'Lift shadow', 0, 0.4, 0.005],
    ['lift', 'Lift off canvas', 0, 60, 1],
    ['thickness', 'Thickness', 0, 30, 0.5],
    ['bevel', 'Rim highlight', 0, 1, 0.01],
    ['sideShade', 'Side shade', 0.4, 1, 0.01],
  ]],
]
const CAMERA: [key: 'pitch' | 'yaw' | 'roll' | 'zoom', label: string, min: number, max: number, step: number][] = [
  ['pitch', 'Pitch', -40, 40, 0.5],
  ['yaw', 'Yaw', -40, 40, 0.5],
  ['roll', 'Roll', -20, 20, 0.5],
  ['zoom', 'Zoom', 0.4, 3, 0.05],
]

export default function WaveJig() {
  const tune = useRef<Tune>({ ...TUNE })
  const cam = useRef({ pitch: 11, yaw: -14, roll: 2.8, zoom: 1.2 })
  const board = useRef<BoardHandle>(null)
  const [, redraw] = useState(0)
  const [landed, setLanded] = useState<(number | null)[]>([null, null])
  const [placedAt, setPlacedAt] = useState<Record<string, number>>({})
  const [headAt, setHeadAt] = useState<number | null>(null)
  const [loop, setLoop] = useState(true)
  const [copied, setCopied] = useState(false)
  const timers = useRef<number[]>([])

  // land both frames a beat apart, the stickies dropping in after each
  const play = () => {
    timers.current.forEach(clearTimeout)
    setLanded([null, null])
    setPlacedAt({})
    setHeadAt(null)
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    at(200, () => setHeadAt(performance.now() / 1000))
    FRAMES.forEach((f, i) => {
      const t = 400 + i * 1400
      at(t, () => setLanded((l) => l.map((v, j) => (j === i ? performance.now() / 1000 : v))))
      f.pieces.forEach((_, j) => at(t + 450 + j * 170, () => setPlacedAt((s) => ({ ...s, [`${i}-${j}`]: performance.now() / 1000 }))))
    })
  }
  useEffect(() => {
    play()
    if (!loop) return
    const id = window.setInterval(play, 7000)
    return () => { clearInterval(id); timers.current.forEach(clearTimeout) }
  }, [loop])

  useEffect(() => {
    let raf = 0
    const step = () => {
      raf = requestAnimationFrame(step)
      const c = cam.current
      board.current?.render({ W: innerWidth, H: innerHeight, P: tune.current.perspective, bx: 0, by: 0, pitch: c.pitch, yaw: c.yaw, roll: c.roll, z: c.zoom, fx: 0, fy: 0, k: 1, cx: innerWidth > 900 ? 150 / c.zoom : 0, far: false }) // clear of the panel
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const copy = async () => {
    const text = `export const TUNE = ${JSON.stringify(tune.current, null, 2)}`
    try { await navigator.clipboard.writeText(text) } catch { /* the textarea below still shows it */ }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const slider = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void) => (
    <label className="jig__row" key={label}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => { set(+e.target.value); redraw((n) => n + 1) }} />
      <output>{value}</output>
    </label>
  )

  return (
    <div className="cover jig">
      <WaveBoard ref={board} tune={tune.current} frames={FRAMES} head={TITLE} landed={landed} placedAt={placedAt} headAt={headAt} />
      {/* depth of field: sharp at the centre, soft towards the edges */}
      <i className="cover__dof" style={{ '--dof-blur': `${tune.current.focusBlur}px`, '--dof-in': `${tune.current.focusSize}%`, '--dof-out': `${tune.current.focusSize + tune.current.focusFeather}%` } as CSSProperties} />
      <aside className="jig__panel">
        <div className="jig__actions">
          <button onClick={play}>Replay</button>
          <label className="jig__check"><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop</label>
          <button onClick={() => { tune.current = { ...TUNE }; redraw((n) => n + 1) }}>Reset</button>
          <button onClick={copy}>{copied ? 'Copied' : 'Copy settings'}</button>
        </div>
        {GROUPS.map(([title, rows]) => (
          <fieldset key={title}>
            <legend>{title}</legend>
            {rows.map(([k, label, min, max, step]) => slider(label, tune.current[k], min, max, step, (v) => { tune.current[k] = v }))}
          </fieldset>
        ))}
        <fieldset>
          <legend>Camera</legend>
          {slider('Perspective (lens)', tune.current.perspective, 250, 5000, 10, (v) => { tune.current.perspective = v })}
          {CAMERA.map(([k, label, min, max, step]) => slider(label, cam.current[k], min, max, step, (v) => { cam.current[k] = v }))}
        </fieldset>
        <textarea readOnly value={`export const TUNE = ${JSON.stringify(tune.current, null, 2)}`} rows={6} />
      </aside>
    </div>
  )
}
