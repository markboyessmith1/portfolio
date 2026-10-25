import { useLayoutEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../data/site'
import Podcast from './Podcast'

export default function Nav() {
  const { pathname } = useLocation()
  const caseItem = site.work.find((w) => w.href === pathname)
  const mode = caseItem ? 'crumb' : 'main'

  // Animate between the main menu and the breadcrumb: the pill resizes
  // smoothly (FLIP on width) and the new items fade/slide in.
  const menu = useRef<HTMLElement>(null)
  const lastWidth = useRef<number | null>(null)
  const lastMode = useRef(mode)
  useLayoutEffect(() => {
    const el = menu.current
    if (!el) return
    const w = el.getBoundingClientRect().width
    const prev = lastWidth.current
    if (prev != null && lastMode.current !== mode && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.animate([{ width: `${prev}px` }, { width: `${w}px` }], { duration: 450, easing: 'cubic-bezier(.65,0,.25,1)' })
    }
    lastWidth.current = w
    lastMode.current = mode
  }, [mode, caseItem?.title])

  return (
    <header className="nav">
      {/* Glass pill menu, top left. Inside a case study it becomes a
          breadcrumb: the back link carries the active pill. */}
      <nav className="menu glass" ref={menu} aria-label="Main">
        <div className="menu__set" key={mode}>
        {/* in a case study the first item becomes a back link (carrying the
            active pill); the rest of the menu stays as it is */}
        {caseItem ? (
          <Link to="/" className="active menu__back">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
              <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Portfolio
          </Link>
        ) : (
          <NavLink to="/" end>Portfolio</NavLink>
        )}
        <NavLink to="/about">About</NavLink>
        <NavLink to="/thoughts">Thoughts</NavLink>
        </div>
      </nav>
      <Podcast />
    </header>
  )
}
