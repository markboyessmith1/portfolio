// Worked example: the sticky stack "endless ideas" video.
//   bun <skill>/scripts/examples/sticky-stack.ts ~/Desktop/sticky-stack.mp4
// Off camera: an empty stack, zoomed and centered, chrome hidden. On camera:
// the cursor titles it, Jev writes (time-lapsed), stickies are pulled off
// faster and faster into a short grid, then a pile until the screen is covered.
import { EASE_IN_OUT, EASE_OUT, sleep, startDemo } from "../demo-kit.ts";

const OUT = process.argv[2] ?? "~/Desktop/sticky-stack.mp4";
const TITLE = "apps for cats";
const TARGET_SHEET = 230; // px on screen for the top sheet

const demo = await startDemo({ board: "endless-ideas" });
const { page, view } = demo;
const sticky = page.getByRole("button", { name: "Sticky note", exact: true });
await sticky.waitFor();
await sleep(1200);

// ── Off camera: an empty, untitled stack in the middle ───────────────────────
await sticky.click();
await page.getByRole("menuitem", { name: "Sticky note stack" }).click();
await page.getByRole("textbox", { name: "Stack name" }).waitFor();
await page.keyboard.press("Escape"); // empty title: "Untitled stack"
await sleep(200);
await page.keyboard.press("Escape"); // deselect

// The pad's own button ("Add sticky note … from <title>"), not the pill's "Add sticky note".
const pad = page.locator('button[aria-label^="Add sticky note"][aria-label*=" from "]').first();
// Zoom: ctrl+wheel scales by exp(-deltaY / 100) around the pointer.
for (let pass = 0; pass < 6; pass++) {
  const b = (await pad.boundingBox())!;
  if (Math.abs(b.width - TARGET_SHEET) < 3) break;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -Math.log(TARGET_SHEET / b.width) * 100);
  await page.keyboard.up("Control");
  await sleep(300);
}
// The card around the pad (layout units of a 200px sheet: title above, padding around).
const cardOf = (b: { x: number; y: number; width: number; height: number }) => {
  const k = b.width / 200;
  return { x: b.x - 28 * k, y: b.y - 88 * k, w: b.width + 56 * k, h: b.height + 116 * k };
};
// Center it: plain wheel pans the canvas.
for (let i = 0; i < 300; i++) {
  const c = cardOf((await pad.boundingBox())!);
  const dx = c.x + c.w / 2 - view.width / 2;
  const dy = c.y + c.h / 2 - view.height / 2;
  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) break;
  await page.mouse.wheel(Math.max(-40, Math.min(40, dx / 3)), Math.max(-40, Math.min(40, dy / 3)));
  await sleep(10);
}
await demo.boardOnly();
await sleep(600);

const box = (await pad.boundingBox())!;
const sheet = box.width;
const grab = { x: box.x + sheet / 2, y: box.y + sheet / 2 };
const card = cardOf(box);
const hasIdea = async () => ((await pad.getAttribute("aria-label")) ?? "").startsWith("Add sticky note “");

await demo.record();

// ── Title it ─────────────────────────────────────────────────────────────────
await demo.glide(card.x + card.w * 0.36, card.y + 46 * (sheet / 200), 650, EASE_OUT, 0.05);
await sleep(180);
await demo.dblclick();
await page.getByRole("textbox", { name: "Stack name" }).waitFor();
await sleep(220);
await demo.type(TITLE);
await sleep(200);
await page.keyboard.press("Enter");
// Enter → first idea: one quick time-lapse (a flash of "Writing ideas…").
const writing = demo.squeezeStart();
await page.keyboard.press("Escape");
await demo.glide(grab.x + sheet * 0.12, grab.y + sheet * 0.18, 380, EASE_IN_OUT, 0.04);
await sleep(300);
while (!(await hasIdea())) await sleep(40);
await sleep(120);
demo.squeezeEnd(writing + 0.05, 0.6);
await sleep(300);

// ── The deal: four beside the stack, then a pile until the screen is covered ─
const gap = Math.round(sheet * 0.08);
const rightX = card.x + card.w + gap + sheet / 2;
const leftX = card.x - gap - sheet / 2;
const rowY = (r: number) => box.y + box.height / 2 + (r === 0 ? -1 : 1) * (sheet + gap) / 2;
const grid = [
  { x: rightX, y: rowY(0) },
  { x: leftX, y: rowY(0) },
  { x: rightX, y: rowY(1) },
  { x: leftX, y: rowY(1) },
];

const half = sheet / 2;
const STEP = 10; // fine enough that a gutter can't slip between samples
const samples: { x: number; y: number }[] = [];
for (let y = 3; y <= view.height - 3; y += STEP) for (let x = 3; x <= view.width - 3; x += STEP) samples.push({ x, y });
// Coverage from where the stickies REALLY are (read off the page after each
// drop), not where they were aimed: a prediction that drifts keeps aiming at a
// spot it thinks is still bare.
let stickies: { x: number; y: number; w: number; h: number }[] = [];
const readStickies = async () => {
  stickies = await page.evaluate(() =>
    [...document.querySelectorAll(".ce-shape")]
      .filter((el) => !el.querySelector('button[aria-label*=" from "]')) // not the stack itself
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
  );
};
const isCovered = (p: { x: number; y: number }) =>
  stickies.some((r) => p.x > r.x + 2 && p.x < r.x + r.w - 2 && p.y > r.y + 2 && p.y < r.y + r.h - 2);
// Never drop over the grab point until the end, or the next press grabs a sticky instead of the pad.
const GRAB_CLEAR = 26;
const nearGrab = (c: { x: number; y: number }) => Math.abs(c.x - grab.x) < half + GRAB_CLEAR && Math.abs(c.y - grab.y) < half + GRAB_CLEAR;
const onScreen = (c: { x: number; y: number }) => ({
  x: Math.min(view.width - half + 6, Math.max(half - 6, c.x)),
  y: Math.min(view.height - half + 6, Math.max(half - 6, c.y)),
});

function nextTarget(): { x: number; y: number; final: boolean } | null {
  const bare = samples.filter((p) => !isCovered(p));
  if (!bare.length) return null;
  // Top-left corners of bare patches, random order: fills fast, reads as a pile.
  const keys = new Set(bare.map((p) => `${p.x},${p.y}`));
  const isBare = (x: number, y: number) => keys.has(`${x},${y}`);
  const corners = bare.filter((p) => !isBare(p.x - STEP, p.y) && !isBare(p.x, p.y - STEP));
  corners.sort(() => Math.random() - 0.5);
  for (const p of corners) {
    const nudge = () => (Math.random() - 0.5) * sheet * 0.06;
    const c = onScreen({ x: p.x + half - 10 + nudge(), y: p.y + half - 10 + nudge() });
    if (!nearGrab(c)) return { ...c, final: false };
  }
  const free = bare.filter((p) => Math.max(Math.abs(p.x - grab.x), Math.abs(p.y - grab.y)) > GRAB_CLEAR + 8);
  if (free.length) {
    // Aim straight at the bare spot; only if that would cover the grab point,
    // slide just off it along the axis where the spot sits farthest away.
    free.sort((a, b) => Math.hypot(b.x - grab.x, b.y - grab.y) - Math.hypot(a.x - grab.x, a.y - grab.y));
    const p = free[0]!;
    const t = onScreen(p);
    if (!nearGrab(t)) return { ...t, final: false };
    const dx = p.x - grab.x;
    const dy = p.y - grab.y;
    return Math.abs(dx) > Math.abs(dy)
      ? { x: grab.x + Math.sign(dx || 1) * (half + GRAB_CLEAR + 2), y: t.y, final: false }
      : { x: t.x, y: grab.y + Math.sign(dy || 1) * (half + GRAB_CLEAR + 2), final: false };
  }
  // Only the pad is left: the last sticky lands on it.
  return { x: bare.reduce((s, q) => s + q.x, 0) / bare.length, y: bare.reduce((s, q) => s + q.y, 0) / bare.length, final: true };
}

for (let i = 0; i < 80; i++) {
  if (i >= grid.length) await readStickies();
  const target = i < grid.length ? { ...grid[i]!, final: false } : nextTarget();
  if (!target) break;
  await demo.waitFor(hasIdea, 0.3); // out-dealt Jev: wait (time-lapsed), never pull a blank
  const pull = Math.max(150, 440 * Math.pow(0.88, i)); // 12% faster each pull
  const back = Math.max(120, pull * 0.75);
  // Off-center grabs only in the grid; dead center in the pile (stickies lie close around the grab point).
  const off = i === 0 || i >= grid.length ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * sheet * 0.2, y: (Math.random() - 0.5) * sheet * 0.2 };
  await demo.glide(grab.x + off.x, grab.y + off.y, i === 0 ? 220 : back, EASE_IN_OUT, i === 0 ? 0.02 : 0.08);
  await sleep(i === 0 ? 140 : Math.max(16, 70 * Math.pow(0.85, i)));
  await demo.press();
  await sleep(i === 0 ? 60 : 24);
  await demo.glide(target.x + off.x, target.y + off.y, pull, EASE_OUT);
  await demo.release();
  if (target.final) break;
}

await sleep(250);
await demo.glide(view.width - 3, view.height * 0.7, 700, EASE_IN_OUT);
await demo.finish(OUT);
