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
