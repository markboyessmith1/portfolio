import type { CSSProperties, ReactNode } from 'react'
import type { ChatHue } from './ChatCursor'
import './palette.css'

/* A Miro sticky note. It takes the same hues as the cursors (palette.css),
   at the design system's sticky step; `light` gives the pale variant. Put a
   <StickerStack> inside to stamp reactions on its corner. */

export type StickyHue = Exclude<ChatHue, 'claude'>

export default function StickyNote({
  hue = 'sunshine',
  light = false,
  by,
  size = 160,
  rotate = 0,
  children,
  style,
}: {
  hue?: StickyHue
  light?: boolean
  /** Signature in the bottom corner. */
  by?: string
  size?: number
  rotate?: number
  children?: ReactNode
  style?: CSSProperties
}) {
  const fill = `var(--miro-${light ? 'light-' : ''}${hue}-sticky-background)`
  const ink = hue === 'coal' && !light ? 'var(--miro-sticky-text-on-dark)' : 'var(--miro-sticky-text)'
  return (
    <div className="sticky-note" style={{ ...style, width: size, height: size, background: fill, color: ink, transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      {children}
      {by && <span className="sticky-note__by">{by}</span>}
    </div>
  )
}
