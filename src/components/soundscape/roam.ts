/* The soundscape board's motion engine: a virtual clock and cursors that
   travel along swooping curves. Framework-free — the board drives it from one
   rAF and writes the positions straight to the DOM.

   Everything is awaitable, so a cursor's behaviour reads as a script:
     await stage.goTo(ana, spot);   // swoop over
     drop a sticky…                 // (next step: objects)
     await stage.wait(800);         // linger
   The clock only advances while the board is visible, so pausing (offscreen,
   background tab) freezes walks and waits together — nothing jumps on return.

   Positions are normalised (0–1 of the stage) so a resize keeps the room's
   composition; distances and curves are worked out in pixels. */

export type Pt = { x: number; y: number };

/** How a cursor moves: its own pace, curve and restlessness. */
export type Gait = {
  /** Multiplies travel time: < 1 is brisk, > 1 unhurried. */
  pace: number;
  /** How far a path bows away from the straight line (0 = straight). */
  swoop: number;
  /** Chance the next move is a short fidget nearby instead of a crossing. */
  fidget: number;
  /** Pause after arriving, ms [min, max]. */
  dwell: [number, number];
};

type Leg = { from: Pt; ctrl: Pt; to: Pt; t0: number; dur: number; done: () => void };

export type Roamer = {
  id: string;
  gait: Gait;
  /** Current position, normalised. */
  pos: Pt;
  leg: Leg | null;
  /** Phase offset for the idle hand tremor, so no two cursors breathe in sync. */
  seed: number;
};

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Minimum-jerk profile — the speed curve of a human reaching movement: a
// quick push off, a long glide, a soft landing. Reads as a hand, not a tween.
const minJerk = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);

// Cursors keep clear of the edges; the right margin leaves room for the name pill.
const MARGIN = { left: 28, top: 28, right: 170, bottom: 56 };

export function createStage(size: () => { w: number; h: number }) {
  let now = 0;
  let waits: { at: number; done: () => void }[] = [];
  let alive = true;

  const toPx = (p: Pt): Pt => {
    const s = size();
    return { x: p.x * s.w, y: p.y * s.h };
  };
  const toNorm = (p: Pt): Pt => {
    const s = size();
    return { x: p.x / (s.w || 1), y: p.y / (s.h || 1) };
  };
  const clamp = (p: Pt): Pt => {
    const s = size();
    return toNorm({
      x: Math.min(s.w - MARGIN.right, Math.max(MARGIN.left, p.x)),
      y: Math.min(s.h - MARGIN.bottom, Math.max(MARGIN.top, p.y)),
    });
  };

  /** Advance the clock; settles finished walks and waits. */
  function tick(dt: number) {
    now += dt;
    const due = waits.filter((w) => w.at <= now);
    if (due.length) {
      waits = waits.filter((w) => w.at > now);
      due.forEach((w) => w.done());
    }
  }

  function wait(ms: number) {
    return new Promise<void>((done) => waits.push({ at: now + ms, done }));
  }

  /** Swoop `r` to `to` (pixels). Travel time follows Fitts's law — long
   *  crossings take longer, but not proportionally — scaled by the gait. */
  function goTo(r: Roamer, to: Pt, opts: { dur?: number; swoop?: number } = {}) {
    const a = toPx(r.pos);
    const target = clamp(to);
    const b = toPx(target);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const dur = opts.dur ?? (180 + 260 * Math.log2(1 + d / 40)) * r.gait.pace;
    // Bow the path to one side: the control point sits off the midpoint,
    // perpendicular to the line of travel.
    const bow = (opts.swoop ?? r.gait.swoop) * d * rand(0.15, 0.45) * (Math.random() < 0.5 ? -1 : 1);
    const ctrl = toNorm({ x: a.x + dx / 2 - (dy / (d || 1)) * bow, y: a.y + dy / 2 + (dx / (d || 1)) * bow });
    r.leg?.done();
    return new Promise<void>((done) => {
      r.leg = { from: { ...r.pos }, ctrl, to: target, t0: now, dur: Math.max(1, dur), done };
    });
  }

  /** Where `r` is right now, in pixels — including a faint hand tremor. */
  function position(r: Roamer): Pt {
    const leg = r.leg;
    if (leg) {
      const t = Math.min(1, (now - leg.t0) / leg.dur);
      const e = minJerk(t);
      const u = 1 - e;
      r.pos = {
        x: u * u * leg.from.x + 2 * u * e * leg.ctrl.x + e * e * leg.to.x,
        y: u * u * leg.from.y + 2 * u * e * leg.ctrl.y + e * e * leg.to.y,
      };
      if (t >= 1) {
        r.leg = null;
        leg.done();
      }
    }
    const p = toPx(r.pos);
    const s = r.seed;
    return {
      x: p.x + Math.sin(now * 0.0013 + s) * 1.6 + Math.sin(now * 0.0031 + s * 2.1) * 0.8,
      y: p.y + Math.cos(now * 0.0011 + s * 1.3) * 1.4 + Math.sin(now * 0.0027 + s * 0.7) * 0.8,
    };
  }

  /** Somewhere on the board: a short fidget near `r`, or anywhere at all. */
  function pickSpot(r: Roamer): Pt {
    const s = size();
    const here = toPx(r.pos);
    if (Math.random() < r.gait.fidget) {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(40, 160);
      return { x: here.x + Math.cos(ang) * dist, y: here.y + Math.sin(ang) * dist };
    }
    return { x: rand(0.06, 0.9) * s.w, y: rand(0.08, 0.88) * s.h };
  }

  /** The default behaviour: wander the board forever, lingering between moves. */
  async function roam(r: Roamer) {
    while (alive) {
      await goTo(r, pickSpot(r));
      if (!alive) return;
      await wait(rand(...r.gait.dwell));
    }
  }

  return {
    get alive() {
      return alive;
    },
    tick,
    wait,
    goTo,
    position,
    pickSpot,
    roam,
    toNorm,
    dispose() {
      alive = false;
    },
  };
}

export type Stage = ReturnType<typeof createStage>;
