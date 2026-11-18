import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import CoverMiroAI from './pages/CoverMiroAI'
import WaveJig from './pages/WaveJig'
import PresentMiroAI from './pages/PresentMiroAI'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* the Miro AI talk (full-screen deck) and the recordable cover scenes render without the site chrome (feature-video/) */}
    {location.pathname.replace(/\/$/, '') === '/present/miro-ai' ? <PresentMiroAI /> : location.pathname === '/cover/miro-ai' ? <CoverMiroAI /> : location.pathname === '/cover/jig' ? <WaveJig /> : (
      <BrowserRouter>
        <App />
        <Analytics />
      </BrowserRouter>
    )}
  </StrictMode>,
)
