import MiroLogo from './MiroLogo'

/* A business's wordmark, in place of a case study's title on its carousel card.
   Miro's is the built-in MiroLogo; any other is an SVG in src/assets/wordmarks/<name>.svg
   (e.g. hyperexponential.svg, glitterball.svg). Drop a file in and it's picked up. Every
   wordmark fills with currentColor, so it takes the card's text colour like the title did.
   Returns null when there's no wordmark yet, so the caller can fall back to the text title. */

const FILES = import.meta.glob('../assets/wordmarks/*.svg', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const SVGS = Object.fromEntries(Object.entries(FILES).map(([path, svg]) => [path.split('/').pop()!.replace(/\.svg$/, ''), svg]))

export const hasWordmark = (name?: string) => !!name && (name === 'miro' || name in SVGS)

export default function Wordmark({ name, label, height = 30, className = '' }: { name: string; label: string; height?: number; className?: string }) {
  if (name === 'miro') return <MiroLogo height={height} className={`wordmark ${className}`} />
  const svg = SVGS[name]
  if (!svg) return null
  return (
    <span
      className={`wordmark wordmark--file ${className}`}
      style={{ height }}
      role="img"
      aria-label={label}
      // a local, trusted asset from src/assets/wordmarks, inlined so it can fill with currentColor
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
