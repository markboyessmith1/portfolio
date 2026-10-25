import AboutStory from '../components/About'
import Contact from '../components/Contact'

export default function About() {
  return (
    <>
      <div className="page-head stack">
        <p className="eyebrow">About</p>
        <h1 className="title">Designer, leader, occasional filmmaker.</h1>
      </div>
      <AboutStory />
      <Contact />
    </>
  )
}
