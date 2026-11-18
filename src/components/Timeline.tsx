import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { TimelineData } from '../data/site'

/* "How we got here": a full-width, two-row timeline on a board. It reads as one
   flow: left to right along the top row, an elbow down from its end (past the
   model moment) into the start of the bottom row, then left to right again.
   When reached, the cards and the arrows between them draw in step; the focus
   row — the IC2 year — lights up under its label. Plays once; reduced motion
   shows it settled. */

/** `x`,`y`: where the arrow lands (every arrow ends pointing right, into a card) */
type Link = { d: string; i: number; x: number; y: number; elbow?: boolean }

/** elbow out of the last top card, down to the turn's line, back across, down into the first bottom card */
const R = 12 // corner radius
function elbow(ax: number, ay: number, bx: number, by: number, midY: number, outX: number, inX: number) {
  return [
    `M${ax},${ay}`,
    `H${outX - R}`, `Q${outX},${ay} ${outX},${ay + R}`,
    `V${midY - R}`, `Q${outX},${midY} ${outX - R},${midY}`,
    `H${inX + R}`, `Q${inX},${midY} ${inX},${midY + R}`,
    `V${by - R}`, `Q${inX},${by} ${inX + R},${by}`,
    `H${bx}`,
  ].join(' ')
}

export default function Timeline({ data }: { data: TimelineData }) {
  const root = useRef<HTMLDivElement>(null)
  // reduced motion: start settled, no build
  const [on, setOn] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [links, setLinks] = useState<Link[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = root.current
    if (!el || on) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: 0.45 })
    io.observe(el)
    return () => io.disconnect()
  }, [on])

  // measure the cards and route the arrows between them (re-run on resize)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => {
      const box = el.getBoundingClientRect()
      const rect = (n: Element) => {
        const r = n.getBoundingClientRect()
        return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cy: r.top - box.top + r.height / 2 }
      }
      const rows = [...el.querySelectorAll('.timeline__row')].map((row) => [...row.querySelectorAll<HTMLElement>('.timeline__step')])
      const turn = el.querySelector('.timeline__turn-label')
      const out: Link[] = []
      const GAP = 3 // arrows stop just short of the card edge
      rows.forEach((cards, r) => {
        cards.forEach((c, k) => {
          const i = Number(c.style.getPropertyValue('--i'))
          if (k > 0) {
            const a = rect(cards[k - 1]), b = rect(c)
            out.push({ d: `M${a.r + GAP},${a.cy} H${b.l - GAP}`, i, x: b.l - GAP, y: b.cy })
          } else if (r > 0) {
            const prev = rows[r - 1]
            const a = rect(prev[prev.length - 1]), b = rect(c)
            const midY = turn ? rect(turn).cy : (a.b + b.t) / 2
            const side = Math.min(28, (box.width - a.r) / 2) // into the board's margin, either side
            out.push({ d: elbow(a.r + GAP, a.cy, b.l - GAP, b.cy, midY, a.r + side, b.l - side), i, x: b.l - GAP, y: b.cy, elbow: true })
          }
        })
      })
      setLinks(out)
      setSize({ w: box.width, h: box.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])

  // one running index across rows, so the build reads left-to-right, top-to-bottom
  let n = 0
  return (
    <div ref={root} className={`timeline${on ? ' is-on' : ''}`}>
      <svg className="timeline__links" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden>
        {links.map((l, k) => {
          // `--i` is the card the arrow lands on: it draws in the beat before that card appears
          const cls = (l.i > (data.rows[0]?.length ?? 0) ? ' is-focus' : '') + (l.elbow ? ' is-elbow' : '')
          return (
            <g key={k} style={{ '--i': l.i } as CSSProperties}>
              <path d={l.d} pathLength={1} className={`timeline__link${cls}`} />
              {/* the head lands once its line has drawn */}
              <path d={`M${l.x - 6},${l.y - 4.5} L${l.x},${l.y} L${l.x - 6},${l.y + 4.5}`} className={`timeline__head${cls}`} />
            </g>
          )
        })}
      </svg>
      {data.rows.map((row, r) => {
        const focus = r === data.focus
        return (
          <div key={r} className={`timeline__group${focus ? ' is-focus' : ''}`}>
            {/* the turn sits between the rows: the moment the models caught up (the elbow runs through it) */}
            {r > 0 && data.turn && (
              <div className="timeline__turn" style={{ '--i': n + 1 } as CSSProperties}>
                <span className="timeline__turn-label">{data.turn}</span>
              </div>
            )}
            {focus && <p className="timeline__label" style={{ '--i': n + 2 } as CSSProperties}>{data.focusLabel}</p>}
            <ol className="timeline__row">
              {row.map((s) => {
                const i = ++n + (r > 0 ? 1 : 0)
                return (
                  <li key={s.when} className="timeline__step" style={{ '--i': i } as CSSProperties}>
                    <span className="timeline__when">{s.when}</span>
                    <span className="timeline__what">{s.what}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
