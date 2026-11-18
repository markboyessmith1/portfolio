/* The two cursor looks the soundscape uses, ported from the c26 prototype:
   HeroBoard's HumanCursor (solid hue wedge, white rim, name pill) and
   PresenceCursor's SidekickCursorPreview (pale-yellow wedge and pill with
   the sparkle avatar). Styles in soundscape.css (.ss-cursor*). */

export const CURSOR_PATH =
  'M12.001 4.162V5.389L11.999 5.4C8.386 5.4 5.4 8.386 5.4 11.999L5.393 12H4.161L0 0.707V0.6L0.6 0H0.707L12.001 4.162Z'

const SPARKLE_PATH =
  'M10.538 3.268c.244-1.69 2.684-1.692 2.928 0a8.584 8.584 0 0 0 7.27 7.27c1.686.244 1.695 2.683 0 2.928a8.583 8.583 0 0 0-7.27 7.27c-.245 1.695-2.684 1.686-2.928 0a8.584 8.584 0 0 0-7.27-7.27c-1.692-.244-1.69-2.684 0-2.928a8.585 8.585 0 0 0 7.27-7.27Z'

export function HumanCursor({ name, color }: { name: string; color: string }) {
  return (
    <>
      <svg width={20} height={20} viewBox="0 0 16 16" fill="none" aria-hidden style={{ display: 'block' }}>
        <path d={CURSOR_PATH} fill={color} stroke="white" strokeWidth={1} strokeLinejoin="round" />
      </svg>
      <span className="ss-cursor-pill" style={{ backgroundColor: color }}>
        {name}
      </span>
    </>
  )
}

export function SidekickCursor({ label = 'Sidekick' }: { label?: string }) {
  return (
    <div className="ss-sidekick" role="img" aria-label={`Sidekick cursor: ${label}`}>
      <svg width={18} height={18} viewBox="0 0 16 16" fill="none" aria-hidden className="ss-sidekick__wedge">
        <path
          d={CURSOR_PATH}
          fill="#FFF09A"
          stroke="#BA8A12"
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="ss-sidekick__pill">
        <span className="ss-sidekick__avatar" aria-hidden>
          <svg viewBox="0 0 24 24" width={8} height={8}>
            <path d={SPARKLE_PATH} fill="#191812" />
          </svg>
        </span>
        <span className="ss-sidekick__label">{label}</span>
      </div>
    </div>
  )
}
