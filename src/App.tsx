import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { WebGLStage } from './webgl/WebGLStage'
import Nav from './components/Nav'
import Footer from './components/Footer'
import BigCursor from './components/BigCursor'
import Home from './pages/Home'
import Work from './pages/Work'
import Thoughts from './pages/Thoughts'
import Storybook from './pages/Storybook'
import Resume from './pages/Resume'
import ResumePrint from './pages/ResumePrint'
import PortfolioRequest from './pages/PortfolioRequest'
import Soundscape from './pages/Soundscape'
import Admin from './pages/Admin'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    // the portfolio <-> case-study routes handle their own scroll (seamless)
    if (!hash && pathname !== '/' && !pathname.startsWith('/work')) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  // The single WebGL canvas receives pointer events from this element,
  // so every <View> on the page can react to hover/move.
  const stageRef = useRef<HTMLDivElement>(null!)
  // the print resume stands alone: no nav, no canvas, nothing but the page
  const { pathname } = useLocation()
  if (pathname === '/about/print') return <ResumePrint />

  return (
    <div ref={stageRef} className={pathname === '/' || pathname.startsWith('/work') ? 'site site--areal' : 'site'}>
      <ScrollToTop />
      <Nav />
      <main className="container">
        <Routes>
          {/* home is the portfolio (the work carousel); the CV is /about */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<Resume />} />
          <Route path="/resume" element={<Navigate to="/about" replace />} />
          <Route path="/work" element={<Navigate to="/" replace />} />
          {/* /portfolio asks for access to all case studies; each /work/:slug is gated too
              (one approval opens them all); /admin is the approval list */}
          <Route path="/portfolio" element={<PortfolioRequest />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/work/:slug" element={<Home />} />
          <Route path="/thoughts" element={<Thoughts />} />
          <Route path="/product-videos" element={<Work />} />
          <Route path="/storybook" element={<Storybook />} />
          <Route path="/soundscape" element={<Soundscape />} />
        </Routes>
      </main>
      <Footer />
      <WebGLStage eventSource={stageRef} />
      <BigCursor />
    </div>
  )
}
