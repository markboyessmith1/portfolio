import { useEffect, useRef } from 'react'
import { CURSOR_PATH } from './miro/ChatCursor'

/* An oversized Miro arrow that replaces the system cursor across the site
   (ported from the c26 prototype's /portfolio BigCursor). Writes go straight
   to the DOM in rAF. Off on touch and under reduced motion, where the normal
   cursor stays. */

export default function BigCursor() {
  const arrow = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = arrow.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) {
      el.style.display = 'none'
      return
    }
    const root = document.documentElement
    root.dataset.bigcursor = 'on'
    let raf = 0
    let x = -200
    let y = -200
    const frame = () => {
      raf = 0
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    const onMove = (e: PointerEvent) => {
      // elements that draw their own cursor take over; the arrow steps aside
      el.style.opacity = (e.target as HTMLElement).closest?.('[data-own-cursor]') ? '0' : '1'
      x = e.clientX
      y = e.clientY
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const onLeave = () => {
      x = y = -2000
      if (!raf) raf = requestAnimationFrame(frame)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      delete root.dataset.bigcursor
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={arrow} className="big-cursor" aria-hidden>
      <svg width={30} height={30} viewBox="0 0 16 16" fill="none">
        <path d={CURSOR_PATH} fill="var(--ink)" stroke="var(--surface)" strokeWidth={0.7} strokeLinejoin="round" />
      </svg>
    </div>
  )
}
