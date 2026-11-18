import ScanHero from '../components/ScanHero'
import Home from './Home'

/** A version of the home page with the face-scan piece as a full-screen hero, then the portfolio as usual. */
export default function HomeScan() {
  return (
    <>
      <ScanHero />
      <Home />
    </>
  )
}
