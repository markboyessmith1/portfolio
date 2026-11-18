import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../lib/access'
import { site, type CaseSection, type PanelLayout, type SceneKey, type WorkItem } from '../data/site'
import { GLSlot } from '../webgl/GLSlot'
import type { SpinState } from '../webgl/GlassEdge'
import { PortraitScene, scenes } from '../webgl/scenes'
import Vignette from './miro/Vignettes'
import CardStickers from './miro/CardStickers'
import CaseBoard from './CaseBoard'
import Timeline from './Timeline'
import StatementReveal from './StatementReveal'
import Storyboard from './Storyboard'
import DarkField from './DarkField'
import Figures from './Figures'
import CaseLoader from './CaseLoader'
import FilmTile from './FilmTile'
import PrinciplesRow from './PrinciplesRow'
import LaunchCelebration from './LaunchCelebration'
import LensGlass from './LensGlass'
import VideoEmbed from './VideoEmbed'
import MiroLogo from './MiroLogo'
import Wordmark, { hasWordmark } from './Wordmark'
import { PagedShelf, ShelfStack } from './shelf/PagedShelf'

/** TEMP: the reels (case-study shelves) are hidden while their placement is decided */
const SHOW_REELS = false

/**
 * One persistent component for the homepage AND every case study, so moving
 * between them never remounts anything (no flash, the WebGL cards stay alive).
 *
 *  home : left = pinned hero card, right = scrolling stack of project cards
 *  case : left = scrolling case-study copy, right = pinned panel stack that
 *         slides to a new panel as each section of the copy comes into view
 *
 * Home -> case: the clicked card bounces and spins 360 in place (it becomes
 * the case study's first panel), while the hero slides out left pulling the
 * case copy in behind it.
 */

/** Pinned top offset (CSS --top), read from the always-present sticky rail. */
function pinnedTop(track: HTMLElement) {
  const pin = track.closest('.carousel')?.querySelector('.carousel__rail-pin')
  return pin ? parseFloat(getComputedStyle(pin).top) || 0 : 100
}
const isDesktop = () => window.matchMedia('(min-width: 1200px)').matches
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const DARK_SCENES = new Set<SceneKey>(['knot', 'video'])
/** Scenes whose overlay text stays light in both themes (photographic content). */
const MEDIA_SCENES = new Set<SceneKey>(['video'])
/** flat artwork (board recordings): no glass rim, it bends the canvas at the edges */
const FLAT_SCENES = new Set<SceneKey>(['miroAi'])
const toneClass = (k: SceneKey) => (MEDIA_SCENES.has(k) ? 'is-media' : DARK_SCENES.has(k) ? 'is-dark' : '')

type Live = { current: number }
type Spin = SpinState

/** Stable per-key mutable objects (blur, spin) that survive re-renders. */
function useKeyed<T>(make: () => T) {
  const map = useRef(new Map<string, T>())
  return (key: string) => {
    let v = map.current.get(key)
    if (!v) { v = make(); map.current.set(key, v) }
    return v
  }
}

function usePagedScroll(track: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = track.current
    if (!el || !enabled) return
    const desktop = window.matchMedia('(min-width: 1200px)')
    const anchor = () => pinnedTop(el)
    const TRIGGER = 30 // px of input that commits to a move
    const GLIDE_MS = 380
    const GESTURE_GAP_MS = 180

    const count = () => el.children.length
    const itemTop = (i: number) => {
      const first = el.children[0] as HTMLElement
      const it = el.children[i] as HTMLElement
      return el.getBoundingClientRect().top + window.scrollY + (it.offsetTop - first.offsetTop) - anchor()
    }
    const targetY = (i: number) => (i === 0 ? 0 : itemTop(i))
    const nearest = () => {
      const y = window.scrollY
      let best = 0
      let bestD = Infinity
      for (let i = 0; i < count(); i++) {
        const d = Math.abs(y - targetY(i))
        if (d < bestD) { bestD = d; best = i }
      }
      return best
    }
    const inZone = () => window.scrollY <= itemTop(count() - 1) + 2

    let index = nearest()
    let animating = false
    let anim = 0
    let acc = 0
    let lastAbs = 0
    let lastT = 0
    let locked = false // swallowing the momentum tail of the last flick

    const glide = (to: number) => {
      cancelAnimationFrame(anim)
      const from = window.scrollY
      const dest = targetY(to)
      if (Math.abs(dest - from) < 1) return
      animating = true
      const start = performance.now()
      const ease = (t: number) => 1 - Math.pow(1 - t, 4)
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / GLIDE_MS)
        // 'instant' bypasses html { scroll-behavior: smooth }, which would
        // otherwise turn every frame into its own smooth-scroll and stall the glide
        window.scrollTo({ top: from + (dest - from) * ease(t), behavior: 'instant' })
        if (t < 1) anim = requestAnimationFrame(step)
        else animating = false
      }
      anim = requestAnimationFrame(step)
    }

    const go = (dir: number) => {
      const next = Math.max(0, Math.min(count() - 1, index + dir))
      if (next === index && Math.abs(window.scrollY - targetY(index)) < 2) return false
      index = next
      glide(index)
      return true
    }

    const onWheel = (e: WheelEvent) => {
      if (!desktop.matches || e.ctrlKey) return // ctrl+wheel = pinch zoom
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1)
      const now = performance.now()
      const gap = now - lastT
      lastT = now
      const abs = Math.abs(dy)
      const newGesture = gap > GESTURE_GAP_MS || abs > lastAbs * 1.4 + 2
      lastAbs = abs

      if (!inZone()) return // below the carousel: native scrolling
      if (!animating) index = nearest()
      // leaving the carousel downwards from the last card: hand back to native
      if (dy > 0 && index === count() - 1 && !animating && Math.abs(window.scrollY - targetY(index)) < 2) return

      e.preventDefault()
      if (gap > GESTURE_GAP_MS) acc = 0
      if (animating || (locked && !newGesture)) return
      locked = false
      acc += dy
      if (Math.abs(acc) >= TRIGGER) {
        const dir = Math.sign(acc)
        acc = 0
        if (go(dir)) locked = true
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (!desktop.matches || !inZone()) return
      const t = e.target as HTMLElement
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const down = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !(e.key === ' ' && e.shiftKey)
      const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey)
      if (!down && !up) return
      if (!animating) index = nearest()
      if (down && index === count() - 1) return // let it scroll on to the footer
      e.preventDefault()
      if (!animating) go(down ? 1 : -1)
    }

    // scrollbar drags / anything else native: snap once it ends
    const onScrollEnd = () => {
      if (!desktop.matches || animating || !inZone()) return
      index = nearest()
      glide(index)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('scrollend', onScrollEnd)
    return () => {
      cancelAnimationFrame(anim)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scrollend', onScrollEnd)
    }
  }, [track, enabled])
}


/**
 * Runs every frame: neighbouring cards sit at 90% scale with an 8px blur and
 * ease to full as they reach the pinned position; the stepper dots morph with
 * the fractional position. Per-frame (not per-scroll) so it also follows the
 * case-study panel slides, which are CSS transitions.
 */
function useTrackMotion(
  track: React.RefObject<HTMLDivElement | null>,
  blurs: React.MutableRefObject<Live[]>,
  marker: React.RefObject<HTMLElement | null>,
  setActive: (i: number) => void,
) {
  useEffect(() => {
    let raf = 0
    let last = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = track.current
      if (!el || !el.children.length) return
      const items = [...el.children] as HTMLElement[]
      if (!isDesktop()) {
        items.forEach((it, i) => {
          it.style.transform = ''
          const o = it.querySelector<HTMLElement>('.gl-slot__content')
          if (o) o.style.filter = ''
          if (blurs.current[i]) blurs.current[i].current = 0
        })
        return
      }
      const anchor = pinnedTop(el)
      const base = el.getBoundingClientRect().top - items[0].offsetTop
      const step = items.length > 1 ? items[1].offsetTop - items[0].offsetTop : 1
      const frac = Math.max(0, Math.min(items.length - 1, (anchor - (base + items[0].offsetTop)) / step))
      // show at most 3 dots: the window keeps the current one centred,
      // pinning at either end of the list (pitch = 8px dot + 6px gap)
      const strip = marker.current?.querySelector<HTMLElement>('.scroll-marker__strip')
      if (strip) {
        const off = Math.max(0, Math.min(items.length - 3, frac - 1))
        strip.style.transform = `translateY(${(-off * 14).toFixed(2)}px)`
      }
      marker.current?.querySelectorAll<HTMLElement>('.scroll-marker__bar').forEach((bar, i) => {
        const w = Math.max(0, 1 - Math.abs(frac - i))
        bar.style.setProperty('--w', (w * w * (3 - 2 * w)).toFixed(3))
      })
      items.forEach((it, i) => {
        let t = Math.min(1, Math.abs(base + it.offsetTop - anchor) / step)
        // the statement and split panels are page content, not cards: they
        // move with the scroll and never shrink or blur
        if (it.querySelector('.panel--statement, .panel--split')) t = 0
        // a case study's right-hand side stays fixed: its panels crossfade, unscaled
        if (el.closest('.carousel--case')) t = 0
        // settled (within a few px): exact identity, no filter, so text renders
        // crisp; a residual scale like 0.998 rasterises the text soft
        if (t < 0.06) t = 0
        // scale toward the active card (cards below shrink from their top edge,
        // cards above from their bottom edge), so the gap to the active card
        // stays constant and the snapped layout isn't thrown off by scaling
        const below = base + it.offsetTop > anchor
        it.style.transformOrigin = below ? 'center top' : 'center bottom'
        it.style.transform = t ? `scale(${(1 - 0.1 * t).toFixed(4)})` : ''
        const b = 8 * t
        const o = it.querySelector<HTMLElement>('.gl-slot__content')
        if (o) o.style.filter = b > 0.3 ? `blur(${b.toFixed(2)}px)` : ''
        if (blurs.current[i]) blurs.current[i].current = b
      })
      const a = Math.round(frac)
      if (a !== last) { last = a; setActive(a) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [track, blurs, marker, setActive])
}

/** Case mode: a chapter on a dark ground (.theme-dark). Its panel spans the window, so it's
 *  told where the window's edges are relative to it (--edge-l / --edge-r, read on resize only:
 *  the panel itself scrolls natively). The fixed header and footer flip to dark while they sit
 *  over it (a class toggle on <html>, from a cheap check on scroll). */
function useDarkRuns(enabled: boolean, left: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const runs = enabled ? [...(left.current?.querySelectorAll<HTMLElement>('.case-left__run.theme-dark') ?? [])] : []
    if (!runs.length) return
    const place = () => runs.forEach((r) => {
      const b = r.getBoundingClientRect()
      r.style.setProperty('--edge-l', `${Math.round(b.left)}px`)
      r.style.setProperty('--edge-r', `${Math.round(window.innerWidth - b.right)}px`)
    })
    place()
    const ro = new ResizeObserver(place)
    ro.observe(document.documentElement)
    const settle = window.setTimeout(place, 1600) // after the copy column's slide-in
    // are the fixed header (the window's top strip) and footer (its bottom strip) over
    // the panel? (it reaches 200px past the chapter's copy at each end, = .theme-dark::before)
    const over = (y: number) => runs.some((r) => { const b = r.getBoundingClientRect(); return b.top - 200 < y && b.bottom + 200 > y })
    const check = () => {
      const root = document.documentElement.classList
      root.toggle('is-head-dark', over(44))
      root.toggle('is-foot-dark', over(window.innerHeight - 32))
    }
    window.addEventListener('scroll', check, { passive: true })
    check()
    return () => {
      ro.disconnect()
      window.clearTimeout(settle)
      window.removeEventListener('scroll', check)
      document.documentElement.classList.remove('is-foot-dark', 'is-head-dark')
    }
  }, [enabled, left])
}

/** a card out to a page of its own (the soundscape): a little scene of it, then the copy */
function LinkCard({ card }: { card: NonNullable<CaseSection['linkCard']> }) {
  return (
    <Link className="link-card" to={card.href}>
      <span className="link-card__visual" aria-hidden>
        <span className="lc-ripple" /><span className="lc-ripple" /><span className="lc-ripple" />
        <span className="lc-stickies">
          <span className="lc-sticky lc-sticky--a">Kick-off in 5</span>
          <span className="lc-sticky lc-sticky--b">Agent’s done!</span>
          <span className="lc-sticky lc-sticky--c">Ana’s here</span>
        </span>
        <span className="lc-cursor lc-cursor--ana"><svg viewBox="0 0 12 12"><path d="M12 4.2V5.4C8.4 5.4 5.4 8.4 5.4 12H4.2L0 .7V.6L.6 0h.1L12 4.2z" /></svg><b>Ana joined</b></span>
        <span className="lc-cursor lc-cursor--agent"><svg viewBox="0 0 12 12"><path d="M12 4.2V5.4C8.4 5.4 5.4 8.4 5.4 12H4.2L0 .7V.6L.6 0h.1L12 4.2z" /></svg><b>Sidekick · done</b></span>
        <span className="lc-react">🎉</span>
        <span className="lc-note lc-note--1">♪</span><span className="lc-note lc-note--2">♫</span><span className="lc-note lc-note--3">♪</span>
      </span>
      <span className="link-card__copy">
        <span className="link-card__eyebrow">{card.eyebrow}</span>
        <span className="link-card__title">{card.title}</span>
        <span className="link-card__body">{card.body}</span>
        <span className="link-card__cta">{card.label} <span aria-hidden>→</span></span>
      </span>
    </Link>
  )
}

/** the number of a section's first figure: figures are numbered through the whole case */
const figureStart = (sections: CaseSection[], i: number) =>
  sections.slice(0, i).reduce((n, s) => n + (s.figures?.length ?? 0), 0) + 1

/** Case mode: the copy fades in from a blur as it comes into view, block by block (each
    heading, paragraph, list, table, band row…), once. Blocks arriving together follow one
    another by a beat. A time-based transition set off on entry (not scrubbed by the scroll),
    and opacity/filter only, so nothing moves and the layout's measurements hold. Things with
    their own entrance keep it: the header, metrics, the timeline, the keynote's glass card
    (a filter on it would blind its glass while it played). Styles: .blur-in */
const BLUR_IN = [
  '.case-left__chapter', '.case-left__chapter-lead',
  '.case-left__section:not(.is-band):not(.case-finale) > :not(.waypoint):not(.case-uses):not(dialog)',
  '.case-uses > *',
  '.band__cols > *', '.band__visual', '.band > .film', '.band__shelf', '.principles-row__item',
  '.case-finale__title',
].join(', ')
function useBlurIn(enabled: boolean, left: React.RefObject<HTMLDivElement | null>, key?: string) {
  useEffect(() => {
    const root = left.current
    if (!enabled || !root || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = [...root.querySelectorAll<HTMLElement>(BLUR_IN)].filter((el) => !el.closest('.timeline, .case-metrics'))
    els.forEach((el) => el.classList.add('blur-in'))
    const io = new IntersectionObserver((entries) => {
      let k = 0
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        const el = e.target as HTMLElement
        el.style.transitionDelay = `${Math.min(k++, 5) * 70}ms`
        el.classList.add('is-in')
        io.unobserve(el)
      })
    }, { rootMargin: '0px 0px -6% 0px' })
    els.forEach((el) => io.observe(el))
    return () => { io.disconnect(); els.forEach((el) => { el.classList.remove('blur-in', 'is-in'); el.style.transitionDelay = '' }) }
  }, [enabled, left, key])
}

/** Case mode: slide the pinned panel stack to match the section in view. */
function useCasePanels(
  enabled: boolean,
  left: React.RefObject<HTMLDivElement | null>,
  track: React.RefObject<HTMLDivElement | null>,
  /** told the panel in view whenever it changes (-1: none, e.g. below desktop) */
  onStep?: (k: number) => void,
) {
  const stepRef = useRef(onStep)
  stepRef.current = onStep
  useEffect(() => {
    const el = track.current
    if (!el) return
    if (!enabled) { el.style.transform = ''; return }
    // Free scroll, a fixed right-hand side: when a section's (invisible) waypoint
    // crosses the line 20% down the screen, its panel crossfades in over the
    // last one, in the same spot.
    // Steps into or out of a [data-smooth] section (statement, split) skip both:
    // they run linearly, 1:1 with the scroll, so those panels move with the
    // page like ordinary content.
    let raf = 0
    let current = -1
    let outgoing = -1
    let outgoingAt = 0
    const clear = () => {
      for (const it of el.children as unknown as HTMLElement[]) { it.style.opacity = ''; it.style.translate = '' }
    }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dots = left.current?.querySelectorAll<HTMLElement>('[data-panel] .waypoint')
      if (!dots?.length || !isDesktop()) { el.style.transform = ''; clear(); if (current !== -1) { current = -1; stepRef.current?.(-1) }; return }
      const vh = window.innerHeight
      const line = vh * 0.2
      const items = [...el.children] as HTMLElement[]
      const step = items.length > 1 ? items[1].offsetTop - items[0].offsetTop : 0
      // panels can differ in height (the statement is short): each one's resting
      // offset centres it where a full card would sit
      const cardH = items[0]?.offsetHeight ?? 0
      const rest = items.map((it) => it.offsetTop - (cardH - it.offsetHeight) / 2)
      const pinTop = parseFloat(getComputedStyle(el).top) || 0
      let target = 0
      let linear = false
      dots.forEach((d, i) => {
        if (i === 0) return
        const y = d.getBoundingClientRect().top
        const sec = d.closest<HTMLElement>('[data-panel]')
        const prev = dots[i - 1].closest<HTMLElement>('[data-panel]')
        if (step && (sec?.dataset.smooth != null || prev?.dataset.smooth != null)) {
          // into or out of a smooth section (statement, split): the panels
          // travel 1:1 with the copy over the panel's own distance, arriving as
          // the copy reaches the card's top (the statement settles centred)
          const dist = Math.max(1, (rest[i] ?? 0) - (rest[i - 1] ?? 0))
          const centred = (e?: HTMLElement | null) => e?.dataset.smooth === 'statement' || e?.dataset.smooth === 'timeline'
          const arrive = centred(sec) ? vh * 0.5 : pinTop
          // the visual holds still until the next one is incoming: travel is driven by the
          // incoming section's waypoint (out of a statement too, rather than its own)
          const t = Math.max(0, Math.min(1, (arrive + dist - y) / dist))
          if (t > 0 && t < 1) linear = true
          target += t
        } else {
          target += y < line ? 1 : 0
        }
      })
      // interpolate between the resting offsets of the panels either side
      const k = Math.min(Math.max(0, Math.floor(target)), rest.length - 1)
      const f = target - k
      const y = rest.length ? rest[k] + ((rest[k + 1] ?? rest[k]) - rest[k]) * f - rest[0] : 0
      el.style.transform = y ? `translateY(${(-y).toFixed(2)}px)` : ''
      // a crossfade: the outgoing panel is held where the new one now sits
      // (only between ordinary panels: a statement or split has already scrolled away)
      if (!linear && Math.abs(k - current) === 1) {
        const smooth = (i: number) => dots[i]?.closest<HTMLElement>('[data-panel]')?.dataset.smooth != null
        const hi = Math.max(k, current)
        outgoing = smooth(hi) || smooth(hi - 1) ? -1 : current
        outgoingAt = now
      } else if (!linear && k !== current) outgoing = -1
      // once it has faded, let go: held out of place it stretches the page's scroll height
      if (linear || now - outgoingAt > 500) outgoing = -1
      if (k !== current) stepRef.current?.(k)
      current = k
      items.forEach((it, i) => {
        it.style.opacity = i === k || (linear && i === k + 1) ? '1' : '0'
        it.style.translate = i === outgoing ? `0 ${(rest[k] - rest[i]).toFixed(2)}px` : ''
      })
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.style.transform = ''
      clear()
    }
  }, [enabled, left, track])
}

/** stable back-face props per project (memo-friendly) */
const backs = new Map<string, { title: string; label: string; plain?: boolean }>()
const backFor = (w: WorkItem) => {
  let b = backs.get(w.href)
  if (!b) { b = { title: w.title, label: 'Case study', plain: w.heroBoard || !!w.vignette }; backs.set(w.href, b) }
  return b
}

/** consecutive sections sharing a `group` become one run (a chapter with sub-chapters) */
/** a metric's value: the new number sits in a quiet box (in a "before → after"
    change, just the after; a single figure is all new). Once `run` is set, the new
    number counts up: from the before figure in a change, from zero otherwise. */
function MetricValue({ value, run, delay }: { value: string; run: boolean; delay: number }) {
  const [before, after] = value.split(' → ')
  if (after === undefined) return <span className="case-metrics__new case-metrics__new--solo"><Count text={value} from={0} run={run} delay={delay} /></span>
  return <>{before}<span className="case-metrics__arrow" aria-hidden>→</span><span className="sr-only"> to </span><span className="case-metrics__new"><Count text={after} from={parseFloat(before.replace(/[^\d.-]/g, '')) || 0} run={run} delay={delay} /></span></>
}

/** a figure that counts up to its value ("+35%", "37%"): the first number in the text
    eases from `from` to its final value, keeping its prefix, suffix and decimals.
    Screen readers get the final text; the moving copy is hidden from them. */
function Count({ text, from, run, delay, duration = 1500 }: { text: string; from: number; run: boolean; delay: number; duration?: number }) {
  const out = useRef<HTMLSpanElement>(null)
  const m = text.match(/-?\d+(?:\.(\d+))?/)
  const to = m ? parseFloat(m[0]) : 0
  const dp = m?.[1]?.length ?? 0
  const fmt = (n: number) => (m ? text.slice(0, m.index) + n.toFixed(dp) + text.slice(m.index! + m[0].length) : text)
  useEffect(() => {
    const el = out.current
    if (!el || !m) return
    if (!run || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = run ? text : fmt(from); return }
    let raf = 0
    const t0 = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0) / duration))
      // ease-out expo: quick off the mark, a long soft settle onto the final figure
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      el.textContent = fmt(from + (to - from) * e)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, text, from, delay, duration])
  if (!m) return <>{text}</>
  return <><span className="sr-only">{text}</span><span ref={out} aria-hidden>{fmt(from)}</span></>
}

/** true once the element has come properly into view (then stays true) */
function useSeen<T extends Element>(ref: React.RefObject<T | null>, threshold = 0.35) {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen, threshold])
  return seen
}

/** the roll-up metrics: arrives once it's in view — the card, then each figure in turn,
    its number counting up as it lands (and the feature's line drawing across) */
function CaseMetrics({ metrics }: { metrics: NonNullable<WorkItem['metrics']> }) {
  const ref = useRef<HTMLDListElement>(null)
  const seen = useSeen(ref)
  return (
    <dl className={`case-metrics${seen ? ' is-in' : ''}`} ref={ref}>
      {metrics.map((m, i) => (
        <div className={`case-metrics__item${m.trend ? ' is-feature' : ''}`} key={m.label} style={{ '--i': i } as React.CSSProperties}>
          <dt className="case-metrics__label">{m.label}</dt>
          <dd className="case-metrics__value"><MetricValue value={m.value} run={seen} delay={250 + i * 140} /></dd>
          {m.trend && <dd className="case-metrics__chart"><Trend points={m.trend} end={m.trendEnd} /></dd>}
        </div>
      ))}
    </dl>
  )
}

/** a metric's rough line: the values stretched to fill the box, with a soft
    fill beneath and a faint drop under the latest value (an illustration, not a chart) */
function Trend({ points, end }: { points: number[]; end?: string }) {
  const lo = Math.min(...points), hi = Math.max(...points)
  const xy = points.map((v, i) => [(i / (points.length - 1)) * 100, 36 - ((v - lo) / (hi - lo || 1)) * 32] as const)
  // a smooth curve through the points (Catmull-Rom, as cubic Béziers)
  const f = (n: number) => n.toFixed(2)
  const line = xy.reduce((d, [x, y], i) => {
    if (i === 0) return `M${f(x)},${f(y)}`
    const [x0, y0] = xy[i - 2] ?? xy[i - 1]
    const [x1, y1] = xy[i - 1]
    const [x3, y3] = xy[i + 1] ?? [x, y]
    return `${d} C${f(x1 + (x - x0) / 6)},${f(y1 + (y - y0) / 6)} ${f(x - (x3 - x1) / 6)},${f(y - (y3 - y1) / 6)} ${f(x)},${f(y)}`
  }, '')
  const [ex, ey] = xy[xy.length - 1]
  // the line runs from yellow to purple, left to right (user space: across the whole box)
  const hue = (id: string) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
      <stop offset="0" style={{ stopColor: 'var(--miro-yellow-500)' }} />
      <stop offset="1" style={{ stopColor: 'var(--miro-lilac-600)' }} />
    </linearGradient>
  )
  return (
    <div className="trend" aria-hidden>
    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
      <defs>
        {hue('trend-hue')}
        {/* the light under the line, in the line's colours: fades away downward, and
            out at both ends (no hard edge under the latest value) */}
        <linearGradient id="trend-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".3" />
          <stop offset=".75" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trend-ends" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".35" stopColor="#fff" stopOpacity="1" />
          <stop offset=".75" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="trend-mask-down" maskContentUnits="userSpaceOnUse">
          <rect x="0" y="0" width="100" height="40" fill="url(#trend-down)" />
        </mask>
        <mask id="trend-mask-ends" maskContentUnits="userSpaceOnUse">
          <rect x="0" y="0" width="100" height="40" fill="url(#trend-ends)" />
        </mask>
      </defs>
      <g className="trend__fill" mask="url(#trend-mask-ends)">
        <path d={`${line} L100,40 L0,40 Z`} fill="url(#trend-hue)" mask="url(#trend-mask-down)" />
      </g>
      <path d={line} fill="none" stroke="url(#trend-hue)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
    {/* a faint drop from the latest value to the foot, and its label (HTML, so neither
        stretches with the box) */}
    <span className="trend__drop" style={{ left: `${ex}%`, top: `${(ey / 40) * 100}%` }} />
    {end && <span className="trend__end" style={{ left: `${ex}%` }}>{end}</span>}
    </div>
  )
}

/** a section's heading: an h3 under a major chapter's h2, else an h2 of its own */
function ChapterHeading({ s }: { s: CaseSection; all?: CaseSection[] }) {
  // a sub-point (s.sub) drops a level again: h4, set smaller
  const H = s.sub ? 'h4' : s.group ? 'h3' : 'h2'
  return <H className={`case-left__h2${s.sub ? ' case-left__h2--sub' : ''}`}>{s.heading}</H>
}

function runsOf(sections: CaseSection[]) {
  const runs: { group?: string; items: { s: CaseSection; i: number }[] }[] = []
  sections.forEach((s, i) => {
    const last = runs[runs.length - 1]
    if (s.group && last?.group === s.group) last.items.push({ s, i })
    else runs.push({ group: s.group, items: [{ s, i }] })
  })
  return runs
}

type Panel = { key: string; scene: SceneKey; item?: WorkItem; layout?: PanelLayout; more?: SceneKey[]; section?: CaseSection }
/** layouts that span both columns: the copy column gives way */
const spans = (l?: PanelLayout) => l === 'full' || l === 'columns' || l === 'statement' || l === 'split' || l === 'timeline'

export default function Carousel() {
  const { slug } = useParams()
  const caseItem: WorkItem | undefined = slug ? site.work.find((w) => w.href === `/work/${slug}`) : undefined
  const mode: 'home' | 'case' = caseItem ? 'case' : 'home'

  const track = useRef<HTMLDivElement>(null)
  const left = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLElement>(null)
  const blurFor = useKeyed<Live>(() => ({ current: 0 }))
  const spinFor = useKeyed<Spin>(() => ({ current: null, from: 0, to: 0, rest: 0 }))
  const [active, setActive] = useState(0)

  // home -> case transition state: hero sliding out, case copy sliding in
  const [transition, setTransition] = useState(false)
  const transitionRef = useRef(false)
  transitionRef.current = transition
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // case -> home: keep the case copy mounted while it slides back out right
  // and the hero slides in from the left (same distance, same timing)
  const lastCase = useRef<WorkItem | undefined>(caseItem)
  const [returning, setReturning] = useState<WorkItem | null>(null)
  const returnTimer = useRef(0)
  useLayoutEffect(() => {
    const prev = lastCase.current
    lastCase.current = caseItem
    if (!caseItem && prev && !reducedMotion()) {
      setReturning(prev)
      window.clearTimeout(returnTimer.current)
      returnTimer.current = window.setTimeout(() => setReturning(null), 2500)
    } else if (caseItem) {
      setReturning(null)
    }
  }, [caseItem])
  useEffect(() => () => window.clearTimeout(returnTimer.current), [])

  const panels: Panel[] = caseItem
    ? [
        { key: caseItem.href, scene: caseItem.scene, item: caseItem },
        ...caseItem.sections.slice(1).map((s, i) => ({ key: `${caseItem.href}#${i + 1}`, scene: s.panel, layout: s.layout, more: s.more, section: s })),
      ]
    : site.work.map((w) => ({ key: w.href, scene: w.scene, item: w }))

  const blurs = useRef<Live[]>([])
  blurs.current = panels.map((p) => blurFor(p.key))

  usePagedScroll(track, mode === 'home')

  useTrackMotion(track, blurs, marker, setActive)
  // the opening story canvas: which chapter the board shows for the panel in view
  const [step, setStep] = useState(0)
  const chapters = caseItem?.sections.map((s) => s.storyboard ?? null) ?? []
  // each run of consecutive storied sections is one Storyboard; a section that opens a
  // themed chapter (the dark flip) starts a new one, so no board spans the flip
  const boards = chapters.reduce<{ first: number; last: number }[]>((acc, c, i) => {
    if (!c) return acc
    const prev = acc[acc.length - 1]
    if (prev && prev.last === i - 1 && !caseItem!.sections[i].theme) prev.last = i
    else acc.push({ first: i, last: i })
    return acc
  }, [])
  useCasePanels(mode === 'case', left, track, setStep)
  useDarkRuns(mode === 'case', left)
  // the case page is held back until its loader has gone, then fades in (and its
  // copy's blur-in starts only then, so the first screen's blocks arrive in turn)
  const [loaded, setLoaded] = useState<string | null>(null)
  const ready = mode === 'case' && loaded === caseItem?.href
  useBlurIn(ready, left, caseItem?.href)

  // reset scroll before paint on mode change, so the clicked card (now panel 0,
  // pinned at the same spot) never jumps
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [slug])

  // faces follow the route: the case study's card rests on its back; every
  // other card turns (animated) back to its front
  useEffect(() => {
    site.work.forEach((w) => {
      const sp = spinFor(w.href)
      const wantBack = caseItem?.href === w.href
      const isBack = Math.round(sp.rest / Math.PI) % 2 !== 0
      if (sp.current != null || wantBack === isBack) return
      if (wantBack && !transitionRef.current) { sp.rest += Math.PI; return } // direct load: no animation
      sp.from = sp.rest
      sp.to = sp.rest + Math.PI
      sp.current = performance.now()
    })
  }, [caseItem?.href]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = (item: WorkItem) => {
    if (mode !== 'home' || reducedMotion()) return
    // one flip, landing on the back face (stays there for the case study)
    const sp = spinFor(item.href)
    sp.from = sp.rest
    sp.to = sp.rest + Math.PI
    sp.current = performance.now()
    setTransition(true)
    window.clearTimeout(timer.current)
    // cleared when the hero's exit animation ends (fallback in case it never runs)
    timer.current = window.setTimeout(() => setTransition(false), 2500)
  }

  // locked: selecting a card goes to that case study's own page, which shows the email gate
  // (Home renders RequestAccess there) until they're approved; one approval opens every case study
  const access = useAccess()
  const navigate = useNavigate()
  const select = (e: ReactMouseEvent, item: WorkItem) => {
    if (mode === 'case') { e.preventDefault(); return }
    if (!access?.granted) { e.preventDefault(); navigate(item.href); return }
    open(item)
  }

  const goTo = (i: number) => {
    (track.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const showHero = mode === 'home' || transition
  const shown = caseItem ?? returning ?? undefined

  return (
    <section className={`carousel carousel--${mode}${transition ? ' is-transitioning' : ''}${mode === 'case' && !ready ? ' is-case-loading' : ''}`}>
      {/* always-present sticky rail: holds the stepper, defines the pinned spot */}
      <div className="carousel__rail" aria-hidden={false}>
        <div className="carousel__rail-pin">
          {/* project stepper: homepage only (case studies have none) */}
          {mode === 'home' && (
          <nav className="scroll-marker glass" aria-label="Projects" ref={marker}>
            <div className="scroll-marker__window">
            <div className="scroll-marker__strip">
            {panels.map((p, i) => (
              <button
                key={p.key}
                className="scroll-marker__bar"
                aria-label={`Go to ${p.item?.title}`}
                aria-current={i === active ? 'true' : undefined}
                onClick={() => goTo(i)}
              >
                <span className="scroll-marker__fill" aria-hidden />
              </button>
            ))}
            </div>
            </div>
          </nav>
          )}
        </div>
      </div>

      {showHero && (
        <div
          className={`carousel__sticky${mode === 'case' ? ' is-exiting' : returning ? ' is-returning' : ''}`}
          data-gl-fade
          onAnimationEnd={(e) => {
            if (e.animationName === 'hero-out') setTransition(false)
            if (e.animationName === 'hero-in') setReturning(null)
          }}
        >
          <GLSlot variant="wide" scene={PortraitScene} className="is-media">
            <div className="hero-type">
              <h1 className="hero-type__name">{site.hero.title.replace(/-/g, '‑')}</h1>
              <p className="hero-type__role">
                {site.hero.subtitle.split(/(?<=,)\s+/).map((part) => (
                  <span key={part}>{part}</span>
                ))}
              </p>
            </div>
          </GLSlot>
        </div>
      )}

      {(caseItem ?? returning) && (
        <div className={`case-left${transition ? ' is-entering' : ''}${!caseItem ? ' is-leaving' : ''}`} ref={caseItem ? left : undefined}>
          <div className="case-left__inner">
          <header className="case-left__head">
            {shown!.brand === 'miro' ? <MiroLogo height={26} className="case-left__brand" /> : <p className="eyebrow">Case study</p>}
            <h1 className="case-left__title">{shown!.headline ?? shown!.title}</h1>
            {!shown!.headline && <p className="lede muted">{shown!.description}</p>}
            {shown!.intro?.split('\n\n').map((para, i) => <p key={i} className="case-left__intro">{para}</p>)}
            {shown!.metrics && <CaseMetrics metrics={shown!.metrics} />}
          </header>
          {runsOf(shown!.sections).map((run) => {
            const one = (s: CaseSection, i: number, row?: number) => (
              <section
                className={`case-left__section${spans(s.layout) ? ' is-full' : ''}${s.layout === 'band' ? ' is-band' : ''}${s.titleSize === 'xl' ? ' is-xl' : ''}${s.layout === 'finale' ? ' case-finale' : ''}${run.group ? ' is-sub' : ''}`}
                data-panel={i}
                // a band travels too: the pinned card above it scrolls away just ahead of it,
                // like content, rather than sitting over it until a crossfade
                data-smooth={s.layout === 'statement' || s.layout === 'split' || s.layout === 'timeline' || s.layout === 'band' ? s.layout : undefined}
                key={s.heading}
                style={row ? { gridRow: row } : undefined}
              >
                {/* waypoint (invisible): where the right-hand panel advances / retreats */}
                <span className="waypoint" aria-hidden />
                {/* full-width sections carry their copy on the panel itself; untitled ones are spacers */}
                {/* the finale: a very large title, centred on the screen, with the keynote over its foot */}
                {s.layout === 'finale' && (
                  <div className="case-finale__inner">
                    <h2 className="case-finale__title">{s.heading}</h2>
                    {shown!.video && (
                      <div className="case-finale__video">
                        {/* notes of praise, tucked behind the card and poking out from its edges */}
                        <LaunchCelebration />
                        {/* the card's glass: real lens refraction and aberration round its rim */}
                        <LensGlass id="finale-glass" target=".video-embed" radius={24} bezel={10} />
                        <VideoEmbed video={shown!.video} />
                      </div>
                    )}
                  </div>
                )}
                {s.linkCard && <LinkCard card={s.linkCard} />}
                {/* a band: the section's own copy across both columns, in the page's flow */}
                {s.layout === 'band' && (
                  <div className="band">
                    {(s.heading || s.body.length > 0) && <div className="band__cols">
                      {/* a band outside any chapter is a chapter of its own: its title at chapter size */}
                      {s.group ? <ChapterHeading s={s} all={shown!.sections} /> : <h2 className="band__title">{s.heading}</h2>}
                      {s.body.map((b) => <p className="lede" key={b}>{b}</p>)}
                    </div>}
                    {s.film
                      ? <FilmTile {...s.film} />
                      : s.placeholder && <div className="band__visual" role="img" aria-label="Visual to come"><span>16:9 visual</span></div>}
                    {s.rows?.map((r, ri) => r.aside ? (
                      // copy on the left, its shelf beside it on the right
                      <div className={`band__row band__row--aside${r.stack ? ' band__row--stack' : ''}`} key={r.title ?? `row-${ri}`}>
                        <div className="band__aside-copy">
                          {r.title && <h3 className="band__row-title">{r.title}</h3>}
                          {(Array.isArray(r.body) ? r.body : r.body ? [r.body] : []).map((b) => <p className="lede" key={b}>{b}</p>)}
                        </div>
                        {r.shelf && (r.stack
                          ? <div className="band__aside-media"><ShelfStack shelf={r.shelf} /></div>
                          : <div className="band__shelf-reel band__aside-media"><PagedShelf shelf={r.shelf} bare /></div>)}
                      </div>
                    ) : (
                      // no title or copy: the row is just its visual, tucked up under the one above
                      <div className={`band__row${r.title || r.body || r.linkCard ? '' : ' band__row--tight'}`} key={r.title ?? `row-${ri}`}>
                        {(r.title || r.body || r.linkCard) && <div className="band__cols">
                          {r.title && <h3 className="band__row-title">{r.title}</h3>}
                          {r.body && <p className="lede band__row-body">{Array.isArray(r.body) ? r.body.join(' ') : r.body}</p>}
                          {r.linkCard && <div className="band__row-card"><LinkCard card={r.linkCard} /></div>}
                        </div>}
                        {/* three principles side by side; else the row's shelf of examples, or a
                            blocked-out space until it's made */}
                        {r.principles
                          ? <PrinciplesRow items={r.principles} />
                          : r.shelf
                            ? <div className="band__shelf-reel"><PagedShelf shelf={r.shelf} bare /></div>
                            : <div className="band__shelf" role="img" aria-label="Examples to come"><span>Shelf of examples</span></div>}
                      </div>
                    ))}
                  </div>
                )}
                {!spans(s.layout) && s.layout !== 'band' && s.layout !== 'finale' && s.heading && (
                  <>
                    {/* a chapter's title sits in the margin; a sub-chapter's leads its copy */}
                    <ChapterHeading s={s} all={shown!.sections} />
                    {(s.list ? s.body.slice(0, 1) : s.body).map((b) => <p className="lede" key={b}>{b}</p>)}
                    {s.list && (
                      <>
                        {(() => {
                          // the last `listApart` items sit on a card of their own, joined by a plus
                          const cut = s.list.length - (s.listApart ?? 0)
                          const item = (it: { title: string; text: string }, n: number) => (
                            <li className="case-list__item" key={it.title}>
                              <span className="case-list__num" aria-hidden>{String(n + 1).padStart(2, '0')}</span>
                              <span className="case-list__body"><b className="case-list__title">{it.title}</b> {it.text}</span>
                            </li>
                          )
                          return (
                            <>
                              <ol className="case-list">{s.list.slice(0, cut).map((it, n) => item(it, n))}</ol>
                              {cut < s.list.length && (
                                <>
                                  <span className="case-list__plus" aria-hidden>+</span>
                                  <ol className="case-list case-list--apart" start={cut + 1}>{s.list.slice(cut).map((it, n) => item(it, cut + n))}</ol>
                                </>
                              )}
                            </>
                          )
                        })()}
                        {s.body.slice(1).map((b) => <p className="lede" key={b}>{b}</p>)}
                      </>
                    )}
                    {s.bullets && (
                      <ul className="case-bullets lede">
                        {s.bullets.map((b) => typeof b === 'string'
                          ? <li key={b}>{b}</li>
                          : <li key={b.title}><b>{b.title}</b>: {b.text}</li>)}
                      </ul>
                    )}
                    {s.table && (
                      <table className="case-table">
                        <thead><tr>{s.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                        <tbody>{s.table.rows.map((r) => <tr key={r[0]}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
                      </table>
                    )}
                    {s.after?.map((b) => <p className="lede" key={b}>{b}</p>)}
                    {s.figures && <Figures items={s.figures} start={figureStart(shown!.sections, i)} />}
                    {s.useCases && (
                      <div className="case-uses">
                        <p className="lede"><b>{s.useCases.label}</b></p>
                        <p className="lede">{s.useCases.intro}</p>
                        <ul className="case-bullets lede">
                          {s.useCases.items.map((it) => <li key={it.title}><b>{it.title}</b>: {it.text}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </section>
            )
            if (!run.group) return run.items.map(({ s, i }) => one(s, i))
            // a major chapter: its name is a larger heading in the copy, above its sections
            return (
              <div className={`case-left__run${run.items[0].s.theme === 'dark' ? ' theme-dark' : ''}`} key={run.group}>
                {run.items[0].s.theme === 'dark' && <DarkField />}
                <h2 className="case-left__chapter">{run.group}</h2>
                {run.items[0].s.chapterLead && <p className="lede case-left__chapter-lead">{run.items[0].s.chapterLead}</p>}
                {run.items.map(({ s, i }, k) => one(s, i, k + (run.items[0].s.chapterLead ? 3 : 2)))}
              </div>
            )
          })}
          </div>
        </div>
      )}

      {/* preloads the case's pictures and fonts, and warms the 3D cards, before it's seen */}
      {mode === 'case' && caseItem && (
        <CaseLoader
          id={caseItem.href}
          onDone={() => setLoaded(caseItem.href)}
          urls={[
            ...caseItem.sections.flatMap((s) => s.figures?.map((f) => f.src) ?? []),
            ...caseItem.sections.flatMap((s) => (s.film?.poster ? [s.film.poster] : [])),
            ...(caseItem.video ? [`https://i.ytimg.com/vi/${caseItem.video.id}/maxresdefault.jpg`] : []),
          ]}
        />
      )}
      <div className="carousel__track-wrap" data-gl-fade>
        {/* Storyboards: one pinned board per run of storied panels (desktop); the panels' own boards hide beneath */}
        {mode === 'case' && step >= 0 && boards.map((b) => (
          <Storyboard
            key={b.first}
            first={b.first}
            last={b.last}
            chapter={step >= b.first && step <= b.last ? chapters[step] : null}
            lead={chapters[b.first]!}
            mission={caseItem!.sections.find((s) => s.storyboard === 'mission')?.mission}
          />
        ))}
        <div className="carousel__track" ref={track}>
          {panels.map((p, i) => (
            <div className={`carousel__item${mode === 'case' && chapters[i] ? ' is-storied' : ''}`} data-gl-fade key={p.key}>
              {p.item ? (
                <Link className="carousel__link" to={p.item.href} onClick={(e) => select(e, p.item!)} tabIndex={mode === 'case' ? -1 : 0}>
                  <GLSlot variant="wide" scene={scenes[p.scene]} flat={FLAT_SCENES.has(p.scene)} blur={blurs.current[i]} spin={spinFor(p.key)} back={backFor(p.item)} tilt className={toneClass(p.scene)}>
                    <div className="stack stack--tight">
                      {/* the business's logo stands in for the title (text title until a logo exists) */}
                      <h2 className="title">
                        {hasWordmark(p.item.logo)
                          ? <Wordmark name={p.item.logo!} label={p.item.title} className="title__logo" />
                          : p.item.title}
                      </h2>
                      <p className="lede">{p.item.description}</p>
                    </div>
                  </GLSlot>
                </Link>
              ) : null}
              {/* the case study opens on the live headline board, over the card's back face */}
              {p.item ? (
                mode === 'case' && (
                  <>
                    {p.item.heroBoard && <div className="case-board"><CaseBoard /></div>}
                    {p.item.vignette && <div className="case-board"><Vignette k={p.item.vignette} /></div>}
                    {/* stickers land once the board has faded in */}
                    {p.item.stickers && <CardStickers delay={1100} />}
                  </>
                )
              ) : p.layout === 'band' || p.layout === 'finale' ? (
                // a band carries its content in the copy column (page flow): no card here
                <div className="panel" />
              ) : p.layout === 'split' && p.section ? (
                // the copy across both columns, then the section's shelf full width
                // (centred across the screen instead, all its paragraphs together, when it has a
                // single paragraph or a placeholder visual beneath)
                <div className="panel panel--split">
                  <div className={`panel__stage split${p.section.body.length === 1 || p.section.placeholder ? ' split--centred' : ''}`}>
                    <div className="split__copy">
                      <ChapterHeading s={p.section} all={caseItem?.sections ?? shown!.sections} />
                      {(p.section.placeholder ? p.section.body : p.section.body.slice(0, 1)).map((b) => <p className="lede" key={b}>{b}</p>)}
                    </div>
                    {p.section.body.length > 1 && !p.section.placeholder && (
                      <div className="split__copy split__copy--right">
                        {p.section.body.slice(1).map((b) => <p className="lede" key={b}>{b}</p>)}
                      </div>
                    )}
                    {SHOW_REELS && p.section.shelf && <div className="split__shelf"><PagedShelf shelf={p.section.shelf} bare /></div>}
                    {p.section.placeholder && <div className="split__placeholder" role="img" aria-label="Visual to come"><span>16:9 visual</span></div>}
                  </div>
                </div>
              ) : p.layout === 'timeline' && p.section?.timeline ? (
                // full width, like the statement: the timeline builds in as it's reached
                <div className="panel panel--statement">
                  <div className="panel__stage"><Timeline data={p.section.timeline} /></div>
                </div>
              ) : p.layout === 'statement' && p.section?.statement ? (
                // one sentence centred across both columns, no card behind it
                <div className="panel panel--statement">
                  <div className="panel__stage"><StatementReveal script={p.section.statement} /></div>
                </div>
              ) : p.layout === 'columns' && p.section?.columns ? (
                // one card per column; each animates in on its own once the
                // section is reached (data-gl-fade mirrors the fade into WebGL)
                <div className="panel panel--columns">
                  <div className="pillars">
                    {p.section.columns.map((c, j) => (
                      <div key={c.title} className={`pillar${active >= i ? ' is-in' : ''}`} data-gl-fade style={{ transitionDelay: active >= i ? `${j * 140}ms` : '0ms' }}>
                        <GLSlot variant="fill" scene={scenes[c.scene]} blur={blurs.current[i]} className={toneClass(c.scene)}>
                          <h3 className="pillar__title">{c.title}</h3>
                        </GLSlot>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`panel panel--${p.layout ?? 'single'}`}>
                  {[p.scene, ...(p.more ?? [])]
                    .slice(0, p.layout === 'grid' ? 4 : p.layout === 'stack' ? 2 : 1)
                    .map((k, j) => (
                      <GLSlot key={j} variant="fill" scene={scenes[k]} blur={blurs.current[i]} className={toneClass(k)}>
                        {p.section?.vignettes?.[j] && <Vignette k={p.section.vignettes[j]} />}
                        {/* a statement on an ordinary card: the sentence written live on the card's board */}
                        {j === 0 && p.section?.statement && <div className="panel__board"><StatementReveal script={p.section.statement} /></div>}
                        {p.layout === 'full' && j === 0 && p.section ? (
                          <div className="panel__copy">
                            <ChapterHeading s={p.section} all={caseItem?.sections ?? shown!.sections} />
                            {p.section.body.map((b) => <p className="lede" key={b}>{b}</p>)}
                          </div>
                        ) : null}
                      </GLSlot>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
