import { useEffect, useRef, useState } from 'react'

/* Liquid glass for a card, as an SVG filter for `backdrop-filter: url(#id)`
   (Chromium; other browsers fall back to the CSS blur set beside it). Mostly
   frost: the backdrop is blurred heavily first (`blur`), then bent only in a
   thin band at the rim, with a fine colour split there.

   A displacement map is drawn for the card's exact size and corner radius:
   through the middle it's flat (no bend), and across a rim `bezel` px wide each
   point shows the backdrop from a little further in, more so towards the edge,
   along the edge's normal (round the corners too): what's under the rim is
   stretched out to the edge, the way a thick pane bends light at its rim.
   (Inward, not outward: past the element's edge Chromium mirrors the backdrop.)
   The frosted backdrop is displaced three times, slightly more for blue than
   for red, and the channels recombined: chromatic aberration where the bend is
   strongest. Re-drawn when the card resizes.

   Renders an invisible <svg> holding the filter; it measures the element
   matched by `target` inside its parent. */

export default function LensGlass({ id, target, radius = 32, bezel = 16, strength = 18, spread = 0.06, blur = 14 }: {
  id: string
  /** selector for the glass element, within this component's parent */
  target: string
  /** the element's corner radius, px */
  radius?: number
  /** how far in from the edge the glass bends, px */
  bezel?: number
  /** the strongest bend, px */
  strength?: number
  /** extra bend for green and blue over red (0.06 = 6%, 12%): the aberration */
  spread?: number
  /** the frost: how much the backdrop is blurred before it's bent, px */
  blur?: number
}) {
  const svg = useRef<SVGSVGElement>(null)
  const [map, setMap] = useState<string>()
  useEffect(() => {
    const el = svg.current?.parentElement?.querySelector<HTMLElement>(target)
    if (!el) return
    let last = ''
    const draw = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight)
      if (!w || !h || `${w}x${h}` === last) return
      last = `${w}x${h}`
      // half resolution is plenty (the map is smooth); scale back up in the filter
      const k = 0.5, W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k))
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const g = c.getContext('2d')!
      const img = g.createImageData(W, H)
      const hx = w / 2, hy = h / 2, r = Math.min(radius, hx, hy)
      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          // this pixel, from the card's centre, in px
          const x = (px + 0.5) / k - hx, y = (py + 0.5) / k - hy
          // rounded-box signed distance (negative inside) and its outward normal
          const qx = Math.abs(x) - (hx - r), qy = Math.abs(y) - (hy - r)
          const ox = Math.max(qx, 0), oy = Math.max(qy, 0)
          const ol = Math.hypot(ox, oy)
          const d = ol + Math.min(Math.max(qx, qy), 0) - r
          let nx: number, ny: number
          if (ol > 0) { nx = ox / ol; ny = oy / ol } else if (qx > qy) { nx = 1; ny = 0 } else { nx = 0; ny = 1 }
          nx *= Math.sign(x) || 1; ny *= Math.sign(y) || 1
          // bend: 0 in the middle, rising to 1 at the edge (eased, like a lens's curve)
          const t = Math.max(0, Math.min(1, 1 + d / bezel))
          const m = t * t * (3 - 2 * t)
          const i = (py * W + px) * 4
          img.data[i] = 128 - nx * m * 127 // towards the centre
          img.data[i + 1] = 128 - ny * m * 127
          img.data[i + 2] = 128
          img.data[i + 3] = 255
        }
      }
      g.putImageData(img, 0, 0)
      setMap(c.toDataURL())
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [target, radius, bezel])

  const s = strength
  const channel = (k: string, scale: number, row: string) => (
    <>
      <feDisplacementMap in="frost" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result={`d${k}`} />
      <feColorMatrix in={`d${k}`} type="matrix" values={`${row} 0 0 0 1 0`} result={k} />
    </>
  )
  return (
    <svg ref={svg} width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation={blur} edgeMode="duplicate" result="frost" />
        {map && <feImage href={map} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />}
        {channel('r', s, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0 ')}
        {channel('g', s * (1 + spread), '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0 ')}
        {channel('b', s * (1 + spread * 2), '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0 ')}
        <feBlend in="r" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b" mode="screen" />
      </filter>
    </svg>
  )
}
