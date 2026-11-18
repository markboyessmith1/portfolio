import { useEffect, useRef } from 'react'
import MiroLogo from '../MiroLogo'
import './palette.css'

/* The new board chrome, as on the C26 Fall prototype's board, laid over a scene:
   top left the menu + logo pill and the board's name, and at the bottom the unified
   toolbar from "Simplifying the toolbar" (my-canvas-prototype's, iframed). The top
   bar is decorative; the toolbar is live. Sized down with `--board-chrome-scale` to sit
   on a card rather than a full screen. Styles: .board-chrome in styles.css. */

const Chevron = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

/** The toolbar frame's width at zoom 1 (the bar is 578, measured, plus room for its
 *  shadow), to keep it inside a narrow card. Keep in step with .board-chrome__toolbar */
const TOOLBAR_W = 640
const FIT_MARGIN = 24
/** the top bars' inset from each side, and the least space between the two groups, in
 *  their own (unscaled) px: keep TOP_INSET in step with .board-chrome__top--left/right */
const TOP_INSET = 30
const TOP_GAP = 32

export default function BoardChrome({ board = 'Q3 planning' }: { board?: string }) {
  // the zooms: the top bars at 2× and the toolbar at 1.5× --board-chrome-scale (in CSS), each
  // unless the card is too narrow, then just small enough to fit (--board-chrome-top-fit,
  // --board-chrome-fit)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const tops = [...el.querySelectorAll<HTMLElement>('.board-chrome__top')]
    const fit = () => {
      const w = el.clientWidth
      el.style.setProperty('--board-chrome-fit', String((w - FIT_MARGIN * 2) / TOOLBAR_W))
      // the top bars: both groups, their side insets (scaled with them) and a gap between
      // must fit across the card (offsetWidth is their unscaled width)
      const groups = tops.reduce((n, g) => n + g.offsetWidth, 0)
      el.style.setProperty('--board-chrome-top-fit', String(w / (groups + TOP_INSET * 2 + TOP_GAP)))
    }
    // the card resizing, or the bars themselves (fonts, the avatar loading)
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    tops.forEach((g) => ro.observe(g))
    return () => ro.disconnect()
  }, [])
  return (
    <div className="board-chrome" ref={root}>
      <div className="board-chrome__top board-chrome__top--left" aria-hidden>
        <span className="board-chrome__pill">
          <svg viewBox="0 0 20 20" width="18" height="18"><path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <MiroLogo height={18} className="board-chrome__logo" />
          <Chevron />
        </span>
        <span className="board-chrome__pill board-chrome__pill--name">
          <span className="board-chrome__board-icon">📋</span>
          {board}
        </span>
      </div>
      <div className="board-chrome__bottom">
        {/* the real unified bar (my-canvas-prototype's Toolbar), the end of "Simplifying the
            toolbar": public/media/simplify/toolbar-page.html at rest, on a clear page. Live,
            its voice split and all; the page keeps its menus from opening */}
        <iframe className="board-chrome__toolbar" src="/media/simplify/toolbar-page.html#rest" title="Miro's toolbar" />
      </div>
    </div>
  )
}
