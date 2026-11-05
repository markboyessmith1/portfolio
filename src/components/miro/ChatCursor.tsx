import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/* Cursor chat in Miro's board Light style (ported from the c26 prototype's
   ChatCursor). One persistent pill per cursor: idle it's a name tag; when
   `say` is set the same element morphs into a bubble and the message is
   revealed by the pill's edge as its width glides to fit the text so far.
   `say = null` folds it back. Reduced motion: the text shows in full. */

import './palette.css'

/** The design system's cursor hues, plus Claude. */
export const CURSOR_HUES = ['coral', 'cyan', 'sunshine', 'lilac', 'pink', 'orange', 'moss', 'teal', 'ocean', 'lime', 'coal'] as const
export type ChatHue = (typeof CURSOR_HUES)[number] | 'claude'

// Miro's board Light cursor recipe (see palette.css)
const paint = (hue: ChatHue) =>
  hue === 'claude'
    ? // Claude has no DS hue: its brand terracotta in the same Light recipe
      { fill: '#F6DBCE', rim: '#C96442', ink: '#602612' }
    : { fill: `var(--miro-light-${hue}-cursor-background)`, rim: `var(--miro-${hue}-cursor-border)`, ink: `var(--miro-${hue}-text)` }

export const CURSOR_PATH =
  'M12.001 4.162V5.389L11.999 5.4C8.386 5.4 5.4 8.386 5.4 11.999L5.393 12H4.161L0 0.707V0.6L0.6 0H0.707L12.001 4.162Z'

const MORPH = 'cubic-bezier(0.32, 0.72, 0, 1)'
const TYPE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const MORPH_MS = 260
const TYPE_MS = 150
const MAX_TEXT_W = 216
const NAME_IDLE = 12
const NAME_SMALL = 10
const MSG_PX = 14
const MSG_LINE = 19
const FONT = "'Inter', system-ui, sans-serif"
const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// one canvas to measure text widths in the pill's own font
let ctx: CanvasRenderingContext2D | null = null
const measure = (text: string, px: number) => {
  ctx ??= document.createElement('canvas').getContext('2d')
  ctx!.font = `500 ${px}px ${FONT}`
  return ctx!.measureText(text).width
}
// greedy wrap at MAX_TEXT_W, so the final layout is known up front
const wrap = (text: string) => {
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && measure(next, MSG_PX) > MAX_TEXT_W) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

export default function ChatCursor({ name, hue, say, charMs = 42 }: { name: string; hue: ChatHue; say: string | null; charMs?: number }) {
  const p = paint(hue)
  const [typed, setTyped] = useState(0)
  const [talking, setTalking] = useState(false)
  const morphing = useRef(false)

  useEffect(() => {
    if (!say) {
      morphing.current = true
      setTalking(false)
      setTyped(0)
      return
    }
    setTalking(true)
    if (REDUCED) {
      setTyped(say.length)
      return
    }
    morphing.current = true
    setTyped(0)
    const typeStart = MORPH_MS * 0.6
    const timers = [window.setTimeout(() => (morphing.current = false), typeStart)]
    for (let i = 1; i <= say.length; i++) timers.push(window.setTimeout(() => setTyped(i), typeStart + i * charMs))
    return () => timers.forEach(window.clearTimeout)
  }, [say, charMs])

  // keep the morph clock for the open/close pass only
  useLayoutEffect(() => {
    if (!talking) morphing.current = false
  }, [talking])

  const text = (say ?? '').slice(0, talking ? typed : 0)
  const nameW = measure(name, talking ? NAME_SMALL : NAME_IDLE)
  const msgLines = talking ? wrap(text) : []
  const msgW = Math.max(0, ...msgLines.map((l) => measure(l, MSG_PX)))
  const padX = talking ? 10 : 8
  const padY = talking ? 6 : 0
  const width = Math.ceil(Math.max(nameW, msgW)) + padX * 2 + 2
  const height = talking ? 15 + Math.max(1, msgLines.length) * MSG_LINE + padY * 2 + 2 : 20
  const t = morphing.current || !talking ? `${MORPH_MS}ms ${MORPH}` : `${TYPE_MS}ms ${TYPE_EASE}`

  const bubble: CSSProperties = {
    position: 'absolute',
    left: 11,
    top: 11,
    boxSizing: 'border-box',
    width,
    height,
    padding: `${padY}px ${padX}px`,
    overflow: 'hidden',
    borderRadius: 12,
    border: `1px solid ${p.rim}`,
    background: p.fill,
    color: p.ink,
    fontFamily: FONT,
    boxShadow: talking
      ? `0 1px 2px 0 color-mix(in srgb, ${p.rim} 30%, transparent), 0 6px 14px -4px color-mix(in srgb, ${p.rim} 18%, transparent), 0 16px 32px -12px color-mix(in srgb, ${p.rim} 16%, transparent)`
      : 'none',
    transition: `width ${t}, height ${t}, padding ${MORPH_MS}ms ${MORPH}, box-shadow ${MORPH_MS}ms ${MORPH}`,
    whiteSpace: 'nowrap',
  }
  return (
    <div style={{ position: 'relative' }}>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
        <path d={CURSOR_PATH} style={{ fill: p.fill, stroke: p.rim }} strokeWidth={1} strokeLinejoin="round" />
      </svg>
      <div style={bubble}>
        <div
          style={{
            height: talking ? 15 : 18,
            lineHeight: talking ? '15px' : '18px',
            fontSize: talking ? NAME_SMALL : NAME_IDLE,
            fontWeight: 500,
            opacity: talking ? 0.72 : 1,
            transition: `font-size ${MORPH_MS}ms ${MORPH}, height ${MORPH_MS}ms ${MORPH}, line-height ${MORPH_MS}ms ${MORPH}, opacity ${MORPH_MS}ms ${MORPH}`,
          }}
        >
          {name}
        </div>
        {/* the message: laid out at its final wrap, revealed by the pill's edge */}
        <div style={{ position: 'absolute', left: padX, top: padY + 15, fontSize: MSG_PX, lineHeight: `${MSG_LINE}px`, fontWeight: 500 }}>
          {msgLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
