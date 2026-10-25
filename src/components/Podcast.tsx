import { useEffect, useRef, useState } from 'react'
import { site } from '../data/site'

const BARS = 14

/**
 * Compact glass podcast bar: cover, title, live visualizer, mute toggle.
 * Silent until unmuted: the first unmute starts the episode at `startAt` with a
 * fade-in, and the visualizer follows the real audio. Muting fades out and pauses.
 */
export default function Podcast() {
  const { podcast } = site
  const audio = useRef<HTMLAudioElement>(null)
  const bars = useRef<HTMLSpanElement[]>([])
  const analyser = useRef<AnalyserNode | null>(null)
  const gainNode = useRef<GainNode | null>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)


  // visualizer loop
  useEffect(() => {
    let raf = 0
    const data = new Uint8Array(64)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = (t: number) => {
      const an = analyser.current
      if (an && !muted) an.getByteFrequencyData(data)
      bars.current.forEach((el, i) => {
        if (!el) return
        let v: number
        if (an && !muted) {
          // voice sits low in the spectrum: spread bars over ~0.4-6 kHz
          const bin = 1 + Math.round(Math.pow(i / (BARS - 1), 1.4) * 15)
          v = data[bin] / 255
        } else {
          // procedural: smooth layered sines, livelier while "playing"
          const k = playing ? 1 : 0
          v = reduce ? 0.35 : 0.25 + k * 0.35 * (0.5 + 0.5 * Math.sin(t / 260 + i * 0.9)) * (0.6 + 0.4 * Math.sin(t / 530 - i * 0.5))
        }
        el.style.transform = `scaleY(${(0.18 + v * 0.82).toFixed(3)})`
      })
      if (!reduce || (an && !muted)) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [muted, playing, podcast.src])

  const toggle = async () => {
    const a = audio.current
    if (!a || !podcast.src) return
    if (!analyser.current) {
      // first gesture: wire Web Audio for the real visualizer
      const ctx = new AudioContext()
      const src = ctx.createMediaElementSource(a)
      const an = ctx.createAnalyser()
      an.fftSize = 128
      an.smoothingTimeConstant = 0.8
      const gain = ctx.createGain()
      gain.gain.value = 0
      src.connect(an).connect(gain).connect(ctx.destination)
      analyser.current = an
      gainNode.current = gain
    }
    const next = !muted
    const g = gainNode.current
    if (g) {
      // fade in on unmute (1.5s), quick fade out on mute
      const now = g.context.currentTime
      g.gain.cancelScheduledValues(now)
      g.gain.setValueAtTime(g.gain.value, now)
      g.gain.linearRampToValueAtTime(next ? 0 : 1, now + (next ? 0.25 : 1.5))
      await (g.context as AudioContext).resume()
    }
    if (next) {
      // fade out, then pause
      window.setTimeout(() => { a.pause(); setPlaying(false) }, 260)
    } else {
      // first play starts at the chosen point in the episode
      if (a.currentTime < podcast.startAt) a.currentTime = podcast.startAt
      a.muted = false
    }
    if (!next && a.paused) await a.play().catch(() => {})
    if (!next) setPlaying(!a.paused)
    setMuted(next)
  }

  return (
    <div className="podcast glass" role="region" aria-label={`Podcast: ${podcast.show}`}>
      {/* artwork + titles open the episode on Apple Podcasts */}
      <a className="podcast__link" href={podcast.link} target="_blank" rel="noreferrer" aria-label={`Listen on Apple Podcasts: ${podcast.episode}`}>
        <img className="podcast__cover" src={podcast.image} alt={`${podcast.show} artwork`} title={podcast.episode} width={36} height={36} />
        <div className="podcast__meta">
          <span className="podcast__title">{podcast.title}</span>
          <span className="podcast__sub">{podcast.subtitle}</span>
        </div>
      </a>
      <div className="podcast__viz" aria-hidden>
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} ref={(el) => { if (el) bars.current[i] = el }} />
        ))}
      </div>
      <button
        className="podcast__btn"
        onClick={toggle}
        disabled={!podcast.src}
        aria-label={muted ? 'Unmute podcast' : 'Mute podcast'}
        title={podcast.src ? undefined : 'No episode file set yet'}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        )}
      </button>
      {podcast.src && <audio ref={audio} src={podcast.src} crossOrigin="anonymous" playsInline preload="metadata" />}
    </div>
  )
}
