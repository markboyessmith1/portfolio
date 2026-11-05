import { useEffect, useRef, useState } from 'react'
import ChatCursor, { type ChatHue } from './miro/ChatCursor'

/* A YouTube video as a quiet card: the poster, a frosted play button and a
   one-line caption. Nothing loads from YouTube until it's pressed; then the
   card becomes the player in place (privacy-enhanced domain, autoplay from
   `start`). An optional collaborator's cursor wanders organically around
   the card's corner and, once the card is on screen, types a nudge in
   cursor chat; it leaves once the video plays. Styles: .video-embed* in styles.css. */

export type VideoRef = {
  /** YouTube video id */
  id: string
  /** where to start, in seconds */
  start?: number
  title: string
  /** short line under the title, e.g. "Watch from 25:37" */
  caption?: string
  /** a collaborator's cursor hovering by the card, typing `say` */
  cursor?: { name: string; hue: ChatHue; say: string }
}

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function VideoEmbed({ video }: { video: VideoRef }) {
  const [playing, setPlaying] = useState(false)
  // the nudge starts typing a beat after the card is on screen
  const fig = useRef<HTMLElement>(null)
  const drift = useRef<HTMLSpanElement>(null)
  const [nudge, setNudge] = useState(false)
  useEffect(() => {
    const el = fig.current
    if (!video.cursor || !el) return
    let t = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      t = window.setTimeout(() => setNudge(true), 900)
      io.disconnect()
    }, { threshold: 0.6 })
    io.observe(el)
    return () => { io.disconnect(); window.clearTimeout(t) }
  }, [video.cursor])
  // an organic drift: sine waves at unrelated speeds, so the path never repeats
  useEffect(() => {
    if (!video.cursor || REDUCED) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const t = (now - t0) / 1000
      const x = 22 * Math.sin(t * 0.53) + 9 * Math.sin(t * 1.37 + 1.2) + 4 * Math.sin(t * 2.9 + 0.4)
      const y = 14 * Math.sin(t * 0.71 + 2.1) + 7 * Math.sin(t * 1.83 + 0.7) + 3 * Math.sin(t * 3.4)
      if (drift.current) drift.current.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [video.cursor])
  const start = video.start ?? 0
  const caption = video.caption ?? (start ? `Watch from ${clock(start)}` : 'Watch')
  const src = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&start=${start}&rel=0&modestbranding=1&playsinline=1`

  return (
    <figure className="video-embed" ref={fig}>
      {video.cursor && !playing && (
        <span className="video-embed__cursor" ref={drift} aria-hidden>
          <ChatCursor name={video.cursor.name} hue={video.cursor.hue} say={nudge || REDUCED ? video.cursor.say : null} charMs={60} />
        </span>
      )}
      <div className="video-embed__frame">
        {playing ? (
          <iframe
            src={src}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className="video-embed__poster" onClick={() => setPlaying(true)} aria-label={`Play ${video.title}, ${caption.toLowerCase()}`}>
            <img src={`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`} alt="" loading="lazy" />
            <span className="video-embed__play" aria-hidden>
              <svg viewBox="0 0 16 16" width="15" height="15"><path d="M5 3.2v9.6L13 8z" fill="currentColor" /></svg>
            </span>
          </button>
        )}
      </div>
      <figcaption className="video-embed__caption">
        <span className="video-embed__title">{video.title}</span>
        <span className="video-embed__meta">{caption}</span>
      </figcaption>
    </figure>
  )
}
