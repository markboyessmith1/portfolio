import { useSyncExternalStore } from 'react'
import { REACTION_SRC, type Reaction } from './components/miro/Reactions'

/**
 * Home "board" state shared between the DOM and the WebGL backdrop
 * (ported from the c26 prototype's HeroBoard). The cursors write their live
 * positions into `points` every frame; the backdrop shader reads them so the
 * dot grid stirs where they move.
 */

export { REACTION_SRC, type Reaction }

/** Up to 4 cursors, packed xy = position in uv (y up), z = strength, w unused. */
export const board = {
  /** true while the home board is mounted: the backdrop fades its dots in. */
  active: false,
  points: new Float32Array(16),
}

/* ---- stickers stamped on the intro card */
export type Sticker = { id: number; kind: Reaction; r: number }
export const MAX_STICKERS = 3

let stickers: Sticker[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function addSticker(kind: Reaction) {
  if (stickers.length >= MAX_STICKERS) return
  stickers = [...stickers, { id: Date.now() + Math.random(), kind, r: Math.round(Math.random() * 24 - 12) }]
  emit()
}
export function stickerCount() {
  return stickers.length
}

export function useStickers() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => stickers,
  )
}
