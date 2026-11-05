import { useEffect, useRef } from 'react'

/* A field of short ink lines, each one tipped to point at the cursor wherever
   it is on the page (the resume's background). Its own WebGL2 canvas, pinned to
   the window's right edge: one fragment shader draws the whole field, a half
   circle on that edge. Scrolling flashes patches of the lines pink and orange,
   brighter the faster you go, fading once you stop. Lines turn
   late in proportion to their distance from the cursor: each reads an older
   entry of the pointer's trail. Each line's shade, between the field's grey
   and black, comes from slow noise that drifts as the page scrolls and keeps
   slowly churning on its own (held still under reduced motion). */

/** frames of pointer history: the farthest lines lag this far behind */
const TRAIL = 40

const VERT = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;    // CSS px
uniform vec2 uTrail[${TRAIL}]; // CSS px from the canvas's top left, newest first
uniform float uDpr;
uniform vec3 uInk;
uniform float uFlash;  // 0 still … 1 scrolling fast
uniform float uScroll; // px
uniform float uTime;   // s
uniform vec3 uDark;    // the shade the noise darkens lines toward
out vec4 color;
const float CELL = 24.0;
// the cursor's reach (px): how quickly its pull fades with distance
const float SPREAD = 420.0;
const vec2 REST = vec2(0.7071, -0.7071);
// how far (px) a line must be from the cursor to lag the whole trail
const float REACH = 1000.0;
float hash(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 v) {
  vec2 i = floor(v), f = fract(v);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  p.y = uRes.y - p.y;
  // the circle's centre is on the canvas's right edge, 40% down; its radius is the canvas width
  float R = uRes.x;
  float edge = 1.0 - smoothstep(R - 1.0, R, length(p - vec2(uRes.x, uRes.y * 0.4)));
  vec2 c = (floor(p / CELL) + 0.5) * CELL;
  float lag = clamp(length(uTrail[0] - c) / REACH, 0.0, 1.0) * float(${TRAIL - 1});
  int i = int(floor(lag));
  vec2 m = mix(uTrail[i], uTrail[min(i + 1, ${TRAIL - 1})], fract(lag));
  vec2 to = m - c;
  float far = length(to);
  // a soft, wide influence: lines near the cursor point at it, and further out
  // they ease back toward a resting slant
  float pull = exp(-far * far / (2.0 * SPREAD * SPREAD));
  vec2 toward = far > 0.001 ? to / far : REST;
  vec2 bent = mix(REST, toward, pull);
  vec2 dir = length(bent) > 0.001 ? normalize(bent) : toward;
  vec2 q = p - c;
  float along = dot(q, dir);
  float across = dot(q, vec2(-dir.y, dir.x));
  // lines near the cursor stretch out a little
  float len = CELL * mix(0.18, 0.3, pull);
  float d = length(vec2(max(abs(along) - len, 0.0), across));
  float a = (1.0 - smoothstep(0.35, 1.1, d)) * edge;
  // one shade per line: noise sampled at the line's cell, scrolling up the field
  float n = noise(c / 220.0 + vec2(uTime * 0.05, uScroll / 300.0 + uTime * 0.03)) * 0.65
          + noise(c / 90.0 - vec2(uScroll / 500.0 + uTime * 0.07, uTime * 0.04)) * 0.35;
  vec3 ink = mix(uInk, uDark, smoothstep(0.45, 0.75, n));
  // the scroll flash: warm patches, pink to orange, in their own drifting noise
  float h = noise(c / 160.0 + vec2(uScroll / 260.0, uTime * 0.1));
  vec3 warm = mix(vec3(1.0, 0.36, 0.66), vec3(1.0, 0.55, 0.2), noise(c / 120.0 - vec2(0.0, uScroll / 400.0)));
  ink = mix(ink, warm, uFlash * smoothstep(0.35, 0.7, h));
  color = vec4(ink * a, a);
}`

/** Sized by CSS (.line-field); `ink` is the colour token the lines take. */
export default function LineField({ ink: inkToken = '--ink' }: { ink?: string }) {
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

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let size = 0
    const fit = () => {
      size = el.clientWidth
      el.width = size * dpr
      el.height = el.clientHeight * dpr
      gl.viewport(0, 0, el.width, el.height)
      gl.uniform2f(u('uRes'), size, el.clientHeight)
      gl.uniform1f(u('uDpr'), dpr)
    }
    fit()
    // the ink follows the theme
    const rgb = (token: string) => {
      const probe = document.createElement('i')
      probe.style.color = `var(${token})`
      el.parentElement!.appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      const m = c.match(/[\d.]+/g)!.map(Number)
      // rgb() comes back in 0–255; a color-mix() resolves to color(srgb …) in 0–1
      const k = c.startsWith('color(') ? 1 : 255
      return [m[0] / k, m[1] / k, m[2] / k] as const
    }
    const ink = () => {
      gl.uniform3f(u('uInk'), ...rgb(inkToken))
      gl.uniform3f(u('uDark'), ...rgb('--ink'))
    }
    ink()

    // until the pointer shows up, the lines lean toward the top left
    const target = { x: -size, y: -size * 0.5 }
    const at = { ...target }
    // the pointer's recent path, newest first (x, y pairs)
    const trail = new Float32Array(TRAIL * 2)
    for (let k = 0; k < TRAIL; k++) { trail[k * 2] = at.x; trail[k * 2 + 1] = at.y }
    const uTrail = u('uTrail')
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let flash = 0
    let lastY = scrollY
    let raf = 0
    const draw = () => {
      raf = 0
      gl.uniform1f(u('uTime'), still ? 0 : (performance.now() - t0) / 1000)
      at.x += (target.x - at.x) * 0.25
      at.y += (target.y - at.y) * 0.25
      trail.copyWithin(2, 0, (TRAIL - 1) * 2)
      trail[0] = at.x
      trail[1] = at.y
      gl.uniform2fv(uTrail, trail)
      // the flash follows scroll speed, and fades out once scrolling stops
      flash = Math.max(flash * 0.94, Math.min(1, Math.abs(scrollY - lastY) / 40))
      lastY = scrollY
      gl.uniform1f(u('uFlash'), still ? 0 : flash)
      gl.uniform1f(u('uScroll'), scrollY)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      // the ripple runs continuously; under reduced motion, only until the trail has caught up
      const tail = (TRAIL - 1) * 2
      if (!still || Math.abs(target.x - trail[tail]) + Math.abs(target.y - trail[tail + 1]) > 0.3) raf = requestAnimationFrame(draw)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw) }
    // the pointer in the viewport (the canvas is fixed, but scrolling redraws the split)
    const pointer = { x: -1e4, y: -1e4 }
    const aim = () => {
      if (pointer.x < -1e3) return
      const b = el.getBoundingClientRect()
      target.x = pointer.x - b.left
      target.y = pointer.y - b.top
      kick()
    }
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; aim() }
    const onScroll = () => { aim(); kick() }
    const ro = new ResizeObserver(() => { fit(); kick() })
    ro.observe(el)
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => { ink(); kick() }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    scheme.addEventListener('change', onScheme)
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      ro.disconnect()
      scheme.removeEventListener('change', onScheme)
    }
  }, [inkToken])

  return <canvas ref={canvas} className="line-field" aria-hidden />
}
