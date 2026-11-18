import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { DECK, type DeckMedia, type DeckSlide } from '../data/presentMiroAi'
import { useAccess } from '../lib/access'
import './present.css'

/* /present/miro-ai: the Miro AI talk as a horizontal, scrolling web
   presentation, in the portfolio's house style (rendered outside the site
   chrome, see main.tsx). The scaffold and build prompt behind it are in
   notes/present-miro-ai.md; the content is src/data/presentMiroAi.ts.

   The strip is a native horizontal scroller with snap points, so a trackpad
   swipe, a touch swipe and the scrollbar all just work. A vertical wheel
   steps one slide per gesture (unless it's over something that scrolls on
   its own, like a mosaic). Keys: → / Space / PageDown next, ← / PageUp back,
   Home / End, F fullscreen, N speaker notes, T hide the TO FILL placeholders.
   The slide number lives in the hash (#7), so a reload keeps your place. */

const slides = DECK.slides
const N = slides.length
const clamp = (n: number) => Math.max(0, Math.min(N - 1, n))
const fromHash = () => clamp((parseInt(location.hash.slice(1), 10) || 1) - 1)
const chapters = [...new Set(slides.map((s) => s.chapter))]
/** consecutive slides in one chapter (the scrubber groups its ticks by these) */
const runs = slides.reduce<{ chapter: string; from: number; to: number }[]>((out, s, i) => {
  const last = out[out.length - 1]
  if (last && last.chapter === s.chapter) last.to = i
  else out.push({ chapter: s.chapter, from: i, to: i })
  return out
}, [])

/** each chapter's hue (Miro's sticky palette): it tints the slides and their cards */
const HUE: Record<string, string> = {
  Intro: '#a9a6a0',
  'No clear direction': '#ffd02f',
  Operationalisation: '#68d3f8',
  Challenges: '#ff8a7a',
  'How AI changed the work': '#8f7fee',
  Outcomes: '#9ed452',
  Appendix: '#a9a6a0',
}
const hueOf = (chapter: string) => HUE[chapter] ?? '#a9a6a0'
const RING_R = 15
const RING_C = 2 * Math.PI * RING_R
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function PresentMiroAI() {
  const access = useAccess()
  // the live site keeps the case study's email gate; previews and dev are open
  const gated = /(^|\.)boyes-smith\.com$/.test(location.hostname)
  if (gated && !access) return <div className="pres" aria-busy />
  if (gated && !access?.granted) {
    return (
      <div className="pres pres--gate">
        <div className="pres-gate">
          <p className="ps-eyebrow">Miro · 2026</p>
          <h1 className="ps-title">{DECK.title}</h1>
          <p className="ps-body">This presentation is part of the Miro AI case study. Once you have access there, it opens here too.</p>
          <a className="pres-btn" href="/work/miro-ai">Request access</a>
        </div>
      </div>
    )
  }
  return <Presentation />
}

function Presentation() {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(fromHash)
  const at = useRef(index)
  // where a keyboard or button move is heading, so quick presses queue up
  const heading = useRef<{ i: number; t: number } | null>(null)
  // the slide the strip last came to rest on
  const settled = useRef(index)
  // mouse and trackpad: we settle the strip ourselves (a short swipe is enough to
  // move on); touch keeps the browser's own paging snap
  const [fine] = useState(() => matchMedia('(pointer: fine)').matches)
  const [notes, setNotes] = useState(false)
  const [clean, setClean] = useState(false)
  const [list, setList] = useState(false)
  // slides that have come into view (they fade up the first time, then stay put)
  const [seen, setSeen] = useState<Set<number>>(() => new Set([at.current]))

  const go = useCallback((n: number) => {
    const el = track.current
    if (!el) return
    const i = clamp(n)
    heading.current = { i, t: performance.now() }
    settled.current = i
    el.scrollTo({ left: i * el.clientWidth, behavior: reduced() ? 'auto' : 'smooth' })
  }, [])
  const step = useCallback((d: number) => {
    const h = heading.current
    const from = h && performance.now() - h.t < 700 ? h.i : at.current
    go(from + d)
  }, [go])

  // open on the hash's slide, without the scroll showing
  useLayoutEffect(() => {
    const el = track.current!
    el.scrollLeft = at.current * el.clientWidth
  }, [])

  // the current slide follows the scroll position
  useEffect(() => {
    const el = track.current!
    let raf = 0
    let rest = 0
    const read = () => {
      raf = 0
      const i = clamp(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
      if (i !== at.current) { at.current = i; setIndex(i) }
    }
    // once a swipe stops: a tenth of a slide in either direction moves on, otherwise back
    const settle = () => {
      const h = heading.current
      if (h && performance.now() - h.t < 900) return // one of our own moves
      const w = el.clientWidth
      const d = el.scrollLeft / w - settled.current
      const target = clamp(Math.abs(d) > 0.1 && Math.abs(d) < 0.5 ? settled.current + Math.sign(d) : Math.round(el.scrollLeft / w))
      if (Math.abs(el.scrollLeft - target * w) > 1) go(target)
      else settled.current = target
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
      if (fine) { clearTimeout(rest); rest = window.setTimeout(settle, 140) }
    }
    // keep the slide in place when the window changes size
    const onResize = () => { el.scrollLeft = at.current * el.clientWidth }
    el.addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(rest)
      el.removeEventListener('scroll', onScroll)
      removeEventListener('resize', onResize)
    }
  }, [fine, go])

  useEffect(() => { history.replaceState(null, '', `#${index + 1}`) }, [index])
  useEffect(() => {
    const onHash = () => go(fromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [go])

  // a vertical wheel steps one slide per gesture; a gesture that starts over
  // something that can still scroll that way (a mosaic, a long slide on a
  // short screen) scrolls it instead. Sideways swipes are the browser's own.
  useEffect(() => {
    const el = track.current!
    const g = { last: 0, native: false, stepped: false }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch zoom
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
      const now = performance.now()
      if (now - g.last > 240) {
        g.native = canScroll(e.target as HTMLElement, el, e.deltaY)
        g.stepped = false
      }
      g.last = now
      if (g.native) return
      e.preventDefault()
      if (g.stepped || Math.abs(e.deltaY) < 3) return
      g.stepped = true
      step(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
          e.preventDefault(); step(1); break
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          e.preventDefault(); step(-1); break
        case 'Home': e.preventDefault(); go(0); break
        case 'End': e.preventDefault(); go(N - 1); break
        case 'f': case 'F':
          if (document.fullscreenElement) document.exitFullscreen()
          else document.documentElement.requestFullscreen?.().catch(() => {})
          break
        case 'n': case 'N': setNotes((v) => !v); break
        case 't': case 'T': setClean((v) => !v); break
        case 'Escape': setList(false); setNotes(false); break
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [step, go])

  // a slide counts as seen once a sliver of it is in view, so it fades up as it slides in
  useEffect(() => {
    const el = track.current!
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((en) => en.isIntersecting).map((en) => Number((en.target as HTMLElement).dataset.i))
      if (hit.length) setSeen((prev) => (hit.every((i) => prev.has(i)) ? prev : new Set([...prev, ...hit])))
    }, { root: el, threshold: 0.18 })
    el.querySelectorAll('.ps').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  const slide = slides[index]

  return (
    <div className={`pres${clean ? ' pres--clean' : ''}${fine ? ' pres--fine' : ''}`} style={{ '--hue': hueOf(slide.chapter) } as CSSProperties}>
      <div className="pres__track" ref={track} tabIndex={-1}>
        {slides.map((s, i) => (
          <section
            key={i}
            data-i={i}
            className={`ps ps--${s.layout}${i === index ? ' is-on' : ''}${seen.has(i) ? ' is-seen' : ''}`}
            style={{ '--hue': hueOf(s.chapter) } as CSSProperties}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${N}: ${s.title}`}
            aria-hidden={i !== index}
          >
            <SlideBody slide={s} active={i === index} near={Math.abs(i - index) <= 2} />
          </section>
        ))}
      </div>

      {/* top left: back to the case study, and the chapter you're in */}
      <header className="pres__nav">
        <a className="pres-round glass" href="/work/miro-ai" aria-label="Back to the case study">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
        <div className="pres-chapter">
          <button type="button" className="chapterbar glass" aria-expanded={list} aria-controls="pres-chapters" onClick={() => setList((o) => !o)}>
            <svg className="chapterbar__ring" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r={RING_R} className="chapterbar__track" />
              <circle cx="18" cy="18" r={RING_R} className="chapterbar__fill" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - (index + 1) / N)} />
            </svg>
            <span className="chapterbar__meta">
              <span className="chapterbar__title" key={slide.chapter} aria-live="polite">{slide.chapter}</span>
            </span>
            <span className="chapterbar__btn" aria-hidden>
              <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
          {list && (
            <nav className="chapterbar__list glass" id="pres-chapters" aria-label="Chapters">
              <ul>
                {chapters.map((c) => {
                  const first = slides.findIndex((s) => s.chapter === c)
                  const on = c === slide.chapter
                  return (
                    <li key={c}>
                      <button type="button" className={on ? 'is-on' : undefined} aria-current={on ? 'true' : undefined} onClick={() => { go(first); setList(false) }}>
                        <span className="pres-dot" style={{ background: hueOf(c) }} aria-hidden />
                        {c}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
        </div>
      </header>

      {/* bottom: who, a scrubber with a tick per slide (grouped by chapter), and the arrows */}
      <footer className="pres__foot">
        <span className="pres__byline">Mark Boyes-Smith</span>
        <nav className="scrub" aria-label="Slides">
          {runs.map((r) => (
            <span key={r.from} className="scrub__run" style={{ '--hue': hueOf(r.chapter) } as CSSProperties}>
              {slides.slice(r.from, r.to + 1).map((s, k) => {
                const i = r.from + k
                return (
                  <button
                    key={i}
                    type="button"
                    className={`scrub__tick${i === index ? ' is-on' : i < index ? ' is-past' : ''}`}
                    aria-label={`Slide ${i + 1}: ${s.title}`}
                    aria-current={i === index ? 'step' : undefined}
                    title={`${i + 1} · ${s.title}`}
                    onClick={() => go(i)}
                  />
                )
              })}
            </span>
          ))}
        </nav>
        <span className="pres__arrows">
          <span className="pres__count">{String(index + 1).padStart(2, '0')} / {N}</span>
          <button type="button" className="pres-round pres-round--sm glass" onClick={() => step(-1)} disabled={index === 0} aria-label="Previous slide">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="pres-round pres-round--sm glass" onClick={() => step(1)} disabled={index === N - 1} aria-label="Next slide">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </span>
      </footer>

      {notes && (
        <aside className="pres__notes glass" aria-label="Speaker notes">
          <p className="pres__notes-head">Notes · {index + 1}</p>
          {slide.criteria?.length ? <p className="pres__notes-crit">Proves: {slide.criteria.join(', ')}</p> : null}
          <p>{slide.notes ?? 'No notes for this slide.'}</p>
          {slides[index + 1] && <p className="pres__notes-next">Next: {slides[index + 1].title}</p>}
        </aside>
      )}
    </div>
  )
}

/** can anything between the wheel's target and the strip still scroll that way? */
function canScroll(from: HTMLElement | null, stop: HTMLElement, dy: number) {
  for (let el = from; el && el !== stop; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
      if (dy < 0 && el.scrollTop > 0) return true
    }
  }
  return false
}

/* ---------- slides ---------- */

/** "01 · Meeting people…" → number + title; a bare "01" is just the number */
function splitNum(title?: string): { num?: string; title?: string } {
  if (!title) return {}
  const m = title.match(/^(\d{1,2})(?:\s*·\s*(.+))?$/)
  return m ? { num: m[1], title: m[2] } : { title }
}

function Bullets({ slide: s, across }: { slide: DeckSlide; across: boolean }) {
  const b = s.bullets
  if (!b?.length) return null
  // plain points: hanging bullets in body type
  if (!b.some((x) => x.title)) {
    return <ul className="ps-bullets">{b.map((x, i) => <li key={i}>{x.text}</li>)}</ul>
  }
  // titled points: the case study's numbered card (across the slide on a statement);
  // short ones run title and text on one line
  const compact = !across && b.every((x) => (x.title?.length ?? 0) <= 28 && x.text.length <= 48)
  return (
    <ol className={`ps-list${across ? ' ps-list--across' : ''}${compact ? ' ps-list--compact' : ''}`} style={{ '--cols': b.length } as CSSProperties}>
      {b.map((x, i) => {
        const { num, title } = splitNum(x.title)
        return (
          <li key={i} className="ps-list__item">
            <span className="ps-list__num" aria-hidden>{num ?? String(i + 1).padStart(2, '0')}</span>
            <span className="ps-list__body">
              {title ? <b className="ps-list__title">{title}</b> : <b className="ps-list__title">{x.text}</b>}
              {title && <span className="ps-list__text">{x.text}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Head({ slide: s, as: H = 'h2' }: { slide: DeckSlide; as?: 'h1' | 'h2' }) {
  return (
    <div className="ps-head ps-anim">
      {s.eyebrow && <p className="ps-eyebrow"><span className="pres-dot" aria-hidden />{s.eyebrow}</p>}
      <H className="ps-title">{s.title}</H>
    </div>
  )
}

function Copy({ slide: s, across = false }: { slide: DeckSlide; across?: boolean }) {
  return (
    <>
      {s.body?.map((p, i) => <p key={i} className="ps-body ps-anim">{p}</p>)}
      {s.bullets && <div className="ps-anim"><Bullets slide={s} across={across} /></div>}
      {s.call && (
        <div className="ps-call ps-anim"><span className="ps-call__label"><span className="pres-dot" aria-hidden />My call</span>{s.call}</div>
      )}
      {s.todo && (
        <ul className="ps-todo ps-anim" aria-label="To fill">{s.todo.map((t, i) => <li key={i}>{t}</li>)}</ul>
      )}
    </>
  )
}

function SlideBody({ slide: s, active, near }: { slide: DeckSlide; active: boolean; near: boolean }) {
  const media = (cls = '') =>
    s.media && (
      <div className={`ps-media ps-media--${s.media.length} ps-anim ${cls}`}>
        {s.media.map((m, i) => <Figure key={i} media={m} active={active} near={near} />)}
      </div>
    )

  switch (s.layout) {
    case 'title':
      return (
        <div className="ps-inner">
          <div className="ps-text">
            <Head slide={s} as="h1" />
            {s.body?.map((p, i) => <p key={i} className="ps-lede ps-anim">{p}</p>)}
            <p className="ps-hint ps-anim">
              Scroll, swipe or press
              <kbd aria-label="right arrow">→</kbd>
            </p>
          </div>
          {s.media && <div className="ps-media ps-media--cover ps-anim"><Figure media={s.media[0]} active={active} near={near} bleed /></div>}
        </div>
      )

    case 'statement':
      return (
        <div className="ps-inner">
          <Head slide={s} />
          <Copy slide={s} across />
        </div>
      )

    case 'timeline':
      return (
        <div className="ps-inner">
          <Head slide={s} />
          <ol className="ps-timeline ps-anim">
            {s.timeline?.map((t) => (
              <li key={t.when} className={`ps-timeline__item${t.major ? ' is-major' : ''}${t.held ? ' is-held' : ''}`}>
                <span className="ps-timeline__dot" aria-hidden />
                <span className="ps-timeline__when">{t.when}</span>
                <span className="ps-timeline__what">{t.what}</span>
                {t.detail && <span className="ps-timeline__detail">{t.detail}</span>}
              </li>
            ))}
          </ol>
        </div>
      )

    case 'stack': {
      const v = s.media?.[0]
      const n = s.logos?.length ?? 1
      return (
        <div className="ps-inner">
          <Head slide={s} />
          <div className="ps-orbit ps-anim">
            <div className="ps-orbit__screen">
              {v && v.kind !== 'todo' ? <Figure media={v} active={active} near={near} bleed /> : <Placeholder caption={v?.caption ?? 'Prototype video, 16:9'} />}
            </div>
            {s.logos?.map((l, i) => {
              const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
              return (
                <span key={l} className="ps-orbit__logo" style={{ left: `${50 + 47 * Math.cos(a)}%`, top: `${50 + 46 * Math.sin(a)}%`, '--d': `${i * -0.9}s` } as CSSProperties}>{l}</span>
              )
            })}
          </div>
        </div>
      )
    }

    case 'mosaic':
      return (
        <div className="ps-inner">
          <div className="ps-top">
            <Head slide={s} />
            <div className="ps-top__copy"><Copy slide={s} /></div>
          </div>
          <div className="ps-mosaic ps-anim">
            {s.metrics?.map((m) => <Metric key={m.label} {...m} />)}
            {s.media?.map((m, i) => <Figure key={i} media={m} active={active} near={near} />)}
          </div>
        </div>
      )

    case 'metrics':
      return (
        <div className="ps-inner">
          <div className="ps-top">
            <Head slide={s} />
            <div className="ps-top__copy"><Copy slide={{ ...s, bullets: undefined }} /></div>
          </div>
          <dl className="ps-kpis ps-anim" style={{ '--cols': s.metrics?.length ?? 1 } as CSSProperties}>
            {s.metrics?.map((m) => <Metric key={m.label} {...m} bare />)}
          </dl>
          {s.reflections && (
            <ol className="ps-list ps-list--across ps-anim" style={{ '--cols': s.reflections.length } as CSSProperties}>
              {s.reflections.map((r, i) => (
                <li key={i} className="ps-list__item">
                  <span className="ps-list__num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                  <span className="ps-list__body"><span className="ps-list__text ps-list__text--ink">{r}</span></span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )

    case 'full':
    case 'grid':
      return (
        <div className="ps-inner">
          <div className="ps-top">
            <Head slide={s} />
            {(s.body || s.bullets || s.call || s.todo) && <div className="ps-top__copy"><Copy slide={s} /></div>}
          </div>
          {media()}
        </div>
      )

    default: // split, live
      if (!s.media) {
        return (
          <div className="ps-inner ps-inner--duo">
            <Head slide={s} />
            <div className="ps-text"><Copy slide={s} /></div>
          </div>
        )
      }
      return (
        <div className="ps-inner">
          <div className="ps-text">
            <Head slide={s} />
            <Copy slide={s} />
          </div>
          {media()}
        </div>
      )
  }
}

function Metric({ value, label, bare }: { value: string; label: string; bare?: boolean }) {
  const body = (
    <>
      <dd className="ps-kpi__value">{value}</dd>
      <dt className="ps-kpi__label">{label}</dt>
    </>
  )
  return bare ? <div className="ps-kpi">{body}</div> : <dl className="ps-kpi ps-kpi--tile">{body}</dl>
}

function Placeholder({ caption }: { caption: string }) {
  return (
    <figure className="ps-fig ps-fig--fill ps-fig--todo">
      <div className="ps-frame"><div className="ps-card"><span>To fill</span><p>{caption}</p></div></div>
    </figure>
  )
}

function Figure({ media: m, active, near, bleed }: { media: DeckMedia; active: boolean; near: boolean; bleed?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) { v.currentTime = 0; v.play().catch(() => {}) } else v.pause()
  }, [active, near])

  if (m.kind === 'todo') return <Placeholder caption={m.caption} />
  const caption = m.caption ? <figcaption className="ps-fig__caption">{m.caption}</figcaption> : null
  const svg = m.kind === 'image' && m.src.endsWith('.svg')
  // a card hugs its video or image; a scene (no size of its own) or a bleed fills its frame
  const fill = bleed || m.kind === 'embed'
  return (
    <figure className={`ps-fig${fill ? ' ps-fig--fill' : ''}${bleed ? ' ps-fig--bleed' : ''}${svg ? ' ps-fig--svg' : ''}${caption ? ' ps-fig--cap' : ''}`}>
      <div className="ps-frame">
        <div className="ps-card">
          {m.kind === 'video' && (near
            ? <video ref={ref} src={m.src} poster={m.poster} muted loop playsInline preload="auto" />
            : m.poster ? <img src={m.poster} alt="" /> : null)}
          {m.kind === 'image' && <img src={m.src} alt={m.alt} loading="lazy" />}
          {m.kind === 'embed' && near && <iframe src={m.src} title={m.caption ?? 'Prototype scene'} tabIndex={-1} />}
        </div>
        {caption}
      </div>
    </figure>
  )
}
