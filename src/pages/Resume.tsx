import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { site, acquiredLabel, type Acquired } from '../data/site'
import PrincipleField from '../components/PrincipleField'
import ResumeTimeline from '../components/ResumeTimeline'
import MediaCarousel from '../components/MediaCarousel'
import { EPISODES } from '../data/episodes'
import CurrentRole from '../components/CurrentRole'
import { useClipChain } from '../components/useClipChain'
import Chars from '../components/Chars'
import CompanyMark from '../components/CompanyMark'
import ReactionBurst from '../components/ReactionBurst'
import { GelVignettes, gelPage } from '../components/GelVignettes'

/** the hero's entrance clock: ms per character of the colour-in sweep (styles.css reads it as --step) */
const STEP = 7

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'principles', label: 'Principles' },
  { id: 'talks', label: 'Talks & media' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
]

/** A one-page resume (site.resume), in the site's type and tokens. */
export default function Resume() {
  const r = site.resume
  // copy starts secondary and turns to ink as it scrolls up past 80% of the screen
  const root = useRef<HTMLElement>(null)
  // the jump link for the section that has passed the top third of the screen
  const [current, setCurrent] = useState(SECTIONS[0].id)
  useEffect(() => {
    const onScroll = () => {
      let at = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top < innerHeight / 3) at = s.id
      }
      // at the foot of the page the last sections can't reach the line: take the last
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) at = SECTIONS[SECTIONS.length - 1].id
      setCurrent(at)
    }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const els = root.current?.querySelectorAll('.resume__job')
    if (!els) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-read'); io.unobserve(e.target) }
    }, { rootMargin: '0px 0px -20% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  // the principle cards slide in once their row is on screen (held in state, so a
  // re-render can't drop it); a row already scrolled past counts as seen
  const principles = useRef<HTMLDivElement>(null)
  // the principle clips play one at a time, snaking round the grid: top row left to right, then
  // the bottom row right to left (wave → shake → heart → cancan), and round again; each from its
  // first frame, starting on the last one's exit frame (its Blender exit_start, kept as `exit` in
  // the data): the exit is built as the next card's entry, so the hand flies straight across.
  // A clip without a mark picks up 40 frames before the last ends, the usual exit length
  // the cancan card (third in the data, bottom left) erupts with reactions from 4.5s into its clip
  const cancan = useRef<HTMLElement>(null)
  const { clip } = useClipChain([[0, 1, 3, 2]], (i, len) => {
    const pr = r.principles[i]
    return 'exit' in pr && pr.exit ? (pr.exit - 1) / 24 : len - 40 / 24 // frame n shows at (n − 1)/24s
  })
  const [principlesIn, setPrinciplesIn] = useState(false)
  // ?gel: the gummy-hand three.js spike behind the cards instead of the glove videos
  const [gel] = useState(gelPage)
  // …but never before the hero's entrance has finished (heroDone, below): if they're on screen
  // sooner they wait for it, if they're reached later they fade straight in
  const loaded = useRef(performance.now())
  useEffect(() => {
    const el = principles.current
    if (!el) return
    let wait = 0
    const io = new IntersectionObserver(([e]) => {
      if (!(e.isIntersecting || e.boundingClientRect.bottom < 0)) return
      io.disconnect()
      wait = window.setTimeout(() => setPrinciplesIn(true), Math.max(0, heroDone - (performance.now() - loaded.current)))
    }, { threshold: 0.15 })
    io.observe(el)
    return () => { io.disconnect(); clearTimeout(wait) }
  }, [])
  // the hero (name, headline, current role, statement) comes in on load, top to bottom: each
  // block un-blurs as its turn comes, while its text colours in a character at a time, carrying
  // on from where the block above left off. --b: when the block starts, in characters
  const [hero, setHero] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setHero(true)); return () => cancelAnimationFrame(f) }, [])
  const cur = r.current
  const statement = `${r.intro.highlight} ${r.intro.statement}`
  const c1 = site.name.length, c2 = c1 + r.headline.length
  const c3 = c2 + `Currently ${cur.role} at ${cur.company}.`.length
  // when the entrance is over: the last character's turn, plus its fade and the last block's un-blur
  const heroDone = (c3 + statement.length) * STEP + 1100
  const block = (b: number) => ({ className: 'hero-block', style: { '--b': b } as CSSProperties })
  return (
    <div className="resume-wrap">
    <ResumeTimeline section="experience" rows={r.experience.map((j) => j.when)} />
    <nav className="resume__jump" aria-label="Resume sections">
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`} className={s.id === current ? 'is-on' : undefined} aria-current={s.id === current ? 'true' : undefined}>{s.label}</a>
      ))}
    </nav>
    <article className={`resume${hero ? ' is-hero' : ''}`} ref={root} style={{ '--step': `${STEP}ms` } as CSSProperties}>
      <header className="resume__head">
        <div className="resume__id">
          <div>
            <h1 className="resume__name"><span {...block(0)}><Chars text={site.name} /></span></h1>
            <p className="lede muted"><span {...block(c1)}><Chars text={r.headline} from={c1} /></span></p>
          </div>
        </div>
      </header>
      <div className="resume__body">
        <div>
          <section className="resume__section resume__profile" id="profile">
            <h2 className="visually-hidden">Profile</h2>
            <div {...block(c2)}><CurrentRole {...r.current} from={c2} /></div>
            <p className="resume__statement"><span {...block(c3)}><Chars text={statement} from={c3} /></span></p>
          </section>
          <section className={`resume__section principles-sec${principlesIn ? ' is-in' : ''}`} id="principles">
            <h2 className="resume__label">Principles</h2>
            <p className="resume__subhead">{r.statement}</p>
            <div className={`principles${principlesIn ? ' is-in' : ''}${gel ? ' principles--gel' : ''}${gel?.jig ? ' is-jig' : ''}`} ref={principles}>
              {gel && <GelVignettes grid={principles} src={gel.src} jig={gel.jig} />}
              {r.principles.map((pr, i) => (
                <article className="principle" key={pr.lead} style={{ '--i': i } as CSSProperties} ref={i === 2 ? cancan : undefined}>
                  {gel ? null : 'video' in pr && pr.video
                    ? <video
                        className="principle-field principle-field--video" src={pr.video} muted playsInline aria-hidden="true"
                        {...clip(i)}
                      />
                    : <PrincipleField variant={pr.field} />}
                  <div className="principle__text">
                    <p className="principle__copy">{pr.lead}</p>
                    <p className="principle__desc">{pr.short}</p>
                  </div>
                </article>
              ))}
              {!gel && <ReactionBurst card={cancan} from={4.5} />}
            </div>
          </section>
          <section className="resume__section" id="talks">
            <h2 className="resume__label">Talks &amp; media</h2>
            <MediaCarousel items={r.media} episodes={EPISODES} />
          </section>
          <section className="resume__section" id="experience">
            <h2 className="resume__label">Experience</h2>
            {r.experience.map((j) => (
              <div className="resume__job" key={j.company + j.when}>
                {'clients' in j && j.clients
                  // clients instead of a company: their logos stack from the left, the name straight after
                  ? <span className="resume__orgline">
                      <span className="company-stack" aria-label={`Clients: ${j.clients.join(', ')}`}>{j.clients.map((c) => <CompanyMark key={c} name={c} />)}</span>
                      <b className="resume__org">{j.company}</b>
                    </span>
                  : <><CompanyMark name={j.company} /><b className="resume__org">{j.company}</b></>}
                {/* top right: the acquisition badge, if any, and the dates (narrow screens only) */}
                <span className="resume__tags">
                  {'acquired' in j && j.acquired && (
                    <span className="resume__acquired"><span>{acquiredLabel(j.acquired as Acquired)}</span> <b>{j.acquired.by}</b>{(j.acquired as Acquired).price && <span> for {(j.acquired as Acquired).price}</span>}</span>
                  )}
                  <span className="resume__when">{j.when}</span>
                </span>
                {'title' in j && j.title && <span className="resume__role">{j.title}</span>}
                {'details' in j && j.details && (
                  <ul className="resume__details">{j.details.map((d) => <li key={d}>{d}</li>)}</ul>
                )}
              </div>
            ))}
          </section>
          <section className="resume__section" id="education">
            <h2 className="resume__label">Education</h2>
            <div className="resume__job">
              <CompanyMark name={r.education.school} />
              <b className="resume__org">{r.education.school}</b>
              <span className="resume__tags"><span className="resume__when">{r.education.when}</span></span>
              <span className="resume__role">{r.education.degree}</span>
              {r.education.dissertation && (
                <div className="resume__thesis">
                  <span className="resume__thesis-tag">Dissertation <span className="resume__thesis-grade">{r.education.dissertation.grade}</span></span>
                  <span className="resume__thesis-title">{r.education.dissertation.title}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </article>
    </div>
  )
}
