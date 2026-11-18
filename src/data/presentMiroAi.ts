/* The Miro AI case study as a talk: a full-screen, slide-by-slide deck at
   /present/miro-ai, shaped for a 45-minute past work review (Fin, 19 Nov 2026).

   Running order follows the review's brief: the problem first, the calls Mark made
   (with PM, Eng and AI), the model layer, the quality bar, how the team built,
   the dead ends, then outcomes last. Copy and media are reused from the case
   study (src/data/site.ts, notes/miro-ai-narrative.md, public/media).

   `todo` marks content that doesn't exist yet: it renders as a dashed
   placeholder on the slide so the gaps are obvious while rehearsing.
   `notes` are speaker notes (press N). `criteria` tags which of the reviewers'
   six criteria the slide is there to prove. */

export type DeckMedia =
  | { kind: 'video'; src: string; poster?: string; caption?: string }
  | { kind: 'image'; src: string; caption?: string; alt: string }
  | { kind: 'embed'; src: string; caption?: string }
  | { kind: 'todo'; caption: string }

export type Criterion = 'Craft' | 'Technical AI' | 'Agency' | 'First principles' | 'Communication' | 'Partnership'

export type DeckSlide = {
  chapter: string
  layout: 'title' | 'statement' | 'split' | 'full' | 'grid' | 'metrics'
  eyebrow?: string
  title: string
  body?: string[]
  bullets?: { title?: string; text: string }[]
  media?: DeckMedia[]
  /** The decision Mark made here, set apart so the questions land on his calls. */
  call?: string
  metrics?: { value: string; label: string }[]
  criteria?: Criterion[]
  todo?: string[]
  notes?: string
}

const AI = '/media/ai'

export const DECK: { title: string; slides: DeckSlide[] } = {
  title: 'Journey to the Intelligent Canvas',
  slides: [
    // ---- Opening -------------------------------------------------------
    {
      chapter: 'Intro',
      layout: 'title',
      eyebrow: 'Miro · 2026 · Past work review',
      title: 'Journey to the Intelligent Canvas',
      body: ['Mark Boyes-Smith, Sr Director, AI Design'],
      media: [{ kind: 'video', src: '/media/miro-ai-cover.mp4' }],
      notes: 'Intro line: "I\'m Mark, Sr Director, AI Design at Miro. We were acquired by Bending Spoons last month after a successful exit, so I\'m looking at what\'s next for 2027." Keep it under a minute.',
    },
    {
      chapter: 'Intro',
      layout: 'statement',
      eyebrow: 'One project, deep',
      title: 'When work moved into chats with agents, we worked out what a shared canvas is for. Then we held a launch until the AI was worth keeping.',
      notes: 'Set expectations: one project, Intelligent Canvas 2.0, six months, from the problem to the calls. Invite interruptions. Plan for ~30 minutes of talking.',
    },
    {
      chapter: 'Intro',
      layout: 'split',
      eyebrow: 'Context',
      title: 'Six months. Seven teams. Nearly 100 people.',
      body: [
        'In 2026 we set out to reimagine Miro as an agentic collaboration platform. In October we launched Intelligent Canvas 2.0 to Miro’s 100 million users.',
        'I co-led the program and was responsible for the end-to-end product experience strategy and how we operationalised it.',
      ],
      media: [{ kind: 'image', src: '/diagrams/stream-structure.svg', alt: 'The AI stream: five formal teams (Surface, Behaviour, Context, Harness, AI Trust) and two virtual teams (Board Gen, Evals Infra).', caption: 'The AI stream' }],
      todo: ['Who I co-led with (role), so "I" vs "we" is clean'],
      notes: 'Say "I" for the calls, "we" for the build. Don\'t open with the $1.4bn exit or the numbers.',
    },

    // ---- The problem ---------------------------------------------------
    {
      chapter: 'The problem',
      layout: 'statement',
      eyebrow: 'An existential moment',
      title: 'Teams were jumping straight to building with their agents. Collaboration was moving later, and away from the canvas.',
      criteria: ['First principles'],
      notes: 'As individuals could do more on their own, people turned to agents for early, open-ended work. Team engagement in early ideation declined across the industry. Left alone, that meant lower team usage exactly where Miro adds the most value.',
    },
    {
      chapter: 'The problem',
      layout: 'statement',
      eyebrow: 'The clay pot',
      title: 'Get your hands on the clay and you own the pot. Hand someone a finished, glazed pot and all they can do is break it.',
      notes: 'Agent output was hard to adopt and the process behind it hard to trace, so teams couldn\'t build on it. This is why "editable, collaborative artifacts" became a goal, not a nice-to-have.',
    },
    {
      chapter: 'The problem',
      layout: 'split',
      eyebrow: 'The reframe',
      title: 'Not a surface for early ideas. A place to see and steer agent work.',
      bullets: [
        { text: 'Visualise and understand high volumes of agent work' },
        { text: 'Untangle the new process bottlenecks' },
        { text: 'Coordinate teams of humans and agents' },
        { text: 'Codify and spread the AI workflows that work' },
      ],
      call: 'I framed this as existential, not a feature gap. That changed what we were willing to stop doing.',
      criteria: ['First principles', 'Communication'],
      media: [{ kind: 'todo', caption: 'Optional: an early framing artifact (strategy board or memo) from Jan–Feb' }],
    },

    // ---- Creating clarity ---------------------------------------------
    {
      chapter: 'Creating clarity',
      layout: 'statement',
      eyebrow: 'The mission',
      title: 'Make the canvas the best shared visual space for human-to-human and human-to-agent collaboration.',
      notes: 'One simple mission across 7 teams. Signals we\'d expect: MCP growth and retention, stickiness of the core AI experience, content survival and board share rates.',
    },
    {
      chapter: 'Creating clarity',
      layout: 'split',
      eyebrow: 'Two ways in, one foundation',
      title: 'If work starts in external agents, what is Miro for?',
      body: [
        'Sidekicks inside the canvas, and MCP for people already working through Claude, ChatGPT or Codex. Both on the same core read, write and update tools, so every improvement reached both.',
      ],
      call: 'One tool layer for first- and third-party agents, instead of two products.',
      criteria: ['First principles', 'Partnership'],
      media: [{ kind: 'image', src: '/diagrams/ai-stack.svg', alt: 'Miro’s AI stack: Sidekicks and Flows in Miro, third-party agents via MCP, all on shared context, behaviour, trust and tools layers.', caption: 'Productecture' }],
    },
    {
      chapter: 'Creating clarity',
      layout: 'split',
      eyebrow: 'Every level of adoption',
      title: 'From holdouts to frontier teams, on one canvas.',
      body: ['We had to build for the agentic era without unsettling the reliable canvas teams had built their workflows around.'],
      media: [{ kind: 'image', src: '/diagrams/ai-cohorts.svg', alt: 'Four customer cohorts from holdouts to frontier teams, and what each needed.', caption: 'Customer cohorts' }],
    },
    {
      chapter: 'Creating clarity',
      layout: 'full',
      eyebrow: 'The vision, built like production software',
      title: 'One experience for the end state of all five investments.',
      body: ['It became our All Hands story, Show and Tell playground, customer testing ground and engineering spec.'],
      media: [{ kind: 'video', src: '/media/vision-sizzle-rko26.mp4', poster: '/media/vision-sizzle-rko26.jpg' }],
      criteria: ['Communication', 'Partnership'],
      notes: 'This is how I got PM and Eng behind a direction: one coded vision used everywhere. Then open the live prototype in another tab if they want to poke at it.',
    },
    {
      chapter: 'Creating clarity',
      layout: 'grid',
      eyebrow: 'Principles',
      title: 'Humanity. Forward momentum. Radical simplicity.',
      media: [
        { kind: 'video', src: '/media/principles/humanity.mp4', poster: '/media/principles/humanity.jpg', caption: 'Humanity' },
        { kind: 'video', src: '/media/principles/momentum.mp4', poster: '/media/principles/momentum.jpg', caption: 'Forward momentum' },
        { kind: 'video', src: '/media/principles/simplicity.mp4', poster: '/media/principles/simplicity.jpg', caption: 'Radical simplicity' },
      ],
      criteria: ['Craft'],
    },
    {
      chapter: 'Creating clarity',
      layout: 'grid',
      eyebrow: 'Dead ends',
      title: 'The versions we threw away, and why.',
      media: [
        { kind: 'todo', caption: 'A #bad-versions exploration of my own' },
        { kind: 'todo', caption: 'A boundary concept we dropped, and the reason' },
        { kind: 'todo', caption: 'An early chat-first direction we moved away from' },
      ],
      criteria: ['Craft', 'Agency'],
      todo: ['2–3 discarded explorations with one line each on why they died'],
      notes: 'The reviewers explicitly asked for explorations, dead ends and throwaway versions. Messy is fine. Kept the core design team at about five on purpose so rough ideas were welcome.',
    },

    // ---- The model layer ----------------------------------------------
    {
      chapter: 'The model layer',
      layout: 'split',
      eyebrow: 'Tool formats',
      title: 'Let the model work in formats it reasons well in. Then make it editable.',
      body: [
        'Agents write SVG, Markdown, Mermaid, HTML and CSV, formats they have seen endlessly in training. The engine translates that into native, editable canvas content.',
      ],
      call: 'The formats bet: quality goes up, and people can still get their hands on the clay.',
      criteria: ['Technical AI', 'First principles'],
      media: [{ kind: 'todo', caption: 'Diagram: prompt → model writes SVG / Mermaid → translator → editable stickies, shapes, docs' }],
      todo: ['A real example of the same board as SVG source and as canvas objects'],
      notes: 'Strongest first-principles answer. Be ready to go one level deeper: why not call canvas tools directly? (Tool-call chains for 2D layout were brittle; models are bad at coordinates, good at known formats.) Confirm this reasoning is accurate before saying it.',
    },
    {
      chapter: 'The model layer',
      layout: 'grid',
      eyebrow: 'Decision models',
      title: 'AI that doesn’t write. It picks, in a few hundred milliseconds.',
      media: [
        { kind: 'video', src: `${AI}/picture-sorting-clef.mp4`, caption: 'Twelve pictures sorted in about 1.5 seconds' },
        { kind: 'video', src: `${AI}/point-and-jev.mp4`, caption: 'Say “here” and “this”, and the board knows' },
        { kind: 'video', src: `${AI}/builds-while-typing.mp4`, caption: 'The board builds while you type' },
      ],
      criteria: ['Technical AI', 'Agency'],
      notes: 'My own experiments: 21 videos from the first sorting test onwards. Speed changed what was possible. Explain internal names (JEV, Clef) as "a fast decision model" rather than naming them. Be honest: most of this didn\'t reach production.',
    },
    {
      chapter: 'The model layer',
      layout: 'grid',
      eyebrow: 'Making agents legible',
      title: 'You can’t trust an agent you can’t see working.',
      media: [
        { kind: 'video', src: `${AI}/ai-see-ya-work.mp4`, caption: 'Agent cursors move where agents really read and write' },
        { kind: 'video', src: `${AI}/megaplan.mp4`, caption: 'Planning mode checks what it needs, then plans on the board' },
      ],
      criteria: ['Craft', 'Technical AI'],
    },
    {
      chapter: 'The model layer',
      layout: 'split',
      eyebrow: 'Where it broke',
      title: 'A failure mode we found, and how we fixed it.',
      criteria: ['Technical AI'],
      media: [{ kind: 'todo', caption: 'Before/after of the failure (layout, selection context, multi-artifact turns…)' }],
      todo: [
        'The failure mode, in one line',
        'How we caught it (eval, user test, dogfooding)',
        'What we changed: prompt, tool, harness or UI',
        'How we checked the fix held',
      ],
      notes: 'Expect the hardest pushing here. Fin rates model-layer depth and evals above everything else.',
    },

    // ---- The quality call ---------------------------------------------
    {
      chapter: 'The quality call',
      layout: 'statement',
      eyebrow: 'Canvas ’26, a fixed date',
      title: 'Sidekicks satisfaction was low, and what AI put on the board wasn’t good enough.',
      criteria: ['Craft'],
      notes: 'Tell it with the tension in it. GTM was ready and the event date was fixed.',
    },
    {
      chapter: 'The quality call',
      layout: 'grid',
      eyebrow: 'Same prompt, two engines',
      title: 'BoardGen V1 vs V2.',
      media: [
        { kind: 'todo', caption: 'BoardGen V1 output' },
        { kind: 'todo', caption: 'BoardGen V2 output, same prompt' },
      ],
      criteria: ['Craft'],
      todo: ['Side-by-side boards on the same prompt; zoom into one detail I sent back'],
      notes: 'This is the craft moment. Zoom right in.',
    },
    {
      chapter: 'The quality call',
      layout: 'split',
      eyebrow: 'The hold',
      title: 'We held the launch a few weeks until BoardGen V2 was ready.',
      body: ['Rather than send more people into a weak experience, we made the new engine the priority, and didn’t push activation until quality was fixed.'],
      call: 'Hold the launch, despite a fixed event date.',
      criteria: ['Agency', 'Partnership'],
      todo: ['Who pushed back (roles, not names) and how I brought them round'],
      media: [{ kind: 'todo', caption: 'Artifact from the decision: the review doc, Slack thread or launch-readiness board' }],
    },
    {
      chapter: 'The quality call',
      layout: 'split',
      eyebrow: 'How we knew it was ready',
      title: 'The eval that told us V2 was good enough.',
      criteria: ['Technical AI'],
      media: [{ kind: 'todo', caption: 'The test set or rubric: even a spreadsheet of graded boards' }],
      todo: [
        'What we graded (prompts, board types)',
        'The rubric for "good", and who wrote it',
        'The threshold we needed to hit',
        'What the evals infra team built, and design’s part in it',
      ],
      notes: 'Biggest gap against Fin\'s criteria. Design owns the rubric for "good" as much as engineering owns the harness.',
    },
    {
      chapter: 'The quality call',
      layout: 'full',
      eyebrow: 'IC 1.0 → IC 2.0',
      title: 'From one-shot format agents to agents that plan, see and iterate.',
      media: [{ kind: 'image', src: '/diagrams/ic-comparison.svg', alt: 'Twelve capabilities compared between IC 1.0 (non-agentic) and IC 2.0 (agentic).' }],
    },

    // ---- How the team built -------------------------------------------
    {
      chapter: 'How we built',
      layout: 'split',
      eyebrow: 'From vision to spec',
      title: 'Spec sheets beside the prototype, so engineers trusted it.',
      body: [
        'We stopped having review sessions where designers and engineers saw the build together for the first time.',
      ],
      media: [{ kind: 'todo', caption: 'A spec sheet next to its prototype branch (e.g. agent prompt planning)' }],
      criteria: ['Partnership'],
    },
    {
      chapter: 'How we built',
      layout: 'split',
      eyebrow: 'Work in code',
      title: 'Designers merged 700+ pull requests into production since June.',
      body: [
        'Engineering built the pipelines and gates to make design contributions safe. Several design engineers emerged from the team, including me. Vibe Lab let teams share prototypes outside production.',
      ],
      call: 'Train the team to ship to production, and protect it with eng gates rather than reviews.',
      criteria: ['First principles', 'Agency'],
      media: [{ kind: 'video', src: '/media/simplify/prototypes.mp4', caption: 'Prototyping in code' }],
      todo: ['The PR graph over time', 'One real PR a designer merged'],
    },

    // ---- What didn't ship ---------------------------------------------
    {
      chapter: 'What didn’t ship',
      layout: 'grid',
      eyebrow: 'Shone in demos',
      title: 'Real-time voice and multiplayer AI never made it to production.',
      media: [
        { kind: 'video', src: `${AI}/voice-mode.mp4`, caption: 'Voice mode' },
        { kind: 'video', src: `${AI}/multiagent.mp4`, caption: 'Multiple AI bots, board as backend' },
        { kind: 'video', src: `${AI}/wave-to-summon.mp4`, caption: 'Wave to summon' },
      ],
      notes: 'Agentic tooling moved weekly; our focus shifted several times. Have a strong opinion on why these didn\'t ship.',
    },
    {
      chapter: 'What didn’t ship',
      layout: 'split',
      eyebrow: 'What I’d do differently',
      title: 'Evals on day one. Vision and spec split earlier.',
      bullets: [
        { title: 'Evals for board quality from the start', text: 'not when Sidekicks satisfaction dropped. We found the gap late, close to a fixed date.' },
        { title: 'Split the vision prototype from the spec sooner', text: 'one prototype got hard to keep coherent, and we lost time telling vision from spec.' },
      ],
      criteria: ['Communication'],
    },

    // ---- Outcomes -----------------------------------------------------
    {
      chapter: 'Outcomes',
      layout: 'metrics',
      eyebrow: 'Week one of full rollout, October 2026',
      title: 'What changed.',
      metrics: [
        { value: '65% → 79%', label: 'MCP content retention on the new tools' },
        { value: '18% → 37%', label: 'MCP board-editing week-zero retention' },
        { value: '+35%', label: 'Tool calls per user (8.8 → 11.9)' },
        { value: '73%', label: 'CSAT on the new engine' },
      ],
      todo: ['Confirm the 73% CSAT figure (the prep notes still had it as X%)'],
    },
    {
      chapter: 'Outcomes',
      layout: 'full',
      eyebrow: 'Launch',
      title: 'Canvas ’26.',
      media: [{ kind: 'image', src: '/media/stills/canvas-26-keynote.jpg', alt: 'Mark on stage at the Canvas 26 keynote', caption: 'Keynote: youtu.be/qM-KxCr4I5I?t=1537' }],
    },
    {
      chapter: 'Outcomes',
      layout: 'statement',
      eyebrow: 'Reflection',
      title: 'The product advanced when we treated AI as a collaborator, and designed its capabilities, interactions, measurement and trust as one system.',
      notes: 'Then hand over: "That\'s the project. What would you like to dig into?" Leave 10 minutes for questions, including the reporting line.',
    },
  ],
}
