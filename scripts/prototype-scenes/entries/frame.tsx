// Shared frame for a scene-only page: one of the C26 Fall prototype's
// PRODUCTION portfolio scenes, filling the page so a shelf card can iframe it
// (the shelf draws its own caption on top). Compiled by ../build.ts from inside
// the prototype, so "@/..." is the prototype's src/. Not part of this app's
// tsconfig (src/ only).
import "@mirohq/design-tokens/tokens.css";
import "@/styles/overrides.css";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { globalCss, ThemeProvider, themes } from "@mirohq/design-system";
import AprisWoff2 from "@/fonts/Apris-Regular.woff2";
import NotoRegular from "@/fonts/NotoSans-Regular.woff2";
import NotoSemiBold from "@/fonts/NotoSans-SemiBold.woff2";
import RoobertMedium from "@/fonts/RoobertPRO-Medium.woff2";
import RoobertSemiBold from "@/fonts/RoobertPRO-SemiBold.woff2";

try {
  window.localStorage.setItem("MIRO_DS_CANVAS_26", "true");
} catch {}

const face = (fontFamily: string, fontWeight: number, src: string) => ({
  fontFamily, fontWeight, fontStyle: "normal" as const, fontDisplay: "swap" as const, src: `url(${src}) format("woff2")`,
});
// Only the faces the scenes use: Apris (serif lines), Noto Sans (body),
// Roobert PRO 500/600 ($heading).
const globalStyles = globalCss({
  "@font-face": [
    face("Apris", 400, AprisWoff2),
    face("Noto Sans", 400, NotoRegular),
    face("Noto Sans", 600, NotoSemiBold),
    face("Roobert PRO", 500, RoobertMedium),
    face("Roobert PRO", 600, RoobertSemiBold),
  ],
  "*": { boxSizing: "border-box" },
  "html, body, #root": { margin: 0, height: "100%", overflow: "hidden" },
  body: { fontFamily: "$body", WebkitFontSmoothing: "antialiased" },
});

type View = {
  /** design px to fill the page's height, and the design point at the page's centre */
  cx: number; cy: number; h: number;
  /** pull back slowly from there: by `by` (0.25 = to 75% size) over `ms`, eased to settle */
  zoomOut?: { by: number; ms: number };
  /** keep this element (a selector inside the scene) centred instead of (cx, cy), as it
   *  moves: the camera tracks it, so a hero object travelling across the board reads as
   *  the board gathering round it, not as a pan. Clamped so the scene's box always
   *  covers the page (no empty edges). */
  follow?: string;
  /** pan gently with the pointer, up to this fraction of the page each way (0.04 = 4%).
   *  The pointer comes from this page, or from the parent page (a `scene-pointer`
   *  message, -1…1 across its viewport), so it follows the mouse anywhere on the site. */
  parallax?: number;
  /** a scene that fakes a camera move by resizing its hero (the followed element) while
   *  other things keep a fixed size: scale those (a selector) by the hero's current size
   *  over its resting size (`restWidth`, in design px), so the whole canvas reads as one
   *  camera. */
  scaleWithFollow?: { selector: string; restWidth: number; /** the hero to measure, if not `follow` */ of?: string };
};

/** `background` replaces the scene's own ground colour (set inline on its root,
 *  hence !important) without touching the prototype's component.
 *  `design`: for a scene laid out in fixed pixels for its prototype card (no camera
 *  to reframe it), render it at that size and scale the whole thing to the page,
 *  so a smaller shelf card shows all of it instead of cropping. It covers the page,
 *  so when the shapes differ the overflow is cropped: `focusX` picks which part of the
 *  width stays in view (0 = left edge, 0.5 = centre, the default; 1 = right edge).
 *  `view` zooms past that with a live camera (see View), for a scene that pads itself
 *  inside its box. Reduced motion: the camera's end frame, no parallax.
 *  Scenes loop while on screen (see autoReplay); `loopEvery` (ms) is for a scene whose
 *  replay control never changes state, so it's pressed on that clock instead. */
export function mount(Scene: ComponentType, opts: { background?: string; design?: { w: number; h: number; focusX?: number; view?: View }; loopEvery?: number } = {}) {
  const ground = opts.background
    ? globalCss({ "article > header + div": { backgroundColor: `${opts.background} !important` } })
    : null;
  // Start the moment any of the scene shows: scenes wait for a share of their box
  // to be on screen (an IntersectionObserver threshold), which on the site reads as
  // a pause before anything moves. Every threshold becomes 0 (any pixel).
  // Held (`#hold` on the page's URL): nothing reports as on screen until the parent page
  // posts { type: "scene-start" }, so a scene can wait, loaded and on its first frame,
  // for something before it (the hero's intro film) to finish. Then every observer is
  // re-armed and the scene starts as if it had just scrolled into view.
  let held = location.hash.includes("hold");
  const armed: { io: IntersectionObserver; targets: Set<Element> }[] = [];
  const Native = window.IntersectionObserver;
  window.IntersectionObserver = class extends Native {
    constructor(cb: IntersectionObserverCallback, o: IntersectionObserverInit = {}) {
      super((entries, io) => { if (!held) cb(entries, io); }, { ...o, threshold: 0 });
      armed.push({ io: this, targets: new Set() });
    }
    observe(t: Element) { armed.find((a) => a.io === this)?.targets.add(t); super.observe(t); }
    unobserve(t: Element) { armed.find((a) => a.io === this)?.targets.delete(t); super.unobserve(t); }
  };
  if (held) {
    window.addEventListener("message", (e) => {
      if (!held || e.data?.type !== "scene-start") return;
      held = false;
      for (const { io, targets } of armed) for (const t of [...targets]) { io.unobserve(t); io.observe(t); }
    });
  }
  autoReplay(opts.loopEvery);
  function App() {
    globalStyles();
    ground?.();
    const { scale, vw, vh } = useFit(opts.design);
    const box = useRef<HTMLDivElement>(null);
    useCamera(box, opts.design);
    const article = (
      // Scenes frame their shots below the card's caption: they measure the nearest
      // article > header. The shelf's caption sits over the iframe, so an empty
      // header here reserves the same band.
      <article style={{ position: "relative", height: "100%" }}>
        <header aria-hidden style={{ height: "clamp(96px, 18vh, 140px)" }} />
        <Scene />
      </article>
    );
    return (
      <ThemeProvider root themes={themes} defaultTheme="newLight">
        {opts.design ? (
          <div
            ref={box}
            style={{
              position: "absolute", left: 0, top: 0, width: opts.design.w, height: opts.design.h, transformOrigin: "0 0",
              // with a `view`, the camera loop sets the transform every frame
              transform: opts.design.view ? undefined : `translate(${(vw - opts.design.w * scale) * (opts.design.focusX ?? 0.5)}px, ${(vh - opts.design.h * scale) / 2}px) scale(${scale})`,
            }}
          >
            {article}
          </div>
        ) : article}
      </ThemeProvider>
    );
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

/** Loops a play-once scene while it's on screen, by pressing its own replay control:
 *  the prototype's scenes show a "Replay …" button once they've ended. After a short
 *  hold on the end frame it's pressed again; off screen it waits, and coming back on
 *  screen replays at once. With `every`, the control is pressed on that clock instead
 *  (for a scene whose button always reads Replay). Reduced motion: left on its end frame. */
const HOLD_MS = 1800;
function autoReplay(every?: number) {
  if (REDUCED) return;
  let visible = false;
  let timer = 0;
  let last = performance.now();
  const button = () => document.querySelector<HTMLButtonElement>('button[aria-label^="Replay"]');
  const check = () => {
    window.clearTimeout(timer);
    if (!visible) return;
    const b = button();
    if (!b) return;
    const wait = every ? Math.max(0, last + every + HOLD_MS - performance.now()) : HOLD_MS;
    timer = window.setTimeout(() => {
      if (!visible) return;
      last = performance.now();
      button()?.click();
      if (every) check();
    }, wait);
  };
  // in an iframe, the implicit root is the top page's viewport: this is "on the site's screen"
  new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e!.isIntersecting;
    if (visible && !was) {
      // the scene starts itself on view; an ended one is replayed now, not after the hold
      last = performance.now();
      if (!every && button()) return button()!.click();
    }
    check();
  }).observe(document.documentElement);
  if (!every) new MutationObserver(check).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-label"] });
}

const REDUCED = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
/** ease-out, settling: the pull-back's curve */
const settle = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** The live camera for a `view`: zoom (with the slow pull-back), the followed element
 *  held at the centre, and the pointer parallax, written straight to the box's
 *  transform each frame (no React render per frame). */
function useCamera(box: React.RefObject<HTMLDivElement | null>, design?: { w: number; h: number; view?: View }) {
  useEffect(() => {
    const el = box.current;
    const view = design?.view;
    if (!el || !design || !view) return;
    let t0 = performance.now();
    // a replay (by hand or by the loop) runs the pull-back again with the scene
    const onReplay = (e: Event) => {
      if ((e.target as Element | null)?.closest?.('button[aria-label^="Replay"]')) t0 = performance.now();
    };
    document.addEventListener("click", onReplay, true);
    // pointer: -1…1 across the parent's viewport (or this page's, standalone)
    const ptr = { x: 0, y: 0 };
    const pan = { x: 0, y: 0 };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "scene-pointer") { ptr.x = e.data.x; ptr.y = e.data.y; }
    };
    const onMove = (e: MouseEvent) => {
      // over this page itself: map into the parent's viewport, so the two sources agree
      const fe = window.frameElement as HTMLElement | null;
      const r = fe?.getBoundingClientRect();
      const W = fe ? window.parent.innerWidth : window.innerWidth;
      const H = fe ? window.parent.innerHeight : window.innerHeight;
      ptr.x = ((e.clientX + (r?.left ?? 0)) / W) * 2 - 1;
      ptr.y = ((e.clientY + (r?.top ?? 0)) / H) * 2 - 1;
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("mousemove", onMove);
    if (view.scaleWithFollow) {
      const style = document.createElement("style");
      style.textContent = `${view.scaleWithFollow.selector} { zoom: var(--follow-scale, 1); }`;
      document.head.append(style);
    }
    let center: { x: number; y: number } | null = null;
    let tx = 0, ty = 0, S = 1;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const vw = window.innerWidth, vh = window.innerHeight;
      const zoom = view.zoomOut ? 1 - view.zoomOut.by * (REDUCED ? 1 : settle((now - t0) / view.zoomOut.ms)) : 1;
      // where the followed element is now, in the design box's own px (undo this frame's transform)
      let want = { x: view.cx, y: view.cy };
      const target = view.follow ? el.querySelector(view.follow) : null;
      if (target && S) {
        const r = target.getBoundingClientRect();
        if (r.width) want = { x: (r.left + r.width / 2 - tx) / S, y: (r.top + r.height / 2 - ty) / S };
      }
      // things the scene keeps at a fixed size, scaled with its hero (measured, not followed)
      const hero = view.scaleWithFollow ? el.querySelector(view.scaleWithFollow.of ?? view.follow ?? "") : null;
      if (hero && S) {
        const w = hero.getBoundingClientRect().width;
        if (w) el.style.setProperty("--follow-scale", String(Math.max(1, w / S / view.scaleWithFollow!.restWidth)));
      }
      // smoothed, so measuring through our own moving transform can't jitter
      center = center ? { x: center.x + (want.x - center.x) * 0.18, y: center.y + (want.y - center.y) * 0.18 } : want;
      S = (vh / view.h) * zoom;
      const amp = REDUCED ? 0 : (view.parallax ?? 0);
      // keep the box covering the page, with room for the parallax
      const mx = (vw / 2) * (1 + 2 * amp) / S, my = (vh / 2) * (1 + 2 * amp) / S;
      const cx = design.w - mx > mx ? Math.min(Math.max(center.x, mx), design.w - mx) : design.w / 2;
      const cy = design.h - my > my ? Math.min(Math.max(center.y, my), design.h - my) : design.h / 2;
      pan.x += (-ptr.x * amp * vw - pan.x) * 0.06;
      pan.y += (-ptr.y * amp * vh - pan.y) * 0.06;
      tx = vw / 2 - cx * S + pan.x;
      ty = vh / 2 - cy * S + pan.y;
      el.style.transform = `translate(${tx}px, ${ty}px) scale(${S})`;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("click", onReplay, true); window.removeEventListener("message", onMessage); window.removeEventListener("mousemove", onMove); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Scale that covers the window with a `design`-sized box (1 with no design), and the window size. */
function useFit(design?: { w: number; h: number }) {
  const fit = () => ({
    scale: design ? Math.max(window.innerWidth / design.w, window.innerHeight / design.h) : 1,
    vw: window.innerWidth,
    vh: window.innerHeight,
  });
  const [state, setState] = useState(fit);
  useEffect(() => {
    if (!design) return;
    const on = () => setState(fit());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}
