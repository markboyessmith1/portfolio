import { useLayoutEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../data/site'
import Podcast from './Podcast'
import ChapterBar from './ChapterBar'

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
      {/* Glass pill menu, top left. Inside a case study it shrinks to a
          single back chevron. */}
      <div className="nav__start">
      <nav className="menu glass" ref={menu} aria-label="Main">
        <div className="menu__set" key={mode}>
        {/* in a case study the menu is just a back chevron to the portfolio */}
        {caseItem ? (
          <Link to="/work" className="active menu__back" aria-label="Back to portfolio">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
              <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <>
            <NavLink to="/" end>About</NavLink>
            {/* the request form; the unlisted portfolio (/work) counts as here too */}
            <NavLink to="/portfolio" className={({ isActive }) => (isActive || pathname === '/work' ? 'active' : undefined)}>Portfolio</NavLink>
          </>
        )}
        </div>
      </nav>
      {/* in a case study the chapter selector sits right against the back chevron */}
      {caseItem && <ChapterBar key={caseItem.href} item={caseItem} />}
      </div>
      {/* top right: the podcast, outside case studies */}
      {/* not on the case studies, nor on the CV (home), which has its own podcast list */}
      {!caseItem && pathname !== '/' && <Podcast />}
      {/* on the CV, the corner holds the PDF download instead: the stripped-back print version
          (pages/ResumePrint, printed to public/), styled to pair with the selector */}
      {pathname === '/' && (
        <a className="nav__download" href="/mark-boyes-smith-resume.pdf" download>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><path d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Download PDF
        </a>
      )}
    </header>
  )
}
