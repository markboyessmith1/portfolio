/* The Miro AI case study as a talk: a full-screen, slide-by-slide deck at
   /present/miro-ai, shaped for a 45-minute past work review (Fin, 19 Nov 2026).

   Chapters follow the reviewers' four prompts: no clear direction, the call with
   PM/Eng/AI and the pushback, the quality bar, and how AI changed how we built.
   'live' slides are the hand-offs to real assets (two prototypes, the spec sheets).
   Story and facts from Mark's own walkthrough (18 Nov), plus the case study
   (src/data/site.ts, notes/miro-ai-narrative.md, public/media).

   `todo` marks content that doesn't exist yet: it renders as a dashed
   placeholder so the gaps are obvious while rehearsing.
   `notes` are speaker notes (press N). Colleagues are named in notes only;
   slides use roles. `criteria` tags which of the reviewers' six criteria the
   slide is there to prove. */

export type DeckMedia =
  | { kind: 'video'; src: string; poster?: string; caption?: string }
  | { kind: 'image'; src: string; caption?: string; alt: string }
  | { kind: 'embed'; src: string; caption?: string }
  | { kind: 'todo'; caption: string }

export type Criterion = 'Craft' | 'Technical AI' | 'Agency' | 'First principles' | 'Communication' | 'Partnership'

export type DeckSlide = {
  chapter: string
  layout: 'title' | 'statement' | 'split' | 'full' | 'grid' | 'metrics' | 'live' | 'timeline'
  eyebrow?: string
  title: string
  body?: string[]
  bullets?: { title?: string; text: string }[]
  media?: DeckMedia[]
  /** The decision Mark made here, set apart so the questions land on his calls. */
  call?: string
  metrics?: { value: string; label: string }[]
  /** Milestones, left to right. `major` ones get the big marker; `held` reads as a plan we moved. */
  timeline?: { when: string; what: string; detail?: string; major?: boolean; held?: boolean }[]
  criteria?: Criterion[]
  todo?: string[]
  notes?: string
}

const AI = '/media/ai'
const SIMPLIFY = '/media/simplify'

export const DECK: { title: string; slides: DeckSlide[] } = {
  title: 'Journey to the Intelligent Canvas',
  slides: [
    // ---- Intro --------------------------------------------------------
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
      layout: 'split',
      eyebrow: 'One project, deep',
      title: 'Making Miro matter in the agentic era, with no blueprint. Then holding the launch until the AI was worth using.',
      bullets: [
        { title: 'This walkthrough', text: 'the problem, the calls I made and what changed.' },
        { title: 'Two prototypes, live', text: 'an early one and a later one, so you can see how the thinking moved.' },
        { title: 'The spec sheets', text: 'like cursor chat, to show how we worked with engineering.' },
      ],
      media: [{ kind: 'video', src: `${SIMPLIFY}/prototypes.mp4`, caption: 'Everything we made was in code' }],
      criteria: ['Communication'],
      notes: 'One project, Intelligent Canvas 2.0, February to October. Invite interruptions. Plan for ~30 minutes of talking.',
    },
    {
      chapter: 'Intro',
      layout: 'timeline',
      eyebrow: 'The mission · February to October 2026',
      title: 'Make the canvas the best shared visual space for human‑to‑human and human‑to‑agent collaboration.',
      timeline: [
        { when: 'Feb 2026', what: 'Kick-off', detail: 'Vision work starts; seven teams, one mission', major: true },
        { when: 'Mar', what: 'Go-to-market enablement' },
        { when: '19 May', what: 'Canvas ’26, San Francisco', detail: 'Agents on the canvas, MCP, agentic Sidekicks announced', major: true },
        { when: 'Jul', what: 'Planned launch, held', detail: 'BoardGen quality wasn’t there yet', held: true },
        { when: '10 Sep', what: 'Bending Spoons agreement', detail: '$1.355bn, announced' },
        { when: 'Oct', what: 'Intelligent Canvas 2.0', detail: 'Full rollout to Miro’s users', major: true },
      ],
      notes: 'Dates: Canvas ’26 press release, San Francisco, 19 May 2026 (miro.com/newsroom). Bending Spoons agreement announced 10 Sep 2026, $1.355bn enterprise value (Goodwin). The rest from my own timeline. The trio: me, Damir (product partner) and Henrik (engineering leader), about 100 people across seven teams. Say "I" for the calls, "we" for the build.',
    },
    // ---- Prompt 2: no clear direction ---------------------------------
    {
      chapter: 'No clear direction',
      layout: 'statement',
      eyebrow: 'An existential moment',
      title: 'Teams were jumping straight to building with their agents. Collaboration was moving later, and away from the canvas.',
      criteria: ['First principles'],
      notes: 'Our moat of visual collaboration was being eaten by the frontier labs and by every other product. Teams were putting up with having conversations in comms tools. Left alone, that meant lower team usage exactly where Miro adds the most value.',
    },
    {
      chapter: 'No clear direction',
      layout: 'split',
      eyebrow: 'No blueprint',
      title: 'Nobody was thinking about interaction paradigms beyond chat.',
      body: ['We set out to bring frontier intelligence to early and late majority teams through visual collaboration. Nobody was doing it, and the technology wasn’t there yet.'],
      bullets: [
        { title: 'How much of the apple to bite off', text: 'and how to make room for it on an ageing platform that was hard to add to.' },
        { title: 'Strip it back first', text: 'years of accrued complexity had to go before new capabilities could land.' },
        { title: 'What is the right way to work with agents?', text: 'everyone was figuring that out at the same time as us.' },
      ],
      call: 'Frame it as existential, not a feature gap. That changed what we were willing to stop doing.',
      criteria: ['First principles', 'Agency'],
    },
    {
      chapter: 'No clear direction',
      layout: 'statement',
      eyebrow: 'The mission',
      title: 'Make the canvas the best shared visual space for human-to-human and human-to-agent collaboration.',
      notes: 'One simple mission across 7 teams. Signals: MCP growth and retention, stickiness of the core AI experience, content survival and board share rates.',
    },
    {
      chapter: 'No clear direction',
      layout: 'full',
      eyebrow: 'Creating the clarity',
      title: 'A vision you could hand someone as a link, and use like a real product.',
      body: ['It had to carry the conversations of about 2,000 people, so it couldn’t be something only the design team could move around. A very small team built it, then took it to customers and broke it down with the teams.'],
      media: [{ kind: 'video', src: '/media/vision-sizzle-rko26.mp4', poster: '/media/vision-sizzle-rko26.jpg' }],
      criteria: ['Communication', 'Partnership', 'Craft'],
      notes: 'I led the vision with Ari (global head of design) and Tilo (principal designer), working closely with our execs Andrea and Jeff. First time I\'ve seen a design vision at this fidelity: ideas buried deep in the prototype you could actually use.',
    },
    {
      chapter: 'No clear direction',
      layout: 'live',
      eyebrow: 'Live',
      title: 'Prototype 1: where we started.',
      body: ['Switch to the early prototype.'],
      todo: ['Which prototype, and its link open in a tab', 'The one thing to point at, and what we later threw away from it'],
      notes: 'Keep it to 3–4 minutes. Show the rough edges: they asked for explorations and dead ends.',
    },
    {
      chapter: 'No clear direction',
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
      chapter: 'No clear direction',
      layout: 'split',
      eyebrow: 'Two ways in, one foundation',
      title: 'If work starts in external agents, what is Miro for?',
      body: ['Sidekicks inside the canvas, and MCP for people already working through Claude, ChatGPT or Codex. Both on the same core read, write and update tools, so every improvement reached both.'],
      call: 'One tool layer for first- and third-party agents, instead of two products.',
      criteria: ['First principles', 'Technical AI'],
      media: [{ kind: 'image', src: '/diagrams/ai-stack.svg', alt: 'Miro’s AI stack: Sidekicks and Flows in Miro, third-party agents via MCP, all on shared context, behaviour, trust and tools layers.', caption: 'Productecture' }],
    },

    // ---- Prompt 3: the call and the pushback --------------------------
    {
      chapter: 'The pushback',
      layout: 'statement',
      eyebrow: 'Meeting customers where they are',
      title: 'Some of our customers didn’t want AI at all.',
      criteria: ['Partnership'],
      notes: 'This was the biggest challenge of the project, and it came up week on week. Our beliefs were split between reinforcing the enterprise base and betting the farm on being the next agentic leader, knowing the enterprise base wouldn\'t sustain us forever.',
    },
    {
      chapter: 'The pushback',
      layout: 'split',
      eyebrow: 'A broad spectrum',
      title: 'You can ship faster than competitors, and still outrun your customers.',
      bullets: [
        { title: 'Facilitators', text: 'want to know exactly what participants see. They don’t want people playing with AI mid-workshop.' },
        { title: 'Enterprise', text: 'what does an agent do in a board with someone who isn’t allowed to see what you can?' },
        { title: 'The business', text: 'had to move faster towards agents than many customers could adopt.' },
      ],
      media: [{ kind: 'image', src: '/diagrams/ai-cohorts.svg', alt: 'Four customer cohorts from holdouts to frontier teams, and what each needed.', caption: 'Customer cohorts' }],
      criteria: ['Partnership', 'First principles'],
    },
    {
      chapter: 'The pushback',
      layout: 'split',
      eyebrow: 'Down to the toolbar',
      title: 'Is the AI chat open or closed by default?',
      body: ['Chat was familiar and a great stepping stone. But the second we added it, we created friction for people who didn’t want AI there. It felt like we’d annoy half our customers whichever way we went.'],
      bullets: [
        { text: 'The same belief split ran through packaging and the website' },
        { text: 'Onboarding and the default experience' },
        { text: 'Credits for AI, when everyone else paid per seat' },
      ],
      media: [{ kind: 'video', src: `${SIMPLIFY}/toolbars-mono.mp4`, poster: `${SIMPLIFY}/toolbars-mono.jpg`, caption: 'Toolbar explorations' }],
      todo: ['What we decided on the default, and why'],
      criteria: ['Craft', 'Partnership'],
    },
    {
      chapter: 'The pushback',
      layout: 'split',
      eyebrow: 'Time to launch',
      title: 'Go-to-market needed a date to sell towards.',
      bullets: [
        { title: 'February', text: 'we start.' },
        { title: 'March', text: 'enable the go-to-market teams.' },
        { title: 'May', text: 'ready in some form for our Canvas events.' },
        { title: 'June', text: 'in customers’ hands.' },
      ],
      body: ['Near the date we had all the pieces, but not the maturity or infrastructure to get repeatable, quality results. This was on another scale from anything Miro had tried.'],
      notes: 'The pressure was fair: GTM needed to close significant deals and enthuse their sales teams. It all fell to me, Damir and Henrik. Then go straight into the quality story.',
    },

    // ---- Prompt 1: quality --------------------------------------------
    {
      chapter: 'Quality',
      layout: 'statement',
      eyebrow: 'BoardGen',
      title: 'The best models in the world don’t matter if the output is worse than what a person would make. People just won’t use it.',
      criteria: ['Craft'],
      notes: 'That was our problem all along. A big technology problem with creating great content on the board, solved through engineering, and a design problem in how we approached it.',
    },
    {
      chapter: 'Quality',
      layout: 'split',
      eyebrow: 'Where we started',
      title: 'We designed backwards from the end state. The models didn’t care.',
      body: ['Early on we took a heavy-handed design approach, layered over models that already worked in a very specific way. We weren’t running our own models.'],
      bullets: [
        { text: 'How the brand aesthetic should feel' },
        { text: 'Which format to use for which exercise' },
        { text: 'How to lay those formats out' },
        { text: 'How to overlay your brand and everything we knew about your context' },
      ],
      media: [{ kind: 'todo', caption: 'An early, heavy-handed BoardGen design: the board we mocked up versus what the model produced' }],
      criteria: ['Craft', 'Technical AI'],
    },
    {
      chapter: 'Quality',
      layout: 'split',
      eyebrow: 'The flip',
      title: 'Work forwards from what the model can do.',
      body: [
        'Find the limits of each model, then engineer the prompt that gets it to a good result. We wrote a set of core principles we believed would realistically lead to good output, and worked from there.',
        'Less designing the output, more creating the right environment for a prompt to succeed.',
      ],
      call: 'Drop “start with the end in mind” for generation, and work forwards from the model. It caused real tension in the team for a while.',
      criteria: ['First principles', 'Technical AI'],
      todo: ['The core principles, as written', 'One before/after where a principle changed the output'],
    },
    {
      chapter: 'Quality',
      layout: 'split',
      eyebrow: 'The engineering fix',
      title: 'Let the model write formats it reasons well in. Then make them editable.',
      body: ['Agents write SVG, Markdown, Mermaid, HTML and CSV, formats they’ve seen endlessly in training. The engine turns that into native, editable canvas content.'],
      media: [{ kind: 'todo', caption: 'Diagram: prompt → model writes SVG / Mermaid → translator → editable stickies, shapes, docs' }],
      criteria: ['Technical AI'],
      notes: 'Be ready to go one level deeper on why not call canvas tools directly. Confirm the reasoning with engineering\'s version before saying it.',
    },
    {
      chapter: 'Quality',
      layout: 'split',
      eyebrow: 'Evals',
      title: 'An evals team that could turn around improvements fast.',
      criteria: ['Technical AI'],
      media: [{ kind: 'todo', caption: 'The test set or rubric: even a spreadsheet of graded boards' }],
      todo: [
        'What we graded (prompts, board types)',
        'The rubric for “good”, and design’s part in writing it',
        'The bar we needed to clear before launch',
        'One failure mode the evals caught, and the fix',
      ],
      notes: 'Expect the hardest pushing here. Fin rates model-layer depth and evals above everything else.',
    },
    {
      chapter: 'Quality',
      layout: 'grid',
      eyebrow: 'Same prompt, two engines',
      title: 'BoardGen V1 vs V2.',
      media: [
        { kind: 'todo', caption: 'BoardGen V1 output' },
        { kind: 'todo', caption: 'BoardGen V2 output, same prompt' },
      ],
      criteria: ['Craft'],
      todo: ['Side-by-side boards on the same prompt; zoom into one detail'],
    },
    {
      chapter: 'Quality',
      layout: 'statement',
      eyebrow: 'The call',
      title: 'We planned to launch in July. We launched in October. You only get one chance to burn a customer.',
      criteria: ['Agency', 'Partnership'],
      notes: 'If we take this one shot and miss because the quality isn\'t good enough, they don\'t come back. So we kept it under wraps longer, improved the models, completely changed our infrastructure, and rolled out in October.',
    },
    {
      chapter: 'Quality',
      layout: 'split',
      eyebrow: 'Handling the pushback',
      title: 'More transparency, not a privacy screen.',
      body: ['The delay was really uncomfortable for our go-to-market partners and our executives. So we opened up the inner workings of the team.'],
      bullets: [
        { text: 'Very structured goals we had to hit' },
        { text: 'Week on week: what we’d done, and how far off the goals we were' },
        { text: 'Kept basic and open, so people understood why' },
      ],
      call: 'Shielding the team would have ended with us chopping the edges off the product to fit the date.',
      media: [{ kind: 'todo', caption: 'The weekly goals update we shared (redacted)' }],
      criteria: ['Partnership', 'Communication'],
      notes: 'A very tense period, and a very rewarding one.',
    },
    {
      chapter: 'Quality',
      layout: 'full',
      eyebrow: 'IC 1.0 → IC 2.0',
      title: 'From one-shot format agents to agents that plan, see and iterate.',
      media: [{ kind: 'image', src: '/diagrams/ic-comparison.svg', alt: 'Twelve capabilities compared between IC 1.0 (non-agentic) and IC 2.0 (agentic).' }],
    },

    // ---- Prompt 4: AI changed how we built ----------------------------
    {
      chapter: 'How AI changed the work',
      layout: 'split',
      eyebrow: 'A completely AI-forward team',
      title: 'We didn’t open Figma once.',
      body: [
        'Everything was in code. Since June, designers have merged more than 700 pull requests into production, behind pipelines and gates engineering built for them.',
        'The bigger change was using AI to explore new technology at very high fidelity, before it was ready.',
      ],
      media: [{ kind: 'todo', caption: 'The designer PR graph, or one real merged PR' }],
      criteria: ['First principles', 'Agency'],
    },
    {
      chapter: 'How AI changed the work',
      layout: 'split',
      eyebrow: 'Autopilot',
      title: 'Why touch the board at all, if it’s up on everyone’s screen?',
      body: ['Ambient intelligence that listens to the conversation, grabs the notes and puts the right material in front of the team at the right time, while staying multiplayer if you want to step in.'],
      bullets: [
        { text: 'Liveblocks and tldraw, as there was no standalone Miro for prototypes yet' },
        { text: 'A range of OpenAI voice models' },
        { text: 'Motion, and shaders that trail the canvas where you touch' },
      ],
      media: [{ kind: 'todo', caption: 'Autopilot prototype clip' }],
      criteria: ['Technical AI', 'Agency'],
      notes: 'Built before decision models were available. Designers wouldn\'t have even looked for these technologies before, let alone played with them. Taking the gloves off cranked up the creativity.',
    },
    {
      chapter: 'How AI changed the work',
      layout: 'grid',
      eyebrow: 'Decision models',
      title: 'AI that doesn’t write. It picks, in a few hundred milliseconds.',
      media: [
        { kind: 'video', src: `${AI}/picture-sorting-clef.mp4`, caption: 'Twelve pictures sorted in about 1.5 seconds' },
        { kind: 'video', src: `${AI}/point-and-jev.mp4`, caption: 'Say “here” and “this”, and the board knows' },
        { kind: 'video', src: `${AI}/builds-while-typing.mp4`, caption: 'The board builds while you type' },
      ],
      criteria: ['Technical AI'],
      notes: 'My own experiments: 21 videos from the first sorting test onwards. Explain internal names (JEV, Clef) as "a fast decision model". Be honest: most of this didn\'t reach production.',
    },
    {
      chapter: 'How AI changed the work',
      layout: 'grid',
      eyebrow: 'The gloves off',
      title: 'Early thinking, at a quality you can hand someone and watch them play.',
      media: [
        { kind: 'video', src: `${AI}/jev2hands.mp4`, caption: 'Moving the canvas with your hands, through the webcam' },
        { kind: 'video', src: `${SIMPLIFY}/soundscape-ring.mp4`, caption: '360° soundscape: hear the collaboration around you' },
        { kind: 'video', src: `${AI}/ai-cursor-identity.mp4`, caption: 'Generated stickers that become your cursor' },
      ],
      criteria: ['Craft', 'Agency'],
      notes: 'Also eye tracking and more generative UI. Sticker packs became the most adopted feature in Miro for a while, because the prompt engineering was spot on.',
    },
    {
      chapter: 'How AI changed the work',
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
      chapter: 'How AI changed the work',
      layout: 'live',
      eyebrow: 'Live',
      title: 'The spec sheets: cursor chat.',
      body: ['Switch to the spec. This is how a prototype became something engineering could build.'],
      media: [{ kind: 'video', src: `${AI}/multiplayer-chat.mp4`, caption: 'Cursor chat' }],
      todo: ['Cursor chat spec open in a tab'],
      criteria: ['Partnership', 'Craft'],
      notes: 'Spec sheets sat beside the vision prototype. We stopped having reviews where designers and engineers saw the build together for the first time.',
    },
    {
      chapter: 'How AI changed the work',
      layout: 'live',
      eyebrow: 'Live',
      title: 'Prototype 2: where we ended up.',
      body: ['Switch to the later prototype.'],
      todo: ['Which prototype, and its link open in a tab', 'What changed since prototype 1, and why'],
    },

    // ---- What didn't ship ---------------------------------------------
    {
      chapter: 'What didn’t ship',
      layout: 'grid',
      eyebrow: 'Shone in demos',
      title: 'Real-time voice and multiplayer AI didn’t make it to production.',
      media: [
        { kind: 'video', src: `${AI}/voice-mode.mp4`, caption: 'Voice mode' },
        { kind: 'video', src: `${AI}/multiagent.mp4`, caption: 'Multiple AI bots, board as backend' },
        { kind: 'video', src: `${AI}/wave-to-summon.mp4`, caption: 'Wave to summon' },
      ],
      notes: 'The technology and the market weren\'t there yet. Have a strong opinion on which of these comes back first.',
    },
    {
      chapter: 'What didn’t ship',
      layout: 'split',
      eyebrow: 'What I’d do differently',
      title: 'Work forwards from day one. Evals from day one.',
      bullets: [
        { title: 'Start from the model’s limits', text: 'we lost time designing generation backwards from a brand opinion.' },
        { title: 'Evals for board quality from the start', text: 'we found the quality gap close to a fixed date.' },
      ],
      criteria: ['Communication'],
      todo: ['Check these are the two you believe'],
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
      todo: ['Confirm the 73% CSAT figure'],
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
