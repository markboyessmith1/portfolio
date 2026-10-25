import { useCallback, useEffect, useRef, useState } from 'react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#%&*+=-/<>'
const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Text that morphs between `short` and `long` by shuffling random glyphs.
 * The string grows (or shrinks) a character at a time while characters lock
 * into place left to right.
 */
export function useScramble(short: string, long: string, duration = 700) {
  const [text, setText] = useState(short)
  const current = useRef(short)
  const raf = useRef(0)

  const to = useCallback(
    (target: string) => {
      cancelAnimationFrame(raf.current)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        current.current = target
        setText(target)
        return
      }
      const from = current.current
      const start = performance.now()
      let lastShuffle = 0
      let frame = from

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const len = Math.round(from.length + (target.length - from.length) * ease(t))
        // characters lock in left to right, trailing the length change slightly
        const locked = Math.floor(target.length * Math.max(0, (t - 0.25) / 0.75))

        // reshuffle at ~30fps so glyphs are readable as "noise", not a blur
        if (now - lastShuffle > 33 || t === 1) {
          lastShuffle = now
          let out = ''
          for (let i = 0; i < len; i++) {
            if (i < locked) out += target[i] ?? ''
            else out += target[i] === ' ' ? ' ' : rand()
          }
          frame = t === 1 ? target : out
          current.current = frame
          setText(frame)
        }
        if (t < 1) raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    },
    [duration],
  )

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return { text, expand: () => to(long), collapse: () => to(short) }
}
