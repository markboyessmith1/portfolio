import { useCallback, useEffect, useRef, useState } from 'react'
import { DECK, type DeckMedia, type DeckSlide } from '../data/presentMiroAi'
import { useAccess } from '../lib/access'
import './present.css'

/* /present/miro-ai: the Miro AI case study as a full-screen, horizontal deck.
   Rendered outside the site chrome (see main.tsx).
   Keys: → / Space / PageDown next, ← / PageUp back, Home / End, F fullscreen,
   N speaker notes, T hide the TO FILL placeholders. Click the right or left
   edge to move, or swipe. The slide number lives in the hash (#7), so a reload
   keeps your place. */

const slides = DECK.slides
const clamp = (n: number) => Math.max(0, Math.min(slides.length - 1, n))
const fromHash = () => clamp((parseInt(location.hash.slice(1), 10) || 1) - 1)

export default function PresentMiroAI() {
  const access = useAccess()
  // the live site keeps the case study's email gate; previews and dev are open
  const gated = /(^|\.)boyes-smith\.com$/.test(location.hostname)
  if (gated && !access) return <div className="deck" aria-busy />
  if (gated && !access?.granted) {
    return (
      <div className="deck deck--gate">
        <p>This presentation is part of the Miro AI case study.</p>
        <a href="/work/miro-ai">Request access</a>
      </div>
    )
  }
  return <Deck />
}

function Deck() {
  const [index, setIndex] = useState(fromHash)
  const [notes, setNotes] = useState(false)
  const [showTodo, setShowTodo] = useState(true)
  const touch = useRef<number | null>(null)

  const go = useCallback((n: number) => setIndex(clamp(n)), [])
  const next = useCallback(() => setIndex((i) => clamp(i + 1)), [])
  const prev = useCallback(() => setIndex((i) => clamp(i - 1)), [])

  useEffect(() => { history.replaceState(null, '', `#${index + 1}`) }, [index])
  useEffect(() => {
    const onHash = () => setIndex(fromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
          e.preventDefault(); next(); break
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
          e.preventDefault(); prev(); break
        case 'Home': go(0); break
        case 'End': go(slides.length - 1); break
        case 'f': case 'F':
          if (document.fullscreenElement) document.exitFullscreen()
          else document.documentElement.requestFullscreen?.().catch(() => {})
          break
        case 'n': case 'N': setNotes((v) => !v); break
        case 't': case 'T': setShowTodo((v) => !v); break
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [next, prev, go])

  const slide = slides[index]
  const chapters = [...new Set(slides.map((s) => s.chapter))]

  return (
    <div
      className={`deck${showTodo ? '' : ' deck--clean'}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button, video[controls]')) return
        if (e.clientX > innerWidth * 0.33) next(); else prev()
      }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touch.current == null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)()
      }}
    >
      <div className="deck__track" style={{ transform: `translate3d(${-index * 100}vw, 0, 0)` }}>
        {slides.map((s, i) => (
          <section key={i} className={`slide slide--${s.layout}`} aria-hidden={i !== index} aria-label={`Slide ${i + 1}: ${s.title}`}>
            {Math.abs(i - index) <= 1 && <SlideBody slide={s} active={i === index} />}
          </section>
        ))}
      </div>

      <nav className="deck__bar" aria-label="Chapters">
        {chapters.map((c) => {
          const first = slides.findIndex((s) => s.chapter === c)
          return (
            <button key={c} type="button" className={c === slide.chapter ? 'is-on' : ''} onClick={() => go(first)}>
              {c}
            </button>
          )
        })}
        <span className="deck__count">{index + 1} / {slides.length}</span>
      </nav>
      <div className="deck__progress" style={{ transform: `scaleX(${(index + 1) / slides.length})` }} />

      {notes && (
        <aside className="deck__notes" onClick={(e) => e.stopPropagation()}>
          <strong>Notes · {index + 1}</strong>
          {slide.criteria?.length ? <p className="deck__crit">Proves: {slide.criteria.join(', ')}</p> : null}
          <p>{slide.notes ?? 'No notes for this slide.'}</p>
          {slides[index + 1] && <p className="deck__next">Next: {slides[index + 1].title}</p>}
        </aside>
      )}
    </div>
  )
}

function SlideBody({ slide: s, active }: { slide: DeckSlide; active: boolean }) {
  const text = (
    <div className="slide__text">
      {s.eyebrow && <p className="slide__eyebrow">{s.eyebrow}</p>}
      <h2 className="slide__title">{s.title}</h2>
      {s.body?.map((p, i) => <p key={i} className="slide__p">{p}</p>)}
      {s.bullets && (
        <ul className="slide__list">
          {s.bullets.map((b, i) => (
            <li key={i}>{b.title && <strong>{b.title}: </strong>}{b.text}</li>
          ))}
        </ul>
      )}
      {s.call && (
        <div className="slide__call"><span>My call</span>{s.call}</div>
      )}
      {s.todo && (
        <ul className="slide__todo" aria-label="To fill">
          {s.todo.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
    </div>
  )

  if (s.layout === 'metrics') {
    return (
      <div className="slide__inner">
        {text}
        <div className="slide__metrics">
          {s.metrics?.map((m) => (
            <div key={m.label} className="metric"><b>{m.value}</b><span>{m.label}</span></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="slide__inner">
      {text}
      {s.media && (
        <div className={`slide__media slide__media--${s.media.length}`}>
          {s.media.map((m, i) => <Media key={i} media={m} active={active} />)}
        </div>
      )}
    </div>
  )
}

function Media({ media: m, active }: { media: DeckMedia; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) { v.currentTime = 0; v.play().catch(() => {}) } else v.pause()
  }, [active])

  const caption = 'caption' in m && m.caption ? <figcaption>{m.caption}</figcaption> : null
  switch (m.kind) {
    case 'video':
      return (
        <figure className="media">
          <video ref={ref} src={m.src} poster={m.poster} muted loop playsInline preload="metadata" />
          {caption}
        </figure>
      )
    case 'image':
      return <figure className="media"><img src={m.src} alt={m.alt} />{caption}</figure>
    case 'embed':
      return <figure className="media"><iframe src={m.src} title={m.caption ?? 'Prototype'} loading="lazy" />{caption}</figure>
    case 'todo':
      return <figure className="media media--todo"><span>TO FILL</span><p>{m.caption}</p></figure>
  }
}
