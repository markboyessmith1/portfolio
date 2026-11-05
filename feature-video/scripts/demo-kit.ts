// Demo-video kit for vlab-mds: drive the real UI with a headless Chrome, draw
// a cursor into the page, record a CDP screencast, and stitch an mp4 with the
// real frame timestamps (optionally time-lapsing waits).
//
//   import { startDemo, EASE_IN_OUT, EASE_OUT } from "<skill>/scripts/demo-kit.ts";
//   const demo = await startDemo({ board: "my-feature" });
//   …setup off camera (chrome visible, normal Playwright clicks)…
//   await demo.boardOnly();            // hide every bar/panel/pill
//   await demo.record();               // screencast on
//   await demo.glide(x, y, 600, EASE_OUT);
//   await demo.press(); await demo.glide(x2, y2, 300, EASE_OUT); await demo.release();
//   await demo.finish("~/Desktop/my-feature.mp4");
//
// Playwright-core is installed once into ~/.cache/feature-video (not the repo).
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEPS = join(homedir(), ".cache", "feature-video");
const PLAYWRIGHT_VERSION = "1.64.0";
const CHROME = process.env.FEATURE_VIDEO_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// ── Curves (the animate skill's tables) ──────────────────────────────────────
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t ** 2 * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid;
      else hi = mid;
    }
    return by((lo + hi) / 2);
  };
}
/** Travel across the screen (moving between targets). */
export const EASE_IN_OUT = cubicBezier(0.77, 0, 0.175, 1);
/** Entering, pulling, landing: instant start, soft settle. */
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now() / 1000;

// ── The drawn cursor ─────────────────────────────────────────────────────────
// Headless screencasts have no cursor, so one is drawn into the page. It is
// driven ONLY by the script (window.__cursor), never by page events — the
// app dispatches synthetic pointer events of its own (Jev's agent cursor).
// It mirrors the cursor the app asks for under it: an open hand over
// `cursor: grab`, a closed hand while pressed on one, else the arrow.
const CURSOR_SCRIPT = `
(() => {
  const install = () => {
    if (document.getElementById("demo-cursor")) return;
    const el = document.createElement("div");
    el.id = "demo-cursor";
    const hand = (palm, paths) =>
      '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="' + palm + '" fill="white" stroke="white" stroke-width="1.5"/>' +
      '<g stroke="white" stroke-width="4.2">' + paths + '</g><g stroke="#050038" stroke-width="1.9">' + paths + '</g></svg>';
    const SHAPES = {
      arrow: { hot: [5, 3], html: '<svg width="30" height="30" viewBox="0 0 28 28"><path d="M5 3 L5 22 L10 17.5 L13.5 25 L17 23.4 L13.6 16 L20.5 16 Z" fill="#050038" stroke="white" stroke-width="1.8" stroke-linejoin="round"/></svg>' },
      grab: { hot: [17, 15], html: hand("M6 8.5 L22 8.5 L22 14 A8 8 0 0 1 14 22 L12 22 C9.2 22 7.5 21.1 6 19.7 L3 16.7 L6 15.5 Z",
        '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>') },
      grabbing: { hot: [17, 17], html: hand("M2 14 L4 12.5 L6 12 L6 9 L18 8.5 L22 10.5 L22 14 A8 8 0 0 1 14 22 L10 22 A8 8 0 0 1 2 14 Z",
        '<path d="M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4"/><path d="M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5"/><path d="M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"/>') },
    };
    Object.assign(el.style, {
      position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none",
      translate: "-200px -200px", transition: "scale 120ms cubic-bezier(0.23, 1, 0.32, 1)",
      filter: "drop-shadow(0 2px 3px rgba(0,0,0,.28))",
    });
    document.documentElement.appendChild(el);
    let shape = "";
    let down = false;
    let at = { x: -200, y: -200 };
    const setShape = (next) => {
      if (next === shape) return;
      shape = next;
      el.innerHTML = SHAPES[next].html;
      el.style.transformOrigin = SHAPES[next].hot[0] + "px " + SHAPES[next].hot[1] + "px";
    };
    const update = () => {
      let next = "arrow";
      if (down) next = shape === "grab" || shape === "grabbing" ? "grabbing" : "arrow";
      else {
        const under = document.elementFromPoint(at.x, at.y);
        if (under && getComputedStyle(under).cursor.includes("grab")) next = "grab";
      }
      setShape(next);
      // The translate PROPERTY, not transform: scale (press feedback) composes
      // after transform and would shrink around the viewport corner — a jump.
      const s = SHAPES[shape];
      el.style.translate = (at.x - s.hot[0]) + "px " + (at.y - s.hot[1]) + "px";
    };
    setShape("arrow");
    window.__cursor = {
      move(x, y) { at = { x, y }; update(); },
      press(on) { down = on; el.style.scale = on ? "0.9" : "1"; update(); },
    };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();
`;

// Just the board: every bar, panel and pill hidden; the canvas stays.
// Selection outlines, hover outlines and widget pills go too.
const BOARD_ONLY_CSS = `
  body * { visibility: hidden !important; }
  .ce-container, .ce-container * { visibility: visible !important; }
  .ce-overlays, .ce-overlays *, .ce-selection-ui, .ce-selection-ui *,
  [data-widget-pill], [data-widget-pill] * { visibility: hidden !important; }
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Page = any;
type Point = { x: number; y: number };

async function playwright(): Promise<any> {
  const dir = join(DEPS, "node_modules", "playwright-core");
  if (!existsSync(dir)) {
    mkdirSync(DEPS, { recursive: true });
    const p = Bun.spawnSync(["bun", "add", `playwright-core@${PLAYWRIGHT_VERSION}`], { cwd: DEPS, stdout: "inherit", stderr: "inherit" });
    if (p.exitCode !== 0) throw new Error("couldn't install playwright-core into ~/.cache/feature-video");
  }
  return import(dir);
}

export interface DemoOptions {
  /** Base URL of the production server the user tests on. */
  base?: string;
  /** Board room id; a timestamp is appended so every take starts fresh. */
  board?: string;
  /** Or any path to open instead of a board. */
  path?: string;
  viewport?: { width: number; height: number };
  /** Device pixel ratio to render and capture at (default 2). Higher supersamples zooms. */
  scale?: number;
}

export async function startDemo(opts: DemoOptions = {}) {
  const base = opts.base ?? "http://localhost:4001";
  const view = opts.viewport ?? { width: 1440, height: 900 };
  const { chromium } = await playwright();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: opts.scale ?? 2 });
  await context.addInitScript(CURSOR_SCRIPT);
  const page: Page = await context.newPage();
  const path = opts.path ?? `/board/${opts.board ?? "demo"}-${Date.now()}`;
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });

  const framesDir = join("/tmp", "feature-video", `frames-${Date.now()}`);
  mkdirSync(framesDir, { recursive: true });
  const frames: { file: string; t: number }[] = [];
  const squeezes: { a: number; b: number; max: number }[] = [];
  let cdp: any = null;
  // Starts on the right edge: a mouse off the viewport never reaches the page.
  let mouse: Point = { x: view.width - 3, y: view.height * 0.72 };

  const cursorTo = (p: Point) => page.evaluate(([x, y]: number[]) => (window as any).__cursor?.move(x, y), [p.x, p.y]);
  const cursorPress = (on: boolean) => page.evaluate((v: boolean) => (window as any).__cursor?.press(v), on);

  const demo = {
    page,
    context,
    view,
    get mouse() {
      return mouse;
    },

    /** Hide the app chrome: only the board canvas stays visible. */
    async boardOnly() {
      await page.addStyleTag({ content: BOARD_ONLY_CSS });
    },

    /** Put the real mouse and the drawn cursor somewhere without animating (off camera). */
    async placeCursor(p: Point = mouse) {
      mouse = p;
      await page.mouse.move(p.x, p.y);
      await cursorTo(p);
    },

    /** Screencast on. Call after setup; everything before is off camera. */
    async record() {
      await demo.placeCursor(mouse);
      cdp = await context.newCDPSession(page);
      cdp.on("Page.screencastFrame", async (f: any) => {
        const file = join(framesDir, `${String(frames.length).padStart(6, "0")}.jpg`);
        frames.push({ file, t: f.metadata.timestamp ?? now() });
        writeFileSync(file, Buffer.from(f.data, "base64"));
        await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
      });
      await cdp.send("Page.startScreencast", {
        format: "jpeg", quality: 92, maxWidth: view.width * (opts.scale ?? 2), maxHeight: view.height * (opts.scale ?? 2), everyNthFrame: 1,
      });
      await sleep(400);
    },

    /** Move along a slight arc with an easing curve (hands don't travel in straight lines). */
    async glide(x: number, y: number, ms: number, curve: (t: number) => number = EASE_IN_OUT, arc = 0.08) {
      const from = { ...mouse };
      const dx = x - from.x;
      const dy = y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = len * arc * (Math.random() < 0.5 ? -1 : 1);
      const start = Date.now();
      for (;;) {
        const t = Math.min(1, (Date.now() - start) / ms);
        const k = curve(t);
        const lift = Math.sin(Math.PI * k) * bend;
        const p = { x: from.x + dx * k + (-dy / len) * lift, y: from.y + dy * k + (dx / len) * lift };
        await page.mouse.move(p.x, p.y);
        await cursorTo(p);
        if (t >= 1) break;
        await sleep(8);
      }
      mouse = { x, y };
    },

    async press() {
      await page.mouse.down();
      await cursorPress(true);
    },
    async release() {
      await page.mouse.up();
      await cursorPress(false);
    },
    /** Click where the cursor is (glide there first). */
    async click() {
      await demo.press();
      await sleep(60);
      await demo.release();
    },
    /** Double-click where the cursor is: the drawn press plays twice, then the real dblclick. */
    async dblclick() {
      for (let c = 0; c < 2; c++) {
        await cursorPress(true);
        await sleep(45);
        await cursorPress(false);
        if (c === 0) await sleep(70);
      }
      await page.mouse.dblclick(mouse.x, mouse.y, { delay: 40 });
    },
    async type(text: string, delay = 55) {
      await page.keyboard.type(text, { delay });
    },

    /** Mark a stretch of real time to be time-lapsed down to `max` seconds in the edit. */
    squeezeStart() {
      return now();
    },
    squeezeEnd(start: number, max: number) {
      squeezes.push({ a: start, b: now(), max });
    },
    /** Wait for a condition; any real wait is time-lapsed to `max` seconds. */
    async waitFor(check: () => Promise<boolean>, max = 0.3, timeoutMs = 60_000) {
      if (await check()) return;
      const a = now();
      const limit = Date.now() + timeoutMs;
      while (!(await check())) {
        if (Date.now() > limit) throw new Error("waitFor timed out");
        await sleep(40);
      }
      squeezes.push({ a, b: now(), max });
    },

    /** Stop, stitch with real timestamps (squeezes applied), encode, clean up. Returns the mp4 path. */
    async finish(out: string, { holdMs = 1600 } = {}) {
      await sleep(holdMs);
      await cdp?.send("Page.stopScreencast");
      await sleep(300);
      await browser.close();
      const lines = ["ffconcat version 1.0"];
      for (let i = 0; i < frames.length; i++) {
        const t0 = frames[i]!.t;
        const t1 = i + 1 < frames.length ? frames[i + 1]!.t : t0 + 0.5;
        let d = t1 - t0;
        for (const w of squeezes) {
          const len = w.b - w.a;
          if (len <= w.max) continue;
          const overlap = Math.max(0, Math.min(t1, w.b) - Math.max(t0, w.a));
          d -= overlap * (1 - w.max / len);
        }
        lines.push(`file '${frames[i]!.file}'`, `duration ${Math.max(0.001, d).toFixed(4)}`);
      }
      lines.push(`file '${frames.at(-1)!.file}'`);
      const list = join(framesDir, "frames.ffconcat");
      writeFileSync(list, lines.join("\n"));
      const target = out.replace(/^~/, homedir());
      const ff = Bun.spawnSync(
        [
          "ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
          "-vf", "scale='min(1920,iw)':-2:flags=lanczos,fps=60,format=yuv420p",
          "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", target,
        ],
        { stdout: "inherit", stderr: "inherit" },
      );
      if (ff.exitCode !== 0) throw new Error(`ffmpeg failed; frames kept in ${framesDir}`);
      rmSync(framesDir, { recursive: true, force: true });
      const span = frames.length ? frames.at(-1)!.t - frames[0]!.t : 0;
      const squeezed = squeezes.map((w) => `${(w.b - w.a).toFixed(1)}s→${Math.min(w.max, w.b - w.a)}s`).join(", ");
      console.log(`${target}: ${frames.length} frames over ${span.toFixed(1)}s${squeezed ? `, squeezed ${squeezed}` : ""}`);
      return target;
    },
  };
  return demo;
}
