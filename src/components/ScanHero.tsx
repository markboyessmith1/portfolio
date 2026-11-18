import { site } from '../data/site'

/* Full-screen hero for the /scan version of the home page: Mark's "face scan in dust" piece
   (public/hero/face-scan.html, a self-contained page) running in an iframe, with his name over it.
   Dragging turns the face; the page's own scroll passes straight through (the embed forwards wheel
   events), and on touch screens the iframe ignores touches so a swipe always scrolls. */
export default function ScanHero() {
  const next = () => document.getElementById('scan-next')?.scrollIntoView({ behavior: 'smooth' })
  return (
    <section className="scan-hero" aria-label="Introduction">
      <iframe className="scan-hero__frame" src="/hero/face-scan.html" title="A face scan drawn in drifting dust" loading="eager" />
      <div className="scan-hero__copy">
        <h1 className="scan-hero__name">{site.name}</h1>
        <p className="scan-hero__role">{site.role}</p>
      </div>
      <button type="button" className="scan-hero__cue" onClick={next}>
        Selected work <span aria-hidden>↓</span>
      </button>
      <div id="scan-next" />
    </section>
  )
}
