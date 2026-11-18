# Brief: fill the vision-band shelves (Miro AI case study)

Three rows in the vision band (`src/data/site.ts`, "Agents that work where you work",
"Generative experiences", "Real-time agentic collaboration") each carry a shelf of 16:9
placeholder cards (`AGENTS_SHELF`, `GENERATIVE_SHELF`, `REALTIME_SHELF` in
`src/data/aiShelves.ts`). Replace every placeholder with either:

1. **A real recording**: first look in `public/media/ai/` and in the C26 Fall prototype
   (`~/dev/c26-fall-prototype`: its demos, the "Feature flags and demos" menu, saved configs)
   for an existing clip or a flag set that reproduces the moment, and record it at 16:9; or
2. **A built vignette**: a short looping scene in the style of `src/components/miro/Vignettes.tsx`
   (cursors, stickies, chat bubbles on the dot grid) when there's no footage.

For each card: swap `media: { kind: 'placeholder' }` for `clip('file.mp4', 'label')`, keep the
16:9 ratio, rewrite the one-line body to match what the clip actually shows, and note in the
summary which cards are real footage, which are vignettes, and which are still open.

## Cards

### Agents that work where you work
| # | Card | What it should show |
|---|------|---------------------|
| 1 | Inline chat | Asking an agent in place on the canvas; the answer lands where you are |
| 2 | Multiplayer chat | People and agents in one shared thread |
| 3 | Sidebar | The persistent agent panel beside the board for longer work |
| 4 | Agent task cards | A handed-off task tracked on a card: in progress → done |
| 5 | Agents building on the canvas | Sidekick, Claude and others building, agent cursors visible |
| 6 | Wave to summon an agent | A cursor wave, and an agent comes over |

### Generative experiences
| # | Card | What it should show |
|---|------|---------------------|
| 1 | Skills | Picking a skill and the agent doing that job |
| 2 | Questions | Planning mode: the agent asks clarifying questions before building |
| 3 | Next best actions | Contextual suggestions for the next step |
| 4 | Full board creation | A prompt turning into a whole, editable board |
| 5 | Format creation | A table generated from a prompt, structured and editable |

### Real-time agentic collaboration
| # | Card | What it should show |
|---|------|---------------------|
| 1 | Voice mode | Talking to the board while the agent builds |
| 2 | Granola transcription | A live meeting transcript feeding the board |
| 3 | JEV | The fast decision model responding to intent in real time |
