import { useEffect, useRef, useState } from 'react'

/* A film in a rounded 16:9 tile (ported from the C26 Fall prototype's portfolio
   home, its VideoTile). At rest the clip loops silently behind a light veil, its
   title over it and one big play button (paused while the tile is off screen).
   Play jumps back to the start and plays it with sound: the veil and title fade
   away and native controls appear. When it ends it falls back to the silent loop.
   `ambient`: no veil, title or play button. The film just loops, muted, with
   a sound toggle top right (a quiet ghost icon, like the scenes' replay control).
   Reduced motion: no autoplay, just the poster (ambient: the toggle plays it).
   Styles: .film */

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export type Film = { src: string; poster?: string; title: string; ambient?: boolean }

export default function FilmTile({ src, poster, title, ambient = false }: Film) {
  const tile = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const playingRef = useRef(false)
  playingRef.current = playing
  const [muted, setMuted] = useState(true)

  // the loop: only while the tile is on screen (ambient keeps whatever sound
  // state the visitor chose; the classic tile pauses a sound play off screen)
  useEffect(() => {
    const el = tile.current, v = video.current
    if (!el || !v) return
    const io = new IntersectionObserver(([e]) => {
      if (!ambient && playingRef.current) { if (!e.isIntersecting) v.pause(); return }
      if (e.isIntersecting && !REDUCED) void v.play().catch(() => {})
      else if (!e.isIntersecting) v.pause()
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [src, ambient])

  const play = () => {
    const v = video.current
    if (!v) return
    v.currentTime = 0
    v.loop = false
    v.muted = false
    setPlaying(true)
    void v.play().catch(() => {})
  }
  // back to the silent loop when it ends
  const onEnded = () => {
    const v = video.current
    if (!v || !playingRef.current) return
    setPlaying(false)
    v.muted = true
    v.loop = true
    v.currentTime = 0
    if (!REDUCED) void v.play().catch(() => {})
  }
  // ambient: sound on/off without restarting the loop
  const toggleSound = () => {
    const v = video.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    if (v.paused) void v.play().catch(() => {})
  }

  if (ambient) {
    return (
      <div ref={tile} className="film film--ambient" role="group" aria-label={title}>
        <video ref={video} className="film__video" src={src} poster={poster} muted loop playsInline preload="metadata" aria-label={title} />
        <button type="button" className="film__sound" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? `Unmute ${title}` : `Mute ${title}`}>
          {muted ? <SoundOff /> : <SoundOn />}
        </button>
      </div>
    )
  }

  return (
    <div ref={tile} className={`film${playing ? ' is-playing' : ''}`} role="group" aria-label={title}>
      <video
        ref={video}
        className="film__video"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        controls={playing}
        preload="metadata"
        onEnded={onEnded}
      />
      <div className="film__veil" aria-hidden />
      <p className="film__title" aria-hidden={playing}>{title}</p>
      {!playing && (
        <button type="button" className="film__play" onClick={play} aria-label={`Play with sound: ${title}`}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M5 3.3v17.4a1 1 0 0 0 1.52.85l14.1-8.7a1 1 0 0 0 0-1.7L6.52 2.45A1 1 0 0 0 5 3.3z" fill="currentColor" />
          </svg>
        </button>
      )}
    </div>
  )
}

// speaker glyphs, drawn to sit with the scenes' 24px line icons
const Speaker = () => <path d="M4 9.5h3l4.5-4v13l-4.5-4H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
const SoundOff = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <Speaker />
    <path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
const SoundOn = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <Speaker />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
