// The my-canvas-prototype toolbar, standing alone on the sunshine ground of the
// "A handful of tools…" card: the app's real Toolbar (its tool row, chat input and
// voice mode, all its own motion), with a script that edits it and a cursor that
// works it through real pointer events.
//
// The story, in two halves:
//   compaction — the toolbar arrives as one long bar of tools; every tool that isn't
//     in the unified bar drops and collapses away, one after another, until only
//     cursor, comment, pen, sticky, reactions and more are left;
//   the AI arrives — "What shall we do next?" grows out of the bar's end, the voice
//     button pops in, the cursor clicks it and the bar splits into voice mode like
//     liquid (the two halves pull apart, a neck between them thins to nothing and
//     their corners round off), listens, speaks, and is clicked shut (they flow back).
//
// The white of the bar is drawn by this page, not the app: a layer under the toolbar
// traces its sections every frame through a gooey SVG filter (blur + alpha threshold),
// so wherever the halves are close they melt together. The app's own fills and
// shadows are switched off to let it show through.
//
// It plays to a director (ToolbarVoiceScene in the C26 prototype): the parent posts
// { type: "page-step", step }; every frame this page posts back { type: "page-cam", w }
// — how much of the page to show. The camera only zooms, centred on the bar.
import "./env";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { IconArrowUpCircle, IconFrame, IconImage, IconKanban, IconLink, IconSmileySticker, IconTimer } from "@mirohq/design-system-icons";
import { PanelProvider } from "@/providers/PanelProvider";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { primaryTools, type ToolDef } from "@/components/toolbar/toolbar-data";
import { SPRING, TOOLBAR_HEIGHT } from "@/components/toolbar/toolbar-constants";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const tell = (msg: object) => window.parent?.postMessage(msg, "*");

// The toolbar chimes in and out of voice mode; a portfolio card stays silent.
const play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
  return this instanceof HTMLAudioElement ? Promise.resolve() : play.call(this);
};

// The split's spring (the app's connected ↔ disconnected morph), re-tuned to be quick
// but nearly critically damped: a snappy ease-in-out with only a hint of settle rather
// than the app's wobble. The toolbar reads this object on every render.
Object.assign(SPRING, { stiffness: 340, damping: 24, mass: 0.9 });

/* ————— the tool rows ————— */

const real = Object.fromEntries(primaryTools.map((t) => [t.id, t])) as Record<string, ToolDef>;
const plain = (id: string, label: string, icon: ToolDef["icon"]) => ({ id, label, icon }) as ToolDef;
// Reactions: the app's sticker & emoji tool (the toolbar opens its emoji panel for it).
const reactions = { id: "emoji", label: "Reactions", icon: IconSmileySticker, actionType: "emoji" } as unknown as ToolDef;
/** Where it ends: the unified bar. */
const SIX = [real.select!, real.comment!, real.draw!, real.sticky!, reactions, real.create!];
/** Where it starts: the same six with the rest of the old chrome threaded between
 *  them, so taking the extras away leaves the six in place, in order. */
const CROWDED = [
  real.select!, real.layouts!, real.comment!, real.text!, real.draw!, real.shapes!, real.sticky!,
  plain("frame", "Frame", IconFrame), plain("kanban", "Kanban", IconKanban), reactions,
  plain("image", "Image", IconImage), plain("timer", "Timer", IconTimer),
  plain("upload", "Upload", IconArrowUpCircle), plain("embed", "Embed", IconLink), real.create!,
];
/** The order the extras go in: from the far end in, then the near ones. */
const FOLD = ["embed", "upload", "timer", "image", "kanban", "frame", "shapes", "text", "layouts"];

/** The Toolbar reads the app's `primaryTools` on every render: edit it in place, then re-render. */
function setTools(list: ToolDef[]) {
  primaryTools.splice(0, primaryTools.length, ...list);
  rerender();
}
let rerender = () => {};
type Voice = "idle" | "connecting" | "listening" | "speaking";
let voice: Voice = "idle";
let setVoice = (_v: Voice) => {};
let setChat = (_on: boolean) => {};

/** Stage flags, as classes on <body> the stylesheet below keys off. */
const flag = (name: string, on: boolean) => document.body.classList.toggle(name, on);

/* ————— the stylesheet: the app's toolbar, re-skinned for the liquid layer ————— */

const ROW = "[data-toolbar] > .relative.flex";
const css = document.createElement("style");
css.textContent = `
/* The fills and shadows are the goo layer's now. */
${ROW} > div:not(.pointer-events-none) { background-color: transparent !important; box-shadow: none !important;
  /* corners round off in step with the halves parting, so the split reads as one motion */
  transition: border-radius 480ms cubic-bezier(0.65, 0, 0.35, 1) !important; }
${ROW} > div.pointer-events-none { display: none !important; }
/* The AI arrives: the prompt grows out of the end of the bar. */
${ROW} > div:nth-child(2):not(.pointer-events-none) { overflow: hidden; animation: tb-grow 760ms cubic-bezier(0.65, 0, 0.35, 1) both; }
@keyframes tb-grow {
  from { max-width: 0; padding-left: 0; padding-right: 0; }
  to { max-width: 320px; padding-left: 8px; padding-right: 8px; }
}
${ROW} form { animation: tb-fade 500ms ease 260ms both; }
@keyframes tb-fade { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
/* … then the voice button pops in (and again whenever the prompt comes back). */
body:not(.tb-voice-in) ${ROW} form button[type=button] { opacity: 0; transform: scale(0.2); }
body.tb-voice-in ${ROW} form button[type=button] { animation: tb-pop 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes tb-pop { from { opacity: 0; transform: scale(0.2); } 35% { opacity: 1; } to { opacity: 1; transform: none; } }
`;
document.head.append(css);

/* ————— the liquid layer ————— */

// Blur radius of the goo: two edges closer than ~1.35× this melt into one.
const GOO = 9;
/** A rect with its own radius per corner [tl, tr, br, bl], as a path. */
function roundRect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: number[]) {
  return `M${x + tl},${y}H${x + w - tr}A${tr},${tr} 0 0 1 ${x + w},${y + tr}V${y + h - br}A${br},${br} 0 0 1 ${x + w - br},${y + h}H${x + bl}A${bl},${bl} 0 0 1 ${x},${y + h - bl}V${y + tl}A${tl},${tl} 0 0 1 ${x + tl},${y}Z`;
}
// The split: when the halves start to part, a bridge between them (in the goo, a neck)
// thins from the bar's full height to nothing.
let splitAt = 0;
let parted = false;
function drawGoo(now: number) {
  const svg = document.getElementById("tb-goo");
  const row = document.querySelector(ROW);
  if (!svg || !row) return;
  const wrap = row.parentElement?.parentElement;
  if (wrap) svg.style.opacity = getComputedStyle(wrap).opacity;
  const parts = [...row.children].filter((e) => !e.classList.contains("pointer-events-none")) as HTMLElement[];
  const rects = parts.map((el) => el.getBoundingClientRect());
  parts.forEach((el, i) => {
    const r = rects[i]!;
    const cs = getComputedStyle(el);
    const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v) =>
      Math.max(0, Math.min(parseFloat(v) || 0, r.height / 2, r.width / 2)),
    );
    document.getElementById(`tb-goo-${i}`)?.setAttribute("d", r.width > 0.5 ? roundRect(r.x, r.y, r.width, r.height, radii) : "");
  });
  if (parts.length < 2) document.getElementById("tb-goo-1")?.setAttribute("d", "");
  const bridge = document.getElementById("tb-goo-bridge");
  const [a, b] = rects;
  const gap = a && b && b.width > 0.5 ? b.left - a.right : 0;
  if (gap > 0.5 && !parted) {
    parted = true;
    splitAt = now;
  } else if (gap <= 0.5) parted = false;
  const t = parted ? Math.min((now - splitAt) / 520, 1) : 1;
  const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; // ease-in-out (cubic)
  const h = parted && a && b ? TOOLBAR_HEIGHT * (1 - e) : 0; // down to nothing
  if (bridge && a && b && h > 1) {
    const cy = a.top + a.height / 2;
    bridge.setAttribute("d", roundRect(a.right - 30, cy - h / 2, gap + 60, h, Array(4).fill(h / 2)));
  } else bridge?.setAttribute("d", "");
}

/* ————— the cursor: Miro's arrow, on a spring, taking the page's pointer with it ————— */

// The cursor every portfolio scene draws for "you": Miro's wedge (cursorParts'
// CURSOR_PATH, 16-unit box, tip at the top-left), ink with a white keyline.
const CURSOR_PATH = "M12.001 4.162V5.389L11.999 5.4C8.386 5.4 5.4 8.386 5.4 11.999L5.393 12H4.161L0 0.707V0.6L0.6 0H0.707L12.001 4.162Z";
const cursor = document.createElement("div");
cursor.style.cssText = "position:fixed;left:0;top:0;z-index:99999;pointer-events:none;opacity:0;transition:opacity 300ms ease;will-change:transform";
const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
arrow.setAttribute("width", "26");
arrow.setAttribute("height", "26");
arrow.setAttribute("viewBox", "0 0 16 16");
arrow.setAttribute("fill", "none");
arrow.style.cssText = "display:block;transform-origin:0 0;transition:transform 160ms cubic-bezier(0.16,1,0.3,1);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25))";
const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
wedge.setAttribute("d", CURSOR_PATH);
wedge.setAttribute("fill", "#1c1c1e");
wedge.setAttribute("stroke", "white");
wedge.setAttribute("stroke-width", "1");
wedge.setAttribute("stroke-linejoin", "round");
arrow.append(wedge);
cursor.append(arrow);

/* A mouse, as the page sees one: over/out (which React's enter/leave derive from)
   and enter/leave down the element chain (which framer-motion listens for), then
   a move — so hover animations and the voice button's blob are real. */
let over: Element | null = null;
const lineage = (el: Element | null) => {
  const out: Element[] = [];
  for (let e = el; e; e = e.parentElement) out.push(e);
  return out;
};
function pointAt(x: number, y: number) {
  cursor.style.transform = `translate(${x}px, ${y}px)`;
  const el = document.elementFromPoint(x, y);
  const at = { clientX: x, clientY: y, view: window, cancelable: true };
  const ptr = { ...at, pointerType: "mouse", isPrimary: true, pointerId: 1 };
  if (el !== over) {
    const from = lineage(over?.isConnected ? over : null);
    const to = lineage(el);
    if (from[0]) {
      from[0].dispatchEvent(new PointerEvent("pointerout", { ...ptr, bubbles: true, relatedTarget: el }));
      from[0].dispatchEvent(new MouseEvent("mouseout", { ...at, bubbles: true, relatedTarget: el }));
    }
    for (const e of from) {
      if (to.includes(e)) break;
      e.dispatchEvent(new PointerEvent("pointerleave", { ...ptr, relatedTarget: el }));
      e.dispatchEvent(new MouseEvent("mouseleave", { ...at, relatedTarget: el }));
    }
    if (el) {
      el.dispatchEvent(new PointerEvent("pointerover", { ...ptr, bubbles: true, relatedTarget: from[0] ?? null }));
      el.dispatchEvent(new MouseEvent("mouseover", { ...at, bubbles: true, relatedTarget: from[0] ?? null }));
      for (const e of to.filter((e) => !from.includes(e)).reverse()) {
        e.dispatchEvent(new PointerEvent("pointerenter", { ...ptr, relatedTarget: from[0] ?? null }));
        e.dispatchEvent(new MouseEvent("mouseenter", { ...at, relatedTarget: from[0] ?? null }));
      }
    }
    over = el;
  }
  el?.dispatchEvent(new PointerEvent("pointermove", { ...ptr, bubbles: true }));
  el?.dispatchEvent(new MouseEvent("mousemove", { ...at, bubbles: true }));
}

/* One loop moves everything, as the other scenes do: the cursor is a critically
   damped spring chasing its mark (it accelerates, travels and settles like a hand),
   the liquid layer traces the bar, and the page tells the director how wide a shot
   it wants — the camera zooms on the bar and never travels. */
const pos = { x: 0, y: 0 };
const vel = { x: 0, y: 0 };
const mark = { x: 0, y: 0 };
let omega = 6;
let active = false;
let shotW = 1100;
let then = performance.now();
function frame(now: number) {
  const dt = Math.min((now - then) / 1000, 1 / 20);
  then = now;
  if (active) {
    for (const k of ["x", "y"] as const) {
      vel[k] += (omega * omega * (mark[k] - pos[k]) - 2 * omega * vel[k]) * dt;
      pos[k] += vel[k] * dt;
    }
    pointAt(pos.x, pos.y);
  }
  drawGoo(now);
  tell({ type: "page-cam", w: shotW });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// One story at a time: a new beat (or a replay) retires whatever was still moving.
let take = 0;
/** Steer to (x, y) and resolve once the hand has (nearly) arrived. `snap` sets how
 *  quick the hand is (the spring's ω); `near` how close counts as there. */
function moveTo(x: number, y: number, snap = 6, near = 6) {
  const mine = take;
  mark.x = x;
  mark.y = y;
  omega = snap;
  return new Promise<void>((done) => {
    const t0 = performance.now();
    const check = () => {
      if (mine !== take) return done();
      if ((Math.hypot(pos.x - x, pos.y - y) < near && Math.hypot(vel.x, vel.y) < 260) || performance.now() - t0 > 2500) return done();
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}
/** Press and release on `el` (so framer's tap scale plays), then click it. */
async function press(el: Element) {
  const r = el.getBoundingClientRect();
  const at = { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true, view: window, pointerType: "mouse", isPrimary: true, pointerId: 1, button: 0 };
  arrow.style.transform = "scale(0.84)";
  el.dispatchEvent(new PointerEvent("pointerdown", { ...at, buttons: 1 }));
  await sleep(120);
  el.dispatchEvent(new PointerEvent("pointerup", { ...at, buttons: 0 }));
  (el as HTMLElement).click();
  arrow.style.transform = "none";
  await sleep(140);
}

/* ————— the beats ————— */

const centre = (el: Element | null | undefined, fy = 0.5) => {
  const r = el?.getBoundingClientRect();
  return r ? { x: r.x + r.width / 2, y: r.y + r.height * fy } : null;
};
const toolButtons = () => [...document.querySelectorAll<HTMLElement>(`${ROW} > div:first-child button`)];
const voiceButton = () => document.querySelector(`${ROW} form button[type=button]`);
const stopButton = () => document.querySelector(`${ROW} > div:nth-child(2) > button`);

const BEATS: Record<number, () => Promise<void>> = {
  // 2 — compaction: each extra tool drops and shrinks, then its slot collapses shut.
  2: async () => {
    const mine = take;
    // Buttons by tool, while the row is still in CROWDED order.
    const byId = new Map(toolButtons().map((b, i) => [CROWDED[i]?.id, b]));
    shotW = 700;
    for (const id of FOLD) {
      if (mine !== take) return;
      const btn = byId.get(id);
      if (btn) {
        btn.style.transition = "transform 300ms cubic-bezier(0.55, 0, 0.75, 0.2), opacity 220ms ease 60ms";
        btn.style.transform = "translateY(14px) scale(0.4)";
        btn.style.opacity = "0";
      }
      setTimeout(() => mine === take && setTools(primaryTools.filter((t) => t.id !== id)), 150);
      await sleep(115);
    }
  },
  // 3 — the AI arrives: "What shall we do next?" grows out of the end of the bar.
  3: async () => {
    shotW = 860;
    setChat(true);
  },
  // 4 — and the voice button pops in.
  4: async () => {
    flag("tb-voice-in", true);
  },
  // 5 — the cursor comes in and clicks it: the bar splits into voice mode.
  5: async () => {
    const btn = voiceButton();
    const p = centre(btn);
    if (!btn || !p) return;
    pos.x = p.x + 200;
    pos.y = window.innerHeight + 30;
    vel.x = -260;
    vel.y = -1000;
    active = true;
    cursor.style.opacity = "1";
    await moveTo(p.x, p.y + 2, 5.5, 3);
    await sleep(380);
    shotW = 920;
    await press(btn);
    // Off the button a touch, so the listening animation is in the clear.
    await sleep(700);
    await moveTo(p.x + 24, p.y + 56, 3);
  },
  // 6 — the AI answers: the button switches to its speaking animation.
  6: async () => {
    setVoice("speaking");
  },
  // 7 — back to listening; the cursor comes back to the button to end it.
  7: async () => {
    setVoice("listening");
    await sleep(300);
    const p = centre(stopButton());
    if (p) await moveTo(p.x, p.y + 2, 5, 3);
  },
  // 8 — click: out of voice mode, the halves flow back together; the cursor drifts off.
  8: async () => {
    const btn = stopButton();
    if (btn && voice !== "idle") await press(btn);
    shotW = 860;
    await sleep(600);
    const p = centre(voiceButton());
    if (p) await moveTo(p.x + 60, p.y - 130, 2.6);
  },
};

/* ————— the page ————— */

/** `#rest`: no story and no ground. The finished unified bar (six tools, the prompt and
 *  the voice button) alone on a clear page, live, for laying over a board (the miro-ai
 *  hero, components/miro/BoardChrome). See the REST block at the foot. */
const REST = location.hash.includes("rest");
const GROUND = REST ? "transparent" : "#FCDA30"; // the card's sunshine ground (sampled from toolbar-agentic.mp4) — guardrails-allow: brand ground

function App({ leaving }: { leaving: boolean }) {
  const [, bump] = useState(0);
  const [v, setV] = useState<Voice>("idle");
  const [chat, setC] = useState(false);
  const [shown, setShown] = useState(false);
  rerender = () => bump((n) => n + 1);
  voice = v;
  setVoice = setV;
  setChat = setC;
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // The real toggle: idle → connecting → listening; any active state → idle.
  const onVoiceToggle = () => {
    if (voice !== "idle") return setV("idle");
    setV("connecting");
    setTimeout(() => voice === "connecting" && setVoice("listening"), 450);
  };
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: GROUND }}>
      {/* The bar's white: its sections, traced each frame and melted together where they're close. */}
      <svg
        id="tb-goo"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
          filter: "drop-shadow(0 6px 8px rgba(34,36,40,0.12)) drop-shadow(0 0 4px rgba(34,36,40,0.06))",
        }}
      >
        <defs>
          <filter id="tb-goo-filter" x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={GOO} />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -14" />
          </filter>
        </defs>
        <g filter="url(#tb-goo-filter)" fill="#fff">
          <path id="tb-goo-0" />
          <path id="tb-goo-bridge" />
          <path id="tb-goo-1" />
        </g>
      </svg>
      {/* The toolbar pins itself bottom-centre of its box: this puts its middle at the page's. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: TOOLBAR_HEIGHT + 24 + 30,
          marginTop: -(30 + TOOLBAR_HEIGHT / 2),
          opacity: shown && !leaving ? 1 : 0,
          transform: shown ? "none" : "translateY(28px) scale(0.96)",
          transition: "opacity 360ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* `isChatOpen` hides the prompt half: the bar starts as tools alone. */}
        <Toolbar onSubmit={() => {}} isLoading={false} voiceState={v} onVoiceToggle={onVoiceToggle} isChatOpen={!chat} />
      </div>
    </div>
  );
}

/** The bar as it stands at `step`, for joining mid-story (or reduced motion, at the end). */
function standAt(step: number) {
  primaryTools.splice(0, primaryTools.length, ...(step >= 3 ? SIX : CROWDED));
  flag("tb-voice-in", step >= 5);
  shotW = step >= 3 ? 860 : step === 2 ? 700 : 1100;
}

function Stage() {
  // `run` remounts the app for each playthrough, so its entrance plays again.
  const [run, setRun] = useState(REST ? 1 : 0);
  // A replay fades the finished bar out (step 0) before the next run mounts (step 1).
  const [leaving, setLeaving] = useState(false);
  const [chatFrom, setChatFrom] = useState(REST);
  useEffect(() => {
    if (REST) return;
    let step = -1;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "page-step" || e.data.step === step) return;
      const prev = step;
      step = e.data.step as number;
      take++;
      if (step <= 1) {
        cursor.style.opacity = "0";
        active = false;
        over = null;
        setLeaving(step === 0);
        if (step === 1) {
          standAt(1);
          setChatFrom(false);
          setRun((n) => n + 1);
        }
        return;
      }
      if (prev < 1) {
        standAt(step);
        setChatFrom(step >= 3);
        setRun((n) => n || 1);
      }
      void BEATS[step]?.();
    };
    window.addEventListener("message", onMessage);
    tell({ type: "page-ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);
  useEffect(() => {
    if (chatFrom) setChat(true);
  }, [chatFrom, run]);
  return run ? (
    <PanelProvider>
      <App key={run} leaving={leaving} />
    </PanelProvider>
  ) : (
    <div style={{ position: "fixed", inset: 0, backgroundColor: GROUND }} />
  );
}

standAt(REST ? 5 : 1);
if (REST) {
  // The bar as it is, its liquid layer and all (the voice split, the chat split), with:
  // - nothing popping up: the tools hover, press and select, but their menus, palettes
  //   and panels (all opened above the bar) and tooltips stay hidden;
  // - one set of corners in every state (rest, chat, voice):
  //   · the bar's pieces 16px on every outer corner (the liquid's blur rounds them a touch further); where the two halves touch, the
  //     joint is square (.tb-joined, measured each frame), so it reads as one bar;
  //   · everything 8px in from the edge 12px: the tool highlight and buttons,
  //     the prompt field and voice's yellow listening pill;
  //   · the buttons inside the prompt field (voice, send), 4px in from it, 8px.
  const rest = document.createElement("style");
  rest.textContent = `
    html, body, #root { background: transparent !important; color-scheme: light; }
    [data-toolbar] > :not(.relative.flex), [data-toolbar] .bottom-full,
    [role="tooltip"], [data-radix-popper-content-wrapper] { display: none !important; }
    ${ROW} > div:not(.pointer-events-none) { border-radius: 16px !important; }
    body.tb-joined ${ROW} > div:not(.pointer-events-none):first-child { border-radius: 16px 0 0 16px !important; }
    body.tb-joined ${ROW} > div:not(.pointer-events-none):nth-child(2) { border-radius: 0 16px 16px 0 !important; }
    ${ROW} > div:first-child button, ${ROW} > div:first-child .absolute,
    ${ROW} form > div, ${ROW} [class*="rounded-[18px]"],
    ${ROW} > div:nth-child(2) > button { border-radius: 12px !important; }
    ${ROW} form button { border-radius: 8px !important; }
  `;
  document.head.append(rest);
  // joined: both halves showing and touching (no gap between them)
  const watch = () => {
    const parts = [...(document.querySelector(ROW)?.children ?? [])].filter((e) => !e.classList.contains("pointer-events-none"));
    const [a, b] = parts.map((e) => e.getBoundingClientRect());
    flag("tb-joined", !!(a && b && b.width > 0.5 && b.left - a.right <= 0.5));
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
}
document.body.append(cursor);
createRoot(document.getElementById("root")!).render(<Stage />);
