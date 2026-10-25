import { Link } from 'react-router-dom'
import type { WorkItem } from '../data/site'
import { GLSlot } from '../webgl/GLSlot'
import { scenes } from '../webgl/scenes'
import Reveal from './Reveal'

export default function WorkCard({ item }: { item: WorkItem }) {
  const body = (
    <>
      <div className="stack stack--tight">
        <p className="eyebrow card__meta">{item.label}</p>
        <h2 className="title">{item.title}</h2>
        <p className="lede muted">{item.description}</p>
      </div>
      <GLSlot variant="portrait" scene={scenes[item.scene]} />
    </>
  )
  return (
    <Reveal>
      {item.external ? (
        <a className="card" href={item.href} target="_blank" rel="noreferrer">{body}</a>
      ) : (
        <Link className="card" to={item.href}>{body}</Link>
      )}
    </Reveal>
  )
}
