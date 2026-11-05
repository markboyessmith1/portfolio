import { useEffect, useState, type ReactNode } from 'react'
import { ChatCursor, CURSOR_HUES, FloatingEmote, REACTION_SRC, StickyNote, CreationToolbar, REACTIONS, StickerStack, type ChatHue, type Reaction } from '../components/miro'

/**
 * A quick in-app storybook (/storybook) of the pieces we compose portfolio
 * scenes from. Each story renders on a dot-grid board canvas; add new ones to
 * STORIES, grouped by folder (e.g. components/miro).
 */

type Story = { group: string; name: string; note?: string; render: () => ReactNode }

const HUES: ChatHue[] = [...CURSOR_HUES, 'claude']
const NAMES = ['Ana', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jun', 'Kit']
const nameFor = (h: ChatHue) => (h === 'claude' ? 'Claude' : NAMES[CURSOR_HUES.indexOf(h)])
// raw ramps in palette.css
const RAMPS = ['blue', 'coral', 'cyan', 'sunshine', 'lilac', 'pink', 'orange', 'moss', 'teal', 'ocean', 'lime', 'coal', 'green', 'red', 'yellow', 'gray', 'ink', 'cloud']
const STEPS = [100, 200, 300, 400, 500, 600, 650, 700, 800, 900]

/** Chat cursor whose bubble opens, streams a line, then folds back, on loop. */
function LoopingChat({ name, hue, lines }: { name: string; hue: ChatHue; lines: string[] }) {
  const [say, setSay] = useState<string | null>(null)
  useEffect(() => {
    let i = 0
    let t = 0
    const step = () => {
      const line = lines[i++ % lines.length]
      setSay(line)
      t = window.setTimeout(() => {
        setSay(null)
        t = window.setTimeout(step, 1200)
      }, 600 + line.length * 42 + 2200)
    }
    t = window.setTimeout(step, 500)
    return () => window.clearTimeout(t)
  }, [lines])
  return <ChatCursor name={name} hue={hue} say={say} />
}

/** Chat cursor driven by a text field. */
function ChatPlayground() {
  const [hue, setHue] = useState<ChatHue>('claude')
  const [text, setText] = useState('Drafting next steps')
  const [open, setOpen] = useState(true)
  return (
    <div className="sb-play">
      <div className="sb-controls">
        <select value={hue} onChange={(e) => setHue(e.target.value as ChatHue)}>
          {HUES.map((h) => <option key={h}>{h}</option>)}
        </select>
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <label><input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> talking</label>
      </div>
      <ChatCursor name={nameFor(hue)} hue={hue} say={open && text ? text : null} />
    </div>
  )
}

/** Click a reaction to send it floating up. */
function EmotePlayground() {
  const [emotes, setEmotes] = useState<{ id: number; kind: Reaction; dx: number }[]>([])
  const send = (kind: Reaction) => {
    const id = Math.random()
    setEmotes((es) => [...es, { id, kind, dx: Math.round(Math.random() * 60 - 30) }])
    window.setTimeout(() => setEmotes((es) => es.filter((e) => e.id !== id)), 1700)
  }
  return (
    <div className="sb-play">
      <div className="sb-controls">
        {REACTIONS.map((r) => (
          <button key={r} className="sb-emoji" onClick={() => send(r)} aria-label={r}>
            <img src={REACTION_SRC[r]} alt="" />
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', height: 140 }}>
        <div style={{ position: 'absolute', left: 40, bottom: 0 }}><ChatCursor name="Ana" hue="coral" say={null} /></div>
        {emotes.map((e) => <FloatingEmote key={e.id} kind={e.kind} dx={e.dx} style={{ position: 'absolute', left: 40, bottom: 20 }} />)}
      </div>
    </div>
  )
}

/** Stamp stickers onto a sticky note, up to three. */
function StickerPlayground() {
  const [items, setItems] = useState<{ id: number; kind: Reaction; r: number }[]>([])
  const stamp = () =>
    setItems((xs) => (xs.length >= 3 ? [] : [...xs, { id: Math.random(), kind: REACTIONS[(xs.length * 2) % REACTIONS.length], r: Math.round(Math.random() * 24 - 12) }]))
  return (
    <div className="sb-play">
      <div className="sb-controls"><button className="sb-btn" onClick={stamp}>{items.length >= 3 ? 'Clear' : 'Stamp a sticker'}</button></div>
      <StickyNote hue="sunshine" light by="product designer">Honestly? All I ever wanted was a sticky note.<StickerStack items={items} /></StickyNote>
    </div>
  )
}

const STORIES: Story[] = [
  {
    group: 'Miro',
    name: 'Core palettes',
    note: 'Ramps from @mirohq/design-tokens: --miro-<hue>-<step>. Cursors use 300 (fill), 650 (rim), 900 (text).',
    render: () => (
      <div className="sb-ramps">
        {RAMPS.map((h) => (
          <div key={h} className="sb-ramp">
            <span>{h}</span>
            {STEPS.map((st) => <i key={st} title={`--miro-${h}-${st}`} style={{ background: `var(--miro-${h}-${st})` }} />)}
          </div>
        ))}
      </div>
    ),
  },
  {
    group: 'Miro',
    name: 'Creation toolbar',
    note: 'Focus the field or open the voice menu: the tools fold into ✕ and the composer opens. Voice / Autopilot morph it into the listening pill (click to end, back to compose); ✕ returns to rest. Type for the send arrow; Dictate types what you say.',
    render: () => <div className="sb-toolbar"><CreationToolbar /></div>,
  },
  {
    group: 'Miro',
    name: 'Chat cursor — idle',
    note: 'Board Light style name tag, one per hue.',
    render: () => (
      <div className="sb-row">
        {HUES.map((h) => <ChatCursor key={h} name={nameFor(h)} hue={h} say={null} />)}
      </div>
    ),
  },
  {
    group: 'Miro',
    name: 'Chat cursor — talking',
    note: 'The tag morphs into a bubble and streams the message.',
    render: () => <LoopingChat name="Claude" hue="claude" lines={['Reading the room…', 'Following Ben', 'Pulling the case studies together']} />,
  },
  { group: 'Miro', name: 'Chat cursor — playground', render: () => <ChatPlayground /> },
  {
    group: 'Miro',
    name: 'Reactions',
    note: 'The six reaction emojis.',
    render: () => (
      <div className="sb-row" style={{ gap: 32 }}>
        {REACTIONS.map((r) => (
          <figure key={r} className="sb-fig"><img src={REACTION_SRC[r]} alt="" width={56} height={56} /><figcaption>{r}</figcaption></figure>
        ))}
      </div>
    ),
  },
  {
    group: 'Miro',
    name: 'Sticky notes',
    note: 'Same hues as the cursors, at the sticky step (400); the second row is the light variant (250).',
    render: () => (
      <div className="sb-stickies">
        <div>{CURSOR_HUES.map((h) => <StickyNote key={h} hue={h} size={88}>{h}</StickyNote>)}</div>
        <div>{CURSOR_HUES.map((h) => <StickyNote key={h} hue={h} light size={88}>light {h}</StickyNote>)}</div>
      </div>
    ),
  },
  { group: 'Miro', name: 'Reaction stickers', note: "Stamped on an object's corner, overlapping and tilted.", render: () => <StickerPlayground /> },
  { group: 'Miro', name: 'Floating emotes', note: 'Sent from a cursor: float up and fade.', render: () => <EmotePlayground /> },
]

export default function Storybook() {
  const groups = [...new Set(STORIES.map((s) => s.group))]
  return (
    <>
      <div className="page-head stack">
        <p className="eyebrow">Storybook</p>
        <h1 className="title">Scene components</h1>
      </div>
      {groups.map((g) => (
        <section key={g} className="sb-group">
          <h2 className="eyebrow">{g}</h2>
          {STORIES.filter((s) => s.group === g).map((s) => (
            <article key={s.name} className="sb-story">
              <header>
                <h3>{s.name}</h3>
                {s.note && <p className="muted">{s.note}</p>}
              </header>
              <div className="sb-canvas">{s.render()}</div>
            </article>
          ))}
        </section>
      ))}
    </>
  )
}
