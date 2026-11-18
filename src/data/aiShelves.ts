import type { ShelfCardData, ShelfData } from '../components/shelf/PagedShelf'

/* The Miro AI case study's shelves, after the pinned chapters: ported from
   the c26 prototype's /portfolio/ai (src/data/portfolioAiShelves.ts). Clips
   live in public/media/ai/. */

const DIR = '/media/ai'

/** A Monika / Playground recording: 1600×1280, so the card takes that shape. */
function work(group: string, eyebrow: string, n: number, title: string, body: string, video?: string): ShelfCardData {
  return {
    id: `${group}-${n}`,
    eyebrow,
    title,
    body,
    media: video ? { kind: 'video', src: `${DIR}/${video}`, label: title } : { kind: 'blank' },
    ratio: 1600 / 1280,
  }
}
const monika = (n: number, title: string, body: string, video?: string) => work('ai-together', 'Monika', n, title, body, video)
const play = (n: number, title: string, body: string, video?: string) => work('ai-playground', 'Playground', n, title, body, video)

/** A fast decision models recording; `captions` names a .vtt beside it. */
const clip = (file: string, label: string, captions?: string) =>
  ({ kind: 'video', src: `${DIR}/${file}`, label, captions: captions && `${DIR}/${captions}` }) as const

// width ÷ height of the screen recordings, so their cards show them whole
const SCREEN = 1920 / 1206
const SCREEN_HANDS = 1662 / 1080

/** Under "The vision": the four bets the Intelligent Canvas 2.0 vision rested on
    (from the EPD-107 IC 2.0 Launch board), each with the clip that shows it best. */
export const VISION_SHELF: ShelfData = {
  id: 'ai-vision-bets',
  title: 'The vision bets',
  cards: [
    { ...monika(0, 'Next Level Board Gen', 'Capable generation and agentic behaviour that make hitting a 9/10 feel effortless.', 'ai-start-faster.mp4'), id: 'ai-bet-boardgen', eyebrow: 'Vision bet' },
    { ...monika(2, '3p Agents on the Canvas', 'Outside agents like Claude as first-class collaborators, doing real work right on the canvas.', 'ai-see-ya-work.mp4'), id: 'ai-bet-agents', eyebrow: 'Vision bet' },
    { ...play(1, 'Multiplayer AI', 'AI that works in the room with everyone: people and agents shaping the same canvas together, in real time.', 'ai-canvas-chat.mp4'), id: 'ai-bet-multiplayer', eyebrow: 'Vision bet' },
    {
      id: 'ai-bet-custom',
      eyebrow: 'Vision bet',
      title: 'Custom AI Solutions',
      body: 'Enterprises extend and tailor AI to their own workflows: custom widgets, Miro Build and solutions on the canvas.',
      media: { kind: 'video', src: `${DIR}/multiagent.mp4`, label: 'the multi-agent clip' },
      ratio: 1920 / 1200,
    },
  ],
}

export const AI_SHELVES: ShelfData[] = [
  {
    id: 'ai-together',
    kicker: '01',
    title: 'New ways to work together',
    intro: 'AI needed a place in the shared workspace. We explored how teams could talk to it, direct it and work alongside it—through multiplayer chat, expressive cursors, MCP-enabled agents, toolbar conversations and voice.',
    cards: [
      monika(0, 'Start faster', 'Skills that get you going.', 'ai-start-faster.mp4'),
      monika(1, 'Just tell me what you want, what you really really want', 'Input modes and the plan proposal.', 'ai-just-tell-me.mp4'),
      monika(2, 'Let me see ya work', 'Sidekick, Claude and Codex build a service diagram while the team adds notes alongside them.', 'ai-see-ya-work.mp4'),
      monika(3, 'Jamming with you', 'One comment, two agents: Sidekick names the feedback themes, Claude pulls in the Jira tickets.', 'ai-jamming-with-you.mp4'),
      monika(4, 'AI that catches you up', 'Back from a break, Sidekick brings you up to speed.', 'ai-catches-you-up.mp4'),
      // recorded at 1920×1080 for the customer-story cut: its own shape
      { ...monika(5, "We're all in this together", 'People and agents on one sprint board, side by side.', 'ai-all-in-this-together.mp4'), ratio: 1920 / 1080 },
    ],
  },
  {
    id: 'ai-playground',
    kicker: '02',
    title: 'From intention to momentum',
    intro: 'The experience had to help people move work forward. Skills, board generation, connectors and flows brought context and action together, helping teams turn an initial thought into something they could build on.',
    cards: [
      play(0, 'Cursor identity', 'Pick a color, an animal and a ride, and your cursor is yours, on the canvas too.', 'ai-cursor-identity.mp4'),
      play(4, 'Proactive suggestions from a decision model', "A decision model reads what you're making, and only when it's sure does Sidekick offer the template that fits.", 'ai-proactive-suggestions.mp4'),
      play(1, 'Multiplayer AI in cursor chat', 'Say "miro" in cursor chat and Sidekick joins the conversation, does the work and tells you what it did.', 'ai-canvas-chat.mp4'),
    ],
  },
  {
    id: 'ai-next',
    kicker: '03',
    title: 'Exploring what comes next',
    intro: 'Alongside the foundations, we explored emerging models such as JEV and more tactile canvas gestures. These experiments helped us imagine a canvas that responds more directly to people’s intentions—and opens up new possibilities for working with AI.',
    cards: [
      {
        id: 'ai-next-auto-sort',
        eyebrow: 'Auto-sort',
        title: 'Write a sticky, click away, and it’s already in the right frame.',
        body: 'My first test with a decision model: AI that doesn’t write, it just picks from a few options in a few hundred milliseconds.',
        media: clip('auto-sort.mp4', 'the auto-sort clip'),
        ratio: 1920 / 1200,
      },
      {
        id: 'ai-next-article',
        eyebrow: 'Article',
        title: 'A fast lane for Boardgen',
        body: 'What decision models are, where they could fit in Boardgen, and what prototyping with them showed.',
        media: { kind: 'blank' },
        link: { href: 'https://fast-decision-models.vibelab.miro.tools/article/a-fast-lane-for-boardgen.html', label: 'Read the article' },
      },
      {
        id: 'ai-next-ideas',
        eyebrow: 'Ideas',
        title: 'Infinite idea machine',
        body: 'A sticky stack that never runs out of ideas.',
        media: { kind: 'video', src: `${DIR}/sticky-stack-endless-ideas.mp4`, label: 'the idea machine clip' },
        ratio: 1920 / 1200,
      },
      {
        id: 'ai-next-planning',
        eyebrow: 'Planning',
        title: 'Planning on the board',
        body: 'Ask Sidekick for a plan and it checks the few things it needs first, then the plan lands on the board, and running it turns each workstream into a card.',
        media: { kind: 'video', src: `${DIR}/megaplan.mp4`, label: 'the planning clip' },
        ratio: 1656 / 1080,
      },
      {
        id: 'ai-next-templates',
        eyebrow: 'Templates',
        title: 'Try on templates in Boardgen',
        body: 'Hover a retro format and the board behind the chat turns into it, so you can see it before you pick.',
        media: { kind: 'video', src: `${DIR}/retroflow.mp4`, label: 'the templates clip' },
        ratio: 1672 / 1080,
      },
      {
        id: 'ai-next-typing',
        eyebrow: 'Type to build',
        title: 'The board builds while you type, one word at a time.',
        body: 'Each circle and sticky lands as I finish its word, and backspacing takes it away again.',
        media: clip('builds-while-typing.mp4', 'the typing clip'),
        ratio: SCREEN,
      },
      {
        id: 'ai-next-hands',
        eyebrow: 'Hands',
        title: 'Grab stickies out of thin air and throw them across the board.',
        body: 'When voice is this fast, maybe you don’t need a cursor.',
        media: clip('jev2hands.mp4', 'the hands clip', 'jev2hands.vtt'),
        ratio: SCREEN_HANDS,
      },
      {
        id: 'ai-next-point',
        eyebrow: 'Point and talk',
        title: 'Say “here” and “this”, and the board knows what you’re pointing at.',
        body: 'It’s how you’d talk to someone standing next to you.',
        media: clip('point-and-jev.mp4', 'the point and talk clip', 'point-and-jev.vtt'),
        ratio: SCREEN,
      },
      {
        id: 'ai-next-vision',
        eyebrow: 'Vision',
        title: 'Ask which sweaters are beach-ready, and the board sorts them.',
        body: 'Twelve pictures take about a second and a half.',
        media: clip('picture-sorting-clef.mp4', 'the picture sorting clip'),
        ratio: SCREEN,
      },
      {
        id: 'ai-next-overview',
        eyebrow: 'Overview',
        title: 'Fast decision models on the canvas',
        body: 'Every experiment, in order: 21 videos from the first sorting test to Clef sorting pictures, with notes on how each one works.',
        media: { kind: 'blank' },
        link: { href: 'https://fast-decision-models.vibelab.miro.tools/', label: 'See all 21 experiments' },
      },
      {
        id: 'ai-next-multiagent',
        eyebrow: 'Multi-agent',
        title: 'Multi AI bots with board as their backend',
        body: 'A team of AI bots works a paid-tier launch in one chat, each writing its part to a shared board.',
        media: { kind: 'video', src: `${DIR}/multiagent.mp4`, label: 'the multi-agent clip' },
        ratio: 1920 / 1200,
      },
    ],
  },
]

/** Under the combined vision + labs section: the vision bets, then the labs experiments
    that tested them, as one shelf. */
export const VISION_LABS_SHELF: ShelfData = {
  id: 'ai-vision-labs',
  title: 'The vision and the experiments',
  cards: [...VISION_SHELF.cards, ...AI_SHELVES[2].cards],
}

/** Under "Agents that work where you work": the agent surfaces, in story order.
    PLACEHOLDERS: blank media until each clip is cut, then swap its media for clip(...). */
const agent = (n: number, title: string, body: string) => slot('ai-agents', 'Agents', n, title, body)
/** A 16:9 placeholder card: a labelled block until the vignette or video exists
    (the brief is notes/ai-shelf-vignettes.md). Swap `media` for `clip(...)` when it lands. */
const slot = (group: string, eyebrow: string, n: number, title: string, body: string): ShelfCardData => ({
  id: `${group}-${n}`,
  eyebrow,
  title,
  body,
  media: { kind: 'placeholder', label: title },
  ratio: 16 / 9,
})

export const AGENTS_SHELF: ShelfData = {
  id: 'ai-agents',
  title: 'Agents that work where you work',
  cards: [
    { ...agent(0, 'Inline chat', 'Ask right where you are on the canvas, and the answer lands in place.'), media: clip('ai-start-faster.mp4', 'Inline chat'), ratio: 1600 / 1280 },
    {
      // the animated multiplayer chat scene (c26 MultiplayerChatScene → public/media/ai/multiplayer-chat.html,
      // built by scripts/prototype-scenes/build.ts); the recording it's based on was clip('multiplayer-chat.mp4', 'Multiplayer chat')
      ...agent(1, 'Multiplayer chat', 'One conversation for the whole room: people and agents in the same thread.'),
      media: { kind: 'embed', src: '/media/ai/multiplayer-chat.html', label: 'Ben thinks out loud in cursor chat, you call Sidekick by name, and its cursor comes over, marks the biggest risk on the board and answers in the same thread' },
      ratio: 1440 / 900,
    },
    {
      // the board chat building up in the real sidebar (c26 AgentSidebarScene → public/media/ai/agent-sidebar.html,
      // built by scripts/prototype-scenes/build.ts)
      ...agent(2, 'Sidebar', 'A persistent home for longer work with an agent, beside the board.'),
      media: { kind: 'embed', src: '/media/ai/agent-sidebar.html', label: 'The board chat sidebar opens and the team’s conversation builds up in it: teammates post, one through Claude, and Sidekick answers in threads' },
    },
    {
      // the board's activity column, live (c26 AgentTaskCardsScene → public/media/ai/agent-task-cards.html,
      // built by scripts/prototype-scenes/build.ts); loops while in view
      ...agent(3, 'Agent task cards', 'Hand off a task and track it on a card: what the agent is doing, and what it did.'),
      media: { kind: 'embed', src: '/media/ai/agent-task-cards.html', label: 'Task cards from Claude Code, ChatGPT, a Flow and Sidekick pop up and stack in the board’s activity column; a click opens Sidekick’s card to its plan, the steps tick off, and it completes and leaves' },
    },
    {
      // Claude builds a Kanban, Sidekick rearranges it (c26 AgentKanbanScene → public/media/ai/agent-kanban.html,
      // built by scripts/prototype-scenes/build.ts)
      ...agent(4, 'Agents building on the canvas', 'Sidekick, Claude and others building on the board, cursors and all.'),
      media: { kind: 'embed', src: '/media/ai/agent-kanban.html', label: 'Claude’s cursor builds a Kanban board and adds two cards to To do and one to In progress; then Sidekick’s cursor comes over and drags the cards on into In progress and Done' },
    },
    { ...agent(5, 'Wave to summon an agent', 'A wave of the cursor, and an agent comes over to help.'), media: clip('wave-to-summon.mp4', 'Wave to summon an agent'), ratio: 2716 / 2160 },
  ],
}

/** Under "Generative experiences": generation in story order.
    PLACEHOLDERS: blank media until each clip is cut, then swap its media for clip(...). */
const gen = (n: number, title: string, body: string) => slot('ai-generative', 'Generative', n, title, body)
export const GENERATIVE_SHELF: ShelfData = {
  id: 'ai-generative',
  title: 'Generative experiences',
  cards: [
    {
      // first: the live "A meeting. A project. A rocket launch." scene from the C26 Fall
      // prototype, on black (public/media/ai/create.html, built by scripts/prototype-scenes/build.ts)
      ...gen(5, 'MCP', 'Ask from a terminal and Miro sets itself up through MCP: the spaces, the boards and the people, with the research already under way.'),
      media: { kind: 'embed', src: '/media/ai/create.html', label: 'A terminal asks for Miro to be set up for a space-mining company, and Miro builds its spaces, boards and people beside it, then dives into a board' },
      ratio: 1.7353, // the prototype's extra-wide card (1180 × 680)
    },
    {
      // the live recipes scene from the C26 Fall prototype ("Your team’s best moves, saved as
      // recipes"): public/media/ai/recipes.html, built by scripts/prototype-scenes/build.ts
      ...gen(0, 'Skills', 'Pick a skill and the agent knows how to do the job, from a retro to a roadmap.'),
      media: { kind: 'embed', src: '/media/ai/recipes.html', label: 'The team’s skills float up past the prompt box, each one a slash away: explore, align, decide, prototype, test' },
      ratio: 1.2059, // the prototype's wide card (820 × 680)
    },
    { ...gen(1, 'Questions', 'Before it builds, the agent asks what it needs to know to get it right.'), media: clip('ai-just-tell-me.mp4', 'Questions'), ratio: 1600 / 1280 },
    {
      // live scene from the C26 Fall prototype (NextBestActionScene, the real orb card):
      // public/media/ai/next-best-action.html, built by scripts/prototype-scenes/build.ts
      ...gen(2, 'Next best actions', 'Suggestions for what to do next, offered right where the work is.'),
      media: { kind: 'embed', src: '/media/ai/next-best-action.html', label: 'A freshly built retro board waits with empty stickies; a glowing orb lands on its corner and, as your cursor reaches it, opens into an offer to fill the retro from Slack. You accept, and Sidekick fills each column with the week’s highlights from the team’s standup channel' },
      ratio: 1.2059, // the prototype's wide card (820 × 680)
    },
    {
      // live scene from the C26 Fall prototype (BoardCreationScene, the real prompt bar):
      // public/media/ai/board-creation.html, built by scripts/prototype-scenes/build.ts
      ...gen(3, 'Full board creation', 'Describe what you need and the whole board builds, editable from the first frame.'),
      media: { kind: 'embed', src: '/media/ai/board-creation.html', label: 'A prompt asking for a Q3 mobile launch plan is typed into the board’s prompt bar; Sidekick builds the board section by section, goals, timeline, risks and owners, and while it is still working you click one of its goals and change 50k installs to 80k' },
      ratio: 1.2059, // the prototype's wide card (820 × 680)
    },
    // the widget creator clip (copy from the C26 Fall prototype's "Create anything" card)
    { ...gen(6, 'Extending Miro', 'Describe what you need and make it: a sticker for your team, a custom widget for your workflow, or an entire interactive playground, built with AI right on the board.'), media: clip('widget-creator.mp4', 'Extending Miro'), ratio: 1920 / 1080 },
  ],
}

/** Under "Real-time agentic collaboration". PLACEHOLDERS until the clips are cut. */
const live = (n: number, title: string, body: string) => slot('ai-realtime', 'Real-time', n, title, body)
export const REALTIME_SHELF: ShelfData = {
  id: 'ai-realtime',
  title: 'Real-time agentic collaboration',
  cards: [
    { ...live(0, 'Voice mode', 'Talk to the board, and the agent builds as you speak.'), media: clip('voice-mode.mp4', 'Voice mode'), ratio: 1920 / 1080 },
    {
      // the live meeting board from the C26 Fall prototype ("Talk it through. Decide on the board."):
      // public/media/ai/rda-matrix.html, built by scripts/prototype-scenes/build.ts rda-matrix
      ...live(1, 'Real-time transcription', 'The meeting transcribes as it happens, and the board keeps up with the conversation.'),
      media: { kind: 'embed', src: '/media/ai/rda-matrix.html', label: "A huddle transcript fills as Priya and Marcus talk; an impact and effort matrix lands on the board beside it, and Sidekick's cursor peels each option they mention off the transcript as a sticky and carries it into its quadrant, ending on the quick win" },
      ratio: 1.2059, // the prototype's wide card (820 × 680)
    },
    { ...live(2, 'Decision models', 'A fast model reading the room in real time, so the canvas responds to what people mean.'), media: clip('jev2hands.mp4', 'Decision models', 'jev2hands.vtt'), ratio: SCREEN_HANDS },
    {
      id: 'ai-realtime-decisions-2',
      eyebrow: 'Real-time',
      title: 'Decision models continued',
      body: 'This model can look at pictures. “Group by colour” puts a board of sweaters and tees into columns, and “group by if I should wear it to the beach” works too, with no one writing the groups first. Twelve pictures take about a second and a half.',
      media: clip('picture-sorting-clef.mp4', 'the picture sorting clip'),
      ratio: SCREEN,
    },
    {
      // the live huddle scene from the C26 Fall prototype ("One tap and you’re talking"):
      // public/media/ai/huddle.html, built by scripts/prototype-scenes/build.ts
      ...live(5, 'Huddles', 'One tap on the headset and you’re talking, right on the board. Camera and mic are there when you want them, and everyone sees who’s in.'),
      media: { kind: 'embed', src: '/media/ai/huddle.html', label: 'Ana taps the headset and a huddle opens on the board: people join as cursors with their video, and Claude listens in' },
      ratio: 1.2059, // the prototype's wide card (820 × 680)
    },
    // last: out to the soundscape, its own page (ported from the C26 Fall prototype)
    {
      id: 'ai-realtime-soundscape',
      eyebrow: 'Real-time',
      title: 'Soundscape',
      body: 'Soft, living sound tells you when someone joins, reacts, or an agent finishes. Quiet, interactive sound that makes the canvas feel alive — waiting music that moves with the board while agents work, soft cues when someone joins, reacts or finishes, and collaboration themes your team can pick for the room.',
      // the soundscape's own 3D scene: a ring of stickies and reactions turning round its title
      media: { kind: 'video', src: '/media/simplify/soundscape-ring.mp4', label: 'the soundscape’s turning ring of stickies and reactions' },
      ratio: 16 / 9,
      to: '/soundscape', // the whole card opens the soundscape
    },
  ],
}
