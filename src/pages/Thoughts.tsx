import { site } from '../data/site'
import Reveal from '../components/Reveal'

const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Thoughts() {
  return (
    <>
      <div className="page-head stack">
        <p className="eyebrow">Thoughts</p>
        <h1 className="title">Notes on design, leadership and the web.</h1>
      </div>
      <ul className="posts">
        {site.thoughts.map((t) => (
          <Reveal key={t.slug}>
            <li className="post">
              <time className="eyebrow" dateTime={t.date}>{fmt.format(new Date(t.date))}</time>
              <div className="stack stack--tight">
                <h2 className="title post__title">{t.title}</h2>
                <p className="lede muted">{t.excerpt}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </>
  )
}
