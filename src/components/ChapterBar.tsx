import { useEffect, useRef, useState } from 'react'
import type { WorkItem } from '../data/site'

/* Case-study chapter bar (top right, in the podcast's place): a ring that
   fills with your progress down the page, the chapter you're reading (it
   swaps as you scroll), and a list of every chapter to jump to. Chapters
   are the case's titled sections, then its shelves, grouped as "Use cases"
   (they revisit the same story beats, so they share titles). */

/** `sub`: the section's sub-chapter (e.g. "How we design"), shown as a heading in the list */
type Chapter = { title: string; group: 'Chapter' | 'Use cases'; sub?: string; target: () => HTMLElement | null }

/** a chapter is current once its top passes this share of the viewport */
const LINE = 0.2
const RING_R = 15
const RING_C = 2 * Math.PI * RING_R

function chaptersOf(item: WorkItem): Chapter[] {
  return [
    ...item.sections.flatMap((s, i) =>
      s.heading ? [{ title: s.heading, group: 'Chapter' as const, sub: s.group, target: () => document.querySelector<HTMLElement>(`.case-left [data-panel="${i}"]`) }] : [],
    ),
    ...(item.shelves ?? []).map((s) => ({ title: s.title, group: 'Use cases' as const, target: () => document.getElementById(s.id) })),
  ]
}

/** the list heading a chapter falls under ('' for plain chapters) */
const label = (c: Chapter) => c.sub ?? (c.group === 'Use cases' ? 'Use cases' : '')

export default function ChapterBar({ item }: { item: WorkItem }) {
  const [chapters] = useState(() => chaptersOf(item))
  // -1: still on the opening screen, before the first chapter
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)
  const ring = useRef<SVGCircleElement>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const line = window.innerHeight * LINE
      let idx = -1
      chapters.forEach((c, i) => {
        const el = c.target()
        if (el && el.getBoundingClientRect().top <= line) idx = i
      })
      setActive(idx)
      // the ring is written directly: no re-render per scroll frame
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      ring.current?.style.setProperty('stroke-dashoffset', String(RING_C * (1 - p)))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [chapters])

  // close the list on an outside click or Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const go = (i: number) => {
    chapters[i].target()?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setOpen(false)
  }

  const current = active >= 0 ? chapters[active].title : item.headline ?? item.title
  // "Chapter 2" / "Use case 1": numbered within its group; before the first, the introduction
  const sub = active < 0
    ? 'Introduction'
    : `${chapters[active].group === 'Chapter' ? 'Chapter' : 'Use case'} ${chapters.slice(0, active + 1).filter((c) => c.group === chapters[active].group).length}`

  return (
    <div className="chapterbar-wrap" ref={root}>
      <button type="button" className="chapterbar glass" aria-expanded={open} aria-controls="chapter-list" onClick={() => setOpen((o) => !o)}>
        <svg className="chapterbar__ring" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r={RING_R} className="chapterbar__track" />
          <circle ref={ring} cx="18" cy="18" r={RING_R} className="chapterbar__fill" strokeDasharray={RING_C} strokeDashoffset={RING_C} />
        </svg>
        <span className="chapterbar__meta">
          {/* the title swaps in place as the chapter changes */}
          <span className="chapterbar__title" key={current} aria-live="polite">{current}</span>
          <span className="chapterbar__sub">{sub}</span>
        </span>
        <span className="chapterbar__btn" aria-hidden>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      {open && (
        <ol className="chapterbar__list glass" id="chapter-list">
          {chapters.map((c, i) => (
            <li key={i}>
              {/* a heading where a sub-chapter (or the use cases) starts; a bare divider where one ends */}
              {i > 0 && label(c) !== label(chapters[i - 1]) && <p className="chapterbar__group">{label(c)}</p>}
              <button type="button" className={i === active ? 'is-on' : i < active ? 'is-read' : undefined} aria-current={i === active ? 'true' : undefined} onClick={() => go(i)}>
                <span className="chapterbar__num">{String(i + 1).padStart(2, '0')}</span>
                {c.title}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
