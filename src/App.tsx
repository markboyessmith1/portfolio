import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { WebGLStage } from './webgl/WebGLStage'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import Work from './pages/Work'
import About from './pages/About'
import Thoughts from './pages/Thoughts'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    // the portfolio <-> case-study routes handle their own scroll (seamless)
    if (!hash && pathname !== '/' && !pathname.startsWith('/work/')) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  // The single WebGL canvas receives pointer events from this element,
  // so every <View> on the page can react to hover/move.
  const stageRef = useRef<HTMLDivElement>(null!)

  return (
    <div ref={stageRef} className="site">
      <ScrollToTop />
      <Nav />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/thoughts" element={<Thoughts />} />
          <Route path="/work/:slug" element={<Home />} />
          <Route path="/product-videos" element={<Work />} />
        </Routes>
      </main>
      <Footer />
      <WebGLStage eventSource={stageRef} />
    </div>
  )
}
