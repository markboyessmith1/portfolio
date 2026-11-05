---
name: feature-video
description: 'Record a polished demo video of a vlab-mds feature by driving the real UI on localhost:4001 with a headless Chrome — a drawn cursor (arrow, open/closed hand) moving on easing curves, the board alone without app chrome, AI waits time-lapsed in the edit, exported as a 1920px 60fps mp4. Use when the user asks for a demo video, screen recording, promo clip, walkthrough video or "make a video of the X feature" showing a board feature in use (widgets, stickies, frames, AI flows). Not for testing or verifying UI; recordings are a deliverable, never a check.'
---

# Feature video

Drive the real app, record it, edit timing in the stitch. Everything reusable lives in
`scripts/demo-kit.ts`; a scene is a short script that imports it. Read
`references/pitfalls.md` before writing a scene: each item there cost a take. For a cover,
hero or promo film, also read `references/cinematic.md`: the house look and camera (scene
pages, gimbal rig, parallax, match cuts, semantic zoom) and how to keep it sharp.

## Requirements

- A vlab-mds checkout, served in production mode on :4001
  (`bun run build && PORT=4001 NODE_ENV=production bun server.ts`).
- `bun`, and `ffmpeg` on the PATH (`brew install ffmpeg`).
- Google Chrome at `/Applications/Google Chrome.app`; elsewhere, set
  `FEATURE_VIDEO_CHROME` to the binary. playwright-core installs itself on first run.

## Workflow

1. **Serve the current build on :4001.** It serves `dist/public`: `bun run build` after
   client changes; restart it after server changes (see pitfalls → Environment).
2. **Agree the beats** in one or two lines if the ask is loose: opening state, the action,
   the payoff, the closing frame. Default to starting fast (no slow intro) and ending on a
   strong final frame held ~1.5 s.
3. **Write the scene** to `/tmp/feature-video/<feature>.ts`, importing the kit by absolute
   path. Start from `scripts/examples/sticky-stack.ts`: it is a complete, working scene
   (off-camera setup, zoom + center, titling, a time-lapsed AI wait, an accelerating loop,
   a covered-screen finale).
4. **Run** `bun /tmp/feature-video/<feature>.ts ~/Desktop/<feature>.mp4` (~1–3 min; the
   first run installs playwright-core into `~/.cache/feature-video`).
5. **Check the moments that matter** from the mp4 with ffmpeg, not by watching the whole
   thing — a tile of frames around each beat:
   `ffmpeg -ss <t> -t <dur> -i out.mp4 -vf "fps=10,crop=<w>:<h>:<x>:<y>,scale=300:-2,tile=6x4" -frames:v 1 tile.png`
   then read the PNG. Check: opening frame, every press (no cursor jump), the payoff,
   the final frame. Fix and re-run; don't hand over a take you haven't looked at.
6. **Deliver** to `~/Desktop/<feature>-vN.mp4` (keep earlier versions), and tell the user
   the length, what happens beat by beat, what was edited (squeezed waits), and that each
   take left a `<board>-<timestamp>` board in the local db.

## Scene anatomy

```ts
import { EASE_IN_OUT, EASE_OUT, sleep, startDemo } from "/abs/path/.claude/skills/feature-video/scripts/demo-kit.ts";
const demo = await startDemo({ board: "my-feature" });   // fresh board room, 1440×900 @2x
const { page, view } = demo;
// Off camera: build the opening state with normal Playwright calls (chrome still visible).
await demo.boardOnly();                                   // then hide the chrome (optional)
await demo.record();                                      // screencast starts here
await demo.glide(x, y, 600, EASE_OUT);                    // arcs; mouse + drawn cursor together
await demo.press(); await demo.glide(x2, y2, 300, EASE_OUT); await demo.release();
await demo.dblclick(); await demo.type("text");           // at the cursor
await demo.waitFor(async () => /* ready? */ true, 0.3);   // real wait, time-lapsed to 0.3 s
const t = demo.squeezeStart(); /* … */ demo.squeezeEnd(t, 0.6); // squeeze any stretch
await demo.finish("~/Desktop/my-feature.mp4");            // stitch + encode + clean up
```

`startDemo({ path: "/space/…" })` opens any route instead of a board. `startDemo({ scale })`
sets the device pixel ratio (default 2), but the screencast records CSS pixels whatever it
is: for a full-resolution capture, size the viewport itself (see `references/cinematic.md`).

## Motion rules

From the `animate` skill's tables — don't invent curves:
- Travel between targets: `EASE_IN_OUT` (0.77, 0, 0.175, 1). Pulls, entrances, landings:
  `EASE_OUT` (0.23, 1, 0.32, 1). Keep a slight arc (`arc` 0.04–0.08).
- Start fast: first move ~0.5 s, repeated actions ~0.4 s, accelerating ~12% per repeat to a
  ~0.15 s floor where motion still reads.
- Hover a moment before pressing anything that reacts to hover (the cursor shows the hand
  over `cursor: grab`, the app shows its hover state).
- Never let the viewer watch a spinner: squeeze it to 0.3–0.9 s, keeping a beat of the
  loading state so the time-lapse is honest.
