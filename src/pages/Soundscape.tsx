import { useEffect } from 'react'
import { CursorStory } from '../components/soundscape/CursorStory'
import { SoundscapeBanner } from '../components/soundscape/SoundscapeBanner'
import { SoundscapeBoard } from '../components/soundscape/SoundscapeBoard'
import '../components/soundscape/soundscape.css'

/* Soundscape — the deep dive behind the "A board you can hear." card, ported
   from the c26 prototype (/portfolio/soundscape). The story in scroll order:
   the dark halftone banner (title + lede), then one pinned scene where the
   cursors orbit the words, drop the ring of stickies, tip it into 3D and ping
   its perimeter, then the board itself pinned through the session's two
   crescendos.

   The prototype's page was its own scroller with mandatory snapping; here it
   sits in the site's normal flow (nav + footer), so the document scrolls and
   the snapping is switched on for <html> while this page is mounted. The
   beats' real STOPS come from that: the long runways (the sweep stretch, the
   board journey) stay free because they carry viewport-covering snap areas —
   inside an oversized snap area every position is a valid rest. */

export default function Soundscape() {
  useEffect(() => {
    const html = document.documentElement
    const prevSnap = html.style.scrollSnapType
    const prevTitle = document.title
    html.style.scrollSnapType = 'y mandatory'
    document.title = 'Soundscape — Mark Boyes-Smith'
    return () => {
      html.style.scrollSnapType = prevSnap
      document.title = prevTitle
    }
  }, [])

  return (
    <div className="ss-page" data-soundscape-page>
      <SoundscapeBanner />
      <CursorStory />
      {/* The hand-off into the board, in the scene headings' voice. */}
      <p className="ss-bridge">Put it together, and the whole board becomes an instrument.</p>
      <SoundscapeBoard />
      {/* A last snap point, so mandatory snapping still lets you reach the footer. */}
      <div className="ss-end" aria-hidden />
    </div>
  )
}
