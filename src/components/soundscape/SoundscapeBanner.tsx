import { LivingTexture } from './LivingTexture'

/* The opening banner, in the Attitude page's hero costume: a dark stage with
   the halftone texture rippling across it, inset with the big squircle
   corners. Carries the page's two voices — the Apris display and the sans
   story — centred, rising in. */

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function SoundscapeBanner() {
  return (
    <header className="ss-banner">
      <div aria-hidden className="ss-fill">
        <LivingTexture kind="halftoneHero" paused={REDUCED} />
      </div>
      <h1 className="ss-banner__display">Soundscape</h1>
      <p className="ss-banner__lede">
        We wanted to bring the board to life in those collaborative moments, so that you could feel the collaboration
        happening around you.
      </p>
    </header>
  )
}
