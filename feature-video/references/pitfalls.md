# Pitfalls (each one cost a take)

## Cursor
- **Drive the drawn cursor from the script only** (`demo.glide/press/release`, which call
  `window.__cursor`). Following page `pointermove`s picks up the app's own synthetic
  events (Jev's agent cursor in `lib/board-agent.ts`) and the cursor jumps for a frame.
- **Position with the `translate` property, never `transform`, when using `scale`.**
  `scale` composes after `transform`, so press feedback shrank the cursor around the
  viewport corner: a 10% jump toward the top-left on every press, and a hand that sat
  off its grab point during drags. demo-kit already does this; keep it if you edit.
- **The mouse must stay inside the viewport.** A move off-screen never reaches the page,
  so the drawn cursor freezes wherever it was. Enter from `view.width - 3`, not beyond.
- **Hands need a solid palm.** Stroke-only icons let the background show through.

## Selectors
- Pills duplicate actions. `button[aria-label^="Add sticky note"]` matched the stack
  PILL's "+" before the pad. Scope by a part only the target has
  (`[aria-label*=" from "]`), or by role + exact name.
- Chrome hidden with `boardOnly()` is `visibility: hidden`: hidden elements can't be
  clicked. Do every chrome interaction (toolbar, menus) BEFORE `boardOnly()`.

## Canvas
- Zoom: ctrl+wheel scales by `exp(-deltaY / 100)` around the pointer. One computed event
  lands within a few %; loop a correction pass and measure an element to converge.
- Pan: a plain wheel event pans by `-deltaX/-deltaY`. Loop small steps while measuring.
- Hit-testing is by shape geometry, topmost first. A press near something you dropped
  earlier can grab THAT instead of the control: keep a clear zone around press points
  and press dead center once things pile up around them.
- Track where things REALLY landed (`getBoundingClientRect` on `.ce-shape`) rather
  than where you aimed. Aim-based bookkeeping drifts and loops on a "bare" spot.

## Timing and AI
- Real AI waits read as dead air. Mark them (`squeezeStart/End`, `waitFor`) and the
  stitch time-lapses them; a 3 s wait at 0.6 s still shows a beat of the loading state.
- Don't outrun a queue that refills asynchronously (sticky stack: next batch at 10
  left). `waitFor(check, 0.3)` before each pull hides the catch-up in the edit.
- Selecting a sticky shows Suggest mode's pills and a selection outline; `boardOnly()`
  hides overlays, pills and the outline. For full-chrome videos, hide them explicitly.

## Environment
- localhost:4001 serves `dist/public` from disk: run `bun run build` after client changes;
  restart the server (kill the PID on :4001, `PORT=4001 NODE_ENV=production bun server.ts`)
  after server changes. Recording a stale build is the most expensive mistake.
- Each take opens a fresh `<board>-<timestamp>` room, which persists in
  `data/annotations.sqlite`. Mention it; never set `DATABASE_PATH` locally (it deletes the db).
- Use the CDP screencast (demo-kit does), not Playwright `recordVideo`: recordVideo is
  low-bitrate and has no per-frame timestamps to time-lapse with.

## Resolution
- The screencast delivers frames at the CSS viewport size, even at `deviceScaleFactor` 2
  (headless new and old alike). A 720×960 viewport gives 720×960 frames, so check the
  raw take with `ffprobe` before encoding. See `cinematic.md` → Resolution for the fix.
- Under a 3D transform (perspective or a tilt) Chrome rasters `transform: scale()` at 1x:
  zoomed content upscales. Zoom with CSS `zoom`.
- The site's global `canvas { max-width: 100% }` squeezes an oversized WebGL canvas: set
  `max-width: none` on it.
- Selectors in a scene page: if the page renders a component twice (e.g. a docked copy
  of the toolbar), scope the locator to the live one (`.cover__bar .ct__field input`).
