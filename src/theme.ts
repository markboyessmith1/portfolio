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
function resolve(name: string, card = false): string {
  // Custom properties can be var() chains or color-mix(); let the browser
  // compute them by applying to a probe element.
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  probe.style.display = 'none'
  // card tokens resolve inside a .gl-slot, where the light palette is pinned
  const host = card ? document.body.appendChild(Object.assign(document.createElement('div'), { className: 'gl-slot' })) : document.body
  host.appendChild(probe)
  const rgb = getComputedStyle(probe).color // "rgb(r, g, b)" or "color(srgb ...)"
  probe.remove()
  if (card) host.remove()
  const m = rgb.match(/[\d.]+/g)
  if (!m) return '#000000'
  const [r, g, b] = rgb.startsWith('color(')
    ? m.slice(0, 3).map((v) => Math.round(parseFloat(v) * 255))
    : m.slice(0, 3).map((v) => Math.round(parseFloat(v)))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const cache = new Map<string, { v: number; c: string }>()
function read(name: string, card = false) {
  const key = card ? `card:${name}` : name
  const hit = cache.get(key)
  if (hit && hit.v === version) return hit.c
  const c = resolve(name, card)
  cache.set(key, { v: version, c })
  return c
}

export function useToken(name: string): string {
  return useSyncExternalStore(subscribe, () => read(name), () => '#000000')
}

/** A token as seen inside a card (.gl-slot): containers keep their light palette in dark mode. */
export function useCardToken(name: string): string {
  return useSyncExternalStore(subscribe, () => read(name, true), () => '#000000')
}
