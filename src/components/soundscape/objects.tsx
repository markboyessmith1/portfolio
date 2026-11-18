import { useEffect, useState } from 'react'
import { REACTION_SRC } from '../miro/Reactions'
import { STICKY_BY_ID } from './palette'
import type { ActionKind } from './audio'
import boombox from '../../assets/soundscape/stickers/boombox.svg'
import high_five from '../../assets/soundscape/stickers/high_five.svg'
import ship_it from '../../assets/soundscape/stickers/ship_it.svg'
import genius from '../../assets/soundscape/stickers/genius.svg'
import to_the_moon from '../../assets/soundscape/stickers/to_the_moon.svg'
import planetary from '../../assets/soundscape/stickers/planetary.svg'
import nailed_it from '../../assets/soundscape/stickers/nailed_it.svg'

/* What the soundscape cursors make. Everything here is a real Miro object
   type — sticky, shape, text, sticker, media card — with votes and reaction
   stamps landing on them, in the board vocabulary HeroBoard established
   (sticky palette fills, reaction pngs, pop-in entrances). Each creation is
   also a note: the kind maps to a lab synth in audio.ts. Styles live in
   soundscape.css (.ss-obj*). */

const STICKER_URLS = { boombox, high_five, ship_it, genius, to_the_moon, planetary, nailed_it } as const

export type ReactionKind = keyof typeof REACTION_SRC

export type BoardObject = {
  id: number
  kind: Extract<ActionKind, 'sticky' | 'shape' | 'text' | 'sticker' | 'media'>
  /** Centre, px. */
  x: number
  y: number
  r: number
  /** Sticky-palette id for fills (sticky, shape, media cover). */
  color: string
  text: string
  /** Shape silhouette, when kind is "shape". */
  shape?: 'square' | 'circle' | 'diamond'
  /** Sticker art, when kind is "sticker". */
  sticker?: keyof typeof STICKER_URLS
  votes: number
  reactions: { id: number; kind: ReactionKind; r: number }[]
  /** Where it spawns (the creating cursor's tip): it glides from here to
   *  x/y, so placement reads as set down, not popped. */
  from?: { x: number; y: number }
  /** Fading out (over the per-kind cap). */
  gone?: boolean
}

/* ————— content pools: the room is talking about its own soundtrack ————— */

export const STICKY_TEXTS = [
  'every move is a note',
  'cursor speed = velocity',
  'key of D, pentatonic — no wrong notes',
  'soft join chime when someone arrives',
  'more of us = faster tempo',
  "quiet when we're reading",
  'votes should ping an octave up',
  'lo-fi bed after 6pm?',
]
export const TEXT_TEXTS = [
  'A board you can hear.',
  'Activity sets the tempo.',
  'Everyone is an instrument.',
  'Silence is part of the music.',
]
export const SHAPE_LABELS = ['intro', 'verse', 'chorus', 'bridge', 'hook', 'outro']
export const MEDIA_TITLES = [
  { title: 'Lullaby bed', meta: 'rubato piano · 0:42' },
  { title: 'Lo-fi bed', meta: 'swung, dusty · 1:18' },
  { title: 'Join chime', meta: 'C5, warm · 0:03' },
]
export const STICKER_POOL: (keyof typeof STICKER_URLS)[] = [
  'boombox',
  'high_five',
  'ship_it',
  'genius',
  'to_the_moon',
  'planetary',
  'nailed_it',
]
export const REACTION_POOL: ReactionKind[] = ['love', 'fire', 'celebrate', 'mindblown', 'like', 'wave']
export const STICKY_COLORS = ['light-sunshine', 'cyan', 'light-pink', 'lilac', 'teal', 'light-lime']

/* ————— visuals ————— */

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

export const STICKY_PX = 128

/** Text objects type themselves out, like someone writing on the board. */
function Typer({ text }: { text: string }) {
  const [n, setN] = useState(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? text.length : 0))
  const done = n >= text.length
  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => setN((k) => Math.min(text.length, k + 1)), 45)
    return () => window.clearInterval(id)
  }, [done, text.length])
  return <>{text.slice(0, n)}</>
}

function body(o: BoardObject) {
  const c = STICKY_BY_ID[o.color] ?? STICKY_BY_ID['light-sunshine']!
  switch (o.kind) {
    case 'sticky':
      return (
        <div className="ss-obj-sticky" style={{ backgroundColor: c.fill, color: c.text }}>
          {o.text}
        </div>
      )
    case 'text':
      return (
        <div className="ss-obj-text">
          <Typer text={o.text} />
        </div>
      )
    case 'shape':
      return (
        <div className={`ss-obj-shape ss-obj-shape--${o.shape ?? 'square'}`} style={{ backgroundColor: c.fill, color: c.text }}>
          <span>{o.text}</span>
        </div>
      )
    case 'sticker':
      return <img className="ss-obj-sticker" src={STICKER_URLS[o.sticker ?? 'boombox']} alt={`${o.sticker} sticker`} />
    case 'media':
      return (
        <div className="ss-obj-media">
          <div className="ss-obj-media__cover" style={{ backgroundColor: c.fill }}>
            <span className="ss-obj-media__play" />
          </div>
          <div className="ss-obj-media__caption">
            <b>{o.text}</b>
            <span>{MEDIA_TITLES.find((m) => m.title === o.text)?.meta}</span>
          </div>
        </div>
      )
  }
}

/** One object on the board: glides from the creating cursor's tip onto its
 *  spot while it settles in, carries its votes and reaction stamps, breathes
 *  out when it's over the cap. Positioned by its centre. The outer div owns
 *  position (translate + glide transition), the inner owns rotation and the
 *  entrance — keeping the channels apart is what keeps the motion smooth. */
export function ObjectView({ o }: { o: BoardObject }) {
  const [at, setAt] = useState(() => o.from ?? { x: o.x, y: o.y })
  useEffect(() => {
    if (at.x === o.x && at.y === o.y) return
    // One painted frame at the spawn point, then the glide to rest.
    const raf = requestAnimationFrame(() => setAt({ x: o.x, y: o.y }))
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.x, o.y])
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
        transform: `translate(${at.x}px, ${at.y}px)`,
        opacity: o.gone ? 0 : 1,
        transition: `transform 620ms ${EASE}, opacity 600ms ${EASE}`,
        willChange: 'transform',
      }}
    >
      <div
        style={{
          position: 'relative',
          transform: `translate(-50%, -50%) rotate(${o.r}deg)`,
          // `backwards`, not `both`: a finished `both` animation would pin
          // opacity at 1 and the `gone` fade above could never win.
          animation: `ss-obj-settle 460ms ${EASE} backwards`,
        }}
      >
        {body(o)}
        {o.votes > 0 && (
          <span key={o.votes} className="ss-obj-vote">
            ▲ {o.votes}
          </span>
        )}
        {o.reactions.length > 0 && (
          <div className="ss-obj-stamps">
            {o.reactions.map((s) => (
              <img key={s.id} className="ss-obj-stamp" src={REACTION_SRC[s.kind]} alt="" style={{ rotate: `${s.r}deg` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
