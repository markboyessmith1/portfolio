import { useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import EpisodeList from './EpisodeList'

/* Talks & media on the resume: a horizontal carousel of quiet grey cards, each
   over a muted background loop (a clip, or a still drifting slowly). Play
   expands the card into a player over the page (a view transition morphs the
   card's media into the player's frame where supported): YouTube for talks,
   Spotify's player or an audio player for podcast episodes, or out to the show's page. Escape, the
   close button or the backdrop put it back. The player is portalled to <body>,
   clear of the resume's isolated layer, so it covers the site's header too.
   Styles: .media-* in styles.css. */

export type MediaPlay =
  | { kind: 'youtube'; id: string; start?: number }
  | { kind: 'audio'; src: string; start?: number; cover?: string }
  | { kind: 'spotify'; episode: string }
  | { kind: 'link' }

export type MediaItem = {
  kind: string
  /** the podcast, for an episode */
  show?: string
  /** square cover art, for an episode */
  cover?: string
  title: string
  /** left off when unknown */
  year?: string
  href: string
  /** muted background loop */
  loop?: string
  /** still, when there's no loop (drifts slowly) */
  poster?: string
  play: MediaPlay
}

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** run a state change inside a view transition where the browser has them */
const morph = (fn: () => void) => {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !REDUCED) doc.startViewTransition(() => flushSync(fn))
  else fn()
}

export default function MediaCarousel({ items: talks, episodes: eps = [] }: { items: MediaItem[]; episodes?: MediaItem[] }) {
  // one list behind the player: talks first, then episodes (podcast guest spots from `talks` join the episodes)
  const items = [...talks.filter((m) => m.kind !== 'Podcast'), ...talks.filter((m) => m.kind === 'Podcast'), ...eps]
  const [open, setOpen] = useState<number | null>(null)
  // the row scrolls within the column; the stepper (the shelves' pager) follows it and pages it,
  // and each edge fades out only while there's more to scroll that way
  const row = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const el = row.current
    if (!el) return
    const update = () => {
      const cards = [...el.children] as HTMLElement[]
      let best = 0
      cards.forEach((c, i) => { if (Math.abs(c.offsetLeft - el.scrollLeft) < Math.abs(cards[best].offsetLeft - el.scrollLeft)) best = i })
      // at the far end, the last card counts as current
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) best = cards.length - 1
      setActive(best)
      setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    return () => { el.removeEventListener('scroll', update); removeEventListener('resize', update) }
  }, [])
  const goTo = (i: number) => {
    const el = row.current
    const card = el?.children[i] as HTMLElement | undefined
    if (el && card) el.scrollTo({ left: card.offsetLeft, behavior: REDUCED ? 'auto' : 'smooth' })
  }
  const close = () => morph(() => setOpen(null))
  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open])
  const item = open === null ? null : items[open]
  // talks and keynotes ride the carousel; podcast episodes sit in a list beneath it
  const cards = items.map((m, i) => ({ m, i })).filter(({ m }) => m.kind !== 'Podcast')
  const episodes = items.map((m, i) => ({ m, i })).filter(({ m }) => m.kind === 'Podcast')
  const from = Math.max(0, Math.min(active - 1, cards.length - 3))

  return (
    <>
      <div className={`media-row${edges.right ? ' fade-right' : ''}`} role="list" ref={row}>
        {cards.map(({ m, i }) => (
          // the whole card is the target: a click anywhere does what its play icon does (the icon
          // stays the real, focusable control; clicks on it are left to it)
          <article
            className={`media-card${m.loop || m.poster ? '' : ' is-plain'}`} role="listitem" key={m.href}
            onClick={(e) => {
              if ((e.target as Element).closest('.media-card__play')) return
              if (m.play.kind === 'link') window.open(m.href, '_blank', 'noreferrer')
              else morph(() => setOpen(i))
            }}
          >
            {/* the media carries the transition name while it morphs into the player */}
            <div className="media-card__media" style={{ viewTransitionName: open === null ? `media-${i}` : undefined }}>
              {m.loop ? (
                <video src={m.loop} poster={m.poster} muted loop playsInline autoPlay={!REDUCED} preload="metadata" aria-hidden />
              ) : m.poster ? (
                <img src={m.poster} alt="" className="is-drift" />
              ) : null}
            </div>
            <div className="media-card__copy">
              <span className="media-card__meta">{m.year ? `${m.kind} · ${m.year}` : m.kind}</span>
              <h3 className="media-card__title">{m.title}</h3>
            </div>
            {m.play.kind === 'link' ? (
              <a className="media-card__play" href={m.href} target="_blank" rel="noreferrer" aria-label={`Open ${m.title}`}>
                <svg viewBox="0 0 16 16" aria-hidden><path d="M5 11l6-6M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            ) : (
              <button type="button" className="media-card__play" aria-label={`Play ${m.title}`} onClick={() => morph(() => setOpen(i))}>
                {/* the icon is the glass: a rounded triangle of frosted, lit glass over the media */}
                <span className="media-card__glass" aria-hidden />
              </button>
            )}
          </article>
        ))}
      </div>
      <div className="shelf-pager media-pager">
        <div className="shelf-pager__dots" role="group" aria-label="Talks and media: pages">
          {/* at most three dots: a window that follows the current card */}
          {cards.slice(from, from + 3).map(({ m }, k) => (
            <button key={m.href} type="button" className="shelf-pager__dot" aria-current={from + k === active} aria-label={`Show ${m.title}`} onClick={() => goTo(from + k)}>
              <span>{from + k === active && <i style={{ transform: 'none' }} />}</span>
            </button>
          ))}
        </div>
      </div>

      {/* podcast episodes: a list under the carousel, playing in place */}
      <EpisodeList episodes={episodes} onOpen={(i) => morph(() => setOpen(i))} />

      {item && open !== null && createPortal(
        <div className="media-player" role="dialog" aria-modal="true" aria-label={item.title} onClick={close}>
          <div className="media-player__frame" style={{ viewTransitionName: `media-${open}` }} onClick={(e) => e.stopPropagation()}>
            {item.play.kind === 'youtube' ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${item.play.id}?autoplay=1&start=${item.play.start ?? 0}&rel=0&modestbranding=1&playsinline=1`}
                title={item.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : item.play.kind === 'spotify' ? (
              <iframe
                className="media-player__spotify"
                src={`https://open.spotify.com/embed/episode/${item.play.episode}?autoplay=1`}
                title={item.title}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            ) : item.play.kind === 'audio' ? (
              <AudioPlayer item={item} play={item.play} />
            ) : null}
          </div>
          <button type="button" className="media-player__close" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}

function AudioPlayer({ item, play }: { item: MediaItem; play: Extract<MediaPlay, { kind: 'audio' }> }) {
  const audio = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const a = audio.current
    if (!a) return
    const seek = () => { if (play.start) a.currentTime = play.start; void a.play().catch(() => {}) }
    if (a.readyState >= 1) seek()
    else a.addEventListener('loadedmetadata', seek, { once: true })
  }, [play])
  return (
    <div className="media-audio">
      {item.loop ? <video src={item.loop} muted loop playsInline autoPlay={!REDUCED} aria-hidden /> : null}
      <div className="media-audio__panel">
        {play.cover && <img src={play.cover} alt="" width={72} height={72} />}
        <div>
          <p className="media-card__meta">{item.year ? `${item.kind} · ${item.year}` : item.kind}</p>
          <h3 className="media-card__title">{item.title}</h3>
          <audio ref={audio} src={play.src} controls preload="metadata" />
        </div>
      </div>
    </div>
  )
}
