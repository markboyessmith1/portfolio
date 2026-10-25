import { site } from '../data/site'
import Reveal from './Reveal'

export default function About() {
  const { about } = site
  return (
    <Reveal as="section" className="section">
      <div className="row">
        <div className="stack">
          <p className="lede lede--strong">{about.heading}</p>
          {about.body.map((p) => (
            <p key={p} className="lede">{p}</p>
          ))}
          <blockquote className="lede">{about.quote}</blockquote>
          <p className="lede">{about.closing}</p>
        </div>
      </div>
    </Reveal>
  )
}
