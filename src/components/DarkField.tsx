/* The dark chapter's ground: one dot grid, each dot set at one of three depths.
   Every cell of the grid gets a single dot, dealt to far, middle or near (a fixed
   shuffle over a 10 × 10 tile, so the pattern doesn't read as repeating). Each
   depth is its own layer, so it can drift at its own rate as the page scrolls
   (scroll-driven CSS, .dark-field__dots--*). Nearer dots are brighter, crisper
   and a touch larger; further ones are fainter and softer, as if through haze.
   Over them, a window-sized lens keeps the middle of the screen in focus and
   blurs and darkens the rim. Decorative; styles in styles.css (.dark-field*). */

const PITCH = 28 // px between dots
const CELLS = 10 // the tile is CELLS × CELLS dots
const TILE = PITCH * CELLS

type Depth = { key: 'far' | 'mid' | 'near'; share: number; r: number; alpha: number; blur: number }
// far → near: fainter and hazier (smaller, softer) to brighter and crisper
const DEPTHS: Depth[] = [
  { key: 'far', share: 0.45, r: 0.75, alpha: 0.07, blur: 0.7 },
  { key: 'mid', share: 0.35, r: 0.95, alpha: 0.12, blur: 0.3 },
  { key: 'near', share: 0.2, r: 1.25, alpha: 0.2, blur: 0 },
]

// a fixed shuffle (seeded), so the layout is the same on every visit
function deal(): number[] {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const n = CELLS * CELLS
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  const depthOf = new Array<number>(n)
  let at = 0
  DEPTHS.forEach((d, k) => {
    const count = k === DEPTHS.length - 1 ? n - at : Math.round(d.share * n)
    for (let c = 0; c < count; c++) depthOf[order[at + c]] = k
    at += count
  })
  return depthOf
}

function tile(depthOf: number[], k: number): string {
  const d = DEPTHS[k]
  const dots = depthOf.flatMap((dk, i) => dk === k
    ? [`<circle cx="${(i % CELLS) * PITCH + PITCH / 2}" cy="${Math.floor(i / CELLS) * PITCH + PITCH / 2}" r="${d.r}"/>`]
    : [])
  const filter = d.blur ? `<filter id="h" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${d.blur}"/></filter>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">${filter}<g fill="#fff" fill-opacity="${d.alpha}"${d.blur ? ' filter="url(#h)"' : ''}>${dots.join('')}</g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const depthOf = deal()
const TILES = DEPTHS.map((d, k) => ({ key: d.key, image: tile(depthOf, k) }))

export default function DarkField() {
  return (
    <div className="dark-field" aria-hidden>
      {TILES.map((t) => (
        <div key={t.key} className={`dark-field__dots dark-field__dots--${t.key}`} style={{ backgroundImage: t.image, backgroundSize: `${TILE}px ${TILE}px` }} />
      ))}
      <div className="dark-field__lens"><div /></div>
    </div>
  )
}
