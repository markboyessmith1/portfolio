import { View } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { GlassEdge, type SpinState } from './GlassEdge'

type Props = {
  variant: 'portrait' | 'square' | 'wide' | 'fill'
  scene: ComponentType
  className?: string
  /** DOM content layered over the card (text, buttons) */
  children?: ReactNode
  /** live blur (px) for the WebGL layer; CSS filters can't reach the canvas */
  blur?: { current: number }
  /** active-state gradient accent (carousel tiles) */
  accent?: boolean
  /** set .current = performance.now() to play the bounce + spin */
  spin?: SpinState
  /** back-face artwork for the spin */
  back?: { title: string; label?: string }
  /** subtle 3D tilt toward the pointer while hovered */
  tilt?: boolean
}

/**
 * A DOM rectangle that a 3D scene renders into, drawn through the glass-edge
 * shader. drei's <View> scissors the shared canvas to the slot's bounds.
 * CSS opacity can't reach the canvas, so if an ancestor is marked
 * [data-gl-fade], its animated opacity is mirrored into the shader.
 */
export function GLSlot({ variant, scene: Scene, className = '', children, blur, accent, spin, back, tilt }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const [opacity] = useState(() => ({ current: 1 }))
  const [tiltPos] = useState(() => ({ x: 0, y: 0 }))
  const [pose] = useState(() => ({ yaw: 0, pitch: 0, scale: 1, card: 600 }))
  const content = useRef<HTMLDivElement>(null)
  // mirror the card's 3D pose (tilt + spin + bounce) on the overlay so the
  // text sits on the card face; it hides once the card turns past edge-on
  useEffect(() => {
    if (!tilt && !spin) return
    let raf = 0
    const tick = () => {
      const c = content.current
      if (c) {
        const still = Math.abs(pose.yaw % (Math.PI * 2)) < 1e-4 && Math.abs(pose.pitch) < 1e-4 && Math.abs(pose.scale - 1) < 1e-4
        c.style.transform = still ? ''
          : `perspective(${(pose.card / 2) * 4}px) rotateY(${pose.yaw}rad) rotateX(${-pose.pitch}rad) scale(${pose.scale})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tilt, spin, pose])
  useEffect(() => {
    const node = el.current
    if (!tilt || !node || window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return
    const move = (e: PointerEvent) => {
      const r = node.getBoundingClientRect()
      tiltPos.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
      tiltPos.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
    }
    const leave = () => {
      tiltPos.x = 0; tiltPos.y = 0
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerleave', leave)
    return () => { node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave) }
  }, [tilt, tiltPos])
  useEffect(() => {
    const fadeEl = el.current?.closest<HTMLElement>('[data-gl-fade]')
    if (!fadeEl) return
    let raf = 0
    const tick = () => {
      opacity.current = parseFloat(getComputedStyle(fadeEl).opacity) || 0
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [opacity])
  return (
    <div ref={el} className={`gl-slot gl-slot--${variant}${tilt ? ' has-tilt' : ''} ${className}`}>
      <View className="gl-view" index={2}>
        <GlassEdge blur={blur} accent={accent} spin={spin} back={back} opacity={opacity} tilt={tilt ? tiltPos : undefined} pose={pose} shadowStrength={/is-dark|is-media/.test(className) ? 1 : 0.45}>
          {/* per-card boundary: a loading video never blanks the other cards */}
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </GlassEdge>
      </View>
      {children && <div ref={content} className="gl-slot__content">{children}</div>}
    </div>
  )
}
