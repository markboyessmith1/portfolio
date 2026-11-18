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

/** Shelf cards (layout 'shelf') read these: an eyebrow, title and line under the media,
    as on the case study's shelves. `ratio` is the media's width ÷ height. */
type CardText = { eyebrow?: string; title?: string; body?: string; ratio?: number }

export type DeckMedia = CardText & (
  | { kind: 'video'; src: string; poster?: string; caption?: string }
  | { kind: 'image'; src: string; caption?: string; alt: string }
  /** a live prototype scene from public/media (the rehearsal artifact plays a recording of it) */
  | { kind: 'embed'; src: string; caption?: string }
  | { kind: 'todo'; caption: string }
)

/** A section's ground: Miro's cloud, white, or the inverted dark. Nothing else. */
export type Ground = 'cloud' | 'white' | 'dark'

export type Criterion = 'Craft' | 'Technical AI' | 'Agency' | 'First principles' | 'Communication' | 'Partnership'

export type DeckSlide = {
  chapter: string
  /** set on a section's first slide; the slides after it keep it until the next one sets another */
  ground?: Ground
  /** 'shelf': title and paragraph over a row of cards (the case study's shelves).
      'band': title and paragraphs across, a film full width beneath (the case study's vision band).
      'numbered': the case study's numbered card; the last `listApart` bullets sit on a card of their own. */
  layout: 'title' | 'statement' | 'split' | 'full' | 'grid' | 'metrics' | 'live' | 'timeline' | 'stack' | 'mosaic' | 'shelf' | 'band' | 'numbered'
  eyebrow?: string
  /** words between underscores are set in Apris, Miro's display serif */
  title: string
  body?: string[]
  bullets?: { title?: string; text: string }[]
  listApart?: number
  media?: DeckMedia[]
  /** The decision Mark made here, set apart so the questions land on his calls. */
  call?: string
  metrics?: { value: string; label: string }[]
  /** Milestones, left to right. `major` ones get the big marker; `held` reads as a plan we moved. */
  timeline?: { when: string; what: string; detail?: string; major?: boolean; held?: boolean }[]
  logos?: string[]
  reflections?: string[]
  criteria?: Criterion[]
  todo?: string[]
  notes?: string
}

const AI = '/media/ai'
const SIMPLIFY = '/media/simplify'

export const DECK: { title: string; slides: DeckSlide[] } = {
  title: 'Journey to the Intelligent Canvas',
  slides: [
    {
      chapter: 'Intro',
      ground: 'cloud',
      layout: 'title',
      eyebrow: 'Miro · 2026 · Past work review',
      title: 'Journey to the _Intelligent Canvas_',
      body: ['Bringing frontier AI capabilities to Miro’s 100 million users.', 'Mark Boyes-Smith, Sr Director, AI Design'],
      media: [{ kind: 'embed', src: '/media/ai/decisions.html', caption: 'Big decisions, made together, with agents doing the legwork' }],
      notes: 'Intro line: "I\'m Mark, Sr Director, AI Design at Miro. We were acquired by Bending Spoons last month after a successful exit, so I\'m looking at what\'s next for 2027." Keep it under a minute.',
    },
    {
      chapter: 'Intro',
      layout: 'split',
      eyebrow: 'Agenda',
      title: 'What we’ll cover.',
      bullets: [
        { title: 'The problem space', text: 'why Miro needed to change in the agentic era.' },
        { title: 'Visualising the solution', text: 'how we built a vision people could use.' },
        { title: 'Operationalising it', text: 'taking it across seven teams and about 100 people.' },
        { title: 'How AI changed our work', text: 'what we built, and how we built it.' },
        { title: 'Challenges along the way', text: 'customers, launch pressure and quality.' },
        { title: 'Reflection', text: 'what I’d keep, and what I’d change.' },
      ],
      media: [{ kind: 'video', src: `${SIMPLIFY}/prototypes.mp4`, caption: 'Everything we made was in code' }],
      criteria: ['Communication'],
      notes: 'One project, Intelligent Canvas 2.0, February to October. Invite interruptions. Plan for ~30 minutes of talking.',
    },
    {
      chapter: 'Intro',
      layout: 'timeline',
      eyebrow: 'The mission · February to October 2026',
      title: 'Make the canvas the best shared visual space for _human‑to‑human_ and human‑to‑agent _collaboration._',
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
    {
      chapter: 'No clear direction',
      ground: 'white',
      layout: 'statement',
      eyebrow: 'An existential moment',
      title: 'Teams were jumping straight to building with their agents. Collaboration was moving later, and away from the canvas.',
      body: ['The canvas had to become more than a surface for early ideation: a place to visualise high volumes of agent work, coordinate teams of humans and agents, and spread the AI workflows that work.'],
      criteria: ['First principles'],
      notes: 'Our moat of visual collaboration was being eaten by the frontier labs and by every other product. Teams were putting up with having conversations in comms tools. Left alone, that meant lower team usage exactly where Miro adds the most value.',
    },
    {
      chapter: 'No clear direction',
      layout: 'statement',
      eyebrow: 'Why it was hard',
      title: 'A huge challenge, for many reasons.',
      bullets: [
        { title: 'Project logistics', text: 'Short time frame\nComplexity of our current platform experience\nLegacy technology blocking the latest tech' },
        { title: 'Industry maturity', text: 'Fast-moving technology\nNo agreement on the future of work\nDiversity in customer needs' },
        { title: 'Strategic direction', text: 'Pricing strategy\nPlatform packaging and value\nProduct roadmap' },
      ],
    },
    {
      chapter: 'No clear direction',
      layout: 'split',
      eyebrow: 'No blueprint',
      title: 'There was no existing paradigm for working with AI on an infinite canvas.',
      body: [
        'To build a canvas where humans and agents collaborate, we had to think beyond the chatbot. Intelligence belonged in the canvas itself. Working with an agent on an infinite canvas was wide open, with no patterns to borrow, and no one had conviction on how it would change the way teams work.',
        'So we asked ourselves: as users of these technologies, what would we want to see?',
      ],
      call: 'That question became the starting point for a prototype we took to our sales teams.',
      criteria: ['First principles', 'Agency'],
    },
    {
      chapter: 'No clear direction',
      layout: 'band',
      eyebrow: 'We started with a vision',
      title: 'A vision you could hand someone as a link, and use like a _real product._',
      body: [
        'We built the vision like production software: one experience covering the end state and boundary concepts for all five investments. It became our All Hands story, Show and Tell playground, customer testing ground and engineering spec.',
        'It had to carry the conversations of about 2,000 people, so it couldn’t be something only the design team could move around. A very small team built it, then took it to customers and broke it down with the teams.',
      ],
      media: [{ kind: 'video', src: '/media/vision-sizzle-rko26.mp4', poster: '/media/vision-sizzle-rko26.jpg' }],
      criteria: ['Communication', 'Partnership', 'Craft'],
      notes: 'I led the vision with Ari (global head of design) and Tilo (principal designer), working closely with our execs Andrea and Jeff. First time I\'ve seen a design vision at this fidelity: ideas buried deep in the prototype you could actually use.',
    },
    {
      chapter: 'No clear direction',
      layout: 'stack',
      title: 'The vision prototype',
      logos: ['React', 'shadcn/ui', 'Claude', 'Liveblocks', 'Supabase', 'Vercel', 'OpenAI'],
      media: [{ kind: 'todo', caption: 'Prototype video, 16:9' }],
      notes: 'Let the video run. The stack around it: all real code, no Figma.',
    },
    {
      chapter: 'No clear direction',
      layout: 'shelf',
      eyebrow: 'Then we distilled three principles from it',
      title: 'Humanity. Forward momentum. _Radical simplicity._',
      media: [
        { kind: 'video', src: '/media/principles/humanity.mp4', poster: '/media/principles/humanity.jpg', title: 'Humanity', body: 'Made by people, for people. Collaboration stays front and centre, and every detail, from the brand to the smallest interaction, is crafted so the work feels human.', ratio: 16 / 9 },
        { kind: 'video', src: '/media/principles/momentum.mp4', poster: '/media/principles/momentum.jpg', title: 'Forward momentum', body: 'Every moment moves the work on. Agents prepare, suggest and follow through, so the team goes from a first idea to a decision without losing pace.', ratio: 16 / 9 },
        { kind: 'video', src: '/media/principles/simplicity.mp4', poster: '/media/principles/simplicity.jpg', title: 'Radical simplicity', body: 'Strip back years of accrued complexity. Fewer tools, less chrome and one prompt to make anything, so there is more room for the work itself.', ratio: 16 / 9 },
      ],
      criteria: ['Craft'],
    },
    {
      chapter: 'No clear direction',
      layout: 'statement',
      eyebrow: 'Our convictions',
      title: 'Three bets everything else rested on.',
      bullets: [
        { title: '01', text: 'A collaborative surface is more important than ever.' },
        { title: '02', text: 'Work must be accessible to all humans and all agents.' },
        { title: '03', text: 'Steering will become a human team’s most important activity.' },
      ],
      criteria: ['First principles'],
    },
    {
      chapter: 'Operationalisation',
      ground: 'dark',
      layout: 'numbered',
      eyebrow: 'Operationalising our vision',
      title: 'Five key investments, across technology and experience.',
      body: ['We ran these in parallel, with forums for air-traffic control on the interdependencies between teams.'],
      listApart: 1,
      bullets: [
        { title: 'Engine and infrastructure', text: 'Critical upgrades to our core agentic infrastructure and engine, unlocking performance and scale, and letting us tap into the latest technology as it evolved.' },
        { title: 'Context and tooling', text: 'Teaching the engine to use all of Miro’s toolkit to create canvas experiences, in the context of the team’s work.' },
        { title: 'New interaction paradigms', text: 'The interface between humans and agents, in the canvas or through MCP.' },
        { title: 'Trust and audit', text: 'Capabilities for enterprises to safeguard data.' },
        { title: 'Strip out complexity', text: 'Removing years of built-up complexity, so teams could see and reach the new capabilities.' },
      ],
      notes: 'We ran these in parallel, with air-traffic-control forums for the interdependencies between teams.',
      criteria: ['First principles', 'Agency'],
    },
    {
      chapter: 'Operationalisation',
      layout: 'split',
      eyebrow: 'Teams built around the investments',
      title: '7 teams, 120 strong.',
      body: ['Surface, Behaviour, Context, Harness and AI Trust, plus virtual teams for Board Gen and Evals Infra cutting across them.'],
      media: [{ kind: 'image', src: '/diagrams/stream-structure.svg', alt: 'The AI stream’s seven domains: Surface, Behaviour, Context, Harness, AI Trust, and virtual teams Board Gen and Evals Infra.', caption: 'Team structure' }],
      criteria: ['Partnership', 'Agency'],
    },
    {
      chapter: 'Operationalisation',
      layout: 'split',
      eyebrow: 'How we ran it',
      title: 'Five investments in parallel, one shared picture.',
      bullets: [
        { title: 'Air-traffic control', text: 'Forums for the interdependencies between teams.' },
        { title: 'The vision as the spec', text: 'All Hands story, Show and Tell playground, customer testing ground and engineering spec, in one prototype.' },
        { title: 'Labs', text: 'Every bet taken through many coded iterations, ready for new models the moment they landed.' },
        { title: 'A lean design team', text: 'Usually five designers, each owning an investment.' },
      ],
      media: [{ kind: 'todo', caption: 'Operating rhythm diagram: forums, cadence, who met when' }],
      todo: ['Cadence: weekly / fortnightly rituals and who was in them', 'Leadership trio and how decisions were made', 'How the 120 people were grouped and reported'],
      criteria: ['Partnership', 'Communication'],
    },
    {
      chapter: 'Operationalisation',
      layout: 'statement',
      eyebrow: 'How AI changed the work',
      title: 'Two shifts.',
      bullets: [
        { title: '01', text: 'We explored more divergent concepts.' },
        { title: '02', text: 'We moved into production code, and changed how we work with engineers.' },
      ],
    },
    {
      chapter: 'Operationalisation',
      layout: 'shelf',
      eyebrow: '01',
      title: 'We explored more _divergent concepts._',
      media: [
        { kind: 'video', src: `${AI}/auto-sort.mp4`, eyebrow: 'Auto-sort', title: 'Write a sticky, click away, and it’s already in the right frame.', body: 'My first test with a decision model: AI that doesn’t write, it just picks from a few options in a few hundred milliseconds.', ratio: 1920 / 1200 },
        { kind: 'video', src: `${AI}/point-and-jev.mp4`, eyebrow: 'Point and talk', title: 'Say “here” and “this”, and the board knows what you’re pointing at.', body: 'It’s how you’d talk to someone standing next to you.', ratio: 1920 / 1206 },
        { kind: 'video', src: `${AI}/builds-while-typing.mp4`, eyebrow: 'Type to build', title: 'The board builds while you type, one word at a time.', body: 'Each circle and sticky lands as I finish its word, and backspacing takes it away again.', ratio: 1920 / 1206 },
        { kind: 'video', src: `${AI}/picture-sorting-clef.mp4`, eyebrow: 'Vision', title: 'Ask which sweaters are beach-ready, and the board sorts them.', body: 'Twelve pictures take about a second and a half.', ratio: 1920 / 1206 },
        { kind: 'video', src: `${AI}/ai-cursor-identity.mp4`, eyebrow: 'Cursor identity', title: 'Pick a color, an animal and a ride, and your cursor is yours.', body: 'Generated stickers that follow you round the canvas.', ratio: 1600 / 1280 },
        { kind: 'video', src: `${AI}/sticky-stack-endless-ideas.mp4`, eyebrow: 'Ideas', title: 'Infinite idea machine', body: 'A sticky stack that never runs out of ideas.', ratio: 1920 / 1200 },
      ],
      criteria: ['Craft', 'Technical AI'],
      notes: 'Scroll the mosaic. Decision models: a fast model that picks rather than writes. Explain internal names (JEV, Clef) as "a fast decision model". Be honest: most of this didn\'t reach production. Sticker packs became the most adopted feature in Miro for a while.',
    },
    {
      chapter: 'Operationalisation',
      layout: 'mosaic',
      eyebrow: '02',
      title: 'We moved into production code, and changed how we work with engineers.',
      metrics: [
        { value: '700+', label: 'pull requests merged into production by designers' },
        { value: '1,000', label: 'prototypes on Vibe Labs' },
      ],
      media: [
        { kind: 'video', src: `${AI}/multiplayer-chat.mp4`, caption: 'Spec sheet: cursor chat' },
        { kind: 'todo', caption: 'Spec sheet page' },
        { kind: 'todo', caption: 'Designer PR graph' },
        { kind: 'todo', caption: 'Vibe Labs gallery' },
      ],
      criteria: ['Partnership', 'Technical AI'],
      notes: 'No Figma: everything was in code, behind pipelines and gates engineering built for us. Spec sheets sat beside the vision prototype, so we stopped having reviews where designers and engineers saw the build together for the first time.',
    },
    {
      chapter: 'No clear direction',
      ground: 'cloud',
      layout: 'shelf',
      eyebrow: 'Investment · Strip out complexity',
      title: 'Simplifying the canvas.',
      body: ['As a 15-year-old product, Miro had accumulated an incredible amount of capability, and a significant amount of experiential debt, made harder to resolve as teams were incentivised to own their own activation and adoption metrics. We stripped back the home, organisational and canvas experience, so the best opportunities reached people at the right point in time.'],
      media: [
        { kind: 'embed', src: `${SIMPLIFY}/toolbar-voice.html`, eyebrow: 'Tools', title: 'A handful of tools made for the agentic era, and one prompt to make anything.', body: 'The few tools you reach for by hand, a prompt that makes whatever you describe, and your voice when you’d rather talk.', ratio: 1.4 },
        { kind: 'embed', src: `${SIMPLIFY}/card-fan.html`, eyebrow: 'Your landing spot', title: 'Important over urgent.', body: 'Miro brings up the decisions, reviews and blockers that actually need you and holds back the rest.', ratio: 1.2059 },
        { kind: 'video', src: `${SIMPLIFY}/home-v2.mp4`, eyebrow: 'Home', title: 'Your spaces, boards and people in one calm place.', body: 'So you pick up right where you left off.', ratio: 16 / 9 },
        { kind: 'video', src: `${SIMPLIFY}/brand-details.mp4`, eyebrow: 'Details', title: 'Tiny details, made for people, by people.', body: 'From the brand to the smallest interaction, crafted by hand so the work feels human.', ratio: 1.7778 },
        { kind: 'video', src: `${SIMPLIFY}/tables.mp4`, eyebrow: 'Tables', title: 'Improving the fidelity of control on your data.', ratio: 1280 / 720 },
      ],
      criteria: ['Craft'],
    },
    {
      chapter: 'No clear direction',
      layout: 'shelf',
      eyebrow: 'Investment · Context and tooling',
      title: 'Agents that work where you work.',
      body: ['Your own agents, wherever they run, could read, create and edit work on the canvas. Through MCP, outside agents like Claude became first-class collaborators, doing real work on the board alongside the team.'],
      media: [
        { kind: 'embed', src: `${AI}/multiplayer-chat.html`, eyebrow: 'Agents', title: 'Multiplayer chat', body: 'One conversation for the whole room: people and agents in the same thread.', ratio: 16 / 9 },
        { kind: 'embed', src: `${AI}/agent-kanban.html`, eyebrow: 'Agents', title: 'Agents building on the canvas', body: 'Sidekick, Claude and others building on the board, cursors and all.', ratio: 16 / 9 },
        { kind: 'embed', src: `${AI}/agent-task-cards.html`, eyebrow: 'Agents', title: 'Agent task cards', body: 'Hand off a task and track it on a card: what the agent is doing, and what it did.', ratio: 16 / 9 },
        { kind: 'embed', src: `${AI}/agent-sidebar.html`, eyebrow: 'Agents', title: 'Sidebar', body: 'A persistent home for longer work with an agent, beside the board.', ratio: 16 / 9 },
        { kind: 'video', src: `${AI}/ai-start-faster.mp4`, eyebrow: 'Agents', title: 'Inline chat', body: 'Ask right where you are on the canvas, and the answer lands in place.', ratio: 1600 / 1280 },
        { kind: 'video', src: `${AI}/wave-to-summon.mp4`, eyebrow: 'Agents', title: 'Wave to summon an agent', body: 'A wave of the cursor, and an agent comes over to help.', ratio: 2716 / 2160 },
      ],
      criteria: ['Technical AI'],
    },
    {
      chapter: 'No clear direction',
      layout: 'shelf',
      eyebrow: 'Investment · Engine and infrastructure',
      title: 'Generative experiences.',
      body: ['Capable generation that made hitting a 9/10 feel effortless: describe what you need and the board builds it, as editable diagrams, docs and tables rather than a static image, ready for the team to pick up.'],
      media: [
        { kind: 'embed', src: `${AI}/board-creation.html`, eyebrow: 'Generative', title: 'Full board creation', body: 'Describe what you need and the whole board builds, editable from the first frame.', ratio: 16 / 9 },
        { kind: 'embed', src: `${AI}/create.html`, eyebrow: 'Generative', title: 'MCP', body: 'Ask from a terminal and Miro sets itself up through MCP: the spaces, the boards and the people.', ratio: 16 / 9 },
        { kind: 'embed', src: `${AI}/recipes.html`, eyebrow: 'Generative', title: 'Skills', body: 'Pick a skill and the agent knows how to do the job, from a retro to a roadmap.', ratio: 16 / 9 },
        { kind: 'video', src: `${AI}/ai-just-tell-me.mp4`, eyebrow: 'Generative', title: 'Questions', body: 'Before it builds, the agent asks what it needs to know to get it right.', ratio: 1600 / 1280 },
        { kind: 'embed', src: `${AI}/next-best-action.html`, eyebrow: 'Generative', title: 'Next best actions', body: 'Suggestions for what to do next, offered right where the work is.', ratio: 16 / 9 },
        { kind: 'video', src: `${AI}/widget-creator.mp4`, eyebrow: 'Generative', title: 'Extending Miro', body: 'A sticker for your team, a custom widget for your workflow, or an interactive playground, built with AI right on the board.', ratio: 1920 / 1080 },
      ],
      criteria: ['Craft', 'Technical AI'],
    },
    {
      chapter: 'No clear direction',
      layout: 'shelf',
      eyebrow: 'Investment · New interaction paradigms',
      title: 'Real-time agentic collaboration.',
      body: ['AI that works in the room with everyone: people and agents shaping the same canvas together, in real time, through voice, cursors and chat.'],
      media: [
        { kind: 'video', src: `${SIMPLIFY}/voice-mode.mp4`, eyebrow: 'Real-time', title: 'Voice mode', body: 'Talk to the board, and the agent builds as you speak.', ratio: 1920 / 1080 },
        { kind: 'embed', src: `${AI}/rda-matrix.html`, eyebrow: 'Real-time', title: 'Real-time transcription', body: 'The meeting transcribes as it happens, and the board keeps up with the conversation.', ratio: 16 / 9 },
        { kind: 'embed', src: `${AI}/huddle.html`, eyebrow: 'Real-time', title: 'Huddles', body: 'One tap on the headset and you’re talking, right on the board.', ratio: 16 / 9 },
        { kind: 'video', src: `${AI}/jev2hands.mp4`, eyebrow: 'Real-time', title: 'Decision models', body: 'A fast model reading the room in real time, so the canvas responds to what people mean.', ratio: 1662 / 1080 },
        { kind: 'video', src: `${AI}/ai-proactive-suggestions.mp4`, eyebrow: 'Real-time', title: 'Proactive suggestions', body: 'A decision model reads what you’re making, and only when it’s sure does Sidekick offer the template that fits.', ratio: 1600 / 1280 },
        { kind: 'video', src: `${SIMPLIFY}/soundscape-ring.mp4`, eyebrow: 'Real-time', title: 'Soundscape', body: 'Soft, living sound tells you when someone joins, reacts, or an agent finishes.', ratio: 16 / 9 },
      ],
      criteria: ['Craft'],
    },
    {
      chapter: 'No clear direction',
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
      chapter: 'No clear direction',
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
      chapter: 'No clear direction',
      layout: 'split',
      eyebrow: 'Cutting room floor',
      title: 'Real-time voice and multiplayer AI didn’t make it to production.',
      body: ['Agentic tooling moved faster than anything we’d worked with. Some real-time multiplayer concepts that shone in demos never shipped. Later in the year, decision models gave us a way to revisit them.'],
      media: [
        { kind: 'video', src: `${AI}/multiagent.mp4`, caption: 'Multiple AI bots with the board as their backend' },
      ],
      notes: 'The technology and the market weren\'t there yet. Have a strong opinion on which of these comes back first.',
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
    {
      chapter: 'Challenges',
      ground: 'white',
      layout: 'statement',
      eyebrow: 'Key challenges',
      title: 'Two challenges that defined it.',
      bullets: [
        { title: '01 · Meeting people where they’re at', text: 'A customer base on a spectrum, and a brand new product experience to push into it.' },
        { title: '02 · Launch timeframe against quality', text: 'BoardGen: a date we’d committed to early, and output that wasn’t ready.' },
      ],
    },
    {
      chapter: 'Challenges',
      layout: 'full',
      eyebrow: '01 · Meeting people where they’re at',
      title: 'Most of our customers sat in the early to late majority.',
      body: ['Our feed-forward research programme put the prototype in front of select users to see how they understood the concepts. It stripped out PMM jargon like “Sidekicks”, which customers just called AI or their agent. We’d built a translation layer nobody needed.'],
      call: 'Sometimes we chose the well-trodden path, even when it felt like a poor decision from an innovation point of view.',
      media: [{ kind: 'image', src: '/diagrams/ai-cohorts.svg', alt: 'Four customer cohorts on a scale from less ready for AI to AI-first: holdouts, cautious adopters, active adopters and frontier teams, with what each needed from the canvas.', caption: 'Customer cohorts' }],
      criteria: ['Partnership'],
      notes: 'The spectrum: holdouts, some didn’t want AI at all; the early to late majority, where most of our customers sat; frontiers, teams already working with agents every day. This is where our feed-forward research programme became incredibly helpful: putting the prototype in front of select users to understand how they read the different concepts. It helped us remove a lot of the product jargon PMM had introduced over consecutive releases, like Sidekicks, which our entire customer base just knew as AI or their agent. We were creating a translation layer that was completely unnecessary in the product.',
    },
    {
      chapter: 'Challenges',
      layout: 'split',
      eyebrow: '01 · Down to the toolbar',
      title: 'Is the AI chat open or closed by default?',
      body: ['We went chat-first because it felt familiar, rather than gestural or voice-led, which felt more immersive. But the second we added chat, we created friction for people who didn’t want AI there.'],
      bullets: [
        { text: 'The same belief split ran through packaging and the website' },
        { text: 'Onboarding and the default experience' },
        { text: 'Credits for AI, when everyone else paid per seat' },
      ],
      media: [
        { kind: 'video', src: `${SIMPLIFY}/toolbars-mono.mp4`, poster: `${SIMPLIFY}/toolbars-mono.jpg`, caption: 'Toolbar explorations' },
        { kind: 'todo', caption: 'Chat-first: the familiar default we shipped' },
        { kind: 'todo', caption: 'Gestural / voice concept we held back' },
        { kind: 'todo', caption: 'Feed-forward research: a session or quote' },
      ],
      criteria: ['Craft', 'Partnership'],
    },
    {
      chapter: 'Challenges',
      layout: 'split',
      eyebrow: '02 · Launch timeframe against quality',
      title: 'We committed to a May launch early. The output wasn’t meeting our bar.',
      call: 'You only get one chance to burn a customer. We planned May; we launched in October.',
      bullets: [
        { title: 'February', text: 'we start.' },
        { title: 'March', text: 'enable the go-to-market teams.' },
        { title: 'May', text: 'ready in some form for our Canvas events.' },
        { title: 'June', text: 'in customers’ hands.' },
      ],
      body: ['Leadership committed to the date very early. As it got closer, the quality of our AI’s output wasn’t meeting our expectations. As a trio we knew we probably had one shot with customers, and we didn’t want to blow it before we felt ready.'],
      media: [{ kind: 'embed', src: '/media/ai/board-creation.html', caption: 'BoardGen: Sidekick builds a plan section by section, and you can edit while it works' }],
      notes: 'The pressure was fair: GTM needed to close significant deals and enthuse their sales teams. It all fell to me, Damir and Henrik. Then go straight into the quality story.',
    },
    {
      chapter: 'Challenges',
      layout: 'split',
      eyebrow: '02 · The pushback',
      title: 'We weren’t prepared to ship it. Fixing it would take time.',
      body: ['We stood up a BoardGen tiger team on both the technical and the experience approach.'],
      bullets: [
        { title: 'Weekly with the C-suite', text: 'full transparency on progress against structured goals.' },
        { title: 'A small vision piece', text: 'showing what we expected board generation to do.' },
        { title: 'A maturity framework', text: 'how the technical capability would evolve to meet that output.' },
        { title: 'Flexible expectations', text: 'not traditional software. We couldn’t work back deterministically from a known output; we had to evolve a model towards it.' },
        { title: 'Working forwards', text: 'from what the model could do, with an evals team turning improvements round fast.' },
      ],
      media: [
        { kind: 'todo', caption: 'BoardGen before and after, same prompt' },
        { kind: 'todo', caption: 'BoardGen maturity curve' },
        { kind: 'todo', caption: 'The BoardGen vision piece' },
      ],
      criteria: ['Partnership', 'Communication'],
      notes: 'My call: Shielding the team would have ended with us chopping the edges off the product to fit the date. A very tense period, and a very rewarding one.',
    },
    {
      chapter: 'Challenges',
      layout: 'split',
      eyebrow: '02 · How we defined good',
      title: 'Evals: what good looked like, and how we measured it.',
      bullets: [
        { title: 'What we graded', text: 'the prompts and board types in the test set.' },
        { title: 'The rubric', text: 'what “good” meant for a board, and design’s part in writing it.' },
        { title: 'The bar', text: 'what we had to clear before we’d launch.' },
        { title: 'A failure the evals caught', text: 'and how we fixed it.' },
      ],
      media: [
        { kind: 'todo', caption: 'Rubric document' },
        { kind: 'todo', caption: 'Graded test set' },
        { kind: 'todo', caption: 'Scores over time against the launch bar' },
        { kind: 'todo', caption: 'A caught failure: before and after' },
      ],
      criteria: ['Technical AI', 'Craft'],
      notes: 'Reference the rubric docs here. Expect the hardest pushing on this slide: Fin rates model-layer depth and evals above everything else. Say who wrote the rubric, what was graded, the bar, and one failure it caught.',
    },
    {
      chapter: 'Outcomes',
      ground: 'dark',
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
      reflections: [
        'We dramatically changed Miro’s product offering and technical capability in a little over eight months.',
        'MCP and better BoardGen quality were the needle movers for CSAT and retention.',
        'Immersive interaction is a quieter win. An infinite canvas does open up novel paradigms and more immersive ways to collaborate, but demand hasn’t reached the mainstream yet.',
      ],
      notes: 'Close: the product advanced when we treated AI as a collaborator, and designed its capabilities, interactions, measurement and trust as one system. Then hand over: "That\'s the project. What would you like to dig into?" Leave 10 minutes for questions, including the reporting line.',
    },
    {
      chapter: 'Appendix',
      ground: 'cloud',
      layout: 'full',
      eyebrow: 'Appendix',
      title: 'How we think about success.',
      media: [{ kind: 'image', src: '/media/appendix/success.png', alt: 'Three goals and their measures: relevance for third-party agents measured by MCP growth and retention; stickiness of the core AI experience measured by share of WAU and stickiness; high-quality editable artifacts measured by content survival and share rates.' }],
    },
    {
      chapter: 'Appendix',
      layout: 'full',
      eyebrow: 'Appendix',
      title: 'Key investment areas over time.',
      media: [{ kind: 'image', src: '/media/appendix/investment-areas.png', alt: 'H1 get the product right, Q3 experience and gen quality and retention (we are here), Q4 activation and adoption friction, next year value capture and next horizon.' }],
    },
    {
      chapter: 'Appendix',
      layout: 'statement',
      eyebrow: 'BoardGen',
      title: 'The best models in the world don’t matter if the output is worse than what a person would make. People just won’t use it.',
      criteria: ['Craft'],
      notes: 'That was our problem all along. A big technology problem with creating great content on the board, solved through engineering, and a design problem in how we approached it.',
    },
    {
      chapter: 'Appendix',
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
      chapter: 'Appendix',
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
      chapter: 'Appendix',
      layout: 'split',
      eyebrow: 'The engineering fix',
      title: 'Let the model write formats it reasons well in. Then make them editable.',
      body: ['Agents write SVG, Markdown, Mermaid, HTML and CSV, formats they’ve seen endlessly in training. The engine turns that into native, editable canvas content.'],
      media: [{ kind: 'todo', caption: 'Diagram: prompt → model writes SVG / Mermaid → translator → editable stickies, shapes, docs' }],
      criteria: ['Technical AI'],
      notes: 'Be ready to go one level deeper on why not call canvas tools directly. Confirm the reasoning with engineering\'s version before saying it.',
    },
    {
      chapter: 'Appendix',
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
      chapter: 'Appendix',
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
      chapter: 'Appendix',
      layout: 'statement',
      eyebrow: 'The call',
      title: 'We planned to launch in May. We launched in October. You only get one chance to burn a customer.',
      criteria: ['Agency', 'Partnership'],
      notes: 'If we take this one shot and miss because the quality isn\'t good enough, they don\'t come back. So we kept it under wraps longer, improved the models, completely changed our infrastructure, and rolled out in October.',
    },
    {
      chapter: 'Appendix',
      layout: 'full',
      eyebrow: 'IC 1.0 → IC 2.0',
      title: 'From one-shot format agents to agents that plan, see and iterate.',
      media: [{ kind: 'image', src: '/diagrams/ic-comparison.svg', alt: 'Twelve capabilities compared between IC 1.0 (non-agentic) and IC 2.0 (agentic).' }],
    },
    {
      chapter: 'Appendix',
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
    {
      chapter: 'Appendix',
      layout: 'full',
      eyebrow: 'Launch',
      title: 'Canvas ’26.',
      media: [{ kind: 'image', src: '/media/stills/canvas-26-keynote.jpg', alt: 'Mark on stage at the Canvas 26 keynote', caption: 'Keynote: youtu.be/qM-KxCr4I5I?t=1537' }],
    },
  ],
}
