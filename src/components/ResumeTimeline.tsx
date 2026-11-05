import { useEffect, useRef, useState } from 'react'

/* The resume's experience timeline (right of the copy, desktop only). While the
   experience section crosses the reading line (40% down, level with the jump
   links) a vertical track fades in. A pill pinned on that line shows the year
   under the line: each row of `section` runs from its end year back to its
   start, so scrolling down walks back in time. Year ticks slide past behind it,
   each new year rolls up into the pill (down, scrolling back), and a small
   clock's hands turn with the scroll. Positions are written straight to the
   DOM per frame; only the whole year goes through React. */

const LINE = 0.4
/** px between year ticks */
const GAP = 48
const NOW = new Date().getFullYear()

/** "2024 – 2026" / "2026 – Present" -> [start, end] */
const span = (when: string): [number, number] => {
  const [a, b] = when.match(/\d{4}/g)?.map(Number) ?? [NOW]
  return [a, b ?? NOW]
}

export default function ResumeTimeline({ section, rows }: { section: string; rows: string[] }) {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const minute = useRef<SVGLineElement>(null)
  const hour = useRef<SVGLineElement>(null)
  const spans = rows.map(span)
  const max = Math.max(...spans.map((s) => s[1]))
  const min = Math.min(...spans.map((s) => s[0]))
  const years = Array.from({ length: max - min + 1 }, (_, i) => max - i)
  const [shown, setShown] = useState({ year: max, prev: max, dir: 'up' as 'up' | 'down' })

  useEffect(() => {
    let raf = 0
    const frame = () => {
      raf = 0
      const sec = document.getElementById(section)
      const els = sec ? [...sec.querySelectorAll<HTMLElement>('.resume__job')] : []
      if (!sec || !els.length || !root.current) return
      const line = innerHeight * LINE
      const b = sec.getBoundingClientRect()
      root.current.classList.toggle('is-in', b.top < line + 40 && b.bottom > line)
      // the year under the line: through each row, from its end year back to its start
      let y = spans[0][1]
      els.forEach((el, i) => {
        const top = el.getBoundingClientRect().top
        if (top > line) return
        const next = els[i + 1]?.getBoundingClientRect().top ?? top + el.offsetHeight
        const f = Math.min(1, (line - top) / Math.max(1, next - top))
        y = spans[i][1] + (spans[i][0] - spans[i][1]) * f
      })
      if (track.current) track.current.style.transform = `translateY(${(line - (max - y) * GAP).toFixed(1)}px)`
      const whole = Math.min(max, Math.max(min, Math.round(y)))
      setShown((s) => (s.year === whole ? s : { year: whole, prev: s.year, dir: whole < s.year ? 'up' : 'down' }))
      // the clock's hands turn with the scroll
      minute.current?.setAttribute('transform', `rotate(${(scrollY * 0.9) % 360} 8 8)`)
      hour.current?.setAttribute('transform', `rotate(${(scrollY * 0.075) % 360} 8 8)`)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }
    frame()
    addEventListener('scroll', kick, { passive: true })
    addEventListener('resize', kick)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', kick)
      removeEventListener('resize', kick)
    }
    // spans/max/min derive from rows, which are fixed data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  return (
    <div className="tl" ref={root} aria-hidden>
      <div className="tl__track" ref={track}>
        {years.map((y, i) => <i key={y} className="tl__tick" style={{ top: i * GAP }} />)}
      </div>
      <div className="tl__pill">
        <svg className="tl__clock" viewBox="0 0 16 16" width="14" height="14">
          <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <line ref={hour} x1="8" y1="8" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line ref={minute} x1="8" y1="8" x2="8" y2="3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span className="tl__years">
          {shown.prev !== shown.year && <span key={`p${shown.prev}-${shown.year}`} className={`tl__year is-out-${shown.dir}`}>{shown.prev}</span>}
          <span key={shown.year} className={`tl__year${shown.prev !== shown.year ? ` is-in-${shown.dir}` : ''}`}>{shown.year}</span>
        </span>
      </div>
    </div>
  )
}
