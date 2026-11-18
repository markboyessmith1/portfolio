---
name: prototype-scene
description: Use when adding a live, animated story scene (like "Important over urgent." — the card fan that opens into a board) to a shelf on this portfolio, or building a new one in that style. Covers where scenes are authored (the C26 Fall prototype), how they're bundled into a self-contained page in public/, and how a shelf card embeds them.
---

# Live prototype scenes on the portfolio

The animated scenes are **authored in the C26 Fall prototype** (`~/dev/c26-fall-prototype`,
React + Miro design system), not here. This site has no MDS, so a scene is compiled into a
self-contained HTML page and **iframed** into a shelf card. Don't port a scene into this repo's
React by hand. That forks it, and it stops matching the prototype.

Reference: the "Simplifying the canvas" row in the Vision section of `/work/miro-ai`.

## Pipeline

1. **Author or update the scene in the prototype.** Its own skill has the full recipe for
   the look and mechanics: `~/dev/c26-fall-prototype/.claude/skills/portfolio-scene/SKILL.md`.
   Canonical file: `src/components/portfolio/CardFanScene.tsx`. In short:
   - A fixed 900×520 world.
   - A `TIMELINE` of step durations driven by `useStoryPlayer`.
   - Every style is a function of `step`, animated with CSS transitions.
   - The camera is `useCamera` + `frame(shot)`.
   - `SNAP` / `DRAMA` easings, staggered `enter(pop, k*110)`, glass cards on a sticky colour.
2. **Build it into `public/`.** All scenes share one build, `scripts/prototype-scenes/`.
   To add a scene, write `entries/<name>.tsx`, which is three lines:
   ```tsx
   import { MyScene } from "@/components/portfolio/MyScene";
   import { mount } from "./frame";
   mount(MyScene);
   ```
   Then add a line to `SCENES` in `build.ts` (`<name>: ["media/<case>/<name>.html", "<title>"]`)
   and run:
   ```bash
   bun scripts/prototype-scenes/build.ts <name>   # no name = rebuild every scene
   ```
   Current scenes:
   - `card-fan`: "Important over urgent.", in Vision › Simplifying the canvas. Two builds:
     - `HomeToBoardScene` (C26) is the director: timeline, camera, and the Pricing board it
       cuts to (`PricingBoard`, shared with `CardFanScene`).
     - The Home half is the real `my-canvas-prototype` home page, built into
       `public/media/simplify/home-fan.html` (+ `home/`) by
       `bun scripts/prototype-scenes/home/build-home.ts` and played in an iframe. A scripted
       cursor inside it drives the real cards with pointer events. The director posts
       `{ type: "home-step", step }`; every frame the page posts back
       `{ type: "home-cam", cx, cy, w }` (where to look, following the cursor) and, on the last
       click, `{ type: "home-card", rect }`. Cursor and camera both ride critically damped
       springs, as in the Kanban and sidebar scenes; the cursor is Miro's `CURSOR_PATH`.
     - Rebuild the home page after changes in `my-canvas-prototype` (run that app once first,
       so Next has downloaded Noto Sans); rebuild `card-fan` after changes in C26.
   - `toolbar-voice`: "A handful of tools made for the agentic era…", the `simple-tools` card
     (Radical Simplicity, and Vision › Simplifying the canvas). Same two-build shape:
     - `ToolbarVoiceScene` (C26) is the director. Its camera is locked on the page centre,
       where the bar sits, and only zooms (a spring in log-zoom). It never dollies.
     - The page is the real `my-canvas-prototype` `Toolbar` on the card's sunshine ground,
       built into `public/media/simplify/toolbar-page.html` (+ `toolbar/`) by
       `bun scripts/prototype-scenes/home/build-home.ts toolbar` (entry `home/entry/toolbar.tsx`).
       - Compaction: it starts as tools only (`isChatOpen` hides the prompt half). Each extra
         tool's button drops and shrinks, then the tool is spliced out of the app's
         `primaryTools`, so the real `AnimatePresence` collapses its slot.
       - The AI arrives: the prompt grows out of the bar (CSS keyframes on the section), then
         the voice button pops in (a `tb-voice-in` body class).
       - Voice mode, the liquid split: the bar's white is drawn by an SVG layer under the
         toolbar. That layer traces the sections every frame through a gooey filter (blur 9 plus
         an alpha threshold); the app's own fills and shadows are switched off with CSS. When the
         halves start to part, a bridge between them shrinks from full height to nothing over
         520ms (ease-in-out), which reads as a neck that pinches and snaps. `SPRING` (toolbar-constants) is
         re-tuned at runtime (340 / 24 / 0.9, nearly critical), and the corner radius eases over 480ms.
     - Protocol: `page-step` (director → page), then `page-ready` and `page-cam` `{ w }`
       (page → director). A replay fades the bar out at step 0, and the zoom cuts at step 1.
   - `next-best-action` and `board-creation`: the Generative shelf's "Next best actions"
     and "Full board creation" (C26 `NextBestActionScene`, `BoardCreationScene`). They share
     `generatedBoard.tsx`, which holds Boardgen-style board pieces (frame, tinted zones,
     true-colour stickies, selection, caret, your Miro cursor, spring camera helpers).
     - NBA uses the real orb card, `BigNbaCard`. The scene opens it with a real `mouseover`,
       so its own morph and deal-in play, and folds it with a `mouseout`.
     - Board creation types into the real prompt bar, `PromptBarShell` from `UbtChatInput`.
       That module pulls in the board, hence the mermaid stub and the asset cap.
   - Bun resolves `lottie-react` to its UMD `browser` build, whose `default` is the whole module
     (React error #130). `build-home.ts` aliases it to `build/index.es.js`.
   - `create`: "A meeting. A project. A rocket launch.", the MCP card on Generative
     experiences. It uses `mount(…, { background: "#000" })`.
   - `recipes`: "Your team's best moves", the Skills card on Generative experiences. It uses
     `mount(…, { design: { w: 820, h: 680 } })`.
   - `decisions`: "Big decisions, made together", the miro-ai case's opening visual (a
     storyboard vignette, `decisions` in `components/miro/Vignettes.tsx`). It uses
     `design` with a `view` zoom.
   - `huddle`: "One tap and you're talking", the Huddles card on Real-time collaboration.
   - `multiplayer-chat`: the Multiplayer chat card on Agents. It's an original scene
     (`MultiplayerChatScene` in the prototype), built from the multiplayer-chat recording.
   - `agent-sidebar`: the Sidebar card on Agents (`AgentSidebarScene`). It runs the
     prototype's own board-channel simulation (`runChannelSimDemo`) in the real sidebar
     (`ChatSessionTabs` + `ChannelConversation`). Sidekick's turns go through the real channel
     pipeline, with `/api/sidekick` answered by a scripted stream in the prototype's SSE format.
   - `agent-task-cards`: the Agent task cards card on Agents (`AgentTaskCardsScene`). The real
     activity column (`AgentActivityStack` + `TaskPill`) fed mock runs, on a still camera
     (the stack's reorder animation measures screen positions, so the camera can't move). It loops.
   - `agent-kanban`: the Agents building on the canvas card on Agents (`AgentKanbanScene`). Claude
     builds a Kanban and Sidekick rearranges it, on the real Records Kanban (`KanbanColumn`,
     `KanbanCard`) and `FlatCursor`. The camera follows whichever cursor is working, on springs.

   Which `mount` options to use:
   - **Scenes with a camera** (`useCamera`, like card-fan and create) re-frame themselves
     for any card size, so mount them plainly.
   - **Scenes laid out in fixed pixels** (no camera, like recipes) crop in a smaller card.
     Pass `design` with the prototype card's size (wide 820×680, xwide 1180×680), so the
     scene renders at that size and scales to fit the card.
   - **`background`** replaces the scene's ground colour without touching the prototype.
   - **`design.view: { cx, cy, h }`** zooms past the fit with a live camera: `h` design
     px fill the card's height, centred on design point (`cx`, `cy`). Use it for a scene
     that pads itself inside its box. The frame also scales the scene's visibility
     thresholds, so start-on-view scenes still start when only part of their box can
     show. Optional extras:
     - `zoomOut: { by, ms }`: a slow, settling pull-back.
     - `follow: "<selector>"`: keeps a moving hero element centred, so its travel
       doesn't read as a pan. It's clamped so the box never shows an empty edge.
     - `parallax: 0.04`: drifts the scene with the pointer, up to 4% of the card each
       way. The parent page should forward the mouse as
       `{ type: 'scene-pointer', x, y }` (-1…1) via `postMessage`; see `Decisions` in
       `components/miro/Vignettes.tsx`.
   - **Scenes built from production components** (rather than drawn) pull in much more of
     the prototype:
     - import `./prototype-env` first in the entry. It pins the persona and answers
       `/api/*` calls with an empty reply.
     - trim the bundle in `SCENES` with `{ stub: [packages], maxAssetKB }`. `stub` swaps
       packages the scene never reaches (mermaid) for an empty module; `maxAssetKB` blanks
       oversized screenshots. That took the sidebar scene from 38 MB to 12 MB.
   - **Board chrome over a scene:** `components/miro/BoardChrome` lays the new top-left,
     top-right and bottom toolbars over the iframe (the hero uses it).
   - **A scene that loads a prototype page by URL** (an iframe `src="/src/assets/…"`) needs
     that path in `RUNTIME_FILES` in `build.ts`. The build copies the file into `public/`
     and rewrites the URL. Otherwise it loads this site in the iframe instead.
   Don't change these parts of `entries/frame.tsx` and `build.ts`:
   - The empty `<article><header>` in `frame.tsx`. It reserves the band the shelf's
     highlighter caption sits over, and the scene frames its shots below it.
   - Copying the entry into the prototype for the build. Using a resolver plugin instead
     breaks Bun's tree-shaking of `@ariakit`.
   - The IIFE output format.
   - Swapping asset paths for `data:` URIs by hand. Bun 1.3's `dataurl` loader emits `""`.
   - Embedding only the fonts the scene uses.
3. **Add it to a shelf card** with media kind `embed` (`src/components/shelf/PagedShelf.tsx`):
   ```ts
   { id: '…', eyebrow: '…', title: '…', body: '…',
     media: { kind: 'embed', src: '/media/<case>/<scene>.html', label: '<what happens, for screen readers>' },
     ratio: 1.2059 }   // the prototype card's shape (wide card: 820×680)
   ```
   Put the card in a `ShelfData` in `src/data/*Shelves.ts`. A section row takes it as
   `rows: [{ title, body, shelf }]` in `src/data/site.ts`.

## Check

- `npx tsc -b` is clean.
- Open the case on `localhost:5173`, scroll to the card and watch it play once. It starts
  when it's half in view. Check that the caption doesn't cover the opening shot and that the
  replay button works.
- With reduced motion turned on, it should show the final frame.
- The page is around 3.4 MB, mostly Noto Sans. The iframe has `loading="lazy"` so it doesn't
  slow down page load.
