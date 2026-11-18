import { useEffect, useRef } from 'react'
import { mountTexture, type TextureKind } from './shaders'

/** A full-bleed WebGL texture from the mood board's noise vocabulary. Fills
 *  its positioned parent; if WebGL fails the parent's background shows. */
export function LivingTexture({
  kind,
  paused = false,
  beforeFrame,
}: {
  kind: TextureKind
  paused?: boolean
  /** Per-frame hook for multi-cursor textures (see `dots`). Read once at mount. */
  beforeFrame?: (points: Float32Array) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const handle = useRef<ReturnType<typeof mountTexture>>(null)

  useEffect(() => {
    if (!ref.current) return
    handle.current = mountTexture(ref.current, kind, { paused, beforeFrame })
    return () => {
      handle.current?.dispose()
      handle.current = null
    }
    // `paused` is applied live below; remounting would reset the texture's clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  useEffect(() => {
    handle.current?.setPaused(paused)
  }, [paused])

  return <canvas ref={ref} className="ss-texture" aria-hidden />
}
