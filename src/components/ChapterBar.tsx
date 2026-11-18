import { useEffect, useRef, useState } from 'react'
import type { WorkItem } from '../data/site'

/* Case-study chapter bar (top right, in the podcast's place): a ring that
   fills with your progress down the page, the section you're reading (one
   line; it swaps as you scroll), and a short list of the key
   chapters to jump to: each major chapter (a `group`), and each section outside
   one. The case's shelves follow as "Use cases" (only when on the page). */

/** `group`: the major chapter it sits in (none: a top-level section of its own) */
type Chapter = { title: string; group?: string; target: () => HTMLElement | null }

/** a chapter is current once its top passes this share of the viewport */
const LINE = 0.2
const RING_R = 15
const RING_C = 2 * Math.PI * RING_R

function chaptersOf(item: WorkItem): Chapter[] {
  return [
    ...item.sections.flatMap((s, i) =>
      s.heading ? [{ title: s.heading, group: s.group, target: () => document.querySelector<HTMLElement>(`.case-left [data-panel="${i}"]`) }] : [],
    ),
    ...(item.shelves ?? []).map((s) => ({ title: s.title, group: 'Use cases', target: () => document.getElementById(s.id) })),
  ]
}

/** the contents: just the key chapters, in order. A major chapter (a `group`) spans its
    sections; a section outside any chapter is a chapter of its own */
type Key = { title: string; from: number; to: number }
function keysOf(chapters: Chapter[]): Key[] {
  const out: Key[] = []
  chapters.forEach((c, i) => {
    const last = out[out.length - 1]
    if (c.group && last && last.title === c.group && last.to === i - 1) last.to = i
    else out.push({ title: c.group ?? c.title, from: i, to: i })
  })
  return out
}

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

  const current = active >= 0 ? chapters[active].title : item.headline ?? item.title
  // only chapters on the page (hidden shelves have no target), worked out as it opens
  const keys = open ? keysOf(chapters).filter((k) => chapters[k.from].target()) : []
  // a key chapter's link lands on its heading (the chapter's run), or its section
  const goKey = (k: Key) => {
    const el = chapters[k.from].target()
    ;(el?.closest<HTMLElement>('.case-left__run') ?? el)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setOpen(false)
  }

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
        </span>
        <span className="chapterbar__btn" aria-hidden>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      {open && (
        <nav className="chapterbar__list glass" id="chapter-list" aria-label="Contents">
          <ul>
            {keys.map((k) => {
              const on = active >= k.from && active <= k.to
              return (
                <li key={k.from}>
                  <button type="button" className={on ? 'is-on' : active > k.to ? 'is-read' : undefined} aria-current={on ? 'true' : undefined} onClick={() => goKey(k)}>
                    {k.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}
