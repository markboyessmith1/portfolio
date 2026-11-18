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
  layout: 'title' | 'statement' | 'split' | 'full' | 'grid' | 'metrics' | 'live' | 'timeline' | 'stack' | 'mosaic'
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
      eyebrow: 'Agenda',
      title: 'What we’ll cover.',
      bullets: [
        { title: 'The problem space', text: 'why Miro needed to change in the agentic era.' },
        { title: 'Visualising the solution', text: 'how we built a vision people could use.' },
        { title: 'Operationalising it', text: 'taking it across seven teams and about 100 people.' },
        { title: 'Challenges along the way', text: 'customers, launch pressure and quality.' },
        { title: 'How AI changed our work', text: 'what we built, and how we built it.' },
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
        'Design couldn’t answer everything. But nobody had a model for doing real work with AI on a canvas, from early ideation to late-stage artifacts, in a multiplayer space. No one had conviction on how this would change the way teams work.',
        'So we asked ourselves: as users of these technologies, what would we want to see?',
      ],
      call: 'That question became the starting point for a prototype we took to our sales teams.',
      criteria: ['First principles', 'Agency'],
    },
    {
      chapter: 'No clear direction',
      layout: 'full',
      eyebrow: 'We started with a vision',
      title: 'A vision you could hand someone as a link, and use like a real product.',
      body: ['It had to carry the conversations of about 2,000 people, so it couldn’t be something only the design team could move around. A very small team built it, then took it to customers and broke it down with the teams.'],
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
      layout: 'grid',
      eyebrow: 'Then we distilled three principles from it',
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
      layout: 'statement',
      eyebrow: 'Operationalising our vision',
      title: 'Five key investments, across technology and experience.',
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
      chapter: 'No clear direction',
      layout: 'split',
      eyebrow: 'Investment · Strip out complexity',
      title: 'Simplifying the canvas.',
      body: ['Fifteen years of experiential debt. Before AI could feel effortless, the canvas around it had to get simpler.'],
      media: [{ kind: 'video', src: `${SIMPLIFY}/home-v2.mp4` }, { kind: 'video', src: `${SIMPLIFY}/toolbar-agentic.mp4` }],
      criteria: ['Craft'],
    },
    {
      chapter: 'No clear direction',
      layout: 'grid',
      eyebrow: 'Investment · Context and tooling',
      title: 'Agents that work where you work.',
      body: ['Through MCP, outside agents join the board as collaborators, not as a separate product.'],
      media: [{ kind: 'video', src: `${AI}/ai-all-in-this-together.mp4` }, { kind: 'video', src: `${AI}/ai-jamming-with-you.mp4` }],
      criteria: ['Technical AI'],
    },
    {
      chapter: 'No clear direction',
      layout: 'grid',
      eyebrow: 'Investment · Engine and infrastructure',
      title: 'Generative experiences.',
      body: ['Hitting a 9/10 should feel effortless: editable diagrams, docs and tables, not static output.'],
      media: [{ kind: 'video', src: `${AI}/ai-start-faster.mp4` }, { kind: 'video', src: `${AI}/ai-just-tell-me.mp4` }, { kind: 'video', src: `${AI}/retroflow.mp4` }],
      criteria: ['Craft', 'Technical AI'],
    },
    {
      chapter: 'No clear direction',
      layout: 'grid',
      eyebrow: 'Investment · New interaction paradigms',
      title: 'Real-time agentic collaboration.',
      body: ['Voice, cursors and chat: the agent is in the room, in real time.'],
      media: [{ kind: 'video', src: `${AI}/ai-catches-you-up.mp4` }, { kind: 'video', src: `${AI}/ai-proactive-suggestions.mp4` }, { kind: 'video', src: `${AI}/voice-mode.mp4` }],
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
      layout: 'grid',
      eyebrow: 'Cutting room floor',
      title: 'Real-time voice and multiplayer AI didn’t make it to production.',
      media: [
        { kind: 'video', src: `${AI}/voice-mode.mp4`, caption: 'Voice mode' },
        { kind: 'video', src: `${AI}/multiagent.mp4`, caption: 'Multiple AI bots, board as backend' },
        { kind: 'video', src: `${AI}/wave-to-summon.mp4`, caption: 'Wave to summon' },
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
      layout: 'statement',
      eyebrow: '01 · Meeting people where they’re at',
      title: 'Most of our customers sat in the early to late majority.',
      body: ['Our feed-forward research programme put the prototype in front of select users to see how they understood the concepts. It stripped out PMM jargon like “Sidekicks”, which customers just called AI or their agent. We’d built a translation layer nobody needed.'],
      bullets: [
        { title: 'Holdouts', text: 'some didn’t want AI at all.' },
        { title: 'The majority', text: 'early to late majority, where most of our customers sat.' },
        { title: 'Frontiers', text: 'teams already working with agents every day.' },
      ],
      call: 'Sometimes we chose the well-trodden path, even when it felt like a poor decision from an innovation point of view.',
      criteria: ['Partnership'],
      notes: 'This is where our feed-forward research programme became incredibly helpful: putting the prototype in front of select users to understand how they read the different concepts. It helped us remove a lot of the product jargon PMM had introduced over consecutive releases, like Sidekicks, which our entire customer base just knew as AI or their agent. We were creating a translation layer that was completely unnecessary in the product.',
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
        { kind: 'todo', caption: 'Evals screenshot' },
      ],
      criteria: ['Partnership', 'Communication'],
      notes: 'My call: Shielding the team would have ended with us chopping the edges off the product to fit the date. A very tense period, and a very rewarding one.',
    },
    {
      chapter: 'How AI changed the work',
      layout: 'statement',
      eyebrow: 'How AI changed the work',
      title: 'Two shifts.',
      bullets: [
        { title: '01', text: 'We explored more divergent concepts.' },
        { title: '02', text: 'We moved into production code, and changed how we work with engineers.' },
      ],
    },
    {
      chapter: 'How AI changed the work',
      layout: 'mosaic',
      eyebrow: '01',
      title: 'We explored more divergent concepts.',
      media: [
        { kind: 'video', src: `${AI}/picture-sorting-clef.mp4`, caption: 'Twelve pictures sorted in about 1.5 seconds' },
        { kind: 'video', src: `${AI}/point-and-jev.mp4`, caption: 'Say “here” and “this”, and the board knows' },
        { kind: 'video', src: `${AI}/builds-while-typing.mp4`, caption: 'The board builds while you type' },
        { kind: 'video', src: `${AI}/jev2hands.mp4`, caption: 'Moving the canvas with your hands, through the webcam' },
        { kind: 'video', src: `${SIMPLIFY}/soundscape-ring.mp4`, caption: '360° soundscape: hear the collaboration around you' },
        { kind: 'video', src: `${AI}/ai-cursor-identity.mp4`, caption: 'Generated stickers that become your cursor' },
      ],
      criteria: ['Craft', 'Technical AI'],
      notes: 'Scroll the mosaic. Decision models: a fast model that picks rather than writes. Explain internal names (JEV, Clef) as "a fast decision model". Be honest: most of this didn\'t reach production. Sticker packs became the most adopted feature in Miro for a while.',
    },
    {
      chapter: 'How AI changed the work',
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
      reflections: [
        'We dramatically changed Miro’s product offering and technical capability in a little over eight months.',
        'MCP and better BoardGen quality were the needle movers for CSAT and retention.',
        'Immersive interaction is a quieter win. An infinite canvas does open up novel paradigms and more immersive ways to collaborate, but demand hasn’t reached the mainstream yet.',
      ],
      notes: 'Close: the product advanced when we treated AI as a collaborator, and designed its capabilities, interactions, measurement and trust as one system. Then hand over: "That\'s the project. What would you like to dig into?" Leave 10 minutes for questions, including the reporting line.',
    },
    {
      chapter: 'Appendix',
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
