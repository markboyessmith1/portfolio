import { useFrame, useThree } from '@react-three/fiber'
import { Float, MeshDistortMaterial, OrthographicCamera, PerspectiveCamera, useTexture, useVideoTexture } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useCardToken, useToken } from '../theme'
import { board } from '../board'

/* ------------------------------------------------------------------ */
/* Backdrop: a soft, slowly drifting gradient field behind the page    */
/* ------------------------------------------------------------------ */

const backdropVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const backdropFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform vec3 uPaper;
  uniform vec3 uEdge;
  uniform vec3 uInk;
  uniform float uDpr;
  uniform vec2 uRes;
  uniform vec4 uPts[4];
  uniform float uDots;

  // cheap value noise
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = vUv;
    p.x *= uAspect;
    float t = uTime * 0.05;

    // domain warp
    vec2 q = vec2(fbm(p + t), fbm(p - t * 0.7));
    float n = fbm(p * 1.4 + 1.6 * q + uMouse * 0.15);

    vec3 paper = uPaper; // --bg
    float d = distance(vUv, uMouse * 0.5 + 0.5);
    float glow = smoothstep(0.7, 0.0, d) * 0.06;
    // flat page colour (no gradient), so the slot corner masks (painted in --bg) blend in exactly
    vec3 col = paper;

    // Home board dot grid (24 CSS px pitch), from the c26 prototype: each
    // cursor in uPts (xy = uv, z = strength) swells the dots around it along
    // drifting contour lines, nudges them aside and darkens them toward ink.
    if (uDots > 0.001) {
      vec2 px = gl_FragCoord.xy / uDpr;
      vec2 res = uRes;
      vec2 cell = (floor(px / 24.0) + 0.5) * 24.0;
      float F = 0.0;
      vec2 push = vec2(0.0);
      for (int i = 0; i < 4; i++) {
        vec4 pt = uPts[i];
        if (pt.z <= 0.001) continue;
        vec2 dd = cell - pt.xy * res;
        float f = exp(-dot(dd, dd) / (190.0 * 190.0)) * pt.z;
        F += f;
        push += normalize(dd + 1e-4) * f;
      }
      F = clamp(F, 0.0, 1.0);
      float h = fbm(cell * 0.0055 + vec2(uTime * 0.02, -uTime * 0.015));
      float lv = fract(h * 9.0);
      float band = 1.0 - smoothstep(0.0, 0.16, min(lv, 1.0 - lv));
      vec2 swirl = vec2(fbm(cell * 0.01 + uTime * 0.1), fbm(cell * 0.01 - uTime * 0.1 + 7.0)) - 0.5;
      vec2 center = cell + push * 5.0 + swirl * 8.0 * F;
      float r = 1.2 + F * (0.2 + 1.2 * band);
      float dotMask = 1.0 - smoothstep(r - 0.6, r + 0.6, length(px - center));
      float ink = 0.15 + F * (0.3 + 0.7 * band) * 0.85;
      col = mix(col, uInk, dotMask * ink * uDots);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`

export function Backdrop() {
  const mat = useRef<THREE.ShaderMaterial>(null!)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uAspect: { value: 1 },
      uPaper: { value: new THREE.Color() },
      uEdge: { value: new THREE.Color() },
      uInk: { value: new THREE.Color() },
      uDpr: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPts: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
      uDots: { value: 0 },
    }),
    [],
  )
  const bg = useToken('--bg')
  const bgEdge = useToken('--bg-edge')
  // raw shader output skips colour management, so feed sRGB values directly
  uniforms.uPaper.value.setStyle(bg, THREE.SRGBColorSpace).convertLinearToSRGB()
  uniforms.uEdge.value.setStyle(bgEdge, THREE.SRGBColorSpace).convertLinearToSRGB()
  const ink = useToken('--ink')
  uniforms.uInk.value.setStyle(ink, THREE.SRGBColorSpace).convertLinearToSRGB()
  useFrame((state, dt) => {
    uniforms.uTime.value += dt
    uniforms.uMouse.value.lerp(state.pointer, 0.04)
    uniforms.uAspect.value = state.size.width / state.size.height
    uniforms.uDpr.value = state.viewport.dpr
    uniforms.uRes.value.set(state.size.width, state.size.height)
    // the home board's cursors stir the dots; fade them in/out with the board
    uniforms.uDots.value = THREE.MathUtils.damp(uniforms.uDots.value, board.active ? 1 : 0, 4, dt)
    uniforms.uPts.value.forEach((v, i) => v.fromArray(board.points, i * 4))
  })
  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 1]} />
      <mesh>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial ref={mat} vertexShader={backdropVert} fragmentShader={backdropFrag} uniforms={uniforms} depthWrite={false} />
      </mesh>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Shared studio lighting                                               */
/* ------------------------------------------------------------------ */

function Studio() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-6, -2, -4]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, -4, 3]} intensity={4} color={useToken('--neutral-50')} distance={12} />
    </>
  )
}

/**
 * Perspective camera that pulls back on narrow (portrait) frames so objects
 * framed for a square view keep fitting horizontally.
 */
function FitCamera({ z, fov }: { z: number; fov: number }) {
  const aspect = useThree((s) => s.size.width / s.size.height)
  const dist = z * Math.max(1, 1 / aspect) * 0.9
  return <PerspectiveCamera makeDefault position={[0, 0, dist]} fov={fov} />
}

/** Gently tilts the group toward the pointer. */
function useParallax(ref: React.RefObject<THREE.Group | null>, amount = 0.25) {
  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const tx = state.pointer.y * -amount
    const ty = state.pointer.x * amount
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tx, 4, dt)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty, 4, dt)
  })
}

/* ------------------------------------------------------------------ */
/* Hero: a slow, glossy torus                                            */
/* ------------------------------------------------------------------ */

export function HeroScene() {
  const surface = useCardToken('--surface')
  const ink = useCardToken('--ink')
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  useParallax(group, 0.35)
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.z += dt * 0.15
  })
  return (
    <>
      <color attach="background" args={[surface]} />
      <FitCamera z={6.5} fov={40} />
      <Studio />
      <group ref={group}>
        <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
          <mesh ref={mesh} rotation={[1.1, 0.3, 0]}>
            <torusGeometry args={[1.5, 0.55, 64, 160]} />
            <meshStandardMaterial color={ink} roughness={0.3} metalness={0.15} />
          </mesh>
        </Float>
      </group>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Hero, second card: dark, soft liquid sphere                          */
/* ------------------------------------------------------------------ */

export function HeroAltScene() {
  const inverse = useCardToken('--surface')
  const onInverse = useCardToken('--ink')
  const group = useRef<THREE.Group>(null)
  useParallax(group, 0.35)
  return (
    <>
      <color attach="background" args={[inverse]} />
      <FitCamera z={7} fov={40} />
      <Studio />
      <group ref={group}>
        <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.5}>
          <mesh>
            <icosahedronGeometry args={[1.6, 48]} />
            <MeshDistortMaterial color={onInverse} roughness={0.2} metalness={0.05} distort={0.35} speed={1.4} />
          </mesh>
        </Float>
      </group>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Card scenes                                                          */
/* ------------------------------------------------------------------ */

export function KnotScene() {
  const inverse = useCardToken('--surface-inverse')
  const onInverse = useCardToken('--on-inverse')
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  useParallax(group)
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * 0.2
  })
  return (
    <>
      <color attach="background" args={[inverse]} />
      <FitCamera z={10} fov={35} />
      <Studio />
      <group ref={group}>
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
          <mesh ref={mesh}>
            <torusKnotGeometry args={[1.3, 0.4, 220, 32, 2, 3]} />
            <meshStandardMaterial color={onInverse} roughness={0.3} metalness={0} />
          </mesh>
        </Float>
      </group>
    </>
  )
}

export function BlobScene() {
  const surface = useCardToken('--surface')
  const ink = useCardToken('--ink')
  const group = useRef<THREE.Group>(null)
  useParallax(group)
  return (
    <>
      <color attach="background" args={[surface]} />
      <FitCamera z={9} fov={35} />
      <Studio />
      <group ref={group}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh>
            <icosahedronGeometry args={[1.7, 48]} />
            <MeshDistortMaterial color={ink} roughness={0.15} metalness={0.05} distort={0.45} speed={1.6} />
          </mesh>
        </Float>
      </group>
    </>
  )
}

export function StackScene() {
  const surface = useCardToken('--surface')
  const ink = useCardToken('--ink')
  const bg = useCardToken('--bg')
  const group = useRef<THREE.Group>(null)
  useParallax(group, 0.4)
  const items = useMemo(() => Array.from({ length: 5 }, (_, i) => i), [])
  useFrame((state) => {
    const g = group.current
    if (!g) return
    g.children.forEach((c, i) => {
      c.position.y = (i - 2) * 0.9 + Math.sin(state.clock.elapsedTime * 1.2 + i * 0.6) * 0.12
      c.rotation.z = Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.08
    })
  })
  return (
    <>
      <color attach="background" args={[surface]} />
      <FitCamera z={11} fov={35} />
      <Studio />
      <group ref={group}>
        {items.map((i) => (
          <mesh key={i} position={[0, (i - 2) * 0.9, 0]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[3.2, 0.45, 2.2]} />
            <meshStandardMaterial color={i % 2 ? ink : bg} roughness={0.35} />
          </mesh>
        ))}
      </group>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Hero card: grayscale portrait blended into the panel colour          */
/* ------------------------------------------------------------------ */

const portraitVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

const portraitFrag = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform vec3 uSurface;    // panel colour (--surface): the white surround melts into it
  uniform float uCardH;     // card height in render-target pixels
  uniform vec3 uTone;  // warm toner: the page colour (#F2F0ED)
  void main() {
    // multiply blend onto the tile colour: the photo's white becomes the
    // tile tint exactly (no halo), darks and colour stay intact
    vec3 col = texture2D(uMap, vUv).rgb * uSurface;
    // 1% white-noise grain for texture (per device pixel, static)
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.02;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function PortraitScene({ src = '/media/portrait.jpg' }: { src?: string }) {
  const texture = useTexture(src)
  texture.colorSpace = THREE.SRGBColorSpace
  const gl = useThree((s) => s.gl)
  // crisp downsampling: trilinear mipmaps + max anisotropy
  texture.anisotropy = gl.capabilities.getMaxAnisotropy()
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const surface = useCardToken('--portrait-tint')
  const img = texture.image as HTMLImageElement
  const ia = img?.width && img?.height ? img.width / img.height : 1
  const ca = size.width / size.height
  // cover: fill the card, crop the overflow, keep the face centred
  const w = ca < ia ? size.height * ia : size.width
  const h = ca < ia ? size.height : size.width / ia
  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uSurface: { value: new THREE.Color() },
      uTone: { value: new THREE.Color() },
      uCardH: { value: 1 },
    }),
    [texture],
  )
  uniforms.uSurface.value.set(surface)
  // gl_FragCoord is in render-target pixels (the card's FBO)
  uniforms.uCardH.value = size.height * dpr
  // load-in zoom: starts 8% larger and eases down to rest
  const photo = useRef<THREE.Mesh>(null)
  const zoomT = useRef(0)
  useFrame((_, dt) => {
    if (!photo.current || zoomT.current >= 1) return
    zoomT.current = Math.min(1, zoomT.current + dt / 1.8)
    const e = 1 - Math.pow(1 - zoomT.current, 3)
    const k = 1.08 - 0.08 * e
    photo.current.scale.set(w * k, h * k, 1)
  })
  return (
    <>
      <color attach="background" args={[surface]} />
      <OrthographicCamera makeDefault position={[0, 0, 10]} />
      <mesh ref={photo} scale={[w * 1.08, h * 1.08, 1]}>
        <planeGeometry />
        <shaderMaterial vertexShader={portraitVert} fragmentShader={portraitFrag} uniforms={uniforms} />
      </mesh>
    </>
  )
}

/** Plain surface-coloured card, for text cards. */
export function PaperScene() {
  const surface = useCardToken('--surface')
  return (
    <>
      <color attach="background" args={[surface]} />
      <FitCamera z={6} fov={40} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Video card: looping muted video, cropped to fill the card (cover)    */
/* ------------------------------------------------------------------ */

export function VideoScene({ src = '/media/hx.mp4' }: { src?: string }) {
  const texture = useVideoTexture(src, { loop: true, muted: true, start: true, playsInline: true, crossOrigin: 'anonymous' })
  const size = useThree((s) => s.size)
  const video = texture.image as HTMLVideoElement
  const va = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
  const ca = size.width / size.height
  // cover: fill the card, crop the overflow
  const w = ca < va ? size.height * va : size.width
  const h = ca < va ? size.height : size.width / va
  return (
    <>
      <color attach="background" args={['#000000']} />
      <OrthographicCamera makeDefault position={[0, 0, 10]} />
      <mesh scale={[w, h, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </>
  )
}

// the Miro AI card's cover
const MiroAiScene = () => <VideoScene src="/media/quick17.mp4" />

export const scenes = { knot: KnotScene, blob: BlobScene, stack: StackScene, video: VideoScene, miroAi: MiroAiScene, blank: PaperScene } as const
