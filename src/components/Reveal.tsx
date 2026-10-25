import { useEffect, useRef, type PropsWithChildren } from 'react'

/** Fades children in once they scroll into view. */
export default function Reveal({ children, className = '', as: Tag = 'div' }: PropsWithChildren<{ className?: string; as?: 'div' | 'section' }>) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in')
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Tag as any
  return <Comp ref={ref} className={`reveal ${className}`}>{children}</Comp>
}
