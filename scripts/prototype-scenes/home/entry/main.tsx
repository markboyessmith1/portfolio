// The my-canvas-prototype home page, standing alone: the app's real shell
// (NavigationShell + sidebar), home layout (header, prompt bar) and home page
// (greeting, card fan, the card detail with its chat), with the session hooks at
// rest (./shims) and a scripted cursor that works the page through real pointer
// events — so every hover lift, tilt, video, emoji and spin is the app's own.
//
// It plays to a director: the parent frame posts { type: "home-step", step } for
// each beat (see HomeToBoardScene in the C26 prototype). Every frame this page posts
// back { type: "home-cam", cx, cy, w } (or { wide: true }) — where the camera should
// look, following the cursor — and, on the last click, { type: "home-card", rect }.
import "./env";
import { useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SidebarProvider } from "@/providers/SidebarProvider";
import { NavigationShell } from "@/components/NavigationShell";
import { useSidebar } from "@/hooks/useSidebar";
import HomeLayout from "@/app/(home)/layout";
import HomePage from "@/app/(home)/page";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const tell = (msg: object) => window.parent?.postMessage(msg, "*");

/* ————— the cursor: Miro's arrow, on a spring, taking the page's pointer with it ————— */

// The cursor every portfolio scene draws for "you": Miro's wedge (cursorParts'
// CURSOR_PATH, 16-unit box, tip at the top-left), ink with a white keyline.
const CURSOR_PATH = "M12.001 4.162V5.389L11.999 5.4C8.386 5.4 5.4 8.386 5.4 11.999L5.393 12H4.161L0 0.707V0.6L0.6 0H0.707L12.001 4.162Z";
const cursor = document.createElement("div");
cursor.style.cssText = "position:fixed;left:0;top:0;z-index:99999;pointer-events:none;opacity:0;transition:opacity 300ms ease;will-change:transform";
const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
arrow.setAttribute("width", "22");
arrow.setAttribute("height", "22");
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

const FAN_CARD = "div.absolute.cursor-pointer";
let over: HTMLElement | null = null;
/** Put the pointer at (x, y): hover what's under it, the way a mouse would. */
function pointAt(x: number, y: number) {
  cursor.style.transform = `translate(${x}px, ${y}px)`;
  const hit = (document.elementsFromPoint(x, y).map((e) => e.closest<HTMLElement>(FAN_CARD)).find(Boolean) ?? null) as HTMLElement | null;
  const where = { clientX: x, clientY: y, bubbles: true };
  if (hit !== over) {
    if (over?.isConnected) {
      over.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse", clientX: x, clientY: y }));
      over.firstElementChild?.dispatchEvent(new MouseEvent("mouseout", { ...where, relatedTarget: document.body }));
    }
    over = hit;
    if (hit) {
      hit.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse", clientX: x, clientY: y }));
      hit.firstElementChild?.dispatchEvent(new MouseEvent("mouseover", { ...where, relatedTarget: document.body }));
    }
  }
  hit?.firstElementChild?.dispatchEvent(new MouseEvent("mousemove", where));
}

/* One loop moves everything, as the other scenes do: the cursor is a critically
   damped spring chasing its mark (so it accelerates, travels and settles like a
   hand, and a new mark mid-move bends the path instead of restarting it), and
   each frame the page tells the director where to look — the cursor, pulled
   towards what this beat is about — so the camera rides with the hand. */
const pos = { x: 0, y: 0 };
const vel = { x: 0, y: 0 };
const mark = { x: 0, y: 0 };
let omega = 6;
let drift = 0; // px of idle wander around the mark (a hand resting on a card)
let active = false; // the cursor is in the scene
// The camera's brief: a subject to keep in frame, how much of the page to show, and
// how far the camera leans from the subject towards the cursor (0..1).
const shot = { x: 0, y: 0, w: 0, lean: 0.55 };
let wide = true;
let t = 0;
let then = performance.now();
function frame(now: number) {
  const dt = Math.min((now - then) / 1000, 1 / 20);
  then = now;
  t += dt;
  if (active) {
    const wx = drift ? Math.cos(t * 2.1) * drift : 0;
    const wy = drift ? Math.sin(t * 2.7) * drift * 0.7 : 0;
    for (const k of ["x", "y"] as const) {
      const to = mark[k] + (k === "x" ? wx : wy);
      vel[k] += (omega * omega * (to - pos[k]) - 2 * omega * vel[k]) * dt;
      pos[k] += vel[k] * dt;
    }
    pointAt(pos.x, pos.y);
  }
  tell(
    wide || !active
      ? { type: "home-cam", wide: true }
      : { type: "home-cam", cx: shot.x + (pos.x - shot.x) * shot.lean, cy: shot.y + (pos.y - shot.y) * shot.lean, w: shot.w },
  );
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
      const far = Math.hypot(pos.x - x, pos.y - y);
      if ((far < near && Math.hypot(vel.x, vel.y) < 260) || performance.now() - t0 > 2500) return done();
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}
/** Swoop: aim past a waypoint and peel off for the mark before reaching it, so the
 *  path arcs rather than corners. */
async function swoop(via: { x: number; y: number }, x: number, y: number, snap = 5) {
  await moveTo(via.x, via.y, snap, 140);
  await moveTo(x, y, snap);
}
async function press(act: () => void) {
  arrow.style.transform = "scale(0.84)";
  await sleep(120);
  act();
  arrow.style.transform = "none";
  await sleep(140);
}
function frameOn(r: { x: number; y: number; width: number; height: number }, w: number, lean = 0.55) {
  shot.x = r.x + r.width / 2;
  shot.y = r.y + r.height / 2;
  shot.w = w;
  shot.lean = lean;
  wide = false;
}

/* ————— the beats ————— */

const box = (el: Element) => el.getBoundingClientRect();
const fanCards = () => [...document.querySelectorAll<HTMLElement>(FAN_CARD)];
const gold = () => document.querySelector<HTMLElement>("[data-fan-card]")?.closest<HTMLElement>(FAN_CARD) ?? null;

const BEATS: Record<number, () => Promise<void>> = {
  // 2 — swoop in from the corner and run along the fan: each card lifts as it's passed.
  2: async () => {
    const cards = fanCards();
    if (!cards.length) return;
    const fan = cards.map(box);
    const all = { x: fan[0]!.x, y: Math.min(...fan.map((b) => b.y)), width: fan.at(-1)!.right - fan[0]!.x, height: Math.max(...fan.map((b) => b.bottom)) - Math.min(...fan.map((b) => b.y)) };
    // Enter from off the bottom-right edge, already moving.
    pos.x = window.innerWidth + 40;
    pos.y = window.innerHeight - 40;
    vel.x = -900;
    vel.y = -300;
    active = true;
    cursor.style.opacity = "1";
    frameOn(all, 980, 0.35);
    const spot = (i: number, fx = 0.5, fy = 0.4) => ({ x: fan[i]!.x + fan[i]!.width * fx, y: fan[i]!.y + fan[i]!.height * fy });
    const last = cards.length - 1;
    const p = spot(last, 0.62);
    await swoop({ x: p.x + 120, y: p.y + 150 }, p.x, p.y, 5.5);
    // Along the fan: marks handed over before arriving, so it's one continuous sweep.
    for (let i = last - 1; i >= 0; i--) {
      const q = spot(i, i === 0 ? 0.42 : 0.5, i % 2 ? 0.46 : 0.36);
      await moveTo(q.x, q.y, 6.5, 40);
    }
    await sleep(250);
  },
  // 3 — back across to the gold Talktrack card and rest on it: it loads, then plays.
  3: async () => {
    const card = gold();
    if (!card) return;
    const b = box(card);
    frameOn(b, 700, 0.4);
    await moveTo(b.x + b.width * 0.56, b.y + b.height * 0.52, 5.5);
    drift = 8;
  },
  // 4 — react: a few emoji from the bar the playing card grows.
  4: async () => {
    const card = gold();
    if (!card) return;
    drift = 0;
    const buttons = [...card.querySelectorAll<HTMLButtonElement>("button")];
    frameOn(box(card), 640, 0.3);
    for (const i of [0, 2, 3]) {
      const btn = buttons[i];
      if (!btn) continue;
      const b = box(btn);
      await moveTo(b.x + b.width / 2, b.y + b.height / 2 + 1, 8, 3);
      await press(() => btn.click());
      await sleep(220);
    }
  },
  // 5 — click the card: it spins up to the top and its chat streams in underneath;
  //     the camera eases back to take in the conversation.
  5: async () => {
    const card = gold();
    if (!card) return;
    const b = box(card);
    await moveTo(b.x + b.width * 0.5, b.y + b.height * 0.42, 7, 4);
    await press(() => card.click());
    over = null;
    const mid = (document.querySelector("main")?.getBoundingClientRect().left ?? 0) / 2 + window.innerWidth / 2;
    frameOn({ x: mid - 300, y: 40, width: 600, height: 560 }, 820, 0.2);
    await sleep(350);
    await moveTo(mid + 240, 330, 3.5);
  },
  // 6 — up onto the card and click through; the director pushes the camera into it.
  6: async () => {
    const card = document.querySelector<HTMLElement>('div[style*="perspective: 1200px"] > div');
    if (!card) return;
    const b = box(card);
    frameOn(b, 560, 0.3);
    await moveTo(b.x + b.width * 0.55, b.y + b.height * 0.55, 6, 4);
    tell({ type: "home-card", rect: { x: b.x, y: b.y, w: b.width, h: b.height } });
    await press(() => {});
  },
};

/* ————— the page ————— */

// The sidebar starts tucked away and pops out once the page is up.
function SidebarEntrance() {
  const { forceCollapse } = useSidebar();
  useLayoutEffect(() => {
    // Tucked from the first frame (the app would otherwise animate it shut).
    const tuck = document.createElement("style");
    tuck.textContent = ".h-screen > .flex-shrink-0.relative:first-child { width: 0 !important }";
    document.head.append(tuck);
    forceCollapse(true);
    const a = setTimeout(() => tuck.remove(), 420);
    const b = setTimeout(() => forceCollapse(false), 700);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      tuck.remove();
    };
  }, [forceCollapse]);
  return null;
}

function Home() {
  return (
    <SidebarProvider>
      <SidebarEntrance />
      <NavigationShell>
        <HomeLayout>
          <HomePage />
        </HomeLayout>
      </NavigationShell>
    </SidebarProvider>
  );
}

function Stage() {
  // `run` remounts the app for each playthrough, so its entrances play again.
  const [run, setRun] = useState(0);
  useEffect(() => {
    let step = -1;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "home-step" || e.data.step === step) return;
      step = e.data.step as number;
      take++;
      if (step <= 1) {
        cursor.style.opacity = "0";
        active = false;
        wide = true;
        drift = 0;
        over = null;
        setRun(step === 1 ? (n) => n + 1 : 0);
        return;
      }
      setRun((n) => n || 1); // joined mid-story: have the page up
      void BEATS[step]?.();
    };
    window.addEventListener("message", onMessage);
    tell({ type: "home-ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return run ? <Home key={run} /> : null;
}

document.body.append(cursor);
createRoot(document.getElementById("root")!).render(<Stage />);
