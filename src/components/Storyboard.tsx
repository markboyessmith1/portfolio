import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Vignette, { type VignetteKey } from './miro/Vignettes'
import MissionBoard, { type MissionScript } from './MissionBoard'

/* A Storyboard (desktop): one board for a run of consecutive storied sections.
   A plain sticky board inside a container that spans the run: it scrolls in with
   the run's first section (or is there from the start, for a run at the top),
   pins over the right-hand card while the copy scrolls, and lets go at the last
   line of the run's last section, scrolling away with the copy. Its content
   follows the story: when the chapter changes, what's on the board clears away
   (lifting and fading, a beat), then the next is written in fresh.
   Phones keep each section's own panel instead. */

export type StoryboardChapter = VignetteKey | 'mission'

const OUT_MS = 520

export default function Storyboard({ chapter, lead, first, last, mission }: {
  /** the chapter to show (null: the run isn't reached yet, or is past) */
  chapter: StoryboardChapter | null
  /** the run's first chapter: written in as soon as the board scrolls into view */
  lead: StoryboardChapter
  /** indexes of the run's first and last sections */
  first: number
  last: number
  mission?: MissionScript
}) {
  // the chapter on the board; trails `chapter` by the clear-away beat (an empty
  // board takes its first chapter at once; past the run it keeps the last)
  const [shown, setShown] = useState<StoryboardChapter | null>(chapter)
  const [clearing, setClearing] = useState(false)
  // a board arriving from below starts its first chapter as it comes into view,
  // rather than scrolling in empty
  const pin = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = pin.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  const want = chapter ?? (seen && !shown ? lead : null)
  useEffect(() => {
    if (!want || want === shown) { setClearing(false); return }
    if (!shown) { setShown(want); return }
    setClearing(true)
    const t = window.setTimeout(() => { setShown(want); setClearing(false) }, OUT_MS)
    return () => window.clearTimeout(t)
  }, [want, shown])

  // the run's extent, in the track column (both columns start at the top of the
  // carousel): from its first section (its chapter heading, when it opens one; the
  // very top for a run that starts the case) to the foot of its last section's copy
  const run = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; height: number }>()
  useLayoutEffect(() => {
    const el = run.current
    const wrap = el?.parentElement
    const start = document.querySelector<HTMLElement>(`.case-left [data-panel="${first}"]`)
    const copy = document.querySelector(`.case-left [data-panel="${last}"]`)
    if (!el || !wrap || !start || !copy) return
    const runEl = start.parentElement
    const opens = runEl?.classList.contains('case-left__run') && runEl.querySelector('.case-left__section') === start
    const head = opens ? runEl!.querySelector<HTMLElement>('.case-left__chapter') : null
    const measure = () => {
      const w = wrap.getBoundingClientRect().top
      const top = first === 0 ? 0 : Math.round((head ?? start).getBoundingClientRect().top - w)
      const end = copy.lastElementChild ?? copy
      setBox({ top, height: Math.round(end.getBoundingClientRect().bottom - w) - top })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(copy.closest('.case-left') ?? copy)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    // the copy column slides in on entry (a transform layout can't see): settle after
    const t = window.setTimeout(measure, 1600)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); window.clearTimeout(t) }
  }, [first, last])

  return (
    <div ref={run} className="storyboard" style={box ? { top: box.top, height: box.height } : undefined}>
      <div ref={pin} className="storyboard__pin">
        <div className="storyboard__board board">
          {shown && (
            <div className={`storyboard__layer${clearing ? ' is-clearing' : ''}`} key={shown}>
              {shown === 'mission' && mission
                ? <MissionBoard script={mission} />
                : <Vignette k={shown === 'mission' ? 'prompt' : shown} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
