import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './palette.css'

/* Miro's creation toolbar with voice (recreated from the c26 prototype's
   UnifiedToolbar + UbtChatInput + SplitVoiceButton + VoiceVisualizer), with
   its mode-change motion. Three states, each a resize of the same persistent
   elements on the toolbar's one clock (400ms snap-bounce, measured off the
   prototype frame by frame):
   - rest: a glass bar, the tool row beside a slim prompt field;
   - compose (focus the field / open the voice menu): the bar "detaches" —
     the tools fold into a ✕ pill and the field grows into the composer card
     (chips row + avatars + "Create with everyone");
   - voice: the tool row unfolds again and the composer shrinks into the
     listening pill. Ending voice returns to compose; ✕ returns to rest.
   The voice control opens Voice / Autopilot / Dictate:
   - Voice / Autopilot swap the field for the listening pill (yellow / blue),
     its bars driven by the live mic (or a gentle idle pulse without one);
     click the pill to end;
   - Dictate streams speech-to-text into the field (Web Speech API);
   - with a draft in the field the voice control becomes the dark send arrow. */

export type ToolId = 'pointer' | 'frame' | 'draw' | 'text' | 'sticky' | 'reactions' | 'create'
type VoiceMode = 'conversation' | 'autopilot'

const path = (d: string, evenodd = false) => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none" aria-hidden>
    <path fill="currentColor" d={d} {...(evenodd ? { fillRule: 'evenodd', clipRule: 'evenodd' } : {})} />
  </svg>
)

// Design-system icons, as rendered by the prototype
const TOOLS: { id: ToolId; label: string; icon: ReactNode }[] = [
  { id: 'pointer', label: 'Pointer', icon: path('M22.001 8.936v2.045l-.003.019C15.977 11 11 15.977 11 21.998l-.012.002H8.935L2 3.178V3l1-1h.179L22 8.936Z') },
  { id: 'frame', label: 'Frames', icon: path('M6 2v2h12V2h2v2h2v2h-2v12h2v2h-2v2h-2v-2H6v2H4v-2H2v-2h2V6H2V4h2V2h2Zm0 16h12V6H6v12Z') },
  { id: 'draw', label: 'Draw', icon: path('M14.492 3.414 8.921 8.985a4.312 4.312 0 0 0 6.105 6.09l5.564-5.562 1.414 1.414-5.664 5.664a6.002 6.002 0 0 1-2.182 1.392L3.344 21.94 2.06 20.656 6.02 9.845c.3-.82.774-1.563 1.391-2.18l.093-.092.01-.01L13.077 2l1.415 1.414ZM4.68 19.32l4.486-1.64a6.305 6.305 0 0 1-1.651-1.19 6.306 6.306 0 0 1-1.192-1.655L4.68 19.32Z', true) },
  { id: 'text', label: 'Text', icon: path('m20 3 1 1v4h-2V5h-6l.001 14H16v2H8v-2h3.001L11 5H5v3H3V4l1-1h16Z') },
  { id: 'sticky', label: 'Sticky note', icon: path('M5 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h7c5.523 0 10-4.477 10-10V5a3 3 0 0 0-3-3H5Zm15 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1v-.004h4a3 3 0 0 0 3-3V13l1-1h4a3 3 0 0 0 3-3Zm-6.952 10.932A4.977 4.977 0 0 0 14 16.996V14h3a4.977 4.977 0 0 0 2.932-.95 8.004 8.004 0 0 1-6.884 6.882Z', true) },
  { id: 'reactions', label: 'Reactions', icon: path('M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0Zm2 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10ZM7.95 8h2v2h-2V8Zm6 0h2v2h-2V8Zm2.949 5a5 5 0 0 1-9.797 0H9.17a2.998 2.998 0 0 0 5.655 0H16.9Z') },
  { id: 'create', label: 'Create', icon: path('M13 4v7h7v2h-7v7h-2v-7H4v-2h7V4h2Z') },
]

const VoiceBlob = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 17 20" fill="none" aria-hidden>
    <ellipse cx="2.5" cy="10" rx="2.5" ry="5" fill="currentColor" />
    <ellipse cx="7.5" cy="10" rx="3" ry="8" fill="currentColor" />
    <ellipse cx="13.5" cy="10" rx="3.5" ry="10" fill="currentColor" />
  </svg>
)
const Chevron = () => path('M6.707 9.293 12 14.586l5.293-5.293 1.414 1.414-6 6h-1.414l-6-6 1.414-1.414Z')
const Mic = () => path('M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Zm-2 4a2 2 0 1 1 4 0v6a2 2 0 1 1-4 0V6Zm-5 6h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.93V22h-2v-3.07A7 7 0 0 1 5 12Z')
const Sparks = () => path('M10 2h2l1.2 4.8L18 8v2l-4.8 1.2L12 16h-2l-1.2-4.8L4 10V8l4.8-1.2L10 2Zm8 10h1.5l.75 2.25L22.5 15v1.5l-2.25.75L19.5 19.5H18l-.75-2.25L15 16.5V15l2.25-.75L18 12Z')
const Close = () => path('M5.293 6.707 10.586 12l-5.293 5.293 1.414 1.414L12 13.414l5.293 5.293 1.414-1.414L13.414 12l5.293-5.293-1.414-1.414L12 10.586 6.707 5.293 5.293 6.707Z')
const ArrowUp = () => path('M11 20V7.414l-5.293 5.293-1.414-1.414 7-7h1.414l7 7-1.414 1.414L13 7.414V20h-2Z')

/* ---- the listening pill's bars (WaveBars, ported 1:1) */
const BAR_W = 7
const BAR_H = 24
function WaveBars({ levels }: { levels: number[] }) {
  // per-bar minimum scale + desynced baseline pulse, so the bars read "alive"
  const params = useMemo(
    () =>
      levels.map(() => {
        const dur = 1.4 + Math.random()
        return { min: 0.5 + Math.random() * 0.12, dur, delay: -Math.random() * dur }
      }),
    [levels.length], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return (
    <div className="ct-bars">
      {levels.map((l, i) => (
        <div key={i} style={{ width: BAR_W, height: BAR_H, animation: `ct-pulse ${params[i].dur}s ease-in-out ${params[i].delay}s infinite` }}>
          <i style={{ transform: `scaleY(${Math.min(1, Math.max(params[i].min, l * 2.025))})` }} />
        </div>
      ))}
    </div>
  )
}

/** Live mic levels for 4 bars while `on`; zeros (idle pulse) without a mic. */
function useMicLevels(on: boolean) {
  const [levels, setLevels] = useState([0, 0, 0, 0])
  useEffect(() => {
    if (!on) return
    let raf = 0
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let alive = true
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop())
        stream = s
        ctx = new AudioContext()
        const an = ctx.createAnalyser()
        an.fftSize = 256
        ctx.createMediaStreamSource(s).connect(an)
        const data = new Uint8Array(an.frequencyBinCount)
        const tick = () => {
          an.getByteFrequencyData(data)
          // voice sits low: four bands over ~0.2–4 kHz
          setLevels([2, 5, 9, 15].map((b, i) => (data[b] + data[b + 1] + data[b + 2]) / 765 * (1 - i * 0.08)))
          raf = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => {}) // no mic: the idle pulse carries it
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      void ctx?.close()
      setLevels([0, 0, 0, 0])
    }
  }, [on])
  return levels
}

type Recognition = { start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; interimResults: boolean; continuous: boolean }
const SpeechRecognition = (typeof window !== 'undefined' &&
  ((window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)) || null

type Mode = 'rest' | 'compose' | 'voice'

// the room in the composer: cursor colours (palette.css) with initials
const PEOPLE = [
  { initial: 'A', hue: 'coral' },
  { initial: 'B', hue: 'cyan' },
  { initial: 'C', hue: 'lilac' },
]

export default function CreationToolbar({
  placeholder = 'Where shall we start?',
  composePlaceholder = 'Create with everyone',
  defaultTool = 'pointer',
  onSend,
  skills,
}: {
  placeholder?: string
  composePlaceholder?: string
  defaultTool?: ToolId
  onSend?: (text: string) => void
  /** skill chips shown while composing (in place of the defaults); picking one starts the prompt with it */
  skills?: string[]
}) {
  const [tool, setTool] = useState<ToolId>(defaultTool)
  const [text, setText] = useState('')
  const [menu, setMenu] = useState(false)
  const [mode, setMode] = useState<Mode>('rest')
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('conversation')
  const [dictating, setDictating] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const voice = mode === 'voice'
  const levels = useMicLevels(voice || dictating)
  const root = useRef<HTMLDivElement>(null)

  // close the menu on an outside click / Escape
  useEffect(() => {
    if (!menu) return
    const off = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', off)
    return () => {
      document.removeEventListener('pointerdown', off)
      document.removeEventListener('keydown', off)
    }
  }, [menu])

  const startVoice = (m: VoiceMode) => {
    setVoiceMode(m)
    setMenu(false)
    setMode('voice')
  }
  const dictate = () => {
    setMenu(false)
    if (!SpeechRecognition) return
    const r = new SpeechRecognition()
    r.interimResults = true
    r.continuous = true
    const base = text ? `${text} ` : ''
    r.onresult = (e) => setText(base + Array.from(e.results, (res) => res[0].transcript).join(''))
    r.onend = () => setDictating(false)
    rec.current = r
    r.start()
    setDictating(true)
  }
  const send = () => {
    if (!text.trim()) return
    onSend?.(text.trim())
    setText('')
  }

  return (
    <div className={`ct ct--${mode}`} ref={root}>
      {/* the tools: a row, folding into the ✕ pill while composing */}
      <div className="ct__tools-shell">
        <div className="ct__tools-clip">
          <div className="ct__tools" role="toolbar" aria-label="Creation tools" inert={mode === 'compose'}>
            {TOOLS.map((t) => (
              <button key={t.id} className="ct__tool" aria-label={t.label} title={t.label} aria-pressed={tool === t.id} onClick={() => setTool(t.id)}>
                {t.icon}
              </button>
            ))}
          </div>
          <button className="ct__tool ct__show-tools" aria-label="Show tools" title="Show tools" onClick={() => { setMenu(false); setMode('rest') }} inert={mode !== 'compose'}>
            <Close />
          </button>
        </div>
      </div>

      {/* the prompt: slim field ⇄ composer card ⇄ listening pill */}
      <div className="ct__compose">
        <div className="ct__chips" inert={mode !== 'compose'}>
          {skills ? (
            skills.map((k) => (
              <button key={k} type="button" className="ct__chip ct__chip--skill" data-skill={k} onClick={() => { setText(`/${k} `); input.current?.focus() }}>
                <kbd>/</kbd>{k}
              </button>
            ))
          ) : (
            <>
              <span className="ct__chip"><kbd>/</kbd>All Recipes</span>
              <span className="ct__chip"><kbd>#</kbd>Settings</span>
            </>
          )}
        </div>
        <div className={`ct__field${voice ? ` is-voice is-${voiceMode}` : ''}`}>
          {voice && (
            // keyed so the ripple replays on every entry
            <button key={voiceMode} className="ct__pill" onClick={() => setMode('compose')} aria-label="End voice chat" title="End voice chat">
              <WaveBars levels={levels} />
              <span className="ct__sr" role="status">Listening to voice input</span>
            </button>
          )}
          <div className="ct__row" inert={voice}>
            <span className="ct__people" aria-hidden>
              {PEOPLE.map((p) => (
                <i key={p.initial} style={{ background: `var(--miro-light-${p.hue}-cursor-background)`, color: `var(--miro-${p.hue}-text)` }}>{p.initial}</i>
              ))}
              <b>+1</b>
            </span>
            <input
              ref={input}
              value={text}
              placeholder={dictating ? 'Listening…' : mode === 'compose' ? composePlaceholder : placeholder}
              onFocus={() => setMode('compose')}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
                if (e.key === 'Escape') { setMode('rest'); input.current?.blur() }
              }}
              aria-label="Prompt"
            />
            {dictating ? (
              <button className="ct__dictating" onClick={() => rec.current?.stop()} aria-label="Stop dictating" title="Stop dictating">
                <WaveBars levels={levels} />
              </button>
            ) : text.trim() ? (
              <button className="ct__send" onClick={send} aria-label="Send">
                <ArrowUp />
              </button>
            ) : (
              <button
                className="ct__voice"
                aria-label="Choose voice mode"
                aria-haspopup="menu"
                aria-expanded={menu}
                title="Voice mode"
                onClick={() => { setMode('compose'); setMenu((m) => !m) }}
              >
                <VoiceBlob />
                <span className="ct__caret"><Chevron /></span>
              </button>
            )}
          </div>
        </div>
        {menu && (
          <div className="ct__menu" role="menu">
            <button role="menuitem" onClick={() => startVoice('conversation')}><Mic />Voice</button>
            <button role="menuitem" onClick={() => startVoice('autopilot')}><Sparks />Autopilot</button>
            <button role="menuitem" onClick={dictate} disabled={!SpeechRecognition} title={SpeechRecognition ? undefined : 'Speech recognition is not supported in this browser'}><Mic />Dictate</button>
          </div>
        )}
      </div>
    </div>
  )
}
