import { useEffect, useRef, useState } from 'react'
import type { MediaItem } from './MediaCarousel'

/* The resume's podcast episodes: a divided list, newest first, the first few shown
   and the rest behind "Show more". Each row is cover art (its play button over it),
   the episode and show, and the year on the right. Audio plays in place: pressing
   play swaps the year for a small play bar (progress you can click to seek, and the
   time) in the same spot, so the row never moves. One episode plays at a time.
   Episodes with no audio file (a video edition) open in the page's player instead. */

const FIRST = 5
const clock = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––')

export default function EpisodeList({ episodes, onOpen }: { episodes: { m: MediaItem; i: number }[]; onOpen: (i: number) => void }) {
  const [more, setMore] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  // which row is loaded, whether it's playing, and where it is
  const [on, setOn] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState({ at: 0, of: 0 })

  useEffect(() => {
    const a = audio.current
    if (!a) return
    const tick = () => setTime({ at: a.currentTime, of: a.duration })
    const play = () => setPlaying(true)
    const pause = () => setPlaying(false)
    a.addEventListener('timeupdate', tick)
    a.addEventListener('loadedmetadata', tick)
    a.addEventListener('play', play)
    a.addEventListener('pause', pause)
    a.addEventListener('ended', pause)
    return () => {
      a.removeEventListener('timeupdate', tick)
      a.removeEventListener('loadedmetadata', tick)
      a.removeEventListener('play', play)
      a.removeEventListener('pause', pause)
      a.removeEventListener('ended', pause)
    }
  }, [])

  const toggle = (i: number, m: MediaItem) => {
    const a = audio.current
    if (m.play.kind !== 'audio') return onOpen(i)
    if (!a) return
    if (on === i) {
      if (a.paused) void a.play()
      else a.pause()
      return
    }
    a.src = m.play.src
    a.currentTime = 0
    setOn(i)
    setTime({ at: 0, of: 0 })
    const start = m.play.start
    a.addEventListener('loadedmetadata', () => { if (start) a.currentTime = start }, { once: true })
    void a.play().catch(() => {})
  }
  const seek = (e: React.MouseEvent<HTMLButtonElement>) => {
    const a = audio.current
    if (!a || !Number.isFinite(a.duration)) return
    const b = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - b.left) / b.width) * a.duration
  }

  return (
    <>
      <audio ref={audio} preload="none" />
      <ul className="media-list">
        {episodes.slice(0, more ? undefined : FIRST).map(({ m, i }) => {
          const live = on === i
          return (
            <li key={m.href} className={`media-list__row${live ? ' is-live' : ''}`}>
              <button
                type="button"
                className="media-list__cover"
                aria-label={live && playing ? `Pause ${m.title}` : `Play ${m.title}`}
                onClick={() => toggle(i, m)}
              >
                {m.cover && <img src={m.cover} alt="" loading="lazy" />}
                <span className="media-list__play" aria-hidden>
                  {live && playing ? (
                    <svg viewBox="0 0 16 16"><path d="M5 4h2v8H5zM9 4h2v8H9z" fill="currentColor" /></svg>
                  ) : (
                    <svg viewBox="0 0 16 16"><path d="M6 4.6v6.8l5.4-3.4z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                  )}
                </span>
              </button>
              <span className="media-list__text">
                <span className="media-list__title">{m.title}</span>
                <span className="media-list__show">{m.show}</span>
              </span>
              {/* the right-hand slot: the year, or, once playing, the play bar in its place */}
              <span className="media-list__side">
                {live ? (
                  <span className="media-list__bar">
                    <button type="button" className="media-list__track" aria-label="Seek" onClick={seek}>
                      <i style={{ width: `${time.of ? (time.at / time.of) * 100 : 0}%` }} />
                    </button>
                    <span className="media-list__time">{clock(time.at)} / {clock(time.of)}</span>
                  </span>
                ) : (
                  <span className="media-list__meta">{m.year}</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {episodes.length > FIRST && (
        <button type="button" className="media-list__more" aria-expanded={more} onClick={() => setMore((v) => !v)}>
          {more ? 'Show fewer' : `Show more (${episodes.length - FIRST})`}
        </button>
      )}
    </>
  )
}
