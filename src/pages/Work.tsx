import { GLSlot } from '../webgl/GLSlot'
import { scenes } from '../webgl/scenes'
import Reveal from '../components/Reveal'

const projects = [
  { title: 'Launch film — Series A fintech', year: '2026', scene: 'knot' as const },
  { title: 'Feature explainer — design tool', year: '2026', scene: 'blob' as const },
  { title: 'Brand spot — AI startup', year: '2025', scene: 'stack' as const },
  { title: 'Onboarding walkthrough — SaaS', year: '2025', scene: 'knot' as const },
]

export default function Work() {
  return (
    <>
      <div className="page-head stack">
        <p className="eyebrow">Service</p>
        <h1 className="title">Product videos</h1>
        <p className="lede muted">Commercials and explainers for startups. Replace these placeholders with real work.</p>
      </div>
      <div className="grid">
        {projects.map((p) => (
          <Reveal key={p.title} className="stack stack--tight">
            <GLSlot variant="portrait" scene={scenes[p.scene]} />
            <p className="lede lede--strong" style={{ marginTop: 16 }}>{p.title}</p>
            <p className="eyebrow">{p.year}</p>
          </Reveal>
        ))}
      </div>
    </>
  )
}
