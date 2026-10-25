import { site } from '../data/site'
import { GLSlot } from '../webgl/GLSlot'
import { HeroAltScene, PaperScene } from '../webgl/scenes'

/** Two cards side by side: hero copy on the left, WebGL on the right. */
export default function Hero() {
  return (
    <section className="section">
      <div className="hero">
        <GLSlot variant="wide" scene={PaperScene}>
          <p className="eyebrow">{site.hero.label}</p>
          <div className="stack stack--tight">
            <h1 className="title">{site.hero.title}</h1>
            <p className="lede">{site.hero.subtitle}</p>
          </div>
        </GLSlot>
        <GLSlot variant="wide" scene={HeroAltScene} />
      </div>
    </section>
  )
}
