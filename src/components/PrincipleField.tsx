import { useEffect, useRef } from 'react'

/* A principle card's background: the resume's field of short ink lines (the
   look LineField introduced), filling the card, with a motion of its own per
   principle. Lines shade between grey and ink in slow drifting noise, and lean
   toward the cursor while it's over the card.
     flow     lines riding travelling sine currents
     radiate  lines pointing out from the centre, bright rings pulsing outward
     orbit    a swirl around two points circling each other, brightest near them
     follow   lines locked onto a roaming point (the cursor, over the card)
   All share one line size and weight; each has its own palette, which the lines
   bloom into on hover, spreading out from the cursor.
   Its own WebGL2 canvas, animated only while on screen and held still under
   reduced motion. */

export type FieldVariant = 'flow' | 'radiate' | 'orbit' | 'follow'
const VARIANTS: FieldVariant[] = ['flow', 'radiate', 'orbit', 'follow']

const VERT = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;     // CSS px
uniform float uDpr;
uniform float uTime;   // s
uniform vec2 uMouse;   // CSS px from the canvas's top left
uniform float uHover;  // 0 away … 1 over the card
uniform int uVariant;
uniform vec3 uInk;     // the lines' resting grey
uniform vec3 uDark;    // the shade the noise darkens them toward
out vec4 color;
float hash(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 v) {
  vec2 i = floor(v), f = fract(v);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
vec2 toward(vec2 from, vec2 to) { vec2 d = to - from; float l = length(d); return l > 0.001 ? d / l : vec2(1, 0); }
void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  p.y = uRes.y - p.y;
  // one spacing, length and stroke for every variant: they differ only in motion and brightness
  const float CELL = 18.0;
  const float LEN = 0.3;
  vec2 c = (floor(p / CELL) + 0.5) * CELL;
  vec2 mid = uRes * vec2(0.5, 0.4);
  float t = uTime;
  vec2 dir;
  float amp = 1.0; // extra brightness
  if (uVariant == 0) {
    // flow: currents, sine bands travelling across the card, bent by noise
    float a = 0.7 * sin(c.y / 34.0 + c.x / 90.0 - t * 1.6) + (noise(c / 120.0 + t * 0.15) - 0.5) * 1.6;
    dir = vec2(cos(a), sin(a));
  } else if (uVariant == 1) {
    // radiate: dashes pointing out; rings of length and brightness pulse outward
    dir = toward(mid, c);
    float r = length(c - mid);
    float ring = 0.5 + 0.5 * sin(r / 18.0 - t * 3.0);
    amp = 0.45 + 0.9 * ring;
  } else if (uVariant == 2) {
    // orbit: two points circling each other fast; lines swirl around both, densest between them
    vec2 o = vec2(cos(t * 1.1), sin(t * 1.1)) * min(uRes.x, uRes.y) * 0.2;
    vec2 a = mid + o, b = mid - o;
    vec2 ta = toward(a, c), tb = toward(b, c);
    float wa = 1.0 / max(length(c - a), 6.0), wb = 1.0 / max(length(c - b), 6.0);
    dir = normalize(vec2(-ta.y, ta.x) * wa + vec2(-tb.y, tb.x) * wb + 1e-5);
    float near = min(length(c - a), length(c - b));
    amp = mix(1.5, 0.7, smoothstep(10.0, 140.0, near));
  } else {
    // follow: everything locks onto a point roaming the card (the cursor, over it)
    vec2 roam = mid + vec2(sin(t * 0.9) * 0.36, sin(t * 0.67 + 1.3) * 0.3) * uRes;
    vec2 at = mix(roam, uMouse, uHover);
    dir = toward(c, at);
  }
  // the cursor leans nearby lines toward it in every variant
  vec2 tc = uMouse - c;
  float pull = uHover * exp(-dot(tc, tc) / (2.0 * 140.0 * 140.0));
  dir = normalize(mix(dir, toward(c, uMouse), pull) + 1e-5);
  vec2 q = p - c;
  float along = dot(q, dir), across = dot(q, vec2(-dir.y, dir.x));
  float d = length(vec2(max(abs(along) - CELL * LEN, 0.0), across));
  float a = clamp((1.0 - smoothstep(0.35, 1.1, d)) * amp, 0.0, 1.0);
  float glowLine = exp(-d * d / 9.0); // a soft halo around each line
  float n = noise(c / 140.0 + vec2(t * 0.06, -t * 0.04));
  vec3 ink = mix(uInk, uDark, smoothstep(0.5, 0.8, n));
  // the hover bloom: each variant's two colours, spreading out from the cursor as the hover eases in
  vec3 c1, c2;
  if (uVariant == 0) { c1 = vec3(0.0, 0.45, 1.0); c2 = vec3(0.0, 0.85, 0.75); }        // flow: electric blue into teal
  else if (uVariant == 1) { c1 = vec3(1.0, 0.78, 0.0); c2 = vec3(1.0, 0.36, 0.0); }    // radiate: sun yellow into orange
  else if (uVariant == 2) { c1 = vec3(0.45, 0.2, 1.0); c2 = vec3(1.0, 0.15, 0.6); }     // orbit: violet into magenta
  else { c1 = vec3(1.0, 0.1, 0.5); c2 = vec3(1.0, 0.5, 0.0); }                         // follow: hot pink into orange
  float reach = length(uRes) * (0.3 + 0.9 * uHover);
  float fromCursor = length(p - uMouse);
  float bloom = uHover * (1.0 - smoothstep(reach * 0.45, reach, fromCursor));
  vec3 hue = mix(c1, c2, smoothstep(0.25, 0.75, noise(c / 90.0 + vec2(t * 0.25, -t * 0.1))));
  // lines take the colour fully, a touch heavier and brighter
  ink = mix(ink, hue, bloom);
  a = min(1.0, a * (1.0 + 0.8 * bloom) + glowLine * 0.15 * bloom);
  // a coloured halo around lit lines, and a faint light pooled under the cursor
  float halo = glowLine * 0.35 * bloom;
  float pool = uHover * 0.12 * exp(-fromCursor * fromCursor / (2.0 * 150.0 * 150.0));
  vec3 rgb = ink * a + hue * (halo + pool);
  color = vec4(rgb, max(a, halo + pool));
}`

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function PrincipleField({ variant }: { variant: FieldVariant }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    const gl = el?.getContext('webgl2', { premultipliedAlpha: true, antialias: false })
    if (!el || !gl) return
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    gl.uniform1i(u('uVariant'), VARIANTS.indexOf(variant))

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const fit = () => {
      el.width = el.clientWidth * dpr
      el.height = el.clientHeight * dpr
      gl.viewport(0, 0, el.width, el.height)
      gl.uniform2f(u('uRes'), el.clientWidth, el.clientHeight)
      gl.uniform1f(u('uDpr'), dpr)
    }
    fit()
    // colours from tokens, so they follow the theme
    const rgb = (value: string) => {
      const probe = document.createElement('i')
      probe.style.color = value
      el.parentElement!.appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      const m = c.match(/[\d.]+/g)!.map(Number)
      const k = c.startsWith('color(') ? 1 : 255
      return [m[0] / k, m[1] / k, m[2] / k] as const
    }
    const ink = () => {
      gl.uniform3f(u('uInk'), ...rgb('color-mix(in srgb, var(--ink) 22%, var(--bg))'))
      gl.uniform3f(u('uDark'), ...rgb('var(--ink)'))
    }
    ink()

    const mouse = { x: 0, y: 0, hover: 0 }
    const target = { x: el.clientWidth / 2, y: el.clientHeight / 2, hover: 0 }
    const t0 = performance.now()
    let raf = 0
    let visible = false
    const draw = () => {
      raf = 0
      mouse.x += (target.x - mouse.x) * 0.2
      mouse.y += (target.y - mouse.y) * 0.2
      mouse.hover += (target.hover - mouse.hover) * 0.08
      gl.uniform1f(u('uTime'), REDUCED ? 0 : (performance.now() - t0) / 1000)
      gl.uniform2f(u('uMouse'), mouse.x, mouse.y)
      gl.uniform1f(u('uHover'), mouse.hover)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (visible && !REDUCED) raf = requestAnimationFrame(draw)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw) }
    // the card (the canvas's parent) takes the pointer; the canvas itself ignores it
    const card = el.parentElement!
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect()
      target.x = e.clientX - b.left
      target.y = e.clientY - b.top
      target.hover = 1
      kick()
    }
    const onLeave = () => { target.hover = 0; kick() }
    card.addEventListener('pointermove', onMove)
    card.addEventListener('pointerleave', onLeave)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick() })
    io.observe(el)
    const ro = new ResizeObserver(() => { fit(); kick() })
    ro.observe(el)
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => { ink(); kick() }
    scheme.addEventListener('change', onScheme)
    draw()
    return () => {
      cancelAnimationFrame(raf)
      card.removeEventListener('pointermove', onMove)
      card.removeEventListener('pointerleave', onLeave)
      io.disconnect()
      ro.disconnect()
      scheme.removeEventListener('change', onScheme)
    }
  }, [variant])

  return <canvas ref={canvas} className="principle-field" aria-hidden />
}
