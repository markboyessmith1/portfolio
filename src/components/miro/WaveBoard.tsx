import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'

/* The cover's board drawn in WebGL, so it can move as a fluid surface: frames
   and stickies are finely divided sheets whose vertices rise and fall with the
   wave, lit softly. The rest of the scene stays DOM (cursors, toolbar), so the
   WebGL camera rebuilds the scene's CSS camera exactly: the same perspective,
   lens rotations, zoom and canvas camera, composed as the CSS transforms are.
   Board coordinates are the DOM world's (x right, y down, z toward the viewer). */

export type BoardCam = {
  W: number; H: number // screen, css px
  P: number // CSS perspective
  bx: number; by: number; pitch: number; yaw: number; roll: number // the lens
  z: number; fx: number; fy: number // zoom layer: zoom, focus
  k: number; cx: number // canvas camera
  far: boolean // semantic zoom: frames read as blocks
}
/** A snapshot of a DOM element laid on the board as a sheet that ripples (board units). */
export type Skin = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number; z: number; r: number; at: number; len: number }
/** A DOM card the board draws in its own material (the toolbar's): board units, z = its top. */
export type Panel = { x: number; y: number; w: number; h: number; r: number; z: number }
export type BoardHandle = { render(c: BoardCam): void; skin(s: Skin | null): void; panels(p: Panel[]): void }

export type BoardPiece = { x: number; y: number; w: number; h: number; shape: 'note' | 'bar' | 'dot'; r: number }
export type BoardFrame = { x: number; y: number; w: number; h: number; hue: string; pieces: BoardPiece[] }
type Props = {
  /** live-tunable settings, read every frame (defaults: TUNE) */
  tune?: Tune
  frames: BoardFrame[]
  head: { x: number; y: number; w: number; h: number }
  /** when each frame landed / each piece dropped / the title appeared (seconds, performance clock) */
  landed: (number | null)[]
  placedAt: Record<string, number>
  headAt: number | null
}

/** Everything about the surface and its shadows that's worth tuning (see the jig, /cover/jig). */
export const TUNE = {
  amp: 31.5, // wave height, board px
  speed: 150, // how fast the wave sweeps across, px/s
  width: 70, // how wide the band of waves is, px
  wavelength: 105, // crest to crest, px
  decay: 0.75, // how quickly it dies away, 1/s
  diffuse: 0.18, // shading on the slopes
  specular: 0.15, // glint on the crests
  shadowReach: 0, // how far shadows fall from their caster, per unit of height
  noteShadow: 0.13, // a sticky's contact shadow at rest
  noteSoft: 0, // its softness at rest, px
  noteBloom: 0, // extra softness per px of height (penumbra)
  dropHeight: 52, // how high stickies drop from, px
  frameShadow: 0.06, // the frame's ambient shadow
  frameSoft: 60, // its softness, px
  frameContact: 0.28, // the shadow where the frame meets the board
  lift: 24, // how far frames stand off the canvas, px
  thickness: 3.5, // a frame's slab depth, px
  noteThickness: 1.75, // a sticky's, px
  bevel: 0.46, // the bright rim along a slab's top edge
  sideShade: 0.76, // how much darker a slab's side wall is
  lightAz: 57, // where the key light comes from, degrees round the board (230: top left)
  lightEl: 11, // how high it is, degrees
  shine: 41, // how tight the glint is (higher: glossier)
  dotSize: 0.95, // canvas dot radius, px
  dotGap: 28, // canvas dot spacing, px
  dotInk: 0.16, // how dark the dots are
  roll: 3, // how far a card's edge rolls over into its wall, px
  ambient: 0.8, // sky + bounce fill, against the key
  paperGrain: 0.01, // paper: speckled tone in the surface
  paperFibre: 0.005, // paper: long soft fibres
  paperTooth: 0.55, // paper: how much the grain catches the light (bump)
  paperScale: 0.2, // paper: size of the grain
  focusBlur: 4.75, // depth of field: blur at the edges of frame, px
  focusSize: 58, // depth of field: the sharp area, % of the screen
  focusFeather: 22, // depth of field: how gradually it goes soft, %
  perspective: 1000, // camera distance, px: lower is a wider lens with stronger perspective
  bounce: 0.42, // warmth of the light bounced up off the board
  occlusion: 0.25, // darkening where walls meet the board
  falloff: 0.04, // how much the key fades across the scene
}
export type Tune = typeof TUNE

const WAVE = /* glsl */ `
  uniform vec2 uC;     // where the wave starts: it sweeps left to right from uC.x (board px)
  uniform float uAge;  // seconds since it started (< 0: still)
  uniform float uAmp, uSpeed, uWidth, uFreq, uDecay;
  uniform float uAmpK;  // this surface's share of the wave (a skin eases it out before handing back)
  float H(vec2 p) {
    if (uAge < 0.0) return 0.0;
    float x = (p.x - uC.x) - uAge * uSpeed;   // distance behind the front
    float env = exp(-x * x / (2.0 * uWidth * uWidth)) * exp(-uAge * uDecay);
    return uAmp * uAmpK * env * cos(x * uFreq);
  }`
const VERT = /* glsl */ `
  ${WAVE}
  varying vec2 vUv;
  varying vec3 vN;
  varying float vH;
  varying float vX;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vX = wp.x;
    float h = H(wp.xy), e = 2.0;
    vN = normalize(vec3(-(H(wp.xy + vec2(e, 0.0)) - h) / e, -(H(wp.xy + vec2(0.0, e)) - h) / e, 1.0));
    wp.z += h;
    vH = h;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`
const SD = /* glsl */ `
  float sdRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }`
// a lit rounded rectangle on the surface
const SHEET = /* glsl */ `
  ${SD}
  uniform vec2 uSize;
  uniform float uR, uOpacity, uOutline, uRing, uDiff, uSpec, uBevel, uShine;
  uniform vec3 uLight;
  uniform vec3 uColor;
  uniform float uFront; // the frame exists behind this x (it enters on the wave)
  varying vec2 vUv;
  varying vec3 vN;
  varying float vH;
  varying float vX;
  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float sd = sdRR(p, uSize * 0.5, uR), aa = fwidth(sd) + 1e-4;
    float a = clamp(0.5 - sd / aa, 0.0, 1.0);
    if (a <= 0.0) discard;
    // a soft key from the top left (y runs down); kept subtle
    vec3 L = uLight, n = normalize(vN);
    float diff = dot(n, L) - L.z;
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), uShine) * smoothstep(0.3, 3.0, abs(vH));
    vec3 col = uColor * (1.0 + diff * uDiff) + spec * uSpec;
    col = mix(col, col * 0.88, uOutline * clamp(1.0 + sd / 1.5, 0.0, 1.0));   // hairline edge
    col = mix(col, vec3(1.0), uBevel * clamp(1.0 + sd / 1.4, 0.0, 1.0));      // the slab's lit rim
    col = mix(col, vec3(1.0), uRing * smoothstep(-2.0 - aa, -2.0 + aa, sd));  // white ring (vote dots)
    gl_FragColor = vec4(col, a * uOpacity * (1.0 - smoothstep(uFront - 18.0, uFront + 18.0, vX)));
  }`
// a soft shadow under something
const SHADOW = /* glsl */ `
  ${SD}
  uniform vec2 uSize, uInner;
  uniform float uR, uBlur, uAlpha, uFront;
  varying vec2 vUv;
  varying float vX;
  void main() {
    float sd = sdRR((vUv - 0.5) * uSize, uInner * 0.5, uR);
    float shown = 1.0 - smoothstep(uFront - 18.0, uFront + 18.0, vX);
    gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha * shown * (1.0 - smoothstep(-uBlur, max(uBlur, 0.5), sd)));
  }`
// a solid card: its top face (a fine grid, corners rounded by distance) and its
// side wall (a ribbon round the outline), both bent by the wave, lit by real normals
const SLAB_VERT = /* glsl */ `
  ${WAVE}
  varying vec2 vUv;
  varying vec3 vN;
  varying float vH;
  varying float vX;
  varying vec2 vW;     // board position (for the light's falloff)
  varying float vZ;    // down the wall: 0 at the top, 1 at the bottom
  varying vec2 vOut;   // a wall's outward direction
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vX = wp.x;
    vW = wp.xy;
    vZ = -position.z;
    float h = H(wp.xy), e = 2.0;
    vec2 g = vec2(H(wp.xy + vec2(e, 0.0)) - h, H(wp.xy + vec2(0.0, e)) - h) / e;
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vOut = n.xy;
    // tilt with the surface: tops take the slope, walls lean with it
    vN = normalize(vec3(n.xy - g * n.z, n.z + dot(n.xy, g)));
    wp.z += h;
    vH = h;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`
const SLAB_FRAG = /* glsl */ `
  ${SD}
  uniform vec2 uSize;
  uniform float uR, uClip, uOpacity, uDiff, uSpec, uShine, uBevel, uRing, uFront;
  uniform float uRoll, uAmbient, uBounce, uOcc, uFalloff, uDepth;
  uniform float uGrain, uFibre, uTooth, uPaper;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  /** paper: fine tooth plus long soft fibres, in surface px */
  float paper(vec2 p) {
    p /= max(uPaper, 0.05);
    float tooth = vnoise(p * 1.7) * 0.6 + vnoise(p * 4.1) * 0.4;
    float fibre = vnoise(vec2(p.x * 0.08 + p.y * 0.02, p.y * 0.9)) * 0.5 + vnoise(vec2(p.x * 0.9, p.y * 0.07 - p.x * 0.03)) * 0.5;
    return (tooth - 0.5) * uGrain * 2.0 + (fibre - 0.5) * uFibre * 2.0;
  }
  uniform vec3 uColor, uLight;
  varying vec2 vUv;
  varying vec3 vN;
  varying float vH;
  varying float vX;
  varying vec2 vW;
  varying float vZ;
  varying vec2 vOut;
  void main() {
    if (vX > uFront) discard;          // it enters on the wave
    float sd = -1.0, a = 1.0;
    if (uClip > 0.5) {                 // the top face: round its corners, antialiased
      sd = sdRR((vUv - 0.5) * uSize, uSize * 0.5, uR);
      a = clamp(0.5 - sd / (fwidth(sd) + 1e-4), 0.0, 1.0);
      if (a <= 0.0) discard;
    }
    vec3 L = uLight, n = normalize(vN);
    // paper: the surface's own coordinates, so the grain rides with the card
    vec2 sp = uClip > 0.5 ? (vUv - 0.5) * uSize : vW + vec2(vZ * 37.0);
    float pt = paper(sp);
    vec2 bump = vec2(paper(sp + vec2(0.7, 0.0)) - pt, paper(sp + vec2(0.0, 0.7)) - pt);
    n = normalize(n - vec3(bump * uTooth * 40.0, 0.0));
    if (uClip > 0.5) {
      // the edge rolls over: within uRoll of the outline the top curves down into the wall
      vec2 p = (vUv - 0.5) * uSize;
      vec2 out2 = normalize(vec2(sdRR(p + vec2(0.5, 0.0), uSize * 0.5, uR) - sdRR(p - vec2(0.5, 0.0), uSize * 0.5, uR),
                                 sdRR(p + vec2(0.0, 0.5), uSize * 0.5, uR) - sdRR(p - vec2(0.0, 0.5), uSize * 0.5, uR)) + 1e-5);
      float roll = min(uRoll, uDepth * 1.2);   // thin cards roll over tighter
      float t = clamp(1.0 + sd / max(roll, 0.01), 0.0, 1.0);
      float ang = t * 1.2;   // up to ~70° over the lip
      n = normalize(n * cos(ang) + vec3(out2, 0.0) * sin(ang));
    } else {
      // the wall's top continues the roll; its foot sits in the board's shadow
      float t = clamp(1.0 - vZ * uDepth / max(min(uRoll, uDepth * 1.2), 0.01), 0.0, 1.0);
      n = normalize(mix(n, normalize(n + vec3(0.0, 0.0, 1.2)), t * 0.6));
    }
    // light: a key (Lambert) over a hemisphere fill, a cool sky above and a warm
    // bounce off the board below; normalised so a level top keeps its own colour
    float key = max(dot(n, L), 0.0);
    vec3 sky = vec3(1.0, 1.0, 1.01), ground = mix(vec3(0.92), vec3(1.0, 0.94, 0.86), uBounce);
    vec3 fill = mix(ground, sky, n.z * 0.5 + 0.5);
    vec3 lit = (fill * uAmbient + key * (1.0 - uAmbient)) / (uAmbient + (1.0 - uAmbient) * L.z);
    lit = mix(vec3(1.0), lit, clamp(uDiff * 1.8, 0.0, 1.0));
    float occ = uClip > 0.5 ? 1.0 : 1.0 - uOcc * smoothstep(0.2, 1.0, vZ);
    float fade = 1.0 - uFalloff * smoothstep(0.0, 1400.0, length(vW - L.xy * 1200.0));
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), uShine);
    vec3 col = uColor * (1.0 + pt) * lit * occ * fade + spec * uSpec * fade;
    col = mix(col, vec3(1.0), uClip * uBevel * clamp(1.0 + sd / 1.4, 0.0, 1.0));   // lit rim
    col = mix(col, vec3(1.0), uClip * uRing * smoothstep(-2.5, -1.5, sd));           // vote-dot ring
    gl_FragColor = vec4(col, uOpacity * a);
  }`

// a DOM snapshot on the surface, lit like the rest
const SKIN = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uDiff, uSpec, uOpacity, uShine;
  uniform vec3 uLight;
  varying vec2 vUv;
  varying vec3 vN;
  varying float vH;
  void main() {
    vec4 c = texture2D(uTex, vUv);
    vec3 L = uLight, n = normalize(vN);
    float diff = dot(n, L) - L.z;
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), uShine) * smoothstep(0.3, 3.0, abs(vH));
    gl_FragColor = vec4(c.rgb * (1.0 + diff * uDiff) + spec * uSpec * c.a, c.a * uOpacity);
  }`
const DOTS = /* glsl */ `
  uniform vec3 uDot;
  uniform float uDotR, uDotGap, uFalloff, uGrain, uPaper;
  uniform vec3 uBg, uLightD;
  varying vec2 vP;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    // the canvas is lit by the same key: a pool where it falls, fading away from it
    float lit = 1.0 - uFalloff * smoothstep(0.0, 1400.0, length(vP - uLightD.xy * 1200.0));
    vec2 q = vP / max(uPaper, 0.05);
    float grain = (vnoise(q * 1.7) * 0.6 + vnoise(q * 4.1) * 0.4 - 0.5) * uGrain * 2.0;
    vec3 base = uBg * lit * (1.0 + grain);
    vec2 g = mod(vP + 4.0 + uDotGap * 0.5, uDotGap) - uDotGap * 0.5;   // dot centres at gap·n - 4
    float d = length(g), aa = fwidth(d) * 0.8 + 1e-4;
    gl_FragColor = vec4(mix(base, uDot, 1.0 - smoothstep(uDotR - aa, uDotR + aa, d)), 1.0);
  }`
const DOTS_VERT = /* glsl */ `
  varying vec2 vP;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xy; gl_Position = projectionMatrix * viewMatrix * wp; }`

/** A damped spring's offset `t` s after being let go `from` its rest. */
function settle(t: number, from: number, zeta: number, w: number) {
  if (t <= 0) return from
  const wd = w * Math.sqrt(1 - zeta * zeta)
  return from * Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

const WaveBoard = forwardRef<BoardHandle, Props>(function WaveBoard({ tune = TUNE, frames, head, landed, placedAt, headAt }, ref) {
  const host = useRef<HTMLCanvasElement>(null)
  const state = useRef({ landed, placedAt, headAt, tune })
  state.current = { landed, placedAt, headAt, tune }
  const api = useRef<BoardHandle>({ render() {}, skin() {}, panels() {} })
  useImperativeHandle(ref, () => ({ render: (c) => api.current.render(c), skin: (k) => api.current.skin(k), panels: (p) => api.current.panels(p) }), [])

  useEffect(() => {
    const canvas = host.current!
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace // colours are written as they should display
    renderer.setClearColor(0x000000, 0)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 100000)
    // the view matrix is set by hand each frame (it carries the zoom and the CSS
    // y-flip): stop the renderer recomputing it, as three strips scale from views
    camera.matrixAutoUpdate = false
    camera.matrixWorldAutoUpdate = false

    const css = getComputedStyle(canvas.closest('.cover')!)
    const colour = (v: string) => {
      const probe = document.createElement('i')
      probe.style.color = v
      canvas.parentElement!.append(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      const [r, g, b] = (c.match(/[\d.]+/g) ?? ['255', '255', '255']).map(Number)
      return new THREE.Color(r / 255, g / 255, b / 255)
    }
    const bg = colour(css.backgroundColor)
    const INK = colour('#1a1b1e'), WHITE = new THREE.Color(1, 1, 1), GREY = colour('#d9d9d9')

    // uniforms every surface shares: set once a frame from the tune
    const shared = { uAmp: { value: 0 }, uSpeed: { value: 0 }, uWidth: { value: 0 }, uFreq: { value: 0 }, uDecay: { value: 0 }, uDiff: { value: 0 }, uSpec: { value: 0 }, uShine: { value: 40 }, uLight: { value: new THREE.Vector3(0, 0, 1) }, uRoll: { value: 8 }, uAmbient: { value: 0.6 }, uBounce: { value: 0.5 }, uOcc: { value: 0.3 }, uFalloff: { value: 0.1 }, uGrain: { value: 0 }, uFibre: { value: 0 }, uTooth: { value: 0 }, uPaper: { value: 1 } }
    const geos: THREE.BufferGeometry[] = []
    const mats: THREE.Material[] = []
    const plane = (w: number, h: number, sx = 1, sy = 1) => { const g = new THREE.PlaneGeometry(w, h, sx, sy); geos.push(g); return g }
    const sheetMat = (w: number, h: number, r: number, color: THREE.Color, outline = 0, ring = 0) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: SHEET, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { ...shared, uC: { value: new THREE.Vector2() }, uAge: { value: -1 }, uFront: { value: 1e9 }, uAmpK: { value: 1 }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: r }, uOpacity: { value: 0 }, uOutline: { value: outline }, uRing: { value: ring }, uBevel: { value: 0 }, uColor: { value: color.clone() } },
      })
      mats.push(m)
      return m
    }
    /** A shadow quad `pad` larger than its caster each side; softness and strength are set per frame. */
    const shadowMat = (w: number, h: number, r: number, pad: number) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: SHADOW, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { ...shared, uC: { value: new THREE.Vector2() }, uAge: { value: -1 }, uFront: { value: 1e9 }, uAmpK: { value: 1 }, uSize: { value: new THREE.Vector2(w + pad * 2, h + pad * 2) }, uInner: { value: new THREE.Vector2(w, h) }, uR: { value: r }, uBlur: { value: 4 }, uAlpha: { value: 0 } },
      })
      mats.push(m)
      return m
    }
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, order: number) => {
      const m = new THREE.Mesh(geo, mat)
      m.frustumCulled = false
      m.renderOrder = order
      scene.add(m)
      return m
    }

    // the dot grid, just behind the board
    const dotMat = new THREE.ShaderMaterial({ vertexShader: DOTS_VERT, fragmentShader: DOTS, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, uniforms: { uDot: { value: bg.clone().multiplyScalar(0.84) }, uDotR: { value: 0.95 }, uDotGap: { value: 28 }, uFalloff: { value: 0.1 }, uBg: { value: bg.clone() }, uLightD: shared.uLight, uGrain: shared.uGrain, uPaper: shared.uPaper } })
    mats.push(dotMat)
    // finely divided so it clips cleanly where the camera's angle swings it past the lens;
    // it follows the camera (the grid is in board space, so the dots stay put)
    const canvasMesh = add(plane(7000, 7000, 48, 48), dotMat, 0)
    canvasMesh.position.set(0, 0, -4)

    // the title
    const headMesh = add(plane(head.w, head.h), sheetMat(head.w, head.h, 12, INK), 6)

    /** A solid card's material: `clip` for the top face, 0 for the wall. */
    const slabMat = (w: number, h: number, r: number, color: THREE.Color, clip: number, ring = 0) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: SLAB_VERT, fragmentShader: SLAB_FRAG, transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide,
        uniforms: { ...shared, uC: { value: new THREE.Vector2() }, uAge: { value: -1 }, uFront: { value: 1e9 }, uAmpK: { value: 1 }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: r }, uClip: { value: clip }, uOpacity: { value: 0 }, uColor: { value: color.clone() }, uBevel: { value: 0 }, uRing: { value: ring }, uDepth: { value: 1 } },
      })
      mats.push(m)
      return m
    }
    /** The wall round a rounded rectangle, one unit deep (scale z to the thickness), with outward normals. */
    const wallGeo = (w: number, h: number, r: number) => {
      const shape = new THREE.Shape()
      const x = -w / 2, y = -h / 2
      shape.moveTo(x + r, y)
      shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r)
      shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r)
      shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y)
      const pts = shape.getSpacedPoints(Math.max(24, Math.round((w + h) * 2 / 4)))
      const pos: number[] = [], nrm: number[] = [], idx: number[] = []
      pts.forEach((p, i) => {
        const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length]
        const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1
        const nx = ty / l, ny = -tx / l // outward for this winding
        pos.push(p.x, p.y, 0, p.x, p.y, -1)
        nrm.push(nx, ny, 0, nx, ny, 0)
        const j = (i + 1) % pts.length
        idx.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1)
      })
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2))
      g.setIndex(idx)
      geos.push(g)
      return g
    }
    /** A card's wall follows its top: same pose, same wave, `depth` deep. */
    const stack = (top: THREE.Mesh, wall: THREE.Mesh, depth: number, shade: number) => {
      wall.position.copy(top.position)
      wall.rotation.copy(top.rotation)
      wall.scale.set(top.scale.x, top.scale.y, Math.max(0.01, depth))
      const tu = (top.material as THREE.ShaderMaterial).uniforms, u = (wall.material as THREE.ShaderMaterial).uniforms
      u.uC.value.copy(tu.uC.value)
      for (const key of ['uAge', 'uFront', 'uOpacity', 'uAmpK'] as const) u[key].value = tu[key].value
      u.uColor.value.copy(tu.uColor.value).multiplyScalar(shade)
      u.uDepth.value = depth
      tu.uDepth.value = depth
    }

    // frames, their contents and their shadows
    const built = frames.map((f) => {
      const tint = colour(`var(--miro-${f.hue}-sticky-background)`)
      // a faint ambient shadow, and a hairline of contact where the sheet meets the board
      const shadow = add(plane(f.w + 120, f.h + 120, 24, 24), shadowMat(f.w, f.h, 10, 60), 1)
      const contact = add(plane(f.w + 60, f.h + 60, 24, 24), shadowMat(f.w, f.h, 10, 30), 1)
      const sheetGeo = plane(f.w, f.h, Math.round(f.w / 5), Math.round(f.h / 5))
      const sides = add(wallGeo(f.w, f.h, 10), slabMat(f.w, f.h, 10, WHITE, 0), 2)
      const sheet = add(sheetGeo, slabMat(f.w, f.h, 10, WHITE, 1), 2)
      const label = add(plane(96, 14), sheetMat(96, 14, 7, GREY), 6)
      const sumA = add(plane(f.w * 0.58, 30, 12, 2), sheetMat(f.w * 0.58, 30, 15, INK), 5)
      const sumB = add(plane(f.w * 0.58 * 0.7, 18, 10, 2), sheetMat(f.w * 0.58 * 0.7, 18, 9, INK), 5)
      const pieces = f.pieces.map((p) => {
        const color = p.shape === 'note' ? tint : p.shape === 'bar' ? colour('var(--miro-lime-sticky-background)') : colour('#4262ff')
        const r = p.shape === 'note' ? 4 : Math.min(p.w, p.h) / 2
        const shadow = add(plane(p.w + 60, p.h + 60, 8, 8), shadowMat(p.w, p.h, r, 30), 3)
        const geo = plane(p.w, p.h, Math.max(2, Math.round(p.w / 6)), Math.max(2, Math.round(p.h / 6)))
        // stickies are overlaid on the frame: drawn over it, and they don't ripple
        const sides = add(wallGeo(p.w, p.h, r), slabMat(p.w, p.h, r, color, 0), 4)
        const mesh = add(geo, slabMat(p.w, p.h, r, color, 1, p.shape === 'dot' ? 1 : 0), 4.5)
        for (const m of [sides, mesh]) Object.assign(m.material as THREE.ShaderMaterial, { depthTest: false, depthWrite: false })
        return { p, mesh, shadow, sides }
      })
      return { f, tint, shadow, contact, sheet, sides, label, sumA, sumB, pieces }
    })

    // a skin: a DOM snapshot as a rippling sheet, with its own shadow
    let skin: Skin | null = null
    let skinTex: THREE.CanvasTexture | null = null
    const skinMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SKIN, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { ...shared, uC: { value: new THREE.Vector2() }, uAge: { value: -1 }, uAmpK: { value: 1 }, uTex: { value: null }, uOpacity: { value: 1 } },
    })
    mats.push(skinMat)
    let skinMesh: THREE.Mesh | null = null, skinShadow: THREE.Mesh | null = null
    api.current.skin = (k) => {
      if (skinMesh) { scene.remove(skinMesh); skinMesh.geometry.dispose() }
      if (skinShadow) { scene.remove(skinShadow); skinShadow.geometry.dispose(); (skinShadow.material as THREE.Material).dispose() }
      skinTex?.dispose()
      skin = k
      skinMesh = skinShadow = null
      if (!k) return
      skinTex = new THREE.CanvasTexture(k.image)
      skinTex.colorSpace = THREE.NoColorSpace
      skinTex.flipY = false // plane uv.y runs up the geometry, which is down the board
      skinTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      skinMat.uniforms.uTex.value = skinTex
      skinShadow = add(new THREE.PlaneGeometry(k.w + 80, k.h + 80, 24, 6), shadowMat(k.w, k.h, k.r, 40), 7)
      skinMesh = add(new THREE.PlaneGeometry(k.w, k.h, Math.round(k.w / 4), Math.max(2, Math.round(k.h / 6))), skinMat, 8)
    }

    // panels: the toolbar's cards as slabs, rebuilt when their size changes
    type Slab = { top: THREE.Mesh; wall: THREE.Mesh; shadow: THREE.Mesh; w: number; h: number; r: number }
    const slabs: Slab[] = []
    let panelList: Panel[] = []
    api.current.panels = (list) => { panelList = list }
    const slabFor = (i: number, p: Panel) => {
      const old = slabs[i]
      if (old && Math.abs(old.w - p.w) < 0.5 && Math.abs(old.h - p.h) < 0.5 && old.r === p.r) return old
      if (old) for (const m of [old.top, old.wall, old.shadow]) { scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose() }
      const shadow = add(new THREE.PlaneGeometry(p.w + 120, p.h + 120, 8, 4), shadowMat(p.w, p.h, p.r, 60), 6)
      const wall = add(wallGeo(p.w, p.h, p.r), slabMat(p.w, p.h, p.r, WHITE, 0), 6.5)
      const top = add(new THREE.PlaneGeometry(p.w, p.h, Math.max(2, Math.round(p.w / 8)), Math.max(2, Math.round(p.h / 8))), slabMat(p.w, p.h, p.r, WHITE, 1), 6.6)
      for (const m of [wall, top]) Object.assign(m.material as THREE.ShaderMaterial, { depthTest: false, depthWrite: false })
      return (slabs[i] = { top, wall, shadow, w: p.w, h: p.h, r: p.r })
    }

    let lod = 0, last = performance.now()
    const F = new THREE.Matrix4().makeScale(1, -1, 1)
    const V = new THREE.Matrix4()
    const M = new THREE.Matrix4(), T = new THREE.Matrix4()
    const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1)
    api.current.render = (c) => {
      const nowMs = performance.now()
      const now = nowMs / 1000, dt = Math.min(0.05, (nowMs - last) / 1000)
      last = nowMs
      // size
      const dpr = Math.min(2, devicePixelRatio)
      if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr)
      const size = renderer.getSize(new THREE.Vector2())
      if (size.x !== c.W || size.y !== c.H) renderer.setSize(c.W, c.H, false)
      // the CSS camera: perspective P from the screen centre; then the lens
      // (translate, rotateX, rotateY, rotateZ), the zoom layer (zoom, -focus)
      // and the canvas camera (scale k, -x), composed in that order
      camera.fov = (2 * Math.atan(c.H / 2 / c.P) * 180) / Math.PI
      camera.aspect = c.W / c.H
      camera.near = c.P / 50
      camera.far = c.P * 50
      camera.updateProjectionMatrix()
      const deg = Math.PI / 180
      M.makeTranslation(c.bx, c.by, 0)
        .multiply(T.makeRotationAxis(AX, c.pitch * deg))
        .multiply(T.makeRotationAxis(AY, c.yaw * deg))
        .multiply(T.makeRotationAxis(AZ, c.roll * deg))
        .multiply(T.makeScale(c.z, c.z, c.z))
        .multiply(T.makeTranslation(-c.fx, -c.fy, 0))
        .multiply(T.makeScale(c.k, c.k, c.k))
        .multiply(T.makeTranslation(-c.cx, 0, 0))
      // CSS y runs down: flip into GL, and stand the eye P in front of the screen
      V.makeTranslation(0, 0, -c.P).multiply(F).multiply(M)
      camera.matrix.copy(V).invert()
      camera.matrixWorld.copy(camera.matrix)
      camera.matrixWorldInverse.copy(V)

      lod += ((c.far ? 1 : 0) - lod) * (1 - Math.exp(-dt * 7))
      canvasMesh.position.set(c.cx + c.fx / c.k, c.fy / c.k, -4)
      /** Place a shadow for a caster centred at (x, y), `h` above what it falls on. */
      const cast = (m: THREE.Mesh, x: number, y: number, h: number, scale: number, alpha: number, blur: number, z = -2) => {
        m.position.set(x + h * 0.35 * tn.shadowReach, y + h * 0.55 * tn.shadowReach, z)
        m.scale.setScalar(scale)
        const u = (m.material as THREE.ShaderMaterial).uniforms
        u.uAlpha.value = alpha
        u.uBlur.value = blur
      }
      const { landed: L, placedAt: P, headAt, tune: tn } = state.current
      shared.uAmp.value = tn.amp
      shared.uSpeed.value = tn.speed
      shared.uWidth.value = tn.width
      shared.uFreq.value = (2 * Math.PI) / tn.wavelength
      shared.uDecay.value = tn.decay
      shared.uDiff.value = tn.diffuse
      shared.uSpec.value = tn.specular
      shared.uShine.value = tn.shine
      shared.uRoll.value = tn.roll
      shared.uAmbient.value = tn.ambient
      shared.uBounce.value = tn.bounce
      shared.uOcc.value = tn.occlusion
      shared.uFalloff.value = tn.falloff
      shared.uGrain.value = tn.paperGrain
      shared.uFibre.value = tn.paperFibre
      shared.uTooth.value = tn.paperTooth
      shared.uPaper.value = tn.paperScale
      dotMat.uniforms.uFalloff.value = tn.falloff
      const az = (tn.lightAz * Math.PI) / 180, el = (tn.lightEl * Math.PI) / 180
      shared.uLight.value.set(Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)) // y runs down the board
      dotMat.uniforms.uDotR.value = tn.dotSize
      dotMat.uniforms.uDotGap.value = tn.dotGap
      dotMat.uniforms.uDot.value.copy(bg).multiplyScalar(1 - tn.dotInk)

      // the title grows in from its left end
      const ht = headAt === null ? -1 : now - headAt
      const hs = 1 + settle(ht, -0.4, 0.5, 12)
      const hu = (headMesh.material as THREE.ShaderMaterial).uniforms
      hu.uOpacity.value = clamp01(ht / 0.3)
      headMesh.scale.set(hs, 1, 1)
      headMesh.position.set(head.x + (head.w * hs) / 2, head.y + head.h / 2, 0)

      for (const b of built) {
        const { f } = b
        const t = L[built.indexOf(b)] === null ? -1 : now - (L[built.indexOf(b)] as number)
        const on = t < 0 ? 0 : 1
        const cxF = f.x + f.w / 2, cyF = f.y + f.h / 2
        const z = tn.lift, sc = 1 // frames stand off the canvas
        // it enters on the wave: the sheet exists behind the leading crest, which
        // sweeps in from its left edge, so it rolls into being rather than popping
        const front = t < 0 ? -1e9 : f.x + t * tn.speed + tn.width * 0.8
        const wave = (m: THREE.Mesh) => {
          const u = (m.material as THREE.ShaderMaterial).uniforms
          u.uC.value.set(f.x, cyF) // the wave enters at the frame's left edge
          u.uAge.value = t < 0 ? -1 : t
          u.uFront.value = front
          return u
        }
        b.sheet.position.set(cxF, cyF, z)
        const su = wave(b.sheet)
        su.uOpacity.value = on
        su.uColor.value.copy(WHITE).lerp(b.tint, lod)
        su.uBevel.value = tn.bevel
        stack(b.sheet, b.sides, tn.thickness, tn.sideShade)
        // shadows: cast down and right from the top-left key, softer and fainter
        // the higher the caster
        ;(b.shadow.material as THREE.ShaderMaterial).uniforms.uFront.value = front
        ;(b.contact.material as THREE.ShaderMaterial).uniforms.uFront.value = front
        cast(b.shadow, cxF, cyF, z + 4, sc, tn.frameShadow * on, tn.frameSoft)
        cast(b.contact, cxF, cyF, z, sc, tn.frameContact * on, 1.5 + z * 0.55)
        // label above the frame: grows and darkens far out
        const ls = 1 + 0.8 * lod
        b.label.scale.set(ls, ls, 1)
        b.label.position.set(f.x + 2 + (96 * ls) / 2, f.y - 14 - (14 * ls) / 2, 0)
        const lu = (b.label.material as THREE.ShaderMaterial).uniforms
        lu.uOpacity.value = 1
        lu.uFront.value = front
        lu.uColor.value.copy(GREY).lerp(INK, lod)
        // the summary bars: what the frame reads as from far out
        const sw = f.w * 0.58
        b.sumA.position.set(f.x + 28 + sw / 2, f.y + f.h * 0.44 + 15, z + 1)
        b.sumB.position.set(f.x + 28 + (sw * 0.7) / 2, f.y + f.h * 0.44 + 50 + 9, z + 1)
        const ua = wave(b.sumA), ub = wave(b.sumB)
        ua.uOpacity.value = on * lod * 0.78
        ub.uOpacity.value = on * lod * 0.2
        // stickies drop onto the sheet and ride the wave with it
        b.pieces.forEach(({ p, mesh, shadow, sides }, j) => {
          const at = P[`${built.indexOf(b)}-${j}`]
          const pt = at === undefined ? -1 : now - at
          const po = clamp01(pt / 0.2) * on * (1 - lod)
          const lift = pt < 0 ? tn.dropHeight : Math.max(0, settle(pt, tn.dropHeight, 0.62, 13))
          const ps = 1 + (pt < 0 ? -0.6 : settle(pt, -0.6, 0.45, 15))
          const x = f.x + p.x + p.w / 2, y = f.y + p.y + p.h / 2
          mesh.position.set(x, y, z + 1 + lift)
          mesh.rotation.z = (p.r * Math.PI) / 180
          mesh.scale.setScalar(ps)
          const mu = wave(mesh)
          mu.uAmpK.value = 0
          mu.uOpacity.value = po
          mu.uBevel.value = tn.bevel * 0.6
          stack(mesh, sides, tn.noteThickness, tn.sideShade)
          // paper on paper: a tight contact shadow at rest that blooms as it drops in
          shadow.rotation.z = mesh.rotation.z
          wave(shadow).uAmpK.value = 0
          const hgt = 1.2 + lift
          cast(shadow, x, y, hgt, ps, tn.noteShadow * (p.shape === 'note' ? 1 : 0.55) * po / (1 + lift / 14), tn.noteSoft + hgt * tn.noteBloom, z + 0.5)
        })
      }
      // the toolbar's cards; while a skin carries the toolbar's contents, they take its wave
      const list = panelList
      const skinAge = skin ? now - skin.at : -1
      const skinK = skin ? 1 - clamp01((skinAge - (skin.len - 0.7)) / 0.7) : 0
      list.forEach((p, i) => {
        const sl = slabFor(i, p)
        sl.top.position.set(p.x + p.w / 2, p.y + p.h / 2, p.z)
        const u = (sl.top.material as THREE.ShaderMaterial).uniforms
        u.uOpacity.value = 1
        u.uBevel.value = tn.bevel
        u.uAge.value = skin ? Math.max(0, skinAge) : -1
        if (skin) u.uC.value.set(skin.x, skin.y + skin.h / 2)
        u.uAmpK.value = skinK * skinK * (3 - 2 * skinK)
        stack(sl.top, sl.wall, tn.thickness, tn.sideShade)
        sl.top.visible = sl.wall.visible = sl.shadow.visible = true
        cast(sl.shadow, p.x + p.w / 2, p.y + p.h / 2, p.z, 1, tn.frameContact * 0.7, 1.5 + p.z * 0.4, p.z - tn.thickness - 1)
      })
      for (let i = list.length; i < slabs.length; i++) slabs[i].top.visible = slabs[i].wall.visible = slabs[i].shadow.visible = false
      if (skin && skinMesh && skinShadow) {
        const age = now - skin.at
        // the wave sweeps in from the left; it eases out to flat before the DOM takes over again
        const k = 1 - clamp01((age - (skin.len - 0.7)) / 0.7)
        skinMesh.position.set(skin.x + skin.w / 2, skin.y + skin.h / 2, skin.z)
        skinShadow.position.set(skin.x + skin.w / 2, skin.y + skin.h / 2 + 12, skin.z - 1)
        for (const m of [skinMesh, skinShadow]) {
          const u = (m.material as THREE.ShaderMaterial).uniforms
          u.uC.value.set(skin.x, skin.y + skin.h / 2)
          u.uAge.value = Math.max(0, age)
          u.uAmpK.value = k * k * (3 - 2 * k)
        }
        const su = (skinShadow.material as THREE.ShaderMaterial).uniforms
        su.uAlpha.value = 0 // the card's own slab casts the shadow
      }
      renderer.render(scene, camera)
    }

    return () => {
      api.current.render = () => {}
      api.current.skin = () => {}
      skinTex?.dispose()
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
      renderer.dispose()
    }
  }, [frames, head])

  return <canvas ref={host} className="wave-board" aria-hidden />
})

export default WaveBoard
