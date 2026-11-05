/* Shared by the Miro case study's headline board (CaseBoard) and the resume's
   current-role line (CurrentRole). */

type Pt = { x: number; y: number }

/* A freehand marker loop around a w×h word box, in real pixels: a slightly
   tilted, wobbly ellipse that starts upper-left, runs clockwise and spirals
   just past its start, like a quick pen stroke. Deterministic, so re-renders
   don't reshuffle it. Returns the path and how far it reaches past the word. */
export function markerLoop(w: number, h: number): { d: string; pad: number } {
  const pad = Math.round(h * 0.22)
  const cx = pad + w / 2
  const cy = pad + h * 0.46
  const rx = w / 2 + pad * 0.55
  const ry = h / 2 + pad * 0.2
  const tilt = (-4 * Math.PI) / 180
  const start = -2.45
  const sweep = Math.PI * 2 + 0.55
  const pts: Pt[] = []
  const n = 90
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = start + sweep * t
    // gentle wobble; the radius grows through the stroke so the end
    // overshoots outside the start instead of closing neatly
    const k = 1 + 0.03 * Math.sin(3 * a + 0.8) + 0.02 * Math.sin(5 * a) + 0.07 * t * t
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * ry * k
    pts.push({ x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) })
  }
  const f = (v: number) => v.toFixed(1)
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    d += ` Q ${f(pts[i].x)} ${f(pts[i].y)} ${f(mx)} ${f(my)}`
  }
  const last = pts[pts.length - 1]
  return { d: d + ` L ${f(last.x)} ${f(last.y)}`, pad }
}
