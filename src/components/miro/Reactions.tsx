import type { CSSProperties } from 'react'
import like from '../../assets/reactions/like.png'
import love from '../../assets/reactions/love.png'
import fire from '../../assets/reactions/fire.png'
import mindblown from '../../assets/reactions/mindblown.png'
import celebrate from '../../assets/reactions/celebrate.png'
import wave from '../../assets/reactions/wave.png'

/* Miro's reaction emojis (from the c26 prototype), as stickers stamped on an
   object and as emotes that float up off a cursor. Styles in styles.css
   (.stickers, .emote). */

export const REACTION_SRC = { like, love, fire, mindblown, celebrate, wave } as const
export type Reaction = keyof typeof REACTION_SRC
export const REACTIONS = Object.keys(REACTION_SRC) as Reaction[]

/** A row of reaction stickers overlapping like real ones; each pops in, tilted by `r` degrees. */
export function StickerStack({ items, size = 46 }: { items: { id: string | number; kind: Reaction; r: number }[]; size?: number }) {
  return (
    <span className="stickers" aria-hidden style={{ '--sticker': `${size}px` } as CSSProperties}>
      {items.map((s) => (
        <img key={s.id} src={REACTION_SRC[s.kind]} alt="" style={{ '--r': `${s.r}deg` } as CSSProperties} />
      ))}
    </span>
  )
}

/** One emote floating up and fading (1.6s, then it's gone: remount to replay). */
export function FloatingEmote({ kind, dx = 0, style }: { kind: Reaction; dx?: number; style?: CSSProperties }) {
  return <img className="emote" src={REACTION_SRC[kind]} alt="" aria-hidden style={{ ...style, '--dx': `${dx}px` } as CSSProperties} />
}
