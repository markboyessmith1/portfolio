# Journey to the Intelligent Canvas: web presentation scaffold

The Miro AI talk (Fin past work review, 19 Nov 2026) as a horizontal, scrolling web
presentation at **/present/miro-ai**, built in the portfolio's house style. This file is
the scaffold (what the presentation is made of) and the prompt (how to build or rebuild
it). The same content also drives the slide-deck artifact used for rehearsal.

- Content, single source of truth: `src/data/presentMiroAi.ts`
- Page: `src/pages/PresentMiroAI.tsx`, styles: `src/pages/present.css`
- Route: rendered outside the site chrome in `src/main.tsx`; on boyes-smith.com it sits
  behind the same email gate as the case study (previews and dev are open)
- Not linked from the site and not live until Mark says so

## 1. Story structure

Six chapters in the talk, plus an appendix for deep dives. Each chapter has a hue that
tints its slides, cards and scrubber ticks.

| Chapter | Hue | Slides | What it has to prove |
|---|---|---|---|
| Intro | warm grey | 1 to 3 | Who, the agenda, the mission and the dates |
| No clear direction | Miro yellow | 4 to 10, 14 to 21 | First principles, the vision, the principles, the investments in practice |
| Operationalisation | cyan | 11 to 13 | Five investments, seven teams, how we ran it |
| Challenges | coral | 22 to 26 | Meeting people where they are; launch date against quality, and the pushback |
| How AI changed the work | lilac | 27 to 29 | Divergent concepts; production code and the engineering relationship |
| Outcomes | lime | 30 | KPIs and three reflections |
| Appendix | warm grey | 31 to 42 | Success model, investment areas, BoardGen deep dive, IC 1.0 to 2.0, Canvas '26 |

## 2. Slide inventory

Generated from the data file. "Gaps" counts TO FILL items on the slide.

| # | Chapter | Layout | Title | Media | Gaps |
|---|---|---|---|---|---|
| 1 | Intro | title | Journey to the Intelligent Canvas | media/miro-ai-cover.mp4 |  |
| 2 | Intro | split | What we’ll cover. | media/simplify/prototypes.mp4 |  |
| 3 | Intro | timeline | Make the canvas the best shared visual space for human‑to‑human and human‑to‑agent collaboration. | — |  |
| 4 | No clear direction | statement | Teams were jumping straight to building with their agents. Collaboration was moving later, and away from the canvas. | — |  |
| 5 | No clear direction | statement | A huge challenge, for many reasons. | — |  |
| 6 | No clear direction | split | There was no existing paradigm for working with AI on an infinite canvas. | — |  |
| 7 | No clear direction | full | A vision you could hand someone as a link, and use like a real product. | media/vision-sizzle-rko26.mp4 |  |
| 8 | No clear direction | stack | The vision prototype | TO FILL: Prototype video, 16:9 | 1 |
| 9 | No clear direction | grid | Humanity. Forward momentum. Radical simplicity. | media/principles/humanity.mp4<br>media/principles/momentum.mp4<br>media/principles/simplicity.mp4 |  |
| 10 | No clear direction | statement | Three bets everything else rested on. | — |  |
| 11 | Operationalisation | statement | Five key investments, across technology and experience. | — |  |
| 12 | Operationalisation | split | 7 teams, 120 strong. | diagrams/stream-structure.svg |  |
| 13 | Operationalisation | split | Five investments in parallel, one shared picture. | TO FILL: Operating rhythm diagram: forums, cadence, who met when | 4 |
| 14 | No clear direction | split | Simplifying the canvas. | media/simplify/home-v2.mp4<br>media/simplify/toolbar-agentic.mp4 |  |
| 15 | No clear direction | grid | Agents that work where you work. | media/ai/ai-all-in-this-together.mp4<br>media/ai/ai-jamming-with-you.mp4 |  |
| 16 | No clear direction | grid | Generative experiences. | media/ai/ai-start-faster.mp4<br>media/ai/ai-just-tell-me.mp4<br>media/ai/retroflow.mp4 |  |
| 17 | No clear direction | grid | Real-time agentic collaboration. | media/ai/ai-catches-you-up.mp4<br>media/ai/ai-proactive-suggestions.mp4<br>media/ai/voice-mode.mp4 |  |
| 18 | No clear direction | grid | You can’t trust an agent you can’t see working. | media/ai/ai-see-ya-work.mp4<br>media/ai/megaplan.mp4 |  |
| 19 | No clear direction | split | Why touch the board at all, if it’s up on everyone’s screen? | TO FILL: Autopilot prototype clip | 1 |
| 20 | No clear direction | grid | Real-time voice and multiplayer AI didn’t make it to production. | media/ai/voice-mode.mp4<br>media/ai/multiagent.mp4<br>media/ai/wave-to-summon.mp4 |  |
| 21 | No clear direction | split | If work starts in external agents, what is Miro for? | diagrams/ai-stack.svg |  |
| 22 | Challenges | statement | Two challenges that defined it. | — |  |
| 23 | Challenges | full | Most of our customers sat in the early to late majority. | diagrams/ai-cohorts.svg |  |
| 24 | Challenges | split | Is the AI chat open or closed by default? | media/simplify/toolbars-mono.mp4<br>TO FILL: Chat-first: the familiar default we shipped<br>TO FILL: Gestural / voice concept we held back<br>TO FILL: Feed-forward research: a session or quote | 3 |
| 25 | Challenges | split | We committed to a May launch early. The output wasn’t meeting our bar. | media/ai/board-creation.html |  |
| 26 | Challenges | split | We weren’t prepared to ship it. Fixing it would take time. | TO FILL: BoardGen before and after, same prompt<br>TO FILL: BoardGen maturity curve<br>TO FILL: The BoardGen vision piece<br>TO FILL: Evals screenshot | 4 |
| 27 | How AI changed the work | statement | Two shifts. | — |  |
| 28 | How AI changed the work | mosaic | We explored more divergent concepts. | media/ai/picture-sorting-clef.mp4<br>media/ai/point-and-jev.mp4<br>media/ai/builds-while-typing.mp4<br>media/ai/jev2hands.mp4<br>media/simplify/soundscape-ring.mp4<br>media/ai/ai-cursor-identity.mp4 |  |
| 29 | How AI changed the work | mosaic | We moved into production code, and changed how we work with engineers. | media/ai/multiplayer-chat.mp4<br>TO FILL: Spec sheet page<br>TO FILL: Designer PR graph<br>TO FILL: Vibe Labs gallery | 3 |
| 30 | Outcomes | metrics | What changed. | — | 1 |
| 31 | Appendix | full | How we think about success. | media/appendix/success.png |  |
| 32 | Appendix | full | Key investment areas over time. | media/appendix/investment-areas.png |  |
| 33 | Appendix | statement | The best models in the world don’t matter if the output is worse than what a person would make. People just won’t use it. | — |  |
| 34 | Appendix | split | We designed backwards from the end state. The models didn’t care. | TO FILL: An early, heavy-handed BoardGen design: the board we mocked up versus what the model produced | 1 |
| 35 | Appendix | split | Work forwards from what the model can do. | — | 2 |
| 36 | Appendix | split | Let the model write formats it reasons well in. Then make them editable. | TO FILL: Diagram: prompt → model writes SVG / Mermaid → translator → editable stickies, shapes, docs | 1 |
| 37 | Appendix | split | An evals team that could turn around improvements fast. | TO FILL: The test set or rubric: even a spreadsheet of graded boards | 5 |
| 38 | Appendix | grid | BoardGen V1 vs V2. | TO FILL: BoardGen V1 output<br>TO FILL: BoardGen V2 output, same prompt | 3 |
| 39 | Appendix | statement | We planned to launch in May. We launched in October. You only get one chance to burn a customer. | — |  |
| 40 | Appendix | full | From one-shot format agents to agents that plan, see and iterate. | diagrams/ic-comparison.svg |  |
| 41 | Appendix | split | Work forwards from day one. Evals from day one. | — | 1 |
| 42 | Appendix | full | Canvas ’26. | media/stills/canvas-26-keynote.jpg |  |

## 3. Layouts

Every slide is one of these. Copy comes from `eyebrow`, `title`, `body`, `bullets`,
`call` ("My call"), `todo`; media from `media` (video, image, embed, todo).

- **title**: copy left (huge title, lede, "scroll, swipe or press →"), the case's cover
  video as a tall 3:4 card right.
- **statement**: one big line. Titled bullets become the case study's numbered card laid
  across the slide, one column per point (multi-line text keeps its line breaks).
- **split**: copy left (5fr), media right (7fr). 1 item hugs its card; 2 stack; 4 make a
  2×2 mosaic. With no media it becomes a duo: heading left, copy right.
- **full**: heading row (title left, copy right), one media card filling below.
- **grid**: heading row, then 2 or 3 cards side by side with captions.
- **mosaic**: heading row, then a 3-column grid that scrolls on its own; metrics become
  dark KPI tiles among the media.
- **metrics**: heading row, the dark KPI card (one column per metric), reflections as a
  numbered card across.
- **timeline**: the mission as the title, a line of milestones (major ones larger, held
  ones dashed).
- **stack**: a 16:9 screen in the middle with the tech stack floating round it as pills.

## 4. House style (from the portfolio)

- **Page**: white (`--neutral-0`) in light, `--neutral-950` in dark; follows the system.
  Each slide is tinted with 9% of its chapter hue.
- **Type**: `--font` / `--font-display` (ABC Areal, falling back to Inter). Headings 550,
  letter-spacing -0.03em, balanced. Body 435, `--ink-body`, about 54ch. Eyebrows 14px
  500 in `--ink-2` with a dot in the chapter hue.
- **Cards**: superellipse corners (`corner-shape: superellipse(1.6)`), 20 to 40px radius.
  Media cards are the chapter hue at 26% on white and hug their video or image with a
  mat of padding; diagrams sit on white; scenes and bleeds fill. Cards keep their light
  palette in dark mode, as the case study's do.
- **Lists**: the case study's numbered card (`case-list`): white, faint inset edge,
  hairline dividers, "01" numbers in `--ink-3`.
- **KPIs**: the case study's dark KPI card (`case-metrics`): near-black, film grain
  along the bottom, values at 470.
- **"My call"**: a soft card in the chapter hue, label with a dot.
- **TO FILL**: dashed orange (`--todo`) so gaps show while rehearsing; `T` hides them.
- **Chrome**: top left, the case study's back pill and chapter bar (progress ring,
  current chapter, chapter list). Bottom: byline, a scrubber with one tick per slide
  grouped by chapter, the count and arrow buttons. Soft washes behind both.

## 5. Interaction

- The strip is a native horizontal scroller, one slide per viewport.
- Mouse and trackpad: a vertical wheel steps one slide per gesture; a sideways swipe
  follows the fingers and settles on release (a tenth of a slide is enough to move on).
  A gesture that starts over something that can still scroll (a mosaic, a long slide on
  a short screen) scrolls that instead.
- Touch: the browser's own paging snap, one slide per swipe; long slides scroll down.
- Keys: → / Space / PageDown next, ← / PageUp back, Home / End, F fullscreen,
  N speaker notes (with the criteria each slide proves), T hide TO FILL, Esc closes.
- The hash holds the slide (#7), so links and reloads keep the place.
- Slides fade up the first time they slide into view. Videos play only on the current
  slide; media mount within two slides of it. Scenes (embeds) don't take the pointer.
- Phones: everything stacks in one column and each slide scrolls vertically.

## 6. Portfolio assets used

All media is already in `public/`:

- `media/miro-ai-cover.mp4` (title), `media/simplify/prototypes.mp4` (agenda)
- `media/vision-sizzle-rko26.mp4` (the vision), `media/principles/*.mp4` (principles)
- `diagrams/stream-structure.svg` (7 teams), `diagrams/ai-stack.svg` (two ways in)
- `diagrams/ai-cohorts.svg` (customer cohorts, challenge 01), new to the talk
- `media/ai/board-creation.html` (live BoardGen scene, challenge 02), new to the talk
- `media/ai/*.mp4`, `media/simplify/*.mp4` (investments, legibility, mosaic, spec sheet)
- `diagrams/ic-comparison.svg`, `media/appendix/*.png`, `media/stills/canvas-26-keynote.jpg`

Other live scenes that could slot in later: `media/ai/agent-task-cards.html`,
`agent-sidebar.html`, `agent-kanban.html`, `huddle.html`, `recipes.html`,
`next-best-action.html`, `media/simplify/toolbar-voice.html`, `card-fan.html`.

## 7. Gaps (TO FILL)

- Vision prototype video, 16:9 (slide 8)
- Operating rhythm diagram, cadence, decision-making, reporting (slide 13)
- Autopilot prototype clip (slide 19)
- Toolbar mosaic: chat-first default, gestural or voice concept, a research session (24)
- Pushback mosaic: BoardGen before/after, maturity curve, vision piece, evals (26)
- Spec sheet page, designer PR graph, Vibe Labs gallery (29)
- Confirm the 73% CSAT figure (30)
- Appendix: early BoardGen design, core principles, engine diagram, evals rubric,
  V1 vs V2 boards, what I’d do differently (34 to 41)

Open questions: the intro timeline still says July for the held launch while challenge 02
says May; slides 14 to 21 sit in "No clear direction" after Operationalisation.

## 8. Rules

- Colleagues are named in speaker notes only; slides use roles. No named colleague's
  performance details anywhere.
- Don't invent metrics. Every number comes from Mark or a cited source.
- Don't link it from the site or merge to main until Mark says so.

## 9. Build prompt

Use this to rebuild the page from scratch, or to port it somewhere else.

> Build a horizontal, scrolling web presentation for the Miro AI case study at
> `/present/miro-ai` in this repo (React 19, Vite, TypeScript). Render it outside the
> site chrome and keep the existing email gate on boyes-smith.com. Read all content from
> `src/data/presentMiroAi.ts` (`DECK.slides`); never hard-code copy in the component.
>
> Use the portfolio's house style from `src/styles.css`: the semantic tokens (`--bg`,
> `--surface`, `--ink`, `--ink-body`, `--ink-2`, `--ink-3`, `--line`), `--font` and
> `--font-display` with headings at 550 and tight tracking, superellipse cards, the case
> study's chapter bar and glass pills, its numbered list card and its dark KPI card.
> White page, light by default, follows the system into dark. Give each chapter a hue
> from Miro's sticky palette and tint its slides (9%) and media cards (26%).
>
> Lay the slides in a native horizontal scroller, one per viewport. Map a vertical wheel
> to one slide per gesture (but let anything that can still scroll vertically, like a
> mosaic, scroll first). On mouse and trackpad settle swipes yourself so a tenth of a
> slide moves on; on touch use `scroll-snap-type: x mandatory` with
> `scroll-snap-stop: always`. Keyboard: arrows, Space, PageUp/Down, Home/End, F, N
> (speaker notes with criteria), T (hide TO FILL). Keep the slide in the hash.
>
> Implement the layouts in section 3 of `notes/present-miro-ai.md`. Media cards hug their
> video or image (size the media with container query units inside a size container), so
> there are no letterbox bars; diagrams sit on white; HTML scenes fill their card and
> don't take the pointer. Only play the current slide's videos, and mount media within
> two slides of it. Show TO FILL items as dashed orange placeholders.
>
> Chrome: back pill to `/work/miro-ai` and the chapter bar (ring = progress through the
> deck, current chapter, a list of chapters to jump to) top left; byline, a per-slide
> scrubber grouped by chapter, the count and arrow buttons along the bottom. On phones,
> stack each slide into one column that scrolls vertically, keep horizontal swiping
> between slides, and hide the scrubber.
>
> Check every slide at 1440×900, 1280×720 and on a phone, in light and dark, before
> pushing. Don't merge or link it from the site.
