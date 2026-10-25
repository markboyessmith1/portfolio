import { useSyncExternalStore } from 'react'

/**
 * Bridges the CSS colour tokens into WebGL. Scenes can't read CSS, so they
 * call useToken('--surface') and re-render when the theme flips (system
 * preference change, or data-theme on <html>).
 */

let version = 0
const listeners = new Set<() => void>()
const bump = () => {
  version++
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', bump)
  new MutationObserver(bump).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Resolve a CSS custom property to a concrete colour string THREE accepts. */
function resolve(name: string): string {
  // Custom properties can be var() chains or color-mix(); let the browser
  // compute them by applying to a probe element.
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color // "rgb(r, g, b)" or "color(srgb ...)"
  probe.remove()
  const m = rgb.match(/[\d.]+/g)
  if (!m) return '#000000'
  const [r, g, b] = rgb.startsWith('color(')
    ? m.slice(0, 3).map((v) => Math.round(parseFloat(v) * 255))
    : m.slice(0, 3).map((v) => Math.round(parseFloat(v)))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const cache = new Map<string, { v: number; c: string }>()
function read(name: string) {
  const hit = cache.get(name)
  if (hit && hit.v === version) return hit.c
  const c = resolve(name)
  cache.set(name, { v: version, c })
  return c
}

export function useToken(name: string): string {
  return useSyncExternalStore(subscribe, () => read(name), () => '#000000')
}
