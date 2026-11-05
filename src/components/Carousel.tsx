import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { site, type CaseSection, type PanelLayout, type SceneKey, type WorkItem } from '../data/site'
import { GLSlot } from '../webgl/GLSlot'
import type { SpinState } from '../webgl/GlassEdge'
import { PortraitScene, scenes } from '../webgl/scenes'
import Vignette from './miro/Vignettes'
import CardStickers from './miro/CardStickers'
import CaseBoard from './CaseBoard'
import StatementReveal from './StatementReveal'
import VideoEmbed from './VideoEmbed'
import MiroLogo from './MiroLogo'
import { PagedShelf } from './shelf/PagedShelf'

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

/** Case mode: slide the pinned panel stack to match the section in view. */
function useCasePanels(
  enabled: boolean,
  left: React.RefObject<HTMLDivElement | null>,
  track: React.RefObject<HTMLDivElement | null>,
) {
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
      if (!dots?.length || !isDesktop()) { el.style.transform = ''; clear(); return }
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
          const arrive = sec?.dataset.smooth === 'statement' ? vh * 0.5 : pinTop
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
const spans = (l?: PanelLayout) => l === 'full' || l === 'columns' || l === 'statement' || l === 'split'

export default function Carousel() {
  const { slug } = useParams()
  const caseItem = slug ? site.work.find((w) => w.href === `/work/${slug}`) : undefined
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
  useCasePanels(mode === 'case', left, track)

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

  const goTo = (i: number) => {
    (track.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const showHero = mode === 'home' || transition
  const shown = caseItem ?? returning ?? undefined

  return (
    <section className={`carousel carousel--${mode}${transition ? ' is-transitioning' : ''}`}>
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
            {shown!.intro && <p className="case-left__intro">{shown!.intro}</p>}
            {shown!.video && <VideoEmbed video={shown!.video} />}
          </header>
          {runsOf(shown!.sections).map((run) => {
            const one = (s: CaseSection, i: number, row?: number) => (
              <section
                className={`case-left__section${spans(s.layout) ? ' is-full' : ''}${run.group ? ' is-sub' : ''}`}
                data-panel={i}
                data-smooth={s.layout === 'statement' || s.layout === 'split' ? s.layout : undefined}
                key={s.heading}
                style={row ? { gridRow: row } : undefined}
              >
                {/* waypoint (invisible): where the right-hand panel advances / retreats */}
                <span className="waypoint" aria-hidden />
                {/* full-width sections carry their copy on the panel itself; untitled ones are spacers */}
                {!spans(s.layout) && s.heading && (
                  <>
                    {/* a chapter's title sits in the margin; a sub-chapter's leads its copy */}
                    <h2 className="case-left__h2">{s.heading}</h2>
                    {s.body.map((b) => <p className="lede" key={b}>{b}</p>)}
                  </>
                )}
              </section>
            )
            if (!run.group) return run.items.map(({ s, i }) => one(s, i))
            // a chapter with sub-chapters: its title rides in the margin for the whole run
            return (
              <div className="case-left__run" key={run.group}>
                <div className="case-left__run-label" style={{ gridRow: `1 / span ${run.items.length}` }}>
                  <p className="case-left__chapter">{run.group}</p>
                </div>
                {run.items.map(({ s, i }, k) => one(s, i, k + 1))}
              </div>
            )
          })}
          </div>
        </div>
      )}

      <div className="carousel__track-wrap">
        <div className="carousel__track" ref={track}>
          {panels.map((p, i) => (
            <div className="carousel__item" data-gl-fade key={p.key}>
              {p.item ? (
                <Link className="carousel__link" to={p.item.href} onClick={(e) => { if (mode === 'case') { e.preventDefault(); return } open(p.item!) }} tabIndex={mode === 'case' ? -1 : 0}>
                  <GLSlot variant="wide" scene={scenes[p.scene]} flat={FLAT_SCENES.has(p.scene)} blur={blurs.current[i]} spin={spinFor(p.key)} back={backFor(p.item)} tilt className={toneClass(p.scene)}>
                    <div className="stack stack--tight">
                      <h2 className="title">{p.item.title}</h2>
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
              ) : p.layout === 'split' && p.section ? (
                // the copy across both columns, then the section's shelf full width
                <div className="panel panel--split">
                  <div className="panel__stage split">
                    <div className="split__copy">
                      <h2 className="case-left__h2">{p.section.heading}</h2>
                      {p.section.body[0] && <p className="lede">{p.section.body[0]}</p>}
                    </div>
                    <div className="split__copy split__copy--right">
                      {p.section.body.slice(1).map((b) => <p className="lede" key={b}>{b}</p>)}
                    </div>
                    {p.section.shelf && <div className="split__shelf"><PagedShelf shelf={p.section.shelf} bare /></div>}
                  </div>
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
                        {p.layout === 'full' && j === 0 && p.section ? (
                          <div className="panel__copy">
                            <h2 className="case-left__h2">{p.section.heading}</h2>
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
