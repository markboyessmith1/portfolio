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

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    // the portfolio <-> case-study routes handle their own scroll (seamless)
    if (!hash && !pathname.startsWith('/work')) window.scrollTo(0, 0)
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
    <div ref={stageRef} className="site">
      <ScrollToTop />
      <Nav />
      <main className="container">
        <Routes>
          {/* for now the CV is the home page; the old addresses land there */}
          <Route path="/" element={<Resume />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/resume" element={<Navigate to="/" replace />} />
          {/* the portfolio is shared on request: /portfolio is the form; the portfolio itself and
              its case studies stay at /work, unlisted, for direct links */}
          <Route path="/portfolio" element={<PortfolioRequest />} />
          <Route path="/work" element={<Home />} />
          <Route path="/work/:slug" element={<Home />} />
          <Route path="/thoughts" element={<Thoughts />} />
          <Route path="/product-videos" element={<Work />} />
          <Route path="/storybook" element={<Storybook />} />
        </Routes>
      </main>
      <Footer />
      <WebGLStage eventSource={stageRef} />
      <BigCursor />
    </div>
  )
}
