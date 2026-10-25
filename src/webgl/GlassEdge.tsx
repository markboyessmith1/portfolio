import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

/**
 * Renders `children` (a full scene with its own camera) into a texture, then
 * draws it as a glass card: a sharp, Apple-style continuous-corner silhouette whose inner rim
 * warps the content inward with a slight RGB split. No blur, no overlays.
 */

const vert = /* glsl */ `
  // The quad is the card in "card units" (-1..1). It can spin/tilt/bounce in
  // 3D (uYaw, uPitch, uScale) with a simple perspective divide. The View is
  // larger than the card by uBleed on each axis, so the motion has room.
  uniform float uYaw;
  uniform float uPitch;
  uniform float uScale;
  uniform float uBleed;   // view size / card size (e.g. 1.16)
  uniform float uAspect;  // card width / height
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 c = vec3(position.x * uAspect, position.y, 0.0) * uScale;
    float cp = cos(uPitch), sp = sin(uPitch);
    c = vec3(c.x, c.y * cp - c.z * sp, c.y * sp + c.z * cp);
    float cy = cos(uYaw), sy = sin(uYaw);
    c = vec3(c.x * cy + c.z * sy, c.y, -c.x * sy + c.z * cy);
    float D = 4.0;                  // camera distance, in card half-heights
    float w = (D - c.z) / D;
    gl_Position = vec4(c.x / uAspect / uBleed, c.y / uBleed, 0.0, w);
  }
`

// Soft drop shadow under tilt cards: a flat blurred rounded rect drawn on the
// page plane (it doesn't rotate with the card), nudged away from the pointer.
const shadowVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const shadowFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uRes;      // card size px
  uniform float uBleed;
  uniform float uRadius;
  uniform vec2 uTilt;
  uniform float uOpacity;
  uniform float uLift;    // 0 at rest, 1 hovered
  uniform float uK;       // strength multiplier (lighter under white cards)
  float shape(vec2 p) {
    vec2 b = uRes * 0.5;
    float r = min(uRadius * 1.6, min(b.x, b.y));
    vec2 q = max(abs(p) - b + r, 0.0);
    float corner = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
    vec2 e = abs(p) - b + r;
    return (corner > 0.0 ? corner : min(max(e.x, e.y), 0.0)) - r;
  }
  void main() {
    vec2 p = (vUv - 0.5) * uRes * uBleed;             // px from card centre, y up
    vec2 off = vec2(-uTilt.x * 8.0, -10.0 + uTilt.y * 6.0) * (0.6 + 0.4 * uLift); // away from the lifted side
    float blur = 22.0 + 8.0 * uLift;
    float d = shape((p - off) * 1.02);
    float a = 1.0 - smoothstep(-blur * 0.6, blur, d);
    // no resting shadow: it only appears with the hover tilt
    gl_FragColor = vec4(0.0, 0.0, 0.0, a * 0.16 * uLift * uK * uOpacity);
  }
`

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2  uRes;      // card size in CSS px
  uniform float uRadius;   // corner radius px
  uniform float uInset;    // gap between box and silhouette, room for the fringe
  uniform float uBand;     // width of the refractive rim, px
  uniform float uStrength; // max refraction offset, px
  uniform float uTime;
  uniform float uBlur;    // px, driven from the DOM (carousel neighbours)
  uniform sampler2D uBack; // back face artwork (seen mid-spin)
  uniform float uHasBack;
  uniform float uOpacity;  // mirrors CSS opacity of the card's DOM wrapper
  uniform vec2  uTilt;     // damped pointer tilt (-1..1), for lighting
  uniform float uAccent;  // 1 = this card shows the active-state gradient accent
  uniform vec3  uLime;    // accent gradient stops (linear)
  uniform vec3  uBlue;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // Apple-style continuous-corner rectangle: straight sides, and corners
  // traced by a superellipse (|x|^n + |y|^n = r^n) instead of a circle, so
  // curvature eases in from the straight edge with no visible join.
  // The corner region is enlarged so its tightest point matches uRadius.
  float shape(vec2 p) {
    vec2 b = uRes * 0.5 - uInset;
    float r = min(uRadius * 1.6, min(b.x, b.y));
    vec2 q = max(abs(p) - b + r, 0.0);
    float n = 4.0;
    float corner = pow(pow(q.x, n) + pow(q.y, n), 1.0 / n);
    vec2 e = abs(p) - b + r;
    return (corner > 0.0 ? corner : min(max(e.x, e.y), 0.0)) - r;
  }

  vec2 grad(vec2 p) {
    vec2 e = vec2(1.0, 0.0);
    return normalize(vec2(shape(p + e.xy) - shape(p - e.xy),
                          shape(p + e.yx) - shape(p - e.yx)) + 1e-5);
  }

  // Texture fetch with an optional disc blur (golden-angle spiral taps).
  vec3 tap(vec2 px) {
    vec2 toUv = 1.0 / uRes;
    vec2 lo = vec2(0.5) * toUv, hi = 1.0 - lo;
    if (uBlur < 0.05) return texture2D(uTex, clamp(px * toUv + 0.5, lo, hi)).rgb;
    vec3 acc = vec3(0.0);
    const int N = 16;
    for (int i = 0; i < N; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / float(N)) * uBlur;
      float a = fi * 2.39996323;
      acc += texture2D(uTex, clamp((px + vec2(cos(a), sin(a)) * r) * toUv + 0.5, lo, hi)).rgb;
    }
    return acc / float(N);
  }

  vec3 sampleSplit(vec2 px, vec2 dir, float amt) {
    if (amt < 0.01) return tap(px);
    float r = tap(px - dir * amt * 1.06).r;
    float g = tap(px - dir * amt).g;
    float b = tap(px - dir * amt * 0.94).b;
    return vec3(r, g, b);
  }

  void main() {
    // back face (mid-spin): un-mirror so it reads as the card's reverse
    vec2 uvv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec2 p = (uvv - 0.5) * uRes;          // px from centre, y up
    float d = shape(p);                    // <0 inside
    vec2 n = grad(p);                      // outward normal

    // Pure content warp: toward the rim, each pixel samples further inward,
    // so content near the edge stretches like it's seen through a thick glass
    // lip. Channels are displaced by different amounts for a slight RGB split.
    // Nothing is blurred or painted on top.
    float t = smoothstep(-uBand, 0.0, d);   // 0 interior -> 1 at the edge
    float amt = uStrength * t * t * t;
    vec3 col = sampleSplit(p, n, amt);
    // back face: its own artwork instead of the card's content
    if (!gl_FrontFacing && uHasBack > 0.5) col = texture2D(uBack, uvv).rgb;

    // Active-state accent: a colour-graded lime -> blue gradient rising from
    // the bottom of the card. Its top edge is a slow wavy alpha mask, and grain
    // fades in with the same mask so the colour dissolves into texture.
    float away0 = clamp(uBlur / 8.0, 0.0, 1.0);
    float on = uAccent * (1.0 - smoothstep(0.0, 0.6, away0));
    if (on > 0.001) {
      vec2 uv = uvv;
      float wave = 0.34
        + 0.06 * sin(uv.x * 5.0 + uTime * 0.7)
        + 0.03 * sin(uv.x * 11.0 - uTime * 1.1)
        + 0.015 * sin(uv.x * 23.0 + uTime * 1.7);
      float mask = smoothstep(wave + 0.18, wave - 0.10, uv.y);   // 1 at bottom
      // grade: lime on the left, blue on the right, drifting slowly
      float g = smoothstep(0.0, 1.0, uv.x + 0.25 * sin(uTime * 0.25) + (0.4 - uv.y) * 0.5);
      vec3 grade = mix(uLime, uBlue, g);
      float grain = hash(gl_FragCoord.xy + floor(uTime * 24.0));
      // grain lives where the mask feathers out: a dithered, textured edge
      float grained = clamp(mask + (grain - 0.5) * 0.6 * (1.0 - abs(mask * 2.0 - 1.0)), 0.0, 1.0);
      float a = grained * on * 0.9;
      // screen over dark content (luminous), multiply over light content (tint),
      // so the accent reads on both dark and white cards
      vec3 scr = 1.0 - (1.0 - col) * (1.0 - grade * a);
      vec3 mul = col * mix(vec3(1.0), grade, a);
      float base = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(scr, mul, smoothstep(0.35, 0.85, base));
      col += (grain - 0.5) * 0.06 * mask * on;                 // texture inside the glow
    }

    // tilt lighting: a soft sheen on the side tipped toward the light
    // (top-left), gentle shade on the side tipping away
    if (dot(uTilt, uTilt) > 1e-5) {
      vec2 q = vUv - 0.5;
      float k = -dot(q, vec2(-uTilt.x, uTilt.y));      // >0 on the side tipping away
      float amt2 = length(uTilt);
      col += vec3(1.0) * smoothstep(0.0, 0.7, -k) * 0.018 * amt2; // sheen opposite pointer
      col *= 1.0 - smoothstep(0.0, 0.7, k) * 0.06 * amt2;          // shade near pointer
      // moving specular streak
      float streak = exp(-pow((q.x + q.y * 0.6 + uTilt.x * 0.35) * 5.0, 2.0));
      col += vec3(1.0) * streak * 0.01 * amt2;
    }

    // crisp, pixel-wide anti-aliased edge
    float inside = 1.0 - smoothstep(-0.5, 0.5, d);

    gl_FragColor = vec4(col, inside * uOpacity);
    #include <colorspace_fragment>
  }
`

/** Card yaw animation state (radians). */
export type SpinState = { current: number | null; from: number; to: number; rest: number }

/** View size / card size: room around the card for bounce, spin and tilt. */
export const BLEED = 1.16

type Props = {
  children: ReactNode
  /** live blur radius in px, read every frame */
  blur?: { current: number }
  /** show the lime/blue gradient accent while this card is active */
  accent?: boolean
  /** spin state: set from/to and .current = performance.now() to animate */
  spin?: SpinState
  /** back-face artwork shown while the card spins */
  back?: { title: string; label?: string }
  /** live opacity (0..1) for the WebGL layer */
  opacity?: { current: number }
  /** pointer position over the card (-1..1), for a subtle hover tilt */
  tilt?: { x: number; y: number }
  /** written every frame: the card's full pose, so DOM overlays can match it */
  pose?: { yaw: number; pitch: number; scale: number; card: number }
  /** drop-shadow strength (1 = default) */
  shadowStrength?: number
  radius?: number
  inset?: number
  band?: number
  strength?: number
}

export function GlassEdge({ children, blur, spin, back, opacity, tilt, pose, shadowStrength = 1, accent = false, radius = 60, inset = 0, band = 80, strength = 28 }: Props) {
  const view = useThree((s) => s.size)
  // the View bleeds past the card (see .gl-view); the card itself is this size
  const size = { width: view.width / BLEED, height: view.height / BLEED }
  const dpr = useThree((s) => s.viewport.dpr)
  const fbo = useFBO(Math.max(1, Math.round(size.width * dpr)), Math.max(1, Math.round(size.height * dpr)), {
    samples: 4,
  })
  const [innerScene] = useMemo(() => [new THREE.Scene()], [])
  const innerCamera = useRef<THREE.Camera | null>(null)
  const quad = useRef<THREE.Mesh>(null)
  const tiltNow = useRef({ x: 0, y: 0 })

  const uniforms = useMemo(
    () => ({
      uTex: { value: fbo.texture },
      uRes: { value: new THREE.Vector2() },
      uRadius: { value: radius },
      uInset: { value: inset },
      uBand: { value: band },
      uStrength: { value: strength },
      uTime: { value: 0 },
      uBlur: { value: 0 },
      uBack: { value: null as THREE.Texture | null },
      uHasBack: { value: 0 },
      uOpacity: { value: 1 },
      uTilt: { value: new THREE.Vector2() },
      uYaw: { value: 0 },
      uPitch: { value: 0 },
      uScale: { value: 1 },
      uBleed: { value: BLEED },
      uAspect: { value: 1 },
      uAccent: { value: accent ? 1 : 0 },
      uLime: { value: new THREE.Color('#C6F432') },
      uBlue: { value: new THREE.Color('#2F6BFF') },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // Build the material ourselves so it shares THIS uniforms object: when R3F
  // builds it from JSX props it keeps its own copy, and per-frame updates
  // (spin, blur) never reach the GPU.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    [uniforms],
  )
  useEffect(() => () => material.dispose(), [material])
  const shadowUniforms = useMemo(
    () => ({
      uRes: uniforms.uRes,
      uBleed: uniforms.uBleed,
      uRadius: uniforms.uRadius,
      uTilt: uniforms.uTilt,
      uOpacity: uniforms.uOpacity,
      uLift: { value: 0 },
      uK: { value: shadowStrength },
    }),
    [uniforms],
  )
  const shadowMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: shadowVert, fragmentShader: shadowFrag, uniforms: shadowUniforms, transparent: true, depthTest: false, depthWrite: false }),
    [shadowUniforms],
  )
  useEffect(() => () => shadowMat.dispose(), [shadowMat])
  uniforms.uTex.value = fbo.texture

  // back-face artwork: brand gradient + grain + project name, drawn to a canvas
  const backTex = useMemo(() => {
    if (!back) return null
    const W = 900, H = 1200
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const draw = () => {
      const g = c.getContext('2d')!
      const lin = g.createLinearGradient(0, 0, W, H)
      lin.addColorStop(0, '#2F5BFF'); lin.addColorStop(0.5, '#8A4DFF'); lin.addColorStop(1, '#FF3E9D')
      g.fillStyle = lin; g.fillRect(0, 0, W, H)
      const img = g.getImageData(0, 0, W, H)
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 28
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n
      }
      g.putImageData(img, 0, 0)
      g.fillStyle = 'rgba(255,255,255,0.75)'
      g.font = '500 34px Satoshi, Inter, sans-serif'
      g.fillText(back.label ?? 'Case study', 72, 110)
      g.fillStyle = '#fff'
      g.font = '600 112px Satoshi, Inter, sans-serif'
      g.fillText(back.title, 72, H - 96, W - 144)
      tex.needsUpdate = true
    }
    draw()
    document.fonts?.ready.then(draw)
    return tex
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [back?.title, back?.label])
  uniforms.uBack.value = backTex
  uniforms.uHasBack.value = backTex ? 1 : 0

  // Priority 0 runs before drei's View render (priority >= 1), so the texture
  // is fresh when the card quad is drawn.
  useFrame((state, dt) => {
    const cam = innerCamera.current
    if (!cam) return
    if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pc = cam as THREE.PerspectiveCamera
      const aspect = size.width / size.height
      if (pc.aspect !== aspect) {
        pc.aspect = aspect
        pc.updateProjectionMatrix()
      }
    }
    uniforms.uRes.value.set(size.width, size.height)
    uniforms.uTime.value += dt
    uniforms.uBlur.value = blur?.current ?? 0
    uniforms.uOpacity.value = opacity?.current ?? 1
    uniforms.uAspect.value = size.width / size.height
    // smaller cards (stack/grid) get proportionally smaller corners
    uniforms.uRadius.value = Math.min(radius, Math.min(size.width, size.height) * 0.11)
    // bounce + spin with a little tilt (~1.1s), from spin.from to spin.to;
    // at rest the card holds spin.rest (π = showing its back face)
    uniforms.uYaw.value = 0; uniforms.uPitch.value = 0; uniforms.uScale.value = 1
    if (spin) {
      const t0 = spin.current
      const t = t0 == null ? 1 : (performance.now() - t0) / 1100
      if (t >= 1 || t < 0) {
        if (t0 != null && t >= 1) { spin.rest = spin.to; spin.current = null }
        uniforms.uYaw.value = spin.rest; uniforms.uPitch.value = 0; uniforms.uScale.value = 1
      } else {
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        uniforms.uYaw.value = spin.from + (spin.to - spin.from) * ease
        uniforms.uPitch.value = 0.22 * Math.sin(Math.PI * t)
        const sec = t * 1.1
        uniforms.uScale.value = 1 + 0.07 * Math.exp(-3.5 * sec) * Math.sin(10 * sec) - 0.06 * Math.sin(Math.PI * t)
      }
    }
    // subtle hover tilt, damped, layered on top of any spin
    const tx = tilt ? tilt.x : 0, ty = tilt ? tilt.y : 0
    tiltNow.current.x = THREE.MathUtils.damp(tiltNow.current.x, tx, 6, dt)
    tiltNow.current.y = THREE.MathUtils.damp(tiltNow.current.y, ty, 6, dt)
    uniforms.uTilt.value.set(tiltNow.current.x, tiltNow.current.y)
    shadowUniforms.uK.value = shadowStrength
    shadowUniforms.uLift.value = THREE.MathUtils.damp(shadowUniforms.uLift.value, tilt && (tilt.x || tilt.y) ? 1 : 0, 6, dt)
    // the side under the cursor lifts toward the viewer (pulled, not pressed)
    uniforms.uYaw.value -= tiltNow.current.x * 0.08
    uniforms.uPitch.value -= -tiltNow.current.y * 0.06
    if (pose) {
      pose.yaw = uniforms.uYaw.value
      pose.pitch = uniforms.uPitch.value
      pose.scale = uniforms.uScale.value
      pose.card = size.height
    }
    const gl = state.gl
    const prevScissor = gl.getScissorTest()
    gl.setScissorTest(false)
    gl.setRenderTarget(fbo)
    gl.clear()
    gl.render(innerScene, cam)
    gl.setRenderTarget(null)
    gl.setScissorTest(prevScissor)
  })

  return (
    <>
      {createPortal(
        <>
          <CameraGrab target={innerCamera} />
          {children}
        </>,
        innerScene,
      )}
      {tilt && (
        <mesh frustumCulled={false} renderOrder={0} material={shadowMat}>
          <planeGeometry args={[2, 2]} />
        </mesh>
      )}
      <mesh ref={quad} frustumCulled={false} renderOrder={1} material={material}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </>
  )
}

/** Captures whichever camera the portalled scene made default. */
function CameraGrab({ target }: { target: React.MutableRefObject<THREE.Camera | null> }) {
  const camera = useThree((s) => s.camera)
  target.current = camera
  return null
}
