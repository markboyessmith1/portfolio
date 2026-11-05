# Cinematic treatment (cover films)

The house style for cover and promo films, worked out on the Miro AI card's cover
(`src/pages/CoverMiroAI.tsx`, scene `scenes/miro-ai-cover.ts`). The reference was the
InVision Freehand launch film: floating UI layers in shallow 3D, slow weighted camera
moves, cuts between UI states. Use this when the ask is a cover, hero or promo clip rather
than a plain walkthrough.

## Build a scene page, not a recording of the app

When the film is a story more than a walkthrough, build a dedicated route (e.g.
`/cover/<name>`, rendered outside the site chrome) out of the real components. The page
owns the camera and the choreography; the recorder only drives the human parts (the
cursor, clicks, typing) and calls beat hooks the page exposes on `window`
(`__start`, `__pan`, `__compose`, `__hideMe`).
- Give it a `?play` mode that runs the same beats with the same timings in a normal
  browser, so the user can watch and give notes before a take. Guard it against
  StrictMode's double-mounted effects with a module-level flag.
- **Collect notes, then record one take.** Don't re-record after every note.

## Look

- **Abstract.** Plain stickies, grey bars and dark pills stand in for words; no real copy
  on the board. Keep real UI (the toolbar, skill chips, the typed prompt) where the story
  needs it.
- **The canvas:** white, with a dot grid a darker shade of it
  (`color-mix(in srgb, var(--canvas) 84%, black)`), small dots (~0.95px radius on a 28px
  grid), extending edge to edge.
- **Open front-on and tight**, right in on the subject (the toolbar at 3x), then tip onto
  a slight angle for the rest (about rotateX 16°, rotateY -20°, rotateZ 4°, perspective
  1500px).
- **Lit acrylic UI** once it tips: half-white fill, `backdrop-filter: blur(16px)
  saturate(2)`, white inset highlights, one soft drop shadow, a soft-light wash and a
  single specular sweep. **No glow and no extrusion**: both were rejected (no coloured
  blooms, no stacked edge layers).
- **Cursors are Miro cursors** (`ChatCursor` with a name pill), the main character
  included: hide the kit's arrow and drive a Miro cursor from `window.__cursor`. Cursors
  live on the canvas, so they zoom with the camera.
- **Depth of field:** sharp at the focus (the screen centre), soft towards the edges,
  stronger and shallower in close-ups. Keep it subtle: blur about 1px wide → 4px at the
  tightest; sharp area from about 62% → 32% of the half-screen. Ease it with the camera.
- **Builds land with physicality:** frames tip in from below the surface and settle. A
  shader ripple through the dot grid was tried and dropped: it fought the frames for the
  same plane in the 3D scene and the user cut it.

## Camera: a gimbal rig, run per frame

Don't move the camera with CSS transitions: they read as rigid and blur mid-move. Use
`src/components/miro/cameraRig.ts`: each axis is an `Axis` with an eased goal (the
operator never starts hard) chased by a soft underdamped spring (inertia: it carries
through, overshoots a touch, floats back). `aim(to, sec, z)` to move, `snap(x)` to cut.
- **Zoom on a log scale** (`ln s`), so zooms feel even.
- **Banking comes from the motion:** the head yaws into a pan and dips into a push in
  proportion to velocity, on its own lagging spring. **Keep it gentle**: lean capped at
  about ±3.5°, scripted swooshes 2–3°, roll 0.2 × the lean. The user called stronger
  values too extreme.
- **Handheld float** once the view tips: incommensurate low-frequency sines (0.04–0.3 Hz)
  on yaw, pitch, roll and a few px of bob. Front-on shots stay locked off.
- **Parallax depth:** real 3D layers (`transform-style: preserve-3d` down the tree): the
  board at the back, cursors above it (translateZ ~70), the toolbar nearer, and a few
  big, blurred, sticky-coloured shapes on a near plane (~420) that slide faster than the
  board on pans.
- **Cuts between states:** cut on a shared shape and keep the camera's velocity through
  the cut (tried: the inked prompt matching into the board's title). For the build the
  user preferred a **tight, straight cut**: lean into the inked prompt, then a hard cut to
  the board framed tight on one frame at a time, no docked toolbar in shot.
- **Semantic zoom to close:** rise to an overview of the whole result. Once far out, frames
  become tinted blocks with prominent labels and summary bars, the way Miro simplifies at
  distance. Hold it about 3 s, then end.

## Resolution

- **Zoom with CSS `zoom`, not `transform: scale()`.** Under a 3D transform Chrome rasters
  layers at 1x and enlarges the bitmap, so close-ups go soft and blocky. `zoom` lays the
  content out at full size. Animated transforms also freeze their raster scale, so drive
  the zoom per frame.
- **Headless Chrome's screencast captures CSS pixels and ignores `deviceScaleFactor`.**
  To get 1440×1920, record a 1440×1920 viewport at `scale: 1` and make the scene scale
  its design to fill the screen (`unit = min(innerWidth / 720, innerHeight / 960)`,
  applied to the zoom, perspective, blur and near layers).
- Encode the card at its captured size, never upscaled:
  `scale=1440:-2:flags=lanczos:in_range=full:out_range=tv,format=yuv420p`, libx264
  `-preset slow -crf 18 -tune animation`. Use `yuv420p`, not `yuvj420p` (the site's
  WebGL video texture choked on full-range).
