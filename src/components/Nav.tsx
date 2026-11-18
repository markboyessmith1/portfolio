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

  // The active-tab background is one pill that slides between the tabs: measure the active
  // link and move the pill to it. The first placement snaps; later ones animate (CSS). It
  // re-measures when the tabs resize (e.g. once the web font lands).
  const set = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = set.current, p = pill.current
    if (!el || !p) return
    const place = () => {
      const a = el.querySelector<HTMLElement>('a.active')
      if (!a) { p.style.opacity = '0'; return }
      p.style.opacity = '1'
      p.style.width = `${a.offsetWidth}px`
      p.style.transform = `translateX(${a.offsetLeft}px)`
    }
    place()
    // enable the slide only after the pill is in place, so it never sweeps in on load
    const raf = requestAnimationFrame(() => p.classList.add('is-ready'))
    const ro = new ResizeObserver(place)
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [pathname, mode])

  return (
    <header className="nav">
      {/* Glass pill menu, top left. Inside a case study it shrinks to a
          single back chevron. */}
      <div className="nav__start">
      <nav className="menu glass" ref={menu} aria-label="Main">
        <div className="menu__set" key={mode} ref={set}>
        {!caseItem && <span className="menu__pill" ref={pill} aria-hidden />}
        {/* in a case study the menu is just a back chevron to the portfolio */}
        {caseItem ? (
          <Link to="/" className="active menu__back" aria-label="Back to portfolio">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
              <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <>
            {/* the access-request form (/portfolio) counts as the portfolio too */}
            <NavLink to="/" end className={({ isActive }) => (isActive || pathname === '/portfolio' ? 'active' : undefined)}>Portfolio</NavLink>
            <NavLink to="/about">About</NavLink>
          </>
        )}
        </div>
      </nav>
      {/* in a case study the chapter selector sits right against the back chevron */}
      {caseItem && <ChapterBar key={caseItem.href} item={caseItem} />}
      </div>
      {/* top right: the podcast, outside case studies */}
      {/* not on the case studies, nor on the CV (/about), which has its own podcast list */}
      {!caseItem && pathname !== '/about' && <Podcast />}
      {/* on the CV, the corner holds the PDF download instead: the stripped-back print version
          (pages/ResumePrint, printed to public/), styled to pair with the selector */}
      {pathname === '/about' && (
        <a className="nav__download" href="/mark-boyes-smith-resume.pdf" download>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><path d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Download PDF
        </a>
      )}
    </header>
  )
}
