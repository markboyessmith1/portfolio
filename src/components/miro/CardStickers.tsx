import type { CSSProperties } from 'react'
import pointing from '../../assets/stickers/pointing.png'
import armsCrossed from '../../assets/stickers/arms-crossed.png'
import fistPump from '../../assets/stickers/fist-pump.png'
import yes from '../../assets/stickers/yes.png'
import secretSociety from '../../assets/stickers/secret-society.png'

/* Custom die-cut stickers slapped around a card's edges, spilling over its
   border like stickers on a laptop. Positions are % of the card so they scale
   with it; they keep clear of the headline words and the stepper (right
   edge, low). Each pops on with a staggered bounce. Decorative only:
   pointer-events pass through to the card link. */

type Placement = { src: string; style: CSSProperties; r: number; d: number }

const STICKERS: Placement[] = [
  { src: secretSociety, style: { top: '-2%', right: '-6%', width: '30%' }, r: 9, d: 0 },
  { src: pointing, style: { bottom: '-4%', left: '-8%', width: '25%' }, r: -9, d: 120 },
  { src: armsCrossed, style: { top: '34%', right: '-7%', width: '21%' }, r: 7, d: 240 },
  { src: fistPump, style: { top: '46%', left: '-9%', width: '24%' }, r: -6, d: 360 },
  { src: yes, style: { bottom: '-6%', right: '22%', width: '25%' }, r: 5, d: 480 },
]

/** `delay` (ms) holds the whole set back, e.g. until the card behind has landed. */
export default function CardStickers({ delay = 0 }: { delay?: number }) {
  return (
    <div className="card-stickers" aria-hidden>
      {STICKERS.map((s, i) => (
        <img key={i} src={s.src} alt="" draggable={false} style={{ ...s.style, '--r': `${s.r}deg`, animationDelay: `${delay + s.d}ms` } as CSSProperties} />
      ))}
    </div>
  )
}
