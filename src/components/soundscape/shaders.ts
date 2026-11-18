/* Living textures for the soundscape page — trimmed from the c26 prototype's
   lib/portfolioShaders.ts (the mood board's raw-WebGL noise vocabulary). Only
   the two textures this page shows are kept: `halftoneHero` (the banner's
   dot screen with its yellow seam) and `dots` (the board's grid, stirred by
   the cursors). GLSL and renderer are verbatim: ONE shared offscreen WebGL
   context renders every visible texture and copies it onto each mount's plain
   2D canvas; prefers-reduced-motion and paused textures get one still frame. */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const PRELUDE = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(11.7, 5.3);
    a *= 0.5;
  }
  return v;
}
float grain(vec2 uv, float t) {
  return hash(uv * u_res + fract(t) * 61.7) - 0.5;
}
`;

/* ————— halftone flow: dot screen sampling a warped field; a yellow seam of
   cells rides one elevation. Parameterised for the soundscape hero: a finer
   screen whose neutral dots sit barely above the black, yellows unchanged. */
const halftoneFrag = ({ cells = 30, neutral = [0.38, 0.37, 0.33] as readonly number[] } = {}) => PRELUDE + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = uv * vec2(aspect, 1.0);
  float t = u_time * 0.05;

  float cells = ${cells.toFixed(1)};
  vec2 g = p * cells;
  vec2 cellUv = (floor(g) + 0.5) / cells;
  float d = length(fract(g) - 0.5);

  vec2 q = vec2(fbm(cellUv * 2.2 + t), fbm(cellUv * 2.2 - t + 3.0));
  float f = fbm(cellUv * 2.2 + 1.9 * q);

  vec2 m = (u_mouse * vec2(aspect, 1.0) - cellUv);
  float near = exp(-dot(m, m) * 22.0);
  float r = mix(0.03, 0.44, smoothstep(0.2, 0.8, f)) + 0.18 * near;

  float dot_ = 1.0 - smoothstep(r - 0.04, r + 0.04, d);
  float seam = smoothstep(0.035, 0.0, abs(f - 0.58));

  vec3 bg = vec3(0.075, 0.072, 0.058);
  vec3 inkcol = mix(vec3(${neutral.map((v) => v.toFixed(3)).join(", ")}), vec3(1.0, 0.862, 0.29),
                    clamp(seam + smoothstep(0.3, 0.9, near), 0.0, 1.0));
  vec3 col = mix(bg, inkcol, dot_);
  col += vec3(grain(uv, u_time)) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ————— board dots: the hero's dot grid, woken by cursors. Each cursor (up to
   4, packed as xy = position in uv, z = strength, w unused) swells the dots
   around it along the contour study's terrain lines and nudges them aside,
   darkening them toward ink as they grow — monochrome, like the board —
   then everything settles back to the plain grid. Dot/background values
   match palette.ts (GRID_DOT_COLOR on BOARD_BG_DEFAULT); ink is the warm
   near-black of the headline. */
const BOARD_DOTS = PRELUDE + `
uniform vec4 u_pts[4];
uniform float u_scale;
void main() {
  vec2 px = gl_FragCoord.xy / u_scale;
  vec2 res = u_res / u_scale;
  float cell = 24.0;
  vec2 c = (floor(px / cell) + 0.5) * cell;

  float F = 0.0;
  float R = 0.0; // ripple rings: dots swell as a ring passes
  // Slot 3 with no strength and w = -1 asks for the finer grid (Huddles card).
  float fine = (u_pts[3].z <= 0.001 && u_pts[3].w < -0.5) ? 1.0 : 0.0;
  vec2 push = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 p = u_pts[i];
    if (p.z <= 0.001) continue;
    vec2 d = c - p.xy * res;
    // w < 0: a ripple ring of radius -w px; otherwise a soft blob (w is free).
    if (p.w < 0.0) {
      R += exp(-pow(length(d) + p.w, 2.0) / (38.0 * 38.0)) * p.z;
      continue;
    }
    float f = exp(-dot(d, d) / (190.0 * 190.0)) * p.z;
    F += f;
    push += normalize(d + 1e-4) * f;
  }
  F = clamp(F, 0.0, 1.0);

  // The contour study's terrain, drifting slowly; dots on its level lines swell.
  float h = fbm(c * 0.0055 + vec2(u_time * 0.02, -u_time * 0.015));
  float lv = fract(h * 9.0);
  float band = 1.0 - smoothstep(0.0, 0.16, min(lv, 1.0 - lv));
  vec2 swirl = vec2(fbm(c * 0.01 + u_time * 0.1), fbm(c * 0.01 - u_time * 0.1 + 7.0)) - 0.5;
  vec2 center = c + push * 5.0 + swirl * 8.0 * F;
  // Growth is kept modest (1.2px dot to ~2.6px on a contour line) so the
  // grid stirs rather than blooms.
  R = clamp(R, 0.0, 1.0);
  float r = mix(1.2, 0.8, fine) + F * (0.2 + 1.2 * band) + R * 2.2;
  float dot_ = 1.0 - smoothstep(r - 0.6, r + 0.6, length(px - center));

  vec3 bg = vec3(0.949);
  vec3 ink = vec3(0.1, 0.098, 0.075);
  vec3 dotCol = mix(vec3(0.824), ink, F * (0.3 + 0.7 * band));
  // Ripple dots keep the grid's own tone; only their size moves.
  gl_FragColor = vec4(mix(bg, dotCol, dot_), 1.0);
}
`;

export type TextureKind = "halftoneHero" | "dots";

const FRAGS: Record<TextureKind, () => string> = {
  // The soundscape banner: 2× finer screen, neutrals 50% darker (near the
  // black), the yellow seam untouched.
  halftoneHero: () => halftoneFrag({ cells: 60, neutral: [0.19, 0.185, 0.165] }),
  dots: () => BOARD_DOTS,
};

type Program = {
  prog: WebGLProgram;
  uRes: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uPts: WebGLUniformLocation | null;
  uScale: WebGLUniformLocation | null;
};

type Entry = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  kind: TextureKind;
  visible: boolean;
  paused: boolean;
  drawn: boolean;
  ptr: { x: number; y: number; tx: number; ty: number; lastMove: number };
  /** Extra positions for textures that react to several cursors (`dots`). */
  points: Float32Array;
  /** Called before each frame to refresh `points` from live layout. */
  beforeFrame?: (points: Float32Array) => void;
};

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = Math.min(devicePixelRatio || 1, 2);

/** The one shared GL context + render loop. Created on first mount. */
function createRenderer() {
  const glCanvas = document.createElement("canvas");
  const gl = glCanvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  gl.getExtension("OES_standard_derivatives");

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const programs = new Map<TextureKind, Program>();
  const program = (kind: TextureKind): Program => {
    const cached = programs.get(kind);
    if (cached) return cached;
    const frag = FRAGS[kind]();
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(
      prog,
      compile(
        gl.FRAGMENT_SHADER,
        frag.includes("fwidth") ? "#extension GL_OES_standard_derivatives : enable\n" + frag : frag,
      ),
    );
    gl.linkProgram(prog);
    const p = {
      prog,
      uRes: gl.getUniformLocation(prog, "u_res"),
      uTime: gl.getUniformLocation(prog, "u_time"),
      uMouse: gl.getUniformLocation(prog, "u_mouse"),
      uPts: gl.getUniformLocation(prog, "u_pts"),
      uScale: gl.getUniformLocation(prog, "u_scale"),
    };
    programs.set(kind, p);
    return p;
  };

  const entries = new Set<Entry>();
  const t0 = performance.now();
  let raf = 0;

  const render = (e: Entry, now: number) => {
    const w = Math.max(1, Math.round(e.canvas.clientWidth * DPR));
    const h = Math.max(1, Math.round(e.canvas.clientHeight * DPR));
    if (e.canvas.width !== w || e.canvas.height !== h) {
      e.canvas.width = w;
      e.canvas.height = h;
    }
    // The shared buffer only grows; each texture renders into its bottom-left w×h.
    if (glCanvas.width < w || glCanvas.height < h) {
      glCanvas.width = Math.max(glCanvas.width, w);
      glCanvas.height = Math.max(glCanvas.height, h);
    }
    // Idle wander: after 2.5s without the pointer, drift on a slow lissajous.
    const ptr = e.ptr;
    if (now - ptr.lastMove > 2500) {
      const t = now / 1000;
      ptr.tx = 0.5 + 0.33 * Math.sin(t * 0.21) * Math.cos(t * 0.07);
      ptr.ty = 0.5 + 0.3 * Math.sin(t * 0.16 + 1.7);
    }
    ptr.x += (ptr.tx - ptr.x) * 0.055;
    ptr.y += (ptr.ty - ptr.y) * 0.055;

    const p = program(e.kind);
    gl.useProgram(p.prog);
    const loc = gl.getAttribLocation(p.prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, w, h);
    gl.uniform2f(p.uRes, w, h);
    gl.uniform1f(p.uTime, (now - t0) / 1000);
    gl.uniform2f(p.uMouse, ptr.x, ptr.y);
    if (p.uPts) {
      e.beforeFrame?.(e.points);
      gl.uniform4fv(p.uPts, e.points);
    }
    if (p.uScale) gl.uniform1f(p.uScale, DPR);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // GL's origin is bottom-left, so the rendered region sits at the bottom.
    e.ctx.drawImage(glCanvas, 0, glCanvas.height - h, w, h, 0, 0, w, h);
    e.drawn = true;
  };

  const tick = (now: number) => {
    raf = 0;
    let animating = false;
    for (const e of entries) {
      if (!e.visible) continue;
      const still = REDUCED || e.paused;
      if (still && e.drawn) continue;
      render(e, now);
      if (!still) animating = true;
    }
    if (animating) raf = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((records) => {
    for (const r of records) {
      for (const e of entries) if (e.canvas === r.target) e.visible = r.isIntersecting;
    }
    wake();
  });

  return {
    add(e: Entry) {
      entries.add(e);
      io.observe(e.canvas);
      wake();
      // Pre-warm while the page is idle: compile this kind's program, grow the
      // shared buffer and draw one frame now, so none of that lands on the
      // frame the texture first scrolls into view (it stalled entrances).
      const idle = (cb: () => void) =>
        typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 200);
      idle(() => {
        if (entries.has(e) && !e.drawn && e.canvas.clientWidth > 0) render(e, performance.now());
      });
    },
    remove(e: Entry) {
      entries.delete(e);
      io.unobserve(e.canvas);
    },
    wake,
  };
}

let renderer: ReturnType<typeof createRenderer> | undefined;

/** Mount a texture on `canvas` (drawn via the shared renderer). Returns
 *  controls, or null if WebGL is unavailable (the parent's CSS surface shows). */
export function mountTexture(
  canvas: HTMLCanvasElement,
  kind: TextureKind,
  { paused = false, beforeFrame }: { paused?: boolean; beforeFrame?: (points: Float32Array) => void } = {},
): { dispose: () => void; setPaused: (p: boolean) => void } | null {
  if (renderer === undefined) renderer = createRenderer();
  const ctx = canvas.getContext("2d");
  if (!renderer || !ctx) return null;
  const r = renderer;

  const entry: Entry = {
    canvas,
    ctx,
    kind,
    visible: false,
    paused,
    drawn: false,
    ptr: { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, lastMove: -1e9 },
    points: new Float32Array(16),
    beforeFrame,
  };
  // Listen on the parent: cards and the hero layer content over the canvas.
  const target = canvas.parentElement ?? canvas;
  const onMove = (ev: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    entry.ptr.tx = (ev.clientX - b.left) / b.width;
    entry.ptr.ty = 1 - (ev.clientY - b.top) / b.height;
    entry.ptr.lastMove = performance.now();
  };
  target.addEventListener("pointermove", onMove);
  r.add(entry);

  return {
    setPaused(p) {
      entry.paused = p;
      r.wake();
    },
    dispose() {
      target.removeEventListener("pointermove", onMove);
      r.remove(entry);
    },
  };
}
