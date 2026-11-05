import { useEffect, useRef, type RefObject } from 'react'

/* Behind ?gel: the gummy-hand three.js loop (public/gel/gummy.html, a standalone page with its own
   hand model) laid behind the four principle cards in place of their videos. The page draws its four
   tiles as a 2x2 square, each min(w, h) / 2 * 0.98 wide and centred, so an iframe 1/0.98 of the grid's
   width, pulled out by the difference, puts every tile exactly on its card; a mask of the cards'
   rounded rects hides everything else (the page's clear colour between tiles).
   ?gel        the loop, in gummy candy
   ?gel=jig    the same loop with its material/scene jig, clickable
   ?gel=felt   the loop in felt (three.js sheen, fibre shading and shell fuzz) */

export function gelPage(): { src: string; jig: boolean } | null {
  const v = new URLSearchParams(window.location.search).get('gel')
  if (v === null) return null
  const jig = v === 'jig'
  const q = jig ? '?jig' : v === 'felt' ? '?mat=felt' : ''
  return { src: `/gel/gummy.html${q}`, jig }
}

const TILE = 0.98 // the loop's tile scale, see tiles() in public/gel/gummy.html

export function GelVignettes({ grid, src, jig }: { grid: RefObject<HTMLDivElement | null>; src: string; jig: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const g = grid.current, f = frame.current
    if (!g || !f) return
    const fit = () => {
      const W = g.clientWidth
      const L = W / TILE, pad = (L - W) / 2
      Object.assign(f.style, { left: `${-pad}px`, top: `${-pad}px`, width: `${L}px`, height: `${L}px` })
      // mask to the cards, in the iframe's own coordinates
      const gr = g.getBoundingClientRect()
      const rects = [...g.querySelectorAll<HTMLElement>('.principle')].map((c) => {
        const r = c.getBoundingClientRect()
        const rx = parseFloat(getComputedStyle(c).borderTopLeftRadius) || 0
        return `<rect x="${r.left - gr.left + pad}" y="${r.top - gr.top + pad}" width="${r.width}" height="${r.height}" rx="${rx}"/>`
      }).join('')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${L}" viewBox="0 0 ${L} ${L}">${rects}</svg>`
      const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
      f.style.maskImage = mask
      f.style.webkitMaskImage = mask
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(g)
    return () => ro.disconnect()
  }, [grid])

  // same-origin via the proxy, so the spike's caption can be hidden
  const onLoad = () => {
    const doc = frame.current?.contentDocument
    if (!doc) return
    const s = doc.createElement('style')
    s.textContent = '#hud { display: none !important; }'
    doc.head.append(s)
  }

  return <iframe ref={frame} className={`gel-vignettes${jig ? ' is-jig' : ''}`} src={src} title="Gummy hands" aria-hidden={!jig} tabIndex={jig ? 0 : -1} onLoad={onLoad} />
}
