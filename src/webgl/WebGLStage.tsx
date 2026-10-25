import { Canvas } from '@react-three/fiber'
import { View, Preload } from '@react-three/drei'
import type { RefObject } from 'react'
import { Backdrop } from './scenes'

/**
 * One fixed, full-window canvas for the whole site. Every <GLSlot> renders a
 * drei <View> that draws into its own DOM-tracked rectangle via scissor, so we
 * pay for a single WebGL context no matter how many slots exist.
 */
export function WebGLStage({ eventSource }: { eventSource: RefObject<HTMLElement> }) {
  return (
    <>
      {/* full-window shader backdrop, drawn first */}
      {/* index 1 (not 0): a priority-0 view lets R3F auto-render an empty
          scene over it on pages with no cards. Cards use index 2, so the
          backdrop always draws first. */}
      <View className="gl-backdrop" index={1}>
        <Backdrop />
      </View>
      <Canvas
        className="stage"
        eventSource={eventSource}
        eventPrefix="client"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <View.Port />
        <Preload all />
      </Canvas>
    </>
  )
}
