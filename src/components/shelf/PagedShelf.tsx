import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'

/* A paged shelf (ported from the c26 prototype's PagedShelf): the headline
   (controls top right), then its cards one at a time, autoplaying under Apple's gallery control (a
   pill of dots, the current one a bar that fills as its card plays, and a
   play / pause). The active card sits on the page's content edge, in line
   with the case study's copy, its neighbours peeking in either side; trackpad swipe, shift+wheel and drag page it too. A card with a
   `ratio` keeps its shape, so the strip centres cards of differing widths.
   Styles: .shelf* in styles.css. */

export type ShelfMedia =
  | { kind: 'video'; src: string; label: string; captions?: string }
  /** nothing: the card's own paper shows through (a type-only link card) */
  | { kind: 'blank' }

export type ShelfCardData = {
  id: string
  eyebrow: string
  title: string
  body: string
  media: ShelfMedia
  /** media width ÷ height: the card takes this shape at the shelf's height */
  ratio?: number
  /** the whole card links out (new tab): the title goes big, `label` sits at the foot */
  link?: { href: string; label: string }
}

export type ShelfData = {
  id: string
  kicker?: string
  title: string
  intro?: string
  cards: ShelfCardData[]
}

/** The row owns the clock: the active card plays from the top while
 *  `playing`, and tells the row how long it runs. */
type Slide = { active: boolean; playing: boolean; report: (ms: number) => void }
const SlideContext = createContext<Slide | null>(null)

/** A card that doesn't say how long it runs (no clip) gets this long. */
const DEFAULT_SLIDE_MS = 9000
const OUT_QUART = 'cubic-bezier(0.25, 1, 0.5, 1)'
/** Paging: one even ease in and out, like a gallery being turned, not flung. */
const PAGE_MS = 800
/** First time a row scrolls into view it rises in. */
const entrance = (inView: boolean): CSSProperties => ({
  opacity: inView ? 1 : 0,
  transform: inView ? 'none' : 'translateY(16px)',
  transition: `opacity 500ms ${OUT_QUART}, transform 700ms ${OUT_QUART}`,
})
// ── The engine ───────────────────────────────────────────────────────────

function usePagedRow(shelf: ShelfData) {
  const count = shelf.cards.length
  const rowRef = useRef<HTMLDivElement>(null)
  const [still] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [inView, setInView] = useState(still)
  const [rowInView, setRowInView] = useState(false)
  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const enter = new IntersectionObserver(([e]) => e!.isIntersecting && (setInView(true), enter.disconnect()), { threshold: 0.15 })
    enter.observe(el)
    return () => enter.disconnect()
  }, [])
  // it plays once the cards themselves are 60% on screen, not the headline
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!stageEl) return
    const play = new IntersectionObserver(([e]) => setRowInView(e!.isIntersecting), { threshold: 0.6 })
    play.observe(stageEl)
    return () => play.disconnect()
  }, [stageEl])

  const [active, setActive] = useState(0)
  const [turn, setTurn] = useState(0) // bumps on every page: the clock and the bar restart
  // scrolled away: back to the first card, so coming back starts the story over
  const wasInView = useRef(false)
  useEffect(() => {
    if (wasInView.current && !rowInView) {
      setActive(0)
      setTurn((t) => t + 1)
    }
    wasInView.current = rowInView
  }, [rowInView])
  const [userPaused, setUserPaused] = useState(false)
  const playing = rowInView && !userPaused && !still
  // held while a swipe or drag is under way: a due advance waits for it to end
  const held = useRef({ on: false, due: false })
  const [runs, setRuns] = useState<Record<number, number>>({})
  const reporters = useMemo(
    () => shelf.cards.map((_, i) => (ms: number) => setRuns((r) => (r[i] === ms ? r : { ...r, [i]: ms }))),
    [shelf.cards],
  )
  const runMs = runs[active] ?? DEFAULT_SLIDE_MS
  const goTo = useCallback((i: number) => {
    setActive(((i % count) + count) % count)
    setTurn((t) => t + 1)
  }, [count])
  // a new page lands before it plays: it holds its opening frame while sliding in
  const [landed, setLanded] = useState(turn)
  useEffect(() => {
    if (still) return setLanded(turn)
    const t = window.setTimeout(() => setLanded(turn), PAGE_MS)
    return () => window.clearTimeout(t)
  }, [turn, still])
  const live = landed === turn
  // the row's clock: the active card's run, kept across pauses
  const clock = useRef({ turn: -1, elapsed: 0 })
  useEffect(() => {
    if (clock.current.turn !== turn) clock.current = { turn, elapsed: 0 }
    if (!playing || !live) return
    const started = performance.now()
    const advance = () => (held.current.on ? (held.current.due = true) : goTo(active + 1))
    const t = window.setTimeout(advance, Math.max(0, runMs - clock.current.elapsed))
    return () => {
      window.clearTimeout(t)
      clock.current.elapsed += performance.now() - started
    }
  }, [playing, live, turn, active, runMs, goTo])

  const slide = (i: number): Slide => ({
    active: i === active && (rowInView || still),
    playing: playing && live && i === active,
    report: reporters[i]!,
  })
  return { shelf, count, rowRef, still, inView, active, turn, playing, userPaused, setUserPaused, held, runMs, goTo, slide, stageEl, setStageEl }
}
type Row = ReturnType<typeof usePagedRow>

// ── Swipe and drag ───────────────────────────────────────────────────────
/* Trackpad swipes, shift+wheel and click-drag (touch too) page the row. The
   cards follow the fingers 1:1, then settle on the nearest page, or the next
   one if the gesture went far enough or was a flick. One gesture is one page
   at most: the rest of the trackpad's momentum is swallowed. Past an end it
   gives with resistance and springs back. Vertical wheel gestures are never
   touched, so the page scrolls as ever. */
const SWIPE = {
  END_MS: 140,
  LOCK_MS: 200,
  AXIS_PX: 4,
  SLOP_PX: 6,
  PAGE_FRAC: 0.12,
  FLICK_V: 0.35,
  DECAY: 0.6,
  RUBBER: 0.3,
  STEP_PX: 64,
}
/** Settling after a gesture: an ease-out that leaves at the release's own speed. */
const settleCurve = (distance: number, speed: number) => {
  const ms = Math.round(Math.min(500, Math.max(350, speed > 0.05 ? (4 * distance) / speed : 500)))
  const slope = Math.min(4, Math.max(0, distance > 1 ? (speed * ms) / distance : 4))
  return `transform ${ms}ms cubic-bezier(0.25, ${(0.25 * slope).toFixed(3)}, 0.5, 1)`
}
const SETTLE_MS = 500
/** iOS-style rubber band: starts at RUBBER×, never passes `d`. */
const rubber = (x: number, d: number) => d * (1 - 1 / ((x * SWIPE.RUBBER) / d + 1))

function useSwipe(row: Row, { strip, bounded, step }: { strip?: RefObject<HTMLElement | null>; bounded: boolean; step?: () => number }) {
  const el = row.stageEl
  const latest = useRef({ row, strip, bounded, step })
  latest.current = { row, strip, bounded, step }
  const settling = useRef('')
  const settleTimer = useRef(0)
  const settle = useCallback((s: HTMLElement, transition: string) => {
    s.style.transition = transition
    s.style.setProperty('--drag-x', '0px')
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      s.style.transition = ''
      s.style.willChange = ''
    }, SETTLE_MS + 40)
  }, [])
  // same commit as the new page's placement, so both run as one transition
  useLayoutEffect(() => {
    const transition = settling.current
    settling.current = ''
    const s = latest.current.strip?.current
    if (transition && s) settle(s, transition)
  }, [row.turn, settle])

  useEffect(() => {
    if (!el) return
    el.dataset.swipe = ''
    const stripEl = () => (latest.current.row.still ? null : (latest.current.strip?.current ?? null))

    let live = false
    let base = 0
    let offset = 0
    let shown = 0
    let span = { w: 1, lo: -1, hi: 1 }
    let raf = 0
    const begin = () => {
      const { row: r, bounded: b, step: st } = latest.current
      live = true
      offset = base = shown = 0
      r.held.current.on = true
      const w = st?.() || el.clientWidth || 1
      span = { w, lo: b && r.active === r.count - 1 ? 0 : -w, hi: b && r.active === 0 ? 0 : w }
      const s = stripEl()
      if (!s) return
      window.clearTimeout(settleTimer.current)
      // catch the strip where it's drawn, even mid-slide
      const drawn = new DOMMatrix(getComputedStyle(s).transform).m41
      s.style.transition = 'none'
      s.style.willChange = 'transform'
      s.style.setProperty('--drag-x', '0px')
      base = shown = drawn - new DOMMatrix(getComputedStyle(s).transform).m41
      s.style.setProperty('--drag-x', `${base}px`)
    }
    const draw = () => {
      raf = 0
      const s = stripEl()
      if (!s || !live) return
      s.style.transition = 'none'
      s.style.setProperty('--drag-x', `${shown}px`)
    }
    const follow = () => {
      const { w, lo, hi } = span
      const x = base + offset
      shown = x > hi ? hi + rubber(x - hi, w) : x < lo ? lo - rubber(lo - x, w) : x
      if (!raf) raf = requestAnimationFrame(draw)
    }
    /** let go: next page, previous, or back. `v`: px/ms (+ = toward the previous card) */
    const release = (v: number) => {
      if (!live) return
      live = false
      cancelAnimationFrame(raf)
      raf = 0
      const { row: r, bounded: b } = latest.current
      const { w } = span
      const x = base + offset
      const flick = Math.abs(v) >= SWIPE.FLICK_V ? Math.sign(v) : 0
      let dir = Math.abs(x) >= SWIPE.PAGE_FRAC * w ? -Math.sign(x) : flick && (x === 0 || Math.sign(x) === flick) ? -flick : 0
      if (b && ((dir < 0 && r.active === 0) || (dir > 0 && r.active === r.count - 1))) dir = 0
      r.held.current.on = false
      const due = r.held.current.due
      r.held.current.due = false
      const s = stripEl()
      const toward = (to: number) => Math.max(0, v * Math.sign(to - shown))
      if (dir) {
        if (s) {
          const transition = settleCurve(Math.abs(-dir * w - shown), toward(-dir * w))
          s.style.setProperty('--drag-x', `${shown}px`)
          s.style.transition = transition
          settling.current = transition
        }
        r.goTo(r.active + dir)
      } else {
        if (s) settle(s, settleCurve(Math.abs(shown), toward(0)))
        if (due) r.goTo(r.active + 1)
      }
    }
    const pageNow = () => {
      if (Math.abs(offset) < Math.max(SWIPE.STEP_PX, 0.08 * span.w)) return false
      release(Math.sign(offset))
      return true
    }

    // wheel: trackpad swipes, shift + mouse wheel
    let phase: 'idle' | 'axis' | 'x' | 'y' | 'locked' = 'idle'
    let last = -Infinity
    let endTimer = 0
    let sumX = 0
    let sumY = 0
    let recent: { t: number; d: number }[] = []
    let ema = 0
    let peak = 0
    let falling = 0
    let prevAbs = 0
    let lockMin = Infinity
    let rising = 0
    const lock = () => {
      phase = 'locked'
      lockMin = Infinity
      rising = 0
    }
    const endWheel = (v: number) => {
      window.clearTimeout(endTimer)
      release(v)
      lock()
    }
    const speed = () => {
      const a = recent[0]
      const z = recent[recent.length - 1]
      return a && z && z.t > a.t ? recent.slice(1).reduce((sum, r) => sum + r.d, 0) / (z.t - a.t) : 0
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1
      let dx = e.deltaX * unit
      let dy = e.deltaY * unit
      if (e.shiftKey && !dx) [dx, dy] = [dy, 0]
      if (!dx && !dy) return
      const gap = e.timeStamp - last
      last = e.timeStamp
      const abs = Math.abs(dx)
      const horizontal = abs > Math.abs(dy)
      if (phase === 'locked') {
        // swallow the momentum tail; a vertical scroll, a quiet spell or a fresh push is new
        lockMin = Math.min(lockMin, abs)
        rising = abs > prevAbs ? rising + 1 : 0
        prevAbs = abs
        const fresh = lockMin <= 4 && rising >= 3 && abs >= 8
        if (horizontal && gap < SWIPE.LOCK_MS && !fresh) return e.preventDefault()
        phase = 'idle'
      }
      if ((phase === 'x' || phase === 'axis') && gap >= SWIPE.END_MS) {
        endWheel(0)
        phase = 'idle'
      }
      if (phase === 'y') {
        if (gap < SWIPE.END_MS) return
        phase = 'idle'
      }
      if (phase === 'idle') {
        phase = 'axis'
        sumX = sumY = 0
      }
      if (phase === 'axis') {
        // the axis is decided on the first few pixels, for the whole gesture
        sumX += dx
        sumY += dy
        if (Math.max(Math.abs(sumX), Math.abs(sumY)) < SWIPE.AXIS_PX) {
          e.preventDefault()
          window.clearTimeout(endTimer)
          endTimer = window.setTimeout(() => (phase = 'idle'), SWIPE.END_MS)
          return
        }
        if (Math.abs(sumX) <= Math.abs(sumY)) return void (phase = 'y')
        phase = 'x'
        recent = []
        ema = peak = falling = prevAbs = 0
        dx = sumX
        begin()
      }
      e.preventDefault()
      offset -= dx
      recent.push({ t: e.timeStamp, d: -dx })
      while (recent.length > 2 && e.timeStamp - recent[0]!.t > 64) recent.shift()
      falling = abs <= prevAbs ? falling + 1 : 0
      prevAbs = abs
      ema = ema ? ema * 0.6 + abs * 0.4 : abs
      peak = Math.max(peak, ema)
      window.clearTimeout(endTimer)
      if (!stripEl()) {
        if (pageNow()) return lock()
      } else {
        follow()
        // deltas falling steadily from their peak: that's momentum, settle now
        if (falling >= 5 && peak >= 8 && ema <= SWIPE.DECAY * peak) return endWheel(speed())
      }
      endTimer = window.setTimeout(() => endWheel(0), SWIPE.END_MS)
    }

    // pointer: click-drag with a mouse, or a finger
    let press: { id: number; x0: number; y0: number; dragging: boolean; samples: { x: number; t: number }[] } | null = null
    let swallowClick = false
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary || live) return
      if ((e.target as Element).closest('button, a, input, textarea, select, [contenteditable]')) return
      press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dragging: false, samples: [] }
    }
    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return
      if (!press.dragging) {
        const dx = e.clientX - press.x0
        const dy = e.clientY - press.y0
        if (Math.hypot(dx, dy) < SWIPE.SLOP_PX) return
        if (Math.abs(dy) >= Math.abs(dx)) return void (press = null) // vertical: not ours
        press.dragging = true
        press.x0 = e.clientX
        el.setPointerCapture(e.pointerId)
        el.dataset.dragging = ''
        begin()
      }
      offset = e.clientX - press.x0
      press.samples.push({ x: e.clientX, t: e.timeStamp })
      while (press.samples.length > 2 && e.timeStamp - press.samples[0]!.t > 100) press.samples.shift()
      if (stripEl()) follow()
      else if (pageNow()) end(e)
    }
    const end = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return
      const { dragging, samples } = press
      press = null
      if (!dragging) return
      delete el.dataset.dragging
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      // the drag isn't also a click on the card under it
      swallowClick = true
      window.setTimeout(() => (swallowClick = false), 0)
      const first = samples[0]
      const lastS = samples[samples.length - 1]
      const v = first && lastS && lastS.t > first.t && e.timeStamp - lastS.t < 60 ? (lastS.x - first.x) / (lastS.t - first.t) : 0
      release(e.type === 'pointercancel' ? 0 : v)
    }
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return
      e.preventDefault()
      e.stopPropagation()
    }
    const noNativeDrag = (e: DragEvent) => e.preventDefault()

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('click', onClick, true)
    el.addEventListener('dragstart', noNativeDrag)
    return () => {
      window.clearTimeout(endTimer)
      cancelAnimationFrame(raf)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('dragstart', noNativeDrag)
      delete el.dataset.swipe
      delete el.dataset.dragging
      latest.current.row.held.current.on = false
    }
  }, [el, settle])
}

// ── Media ────────────────────────────────────────────────────────────────

/** A card clip, run by the row: from the top on its turn, paused with the
 *  row; its length is the turn's length. Captions (.vtt) are drawn in the
 *  page's type rather than the native caption box. */
function ShelfVideo({ src, label, captions }: { src: string; label: string; captions?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLTrackElement>(null)
  const [cue, setCue] = useState('')
  const slide = useContext(SlideContext)
  const report = slide?.report
  const active = !!slide?.active
  const playing = !!slide?.playing

  useEffect(() => {
    const video = ref.current
    if (!video || !report) return
    const send = () => Number.isFinite(video.duration) && report(Math.round(video.duration * 1000) + 600)
    send()
    video.addEventListener('loadedmetadata', send)
    return () => video.removeEventListener('loadedmetadata', send)
  }, [report])

  const wasActive = useRef(false)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (!active) {
      wasActive.current = false
      video.pause()
      return
    }
    if (!wasActive.current) {
      wasActive.current = true
      if (video.readyState === 0) video.load()
      video.currentTime = 0
    }
    if (playing) void video.play().catch(() => {})
    else video.pause()
  }, [active, playing])

  useEffect(() => {
    const track = trackRef.current?.track
    if (!track) return
    track.mode = 'hidden'
    const onCueChange = () => setCue(Array.from(track.activeCues ?? [], (c) => (c as VTTCue).text).join('\n'))
    track.addEventListener('cuechange', onCueChange)
    return () => track.removeEventListener('cuechange', onCueChange)
  }, [captions])

  return (
    <>
      <video ref={ref} src={src} muted playsInline preload="metadata" aria-label={label}>
        {captions && <track ref={trackRef} kind="captions" src={captions} srcLang="en" label="English" default />}
      </video>
      {cue && <p className="shelf-card__cue">{cue}</p>}
    </>
  )
}

/* The caption, top left on the card: byline and title on a yellow
   highlighter that wraps each line and flows round both as one shape. The
   yellow is drawn twice over: a copy of the lines on yellow, run through the
   goo filter (blur, then a hard alpha cut, so neighbouring boxes melt into
   one curved outline), with the crisp text laid on top. */
function Highlight({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  const lines = (
    <>
      <span className="shelf-hl__byline"><span>{eyebrow}</span></span>
      <span className="shelf-hl__title"><span>{title}</span></span>
    </>
  )
  return (
    <header className="shelf-hl">
      <div className="shelf-hl__ink" aria-hidden>{lines}</div>
      <h3 className="shelf-hl__text" id={id}>{lines}</h3>
    </header>
  )
}

function CardFace({ card }: { card: ShelfCardData }) {
  const body = (
    <article className={`shelf-card${card.link ? ' shelf-card--link' : ''}`} aria-labelledby={`${card.id}-title`}>
      {card.media.kind === 'video' && (
        <div className="shelf-card__media">
          <ShelfVideo src={card.media.src} label={card.media.label} captions={card.media.captions} />
        </div>
      )}
      {!card.link && <Highlight eyebrow={card.eyebrow} title={card.title} id={`${card.id}-title`} />}
      {card.link && (
        <>
          <header className="shelf-card__head">
            <h3 className="shelf-card__title" id={`${card.id}-title`}>{card.title}</h3>
          </header>
          <span className="shelf-card__foot">
            {card.link.label}
            <span className="shelf-card__arrow" aria-hidden>↗</span>
          </span>
        </>
      )}
    </article>
  )
  return card.link ? (
    <a className="shelf-card__link" href={card.link.href} target="_blank" rel="noopener noreferrer">{body}</a>
  ) : body
}

// ── Controls ─────────────────────────────────────────────────────────────

/** The bar that fills over the active card's run (restarts each turn, pauses with the row). */
function Fill({ row }: { row: Row }) {
  return (
    <i
      key={row.turn}
      style={
        row.still
          ? { transform: 'none' }
          : { animationName: 'shelf-fill', animationDuration: `${row.runMs}ms`, animationTimingFunction: 'linear', animationFillMode: 'forwards', animationPlayState: row.playing ? 'running' : 'paused' }
      }
    />
  )
}

/** Arrow keys page too, from any dot. */
const arrowKeys = (row: Row) => (e: KeyboardEvent<HTMLElement>) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  e.preventDefault()
  const next = (row.active + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + row.count) % row.count
  row.goTo(next)
  ;(e.currentTarget.querySelectorAll('button')[next] as HTMLElement | undefined)?.focus()
}

function Pager({ row }: { row: Row }) {
  return (
    <div className="shelf-pager">
      <div className="shelf-pager__dots" role="group" aria-label={`${row.shelf.title}: pages`} onKeyDown={arrowKeys(row)}>
        {row.shelf.cards.map((card, i) => (
          <button key={card.id} type="button" className="shelf-pager__dot" aria-current={i === row.active} aria-label={`Show ${card.title}`} onClick={() => row.goTo(i)}>
            <span>{i === row.active && <Fill row={row} />}</span>
          </button>
        ))}
      </div>
      {!row.still && (
        <button type="button" className="shelf-pager__play" aria-label={row.userPaused ? `Play ${row.shelf.title}` : `Pause ${row.shelf.title}`} onClick={() => row.setUserPaused((p) => !p)}>
          {row.userPaused ? (
            <svg viewBox="0 0 16 16" aria-hidden><path d="M4.5 2.8v10.4L13 8z" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" /></svg>
          )}
        </button>
      )}
    </div>
  )
}

// ── The stage ────────────────────────────────────────────────────────────

/** A card's width: its own shape at the row's height, never wider than the stage. */
const cardWidth = (card: ShelfCardData) =>
  card.ratio ? `min(calc(var(--shelf-card-h) * ${card.ratio}), var(--shelf-stage-w))` : 'var(--shelf-stage-w)'

/** Slides the strip so the active card lines up with the page's content edge. */
function useStageStrip(row: Row) {
  const ref = useRef<HTMLUListElement>(null)
  const prev = useRef(row.active)
  const [activeW, setActiveW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const to = row.active
    const place = (animate: boolean) => {
      const item = el.children[to] as HTMLElement | undefined
      if (!item) return
      if (!animate) el.style.transition = 'none'
      // the active card sits on the page's content edge (the strip's own padding)
      el.style.setProperty('--slide-x', `${parseFloat(getComputedStyle(el).paddingLeft) - item.offsetLeft}px`)
      setActiveW(item.offsetWidth)
      if (!animate) {
        void el.offsetWidth // commit the jump before transitions come back
        el.style.transition = ''
      }
    }
    place(prev.current !== to)
    prev.current = to
    // re-place only on a real resize: observe() fires once, and that would cancel the slide
    let width = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      place(false)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [row.active])
  return { ref, activeW }
}

/** `bare`: no headline (it's read, not shown) and no panel of its own, for a shelf set inside a case section */
export function PagedShelf({ shelf, bare = false }: { shelf: ShelfData; bare?: boolean }) {
  const row = usePagedRow(shelf)
  const strip = useStageStrip(row)
  useSwipe(row, { strip: strip.ref, bounded: true, step: () => strip.activeW })
  return (
    <section className={`shelf${bare ? ' shelf--bare' : ''}`} id={shelf.id} aria-labelledby={`${shelf.id}-title`}>
      <div ref={row.rowRef}>
        {/* the headline on the left; the controls top right, just above the cards */}
        <div className="shelf__top" style={entrance(row.inView)}>
          <header className={`shelf__head${bare ? ' sr-only' : ''}`}>
            {shelf.kicker && <span className="eyebrow">{shelf.kicker}</span>}
            <h2 className="case-left__h2 shelf__title" id={`${shelf.id}-title`}>{shelf.title}</h2>
            {shelf.intro && <p className="lede shelf__intro">{shelf.intro}</p>}
          </header>
          <Pager row={row} />
        </div>
        <div style={entrance(row.inView)}>
          <div ref={row.setStageEl}>
            <ul className="shelf__strip" ref={strip.ref} aria-roledescription="carousel" aria-label={shelf.title}>
              {shelf.cards.map((card, i) => {
                const on = i === row.active
                return (
                  <li
                    key={card.id}
                    style={{ width: cardWidth(card) }}
                    // a peeking neighbour is a way to it; the pager is the keyboard route
                    {...(on ? {} : { onClick: () => row.goTo(i), 'aria-hidden': true, 'data-neighbour': '' })}
                  >
                    <div inert={!on ? true : undefined} style={{ height: '100%' }}>
                      <SlideContext.Provider value={row.slide(i)}>
                        <CardFace card={card} />
                      </SlideContext.Provider>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/** The case study's closing run of shelves. */
export default function Shelves({ shelves }: { shelves: ShelfData[] }) {
  return (
    <div className="shelves">
      {/* the highlighter's goo: blur the yellow, then cut its alpha hard */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="shelf-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12" />
        </filter>
      </svg>
      {shelves.map((s) => <PagedShelf key={s.id} shelf={s} />)}
    </div>
  )
}
