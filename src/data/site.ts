import type { VignetteKey } from '../components/miro/Vignettes'
import type { ShelfData } from '../components/shelf/PagedShelf'
import type { StatementScript } from '../components/StatementReveal'
import type { MissionScript } from '../components/MissionBoard'
import type { VideoRef } from '../components/VideoEmbed'
import type { MediaItem } from '../components/MediaCarousel'
import type { FieldVariant } from '../components/PrincipleField'
import type { Principle } from '../components/PrinciplesRow'
import { AGENTS_SHELF, AI_SHELVES, GENERATIVE_SHELF, REALTIME_SHELF, VISION_LABS_SHELF } from './aiShelves'
import { SIMPLIFY_CANVAS_SHELF } from './simplifyShelves'

export type WorkItem = {
  label: string
  title: string
  description: string
  href: string
  external?: boolean
  /** keep the case study in the code but off the site (carousel, nav and its /work page) */
  hidden?: boolean
  /** which 3D scene to render in the card's media slot */
  scene: SceneKey
  /** case study title (replaces title + description on the case page) */
  headline?: string
  /** short paragraph under the case study title, on the first screen */
  intro?: string
  /** the keynote video, shown by a 'finale' section: centred under its very large title */
  video?: VideoRef
  /** roll-up metrics in a card under the intro: the headline number, then what it measures */
  metrics?: { value: string; label: string; /** a rough line to draw under it (makes it the double-height feature) */ trend?: number[]; /** a label under the line's latest value */ trendEnd?: string }[]
  /** show the brand's wordmark above the title instead of the "Case study" label */
  brand?: 'miro'
  /** the business's wordmark, shown on the carousel card in place of the title (components/Wordmark:
      'miro', or the name of an SVG in src/assets/wordmarks). The text title shows until the file exists. */
  logo?: string
  /** case study opens on the live headline board (dot grid, draggable words) */
  heroBoard?: boolean
  /** custom stickers slapped around the case study's opening card (components/miro/CardStickers) */
  stickers?: boolean
  /** case study opens on a looping board scene (components/miro/Vignettes) */
  vignette?: VignetteKey
  /** case-study sections; each one sets what the right-hand panel shows */
  sections: CaseSection[]
  /** paged, autoplaying shelves after the pinned chapters (components/shelf/PagedShelf) */
  shelves?: ShelfData[]
}

export type SceneKey = 'knot' | 'blob' | 'stack' | 'video' | 'miroAi' | 'blank'

export type CaseSection = {
  heading: string
  /** a run of sections that share this sub-chapter name (shown in the margin and the chapter list) */
  group?: string
  body: string[]
  /** right-hand panel while this section is in view. The first section always
      shows the project's own card (the one that spun in from the homepage). */
  panel: SceneKey
  /** how the right-hand panel is arranged (default: single card).
      'full' spans both columns; the section's copy sits on top of it. */
  layout?: PanelLayout
  /** extra scenes for multi-card layouts (stack: 1 more, grid: 3 more) */
  more?: SceneKey[]
  /** board scenes laid over the panel's cards, in card order */
  vignettes?: VignetteKey[]
  /** a Storyboard (components/Storyboard): each run of consecutive sections with a
      `storyboard` shares one pinned board on desktop, its content rewritten per chapter
      (a vignette, or 'mission': the section's `mission` assembled on the board) */
  storyboard?: VignetteKey | 'mission'
  /** how many of `list`'s last items sit on a card of their own, below, joined by a plus */
  listApart?: number
  /** a numbered list in a card, set after the first paragraph of `body` */
  list?: { title: string; text: string }[]
  /** a bulleted list, set after the whole of `body` (an item may lead with a bold title) */
  bullets?: (string | { title: string; text: string })[]
  /** a sub-point of the section before it: a smaller heading (h4), same flow */
  sub?: boolean
  /** the major chapter's ground (set on its first section): 'dark' flips it light-on-dark, in a
      rounded panel the copy scrolls into (desktop) */
  theme?: 'dark'
  /** a line under the major chapter's heading, before its first section (set on that section) */
  chapterLead?: string
  /** paragraphs after the table */
  after?: string[]
  /** figures after the copy (diagrams, tables): thumbnails that open in a lightbox
      (components/Figures). `src` is under public/ */
  figures?: { src: string; alt: string; caption: string }[]
  /** a small data table after the copy */
  table?: { head: string[]; rows: string[][] }
  /** use cases after the copy: a bold label, an intro line, then titled bullets */
  useCases?: { label: string; intro: string; items: { title: string; text: string }[] }
  /** 'columns' layout: one card per column, title overlaid; they animate in
      one by one when the section is reached */
  columns?: { title: string; scene: SceneKey }[]
  /** 'statement' layout: one sentence centred across both columns, written
      live by the room, turn by turn (components/StatementReveal) */
  statement?: StatementScript
  /** storyboard 'mission': the mission assembled on the board (components/MissionBoard) */
  mission?: MissionScript
  /** 'split' layout: a paged shelf under the copy (components/shelf/PagedShelf) */
  shelf?: ShelfData
  /** 'band' layout: a film under the copy, in a 16:9 tile (components/FilmTile): a silent
      loop at rest, played with sound on demand. `src` / `poster` are under public/.
      `ambient`: no veil, title or play button, just the loop and a sound toggle top right */
  film?: { src: string; poster?: string; title: string; ambient?: boolean }
  /** 'band' layout: 'xl' sets the band's title at display size, with more room above it */
  titleSize?: 'xl'
  /** 'band' layout: a wide card linking to a page of its own on this site (e.g. the soundscape) */
  linkCard?: { href: string; eyebrow: string; title: string; body: string; label: string }
  /** 'split' / 'band' layout: a placeholder block under the copy, while its visual is made */
  placeholder?: '16:9'
  /** 'band' layout: rows under the visual, each a title (left) and paragraph (right) over a
      shelf of examples (a blocked-out space until the shelves are made). A row with
      `principles` shows them as three looping clips side by side (components/PrinciplesRow) instead.
      No title (and no body): the row drops its copy line and tucks up under the visual above */
  rows?: { title?: string; body?: string | string[]; /** copy on the left, the shelf beside it on the right (not beneath) */ aside?: boolean; shelf?: ShelfData; /** the shelf's cards stacked one under another, not paged */ stack?: boolean; principles?: Principle[]; /** a card out to a page of its own, under the paragraph */ linkCard?: CaseSection['linkCard'] }[]
  /** 'timeline' layout: a full-width, two-row timeline that builds in when reached
      (components/Timeline); `focus` rows are highlighted under `focusLabel` */
  timeline?: TimelineData
}

export type TimelineStep = { when: string; what: string }
export type TimelineData = { rows: TimelineStep[][]; turn?: string; focus: number; focusLabel: string }

/** 'full', 'columns', 'statement' and 'split' span both columns (the copy column gives way).
    'split': the copy across both columns (heading and first paragraph left, the
    rest right), with the section's `shelf` below it. */
export type PanelLayout = 'single' | 'square' | 'stack' | 'grid' | 'full' | 'columns' | 'statement' | 'split' | 'timeline' | 'band' | 'finale'

/** Placeholder sections: replace with the real case-study story. */
function placeholderSections(own: SceneKey, rest: SceneKey[]): CaseSection[] {
  const p = 'Placeholder copy. Replace with the real story for this project.'
  return [
    { heading: 'Overview', body: [p, 'What the product is, who it is for, and your role.'], panel: own },
    { heading: 'The problem', body: [p, 'What was broken or missing, and why it mattered.'], panel: rest[0] },
    { heading: 'Approach', body: [p, 'How the team explored, decided and built.'], panel: rest[1] },
    { heading: 'Outcome', body: [p, 'What shipped, what changed, and what you learned.'], panel: rest[2] },
  ]
}

/** an acquisition badge on a resume role: "[what] acquired by <by> [for <price>]" */
export type Acquired = { by: string; what?: string; price?: string }
export const acquiredLabel = (a: Acquired) => `${a.what ? `${a.what} acquired` : 'Acquired'} by`

/** The portfolio (the work carousel at /, its case studies at /work/:slug and the access request
    at /portfolio) is hidden for now: About is the home page and those routes go home. Flip this
    back on to restore it (About returns to /about). */
export const PORTFOLIO_ON = false
/** where the About page (the CV) lives */
export const ABOUT_PATH = PORTFOLIO_ON ? '/about' : '/'

export const site = {
  name: 'Mark Boyes-Smith',
  logo: { short: 'MBS', long: 'Mark Boyes-Smith' },
  role: 'Design Leader, Product Maker',
  hero: {
    label: 'Portfolio',
    title: 'Mark Boyes-Smith',
    subtitle: 'Design Leader, Product Maker',
  },
  about: {
    heading: 'I never set out to design for a living. It just kinda happened.',
    body: [
      'Mostly I just wanted to make things that felt good to use.',
      'Then a boss asked me to put together a short film for a feature launch. The first one was bad. Each one after that was a little less bad, and I kept pushing to make the next one better.',
    ],
    quote: 'Hey, we have a really exciting new feature coming out. I want you to make something for it.',
    closing: 'Today I lead design at a small studio, and I live somewhere green with my family and a horrible dog.',
  },
  /** Podcast player (top left): AI and Design, Mark's episode (Apple Podcasts id 1000772037145). */
  podcast: {
    show: 'AI and Design',
    episode: "Copilot Redesign, Is AI ever Done, Amazon Proteus, Miro's Head of AI Design Mark Boyes-Smith",
    image: '/media/podcast-cover.jpg',
    link: 'https://podcasts.apple.com/us/podcast/copilot-redesign-is-ai-ever-done-amazon-proteus-miros/id1868571210?i=1000772037145',
    title: 'AI and Design Podcast',
    subtitle: 'Recent Appearance',
    startAt: 30 * 60 + 10, // 30:10
    // direct host URL (CORS-enabled) so the visualizer can read the audio
    src: 'https://hosting-media.riverside.com/media/clips/6a28a5b88067da6fa8ef2fee/designing-ai-composer-2026-6-10__1-45-59.mp3?response-content-disposition=inline&response-content-type=audio/mpeg',
  },
  /** Portfolio case studies. Descriptions are placeholders: replace with the real story. */
  work: ([
    {
      label: 'Miro AI',
      title: 'Miro AI',
      brand: 'miro',
      description: 'Launching an intelligent canvas.',
      href: '/work/miro-ai',
      logo: 'miro',
      scene: 'miroAi',
      headline: 'Journey to the Intelligent Canvas',
      intro: 'Bringing frontier AI capabilities to Miro’s 100 million users\n\nIn 2026, we set out to reimagine Miro as an agentic collaboration platform. By October, six months after setting out, we launched the Intelligent Canvas 2.0 to the world, alongside Miro’s $1.4bn acquisition by Bending Spoons. Throughout this time, I was responsible for leading the end-to-end product experience strategy and operationalisation.',
      video: {
        id: 'qM-KxCr4I5I',
        start: 1537,
        title: 'Canvas 26: Miro Keynote',
        cursor: { name: 'Sidekick', hue: 'ocean', say: 'Watch Mark at the launch keynote' },
      },
      // week one of full rollout (Oct 2026), from notes/ic2-story-builder.html and the narrative
      // the first (with a trend) is the feature: double height, with its line
      metrics: [
        // trend: illustrative only (the real series isn't in the notes), 18% rising to 37%
        { value: '18% → 37%', label: 'MCP board-editing week-zero retention', trend: [18, 18.6, 19.8, 21.6, 24, 26.8, 29.8, 32.6, 35, 37], trendEnd: 'Oct 26' },
        { value: '73%', label: 'CSAT on the new engine' },
        { value: '+35%', label: 'Tool calls per user (8.8 → 11.9)' },
      ],
      // opens on the prototype's live "Big decisions, made together" scene (was the 'prompt' board)
      vignette: 'decisions',
      sections: [
        { heading: '', body: [], panel: 'blob', layout: 'single', storyboard: 'decisions' },
        {
          heading: 'An existential moment',
          group: 'The challenge',
          body: [
            'AI presented a unique situation to Miro. As individuals could do more on their own, people turned to their agents for early, open-ended work, and team engagement in early ideation declined across the industry. Teams were jumping right to building, and collaboration and alignment were shifting later in the process. Left unaddressed, this could have resulted in lower team usage at the stage where Miro adds the most value.',
            'At the same time, the conversations we were having with our agents became more complex. Context became multi-modal, and connected to the other tools where we work. The chat-based experiences were struggling to visualise how pieces of the puzzle came together.',
            'When teams did need to come together, the work was difficult to adopt, and the process behind it was hard to trace, so it was difficult to build on. We often refer to the analogy of a clay pot. When we can get our hands on the clay and help mould the pot, we build a sense of ownership and understanding for how it’s constructed. When we hand somebody a finished, glazed pot, the only thing they can do to change it is break it apart.',
            'The shift changed how we thought about the canvas’s value: not just as a surface for early ideation, but also one to visualise and understand high volumes of agent work, untangle the emerging process bottlenecks, coordinate teams of humans and agents, and codify and spread the AI workflows that work in an organisation.',
          ],
          panel: 'blank',
          layout: 'single',
          // the hero board carries on here (was the Mona Lisa 'prompt' board)
          storyboard: 'decisions',
        },
        // TEMPORARILY REMOVED: the 'How we got here' timeline (flowchart). Uncomment to restore.
        /*
        {
          heading: 'How we got here',
          group: 'The challenge',
          body: [],
          panel: 'blank',
          layout: 'timeline',
          // from the stream overview deck: the years before, the model moment, then the IC2 year
          timeline: {
            rows: [
              [
                { when: '2022–23', what: 'Chatbots' },
                { when: '2024', what: 'First canvas editing tools and action shortcuts' },
                { when: 'Early 2025', what: 'Flows and format agents' },
                { when: 'Late 2025', what: 'Sidekicks and the Intelligent Canvas launch at Canvas ’25' },
              ],
              [
                { when: 'Jan–Feb', what: 'Revamped UX vision' },
                { when: 'Feb–May', what: 'Engine and harness rebuild, canvas quality code red' },
                { when: 'June', what: 'BoardGen V2 and the new edit tools' },
                { when: 'October', what: 'A product we’re confident in' },
              ],
            ],
            turn: 'Opus 4.5, Claude Code, Codex',
            focus: 1,
            focusLabel: 'Intelligent Canvas 2.0 · 2026',
          },
        },
        */
        {
          heading: 'A shared mission',
          group: 'Our mission',
          body: [
            'Nearly 100 engineers, product owners and designers contributed, across 7 teams with many complex sub-goals. To keep us focused, we set everyone out on a very simple, shared mission.',
            // what success would look like (was its own section)
            'We would later call this the Intelligent Canvas, and outlined the signals we would expect to see if we achieved the mission:',
          ],
          bullets: [
            'Prove relevance and value as a tool for third-party agents, which we would see through MCP growth and retention.',
            'Drive stickiness for our core AI experience, which we would see through share of WAU and stickiness.',
            'Create high-quality, editable, collaborative artifacts, which we would see through an increase in content survival and board share rates.',
          ],
          panel: 'blank',
          layout: 'single',
          storyboard: 'mission',
          // the mission, assembled on the right-hand card like the prototype's /portfolio
          // hero: its lines lie scattered on the board and the room carries them into a
          // stepped lock-up; Monika then sharpens the opening, Josh rings the key phrase
          mission: {
            // the opening three lines are one text block, dragged in whole
            lines: ['Make the canvas\nthe best shared\nvisual space for', 'human-to-human', 'and human-to-agent', 'collaboration.'],
            retype: { line: 0, from: 'Turn the canvas into\nthe best shared\nvisual space for', who: 'Monika', say: 'Punchier' },
            ring: 2,
            ringBy: 'Josh',
            stamps: { 0: ['like'], 2: ['fire', 'love'], 3: ['celebrate'] },
            serif: [1, 3], // in Apris; the others in the display sans
          },
        },
        {
          heading: 'Key investments',
          group: 'Our approach',
          body: [
            'To achieve the Intelligent Canvas, we made five major investments, across both technology and experience:',
            'This was an incredibly complex program of work with many constraints and opportunities. We ran these investments in parallel and created forums for air-traffic control on the interdependencies among teams.',
          ],
          panel: 'blank',
          layout: 'single',
          // the board holds the mission through here (two chapters are enough; the
          // five are told by the numbered card instead)
          storyboard: 'mission',
          listApart: 1, // the fifth (strip out complexity) on a card of its own, after a plus
          // the five, as a numbered card after the opening line (titles match the board's stickies)
          list: [
            { title: 'Engine and infrastructure', text: 'Critical upgrades to our core agentic infrastructure and engine, unlocking performance and scale, and letting us tap into the latest technology as it continued to evolve.' },
            { title: 'Context and tooling', text: 'We taught the engine how to use Miro to create canvas experiences, using all the tools in Miro’s toolkit and within the context of the team’s work.' },
            { title: 'New interaction paradigms', text: 'The interface between humans and agents, whether they were working in the canvas or through MCP.' },
            { title: 'Trust and audit', text: 'Capabilities for enterprises to safeguard data.' },
            { title: 'Strip out complexity', text: 'Removing the complexity built up in the tool over the years, so that teams could better see and access the new capabilities we were bringing.' },
          ],
        },
        {
          heading: 'Vision',
          titleSize: 'xl', // a display-size title, with more room above
          // a section of its own (not part of 'Design approach'): its heading is set at chapter size
          // (was 'Starting with the vision' + 'Experiment forward' + 'Unexplored paths')
          body: [
            // was its own 'Unexplored paths' section (the 'Vision' chapter)
            'To build a canvas where humans and agents collaborate, we had to think beyond the chatbot. Intelligence belonged in the canvas itself: an agent that could understand, create and edit live work, and a welcome for your own agents wherever they run. People expected AI to see what they saw and use the same tools. Working with an agent on an infinite canvas was wide open, with no patterns to borrow.',
            'We built the vision like production software: one experience covering the end state and boundary concepts for all five investments. It became our All Hands story, Show and Tell playground, customer testing ground and engineering spec. Labs explorations then took every bet through many coded iterations, ready for new models the moment they landed, like the decision models behind real-time canvas iteration and voice.',
          ],
          // a band: ordinary page content across both columns (scrolls natively, no panel
          // motion): heading | paragraph | paragraph, then the visual full width beneath
          panel: 'blank',
          layout: 'band',
          shelf: VISION_LABS_SHELF, // its reel (hidden until it's placed)
          // the vision film: the RKO26 sizzle, looping silently with a sound toggle top right
          film: { src: '/media/vision-sizzle-rko26.mp4', poster: '/media/vision-sizzle-rko26.jpg', title: 'The vision sizzle', ambient: true },
          // DRAFT copy, from the matching vision bets: replace with the real paragraphs
          rows: [
            {
              // the three principles the vision was built on, titled like the shelves below
              // (DRAFT descriptions: replace with the real lines)
              title: 'Principles',
              principles: [
                { title: 'Humanity', body: 'Made by people, for people. Collaboration stays front and centre, and every detail, from the brand to the smallest interaction, is crafted so the work feels human.', video: '/media/principles/humanity.mp4', poster: '/media/principles/humanity.jpg' },
                { title: 'Forward momentum', body: 'Every moment moves the work on. Agents prepare, suggest and follow through, so the team goes from a first idea to a decision without losing pace.', video: '/media/principles/momentum.mp4', poster: '/media/principles/momentum.jpg' },
                { title: 'Radical simplicity', body: 'Strip back years of accrued complexity. Fewer tools, less chrome and one prompt to make anything, so there is more room for the work itself.', video: '/media/principles/simplicity.mp4', poster: '/media/principles/simplicity.jpg' },
              ],
            },
            {
              // the first investment, straight after the principles: copy left, its examples right
              title: 'Simplifying the canvas',
              aside: true,
              body: [
                'As a 15-year-old product, Miro had accumulated an incredible amount of capabilities. Unfortunately, with that, it also accumulated a significant amount of experiential debt, made more challenging to resolve as teams were incentivised to own their own activation and adoption metrics.',
                'The business had not found ways of centrally incentivising teams to create the simplest and most natural product experience. Our initial investment as we tracked towards the Intelligent Canvas was in stripping back the home, organisational and canvas experience, so that we put the best opportunities in front of the user at the right point in time, regardless of activation of our most loved features.',
              ],
              shelf: SIMPLIFY_CANVAS_SHELF,
              stack: true,
            },
            {
              title: 'Agents that work where you work',
              body: 'Your own agents, wherever they run, could read, create and edit work on the canvas. Through MCP, outside agents like Claude became first-class collaborators, doing real work on the board alongside the team.',
              shelf: AGENTS_SHELF, // placeholder cards until the clips are cut
            },
            {
              title: 'Generative experiences',
              body: 'Capable generation that made hitting a 9/10 feel effortless: describe what you need and the board builds it, as editable diagrams, docs and tables rather than a static image, ready for the team to pick up.',
              shelf: GENERATIVE_SHELF, // placeholder cards until the clips are cut
            },
            {
              title: 'Real-time agentic collaboration',
              body: 'AI that works in the room with everyone: people and agents shaping the same canvas together, in real time, through voice, cursors and chat.',
              shelf: REALTIME_SHELF, // placeholder cards until the clips are cut
            },
          ],
        },
        // Notable design challenges (from the case-study doc): three numbered challenges.
        // A Storyboard of its own: one vignette per challenge
        {
          heading: '1. Building for every level of AI adoption',
          group: 'Notable design challenges',
          chapterLead: 'Three challenges shaped the work.',
          body: [
            'Miro’s customers ranged from AI-first organisations to teams that hadn’t switched on a single agentic tool. We had to build the platform Miro needed for the agentic era without unsettling the reliable canvas that teams had built their workflows around, many with no interest in agents at all.',
          ],
          bullets: [
            { title: 'Two ways in, one foundation', text: 'Sidekicks inside the canvas and MCP for people working through external agents, both on the same core tools, so every improvement reached both.' },
            { title: 'AI you can see working', text: 'agent cursors, planning mode and skills, with AI writing straight to the board and finding its own context.' },
            { title: 'Trust built in', text: 'admin controls, content guardrails and AI attribution, so customers could get AI through security and compliance review.' },
          ],
          panel: 'blank',
          layout: 'single',
          figures: [
            {
              src: '/diagrams/ai-cohorts.svg',
              caption: 'Customer cohorts',
              alt: 'Four customer cohorts on a scale from less ready for AI to AI-first. Holdouts: yet to enable a single agentic tool; they needed a canvas that works as it always has and admin controls that keep AI off. Cautious adopters: trying AI where it is switched on; they needed visible, attributed AI with guardrails on sensitive boards. Active adopters: using AI in the canvas week to week; they needed Sidekicks and skills in the canvas and output worth keeping. Frontier teams: AI-first, working through external agents; they needed MCP so their agents can read and write the board.',
            },
            {
              src: '/diagrams/ai-stack.svg',
              caption: 'Productecture',
              alt: 'Miro’s AI stack. First party, in Miro: Flows run through an orchestrator into the AI engine, alongside Sidekicks; the engine talks to a model gateway. Third party, via MCP: agents such as Claude and ChatGPT reach the MCP server. Both feed the same layers: context (board understanding, user preferences, connectors), behaviour (system, Miro and custom skills, starter prompts), the AI infra and trust layer (prompt blocking, admin controls, credit consumption, consent), and the tools registry (canvas read, write and update in SVG, HTML, Mermaid and Markdown, plus other tools), over the Board and Miro APIs.',
            },
          ],
          storyboard: 'stack',
          vignettes: ['stack'], // phones: the same scene on this section's own card
          shelf: AI_SHELVES[0], // the reel of use cases for this (hidden until it's placed)
        },
        {
          heading: '2. Hitting the quality bar for AI-generated content',
          group: 'Notable design challenges',
          body: [
            'Ahead of the Canvas ’26 launch, Sidekicks satisfaction was low and what AI put on the board wasn’t good enough. Rather than send more people into a weak experience, we made the new board-generation engine, BoardGen V2, the priority, and held the launch back a few weeks until it was ready, despite a fixed event date. It was the right call, and a major contributor to the rise in CSAT over launch month.',
            'The new tools let agents work in formats they reason well in, such as SVG, Markdown, Mermaid, HTML and CSV, and turn that work into editable canvas content.',
          ],
          table: {
            head: ['Measure', 'Before', 'After (new tools)'],
            rows: [
              ['MCP content retention', '65% (older tools and Sidekicks)', '79%'],
              ['MCP board-editing week-zero retention', 'about 18%', '37%'],
            ],
          },
          after: [
            'Sidekicks moved to the new tools later, so its results are still coming in. With quality in place, the focus moved to activation: helping people find valuable uses and reach first value faster.',
          ],
          panel: 'blank',
          layout: 'single',
          figures: [
            {
              src: '/diagrams/ic-comparison.svg',
              caption: 'IC 1.0 vs IC 2.0',
              alt: 'A comparison of twelve capabilities. IC 1.0, non-agentic: one artifact per turn, staged for manual application, brittle editing, no planning mode, models hard-coded per format, up to 20 messages of memory, board-internal tools only, explicit selection, no agent presence, no skills, text only, limited connectors. IC 2.0, agentic: multi-artifact generation written directly to the canvas, high-precision editing, a planning mode that asks questions, one model for agent and artifacts, the full context window, tools beyond boards, implicit board understanding, agent cursors and avatars, 20+ managed skills, text, dictation and voice, and full connector access.',
            },
          ],
          storyboard: 'stack', // the challenge 1 board stays up through the block
        },
        {
          heading: '3. Keeping pace with the technology',
          group: 'Notable design challenges',
          body: [
            'Agentic tooling moved faster than anything we’d worked with, with new models, harnesses and methods almost every week. Our focus shifted several times over the six months, and some real-time multiplayer concepts that shone in demos never made it to production.',
            'The pace opened doors too. Within a couple of months, models were good enough for us to prototype directly in the production codebase, and later in the year, decision models gave us a way to revisit earlier ideas for real-time voice and canvas manipulation.',
            // [Reel to add: the real-time voice mode and autopilot experiences we designed but couldn't ship]
          ],
          panel: 'blank',
          layout: 'single',
          storyboard: 'stack',
          shelf: AI_SHELVES[1], // the reel of use cases for this (hidden until it's placed)
        },
        /* Design approach (Craft first, hands-on · From vision to spec · Work in code): commented out for now.
        {
          heading: 'Craft first, hands-on',
          theme: 'dark', // the whole Design approach chapter sits on a dark ground (desktop)
          group: 'Design approach',
          body: [
            'With any complex, long-running project, it’s important to start with the end in mind: not only to give teams a destination and bearing, but also to challenge long-held beliefs about what we think is possible with our technology. This was a key opportunity for design to take the lead.',
            'The design team flexed over time but was usually five people, and I kept it that size deliberately. The team was deeply engaged with AI, understood the market and was willing to play with throwaway ideas. I’m hands-on and bring my fair share of #bad-versions to the table, so we built an environment where rough ideas were welcome. Keeping the team lean gave each designer real ownership of an investment, and kept the balance between play and progress deliberately uncomfortable.',
            'Of the 7 teams in the AI stream, 3 needed dedicated design attention: AI surfaces, board generation (our creative capability) and MCP (our off-platform experience). The rest needed a strong vision to align with, and design review and consultation throughout.',
          ],
          panel: 'blank',
          layout: 'single',
          figures: [
            {
              src: '/diagrams/stream-structure.svg',
              caption: 'Team structure',
              alt: 'The AI stream’s seven domains and their scope. Five formal teams: Surface (the experiences that make AI a first-class citizen of the canvas), Behaviour (how agents behave and how customers customise it), Context (AI’s understanding of the board and its own memory), Harness (foundations every other domain builds on) and AI Trust (making admins comfortable turning AI on). Two virtual teams: Board Gen (the canvas as a lossless read/write surface for AI) and Evals Infra (a shared way to know AI is working).',
            },
          ],
          // Design approach is a Storyboard of its own, after the vision: the vision
          // prototype and its spec sheets, then Work in code
          storyboard: 'spec',
        },
        {
          heading: 'From vision to spec',
          group: 'Design approach',
          body: [
            'As we progressed, we got better at moving between the vision and the operational detail of the work. That mattered, because much of our work was either imagining what came next or breaking it down into the detail teams needed to build it.',
            'Designers were so used to pouring ideas into a single prototype that it became hard to tell when something was a vision and when it had become a spec for development. After a few attempts, and some trust-building with engineering, the team settled on spec sheets that sat alongside the vision prototype and added the detail engineers needed. For especially complex flows, such as agent prompt planning, designers spun off separate branches of the prototype to go deeper.',
            'As the relationship changed, engineers started to rely on designers to get into the production codebase and get hands-on with the materials they were producing. The result was more polished work that felt like the designer had been in the room. We stopped having review sessions where designers and engineers saw the build together for the first time. A cultural hurdle that had existed since the beginning of my career all but disappeared.',
          ],
          panel: 'blank',
          layout: 'single',
          storyboard: 'spec',
          vignettes: ['spec'], // phones: the same scene on this section's own card
        },
        {
          heading: 'Work in code',
          group: 'Design approach',
          body: [
            'Code let us share fragments of ideas, combine them easily, and move them into our main codebase for faster deployment to testing.',
            'As the models matured, we got more hands-on with the logic of our production codebase, which meant our designers could, for the first time, build capabilities end-to-end with their agents. Engineering assembled the pipelines and gates to deploy these contributions safely and in line with our coding standards. Several design engineers emerged from the design team, including me. Some of them created a prototype sharing capability named Vibe Lab, which let internal teams share concepts outside production, protected by VPN.',
            'We also trained teams on best practices for contributing production code. For some designers it was an uphill climb: an entirely new skill set, built on principles they had never worked with. Since June, designers have merged more than 700 pull requests into production.',
          ],
          // the Design approach Storyboard's last chapter (phones: the square vignette instead)
          panel: 'blank',
          layout: 'square',
          vignettes: ['voice'],
          storyboard: 'voice',
        },
        */
        // the launch moment: a very large centred title, the keynote video over its foot
        { heading: 'Launch Moment', body: [], panel: 'blank', layout: 'finale' },
        {
          heading: 'Reflection',
          body: [
            'In six months, a vision-led, code-first design practice turned an ambitious direction into a more capable canvas experience, and real product signals told us what to improve next.',
            'The product advanced when we treated AI as a collaborator in the workspace, and designed its capabilities, interactions, measurement and trust controls as one connected system.',
          ],
          // in the page's flow (a band), so the closing launch moment can follow it
          panel: 'blank',
          layout: 'band',
        },
      ],
    },
    {
      label: 'Hyperexponential',
      title: 'Hyperexponential',
      description: 'Case study coming soon',
      href: '/work/hyperexponential',
      logo: 'hyperexponential',
      scene: 'video',
      sections: placeholderSections('video', ['stack', 'knot', 'blob']),
    },
    {
      label: 'Glitterball.dev',
      title: 'Glitterball.dev',
      description: 'Case study coming soon',
      href: '/work/glitter',
      hidden: true, // off the site for now (18 Nov 2026); delete this line to bring it back
      logo: 'glitterball',
      scene: 'blob',
      sections: placeholderSections('blob', ['knot', 'video', 'stack']),
    },
  ] satisfies WorkItem[]).filter((w) => !w.hidden),
  thoughts: [
    {
      slug: 'design-leadership-is-editing',
      title: 'Design leadership is mostly editing',
      date: '2026-10-01',
      excerpt: 'The job shifts from making the thing to deciding what the thing should not be.',
    },
    {
      slug: 'taste-at-scale',
      title: 'Taste doesn’t scale. Systems do.',
      date: '2026-08-14',
      excerpt: 'How to turn a gut feeling into something a team of twenty can act on.',
    },
    {
      slug: 'webgl-for-designers',
      title: 'WebGL for designers who don’t code (much)',
      date: '2026-06-02',
      excerpt: 'A short field guide to shaders, scenes and why a single canvas matters.',
    },
  ],
  /** /resume: from the LinkedIn profile export (Downloads/Profile.pdf) */
  resume: {
    headline: 'AI Design Leader, Product Maker',
    location: 'United Kingdom',
    email: 'mark@boyes-smith.com',
    linkedin: 'https://www.linkedin.com/in/markboyessmith',
    // the intro, after the "Background" frame on the leadership board: a statement with its
    // lead highlighted, then three points, each with a bold phrase (pre · bold · post)
    intro: {
      highlight: 'UK-based executive design leader',
      statement: 'with a background in engineering and AI. I lead end-to-end experience and build super creative, AI-forward teams.',
      // no longer shown
      points: [
        { pre: '', bold: 'Dynamic, multi-disciplinary leader', post: ' with a background across design, engineering and product.' },
        { pre: 'Known for a broad skillset across the design spectrum, ', bold: 'strong product vision', post: ', and the ability to scale the reach of design.' },
        { pre: 'A dedicated culture carrier and ', bold: 'active leadership voice', post: ' who leads by example, with candor and empathy.' },
      ],
    },
    // after the intro: the current role, which a collaborator's cursor selects and comments on
    current: { role: 'Head of AI Design', company: 'Miro', note: 'Mark works for us.', by: 'Jake' },
    // the previous intro, no longer shown
    profile: [
      'Design executive leading AI design at Miro, where I co-led the Intelligent Canvas 2.0 from vision to launch for 100 million users in six months.',
      'An engineer turned designer, previously VP Design at InVision and Head of Design at Hyperexponential. I build teams that work vision-first and in code, and keep them shipping through change.',
    ],
    experience: [
      // `acquired`: the badge reads "[what] acquired by <by> [for <price>]" (what: when it was a product, not the company)
      { company: 'Miro', when: '2026 – Present', title: 'Senior Director, Head of AI Design', acquired: { by: 'Bending Spoons' }, details: [
        'Co-led the AI arm of Miro’s business, shaping its strategic vision, product direction and execution.',
        'Set the design direction for Miro in the agentic era, reimagining Home, Spaces, search and the canvas. Moved AI from a chat panel into agents that work directly on the board.',
        'Connected five teams across the AI experience, aligning their work with cross-functional BoardGen and evaluation efforts around a shared direction.',
        'Co-led strategy and delivery for Intelligent Canvas 2.0, the company’s most critical initiative, taking it from vision to launch for 100 million users in six months.',
        'Shaped a shared foundation for Sidekicks and MCP, giving first-party and external agents access to the same canvas tools.',
        'Led a vision-first, code-first design practice, using working prototypes and labs explorations to test ideas and guide delivery.',
      ] },
      // the export still lists this as current: ended when the Miro role began
      { company: 'Hyperexponential', when: '2024 – 2026', title: 'Senior Director, Head of Design', acquired: { by: 'Guidewire', price: '$2.1bn' }, details: [
        'Joined as founding designer, establishing design and brand as company functions.',
        'Hired and built the product design and brand team.',
        'Led the company rebrand and reimagining of the platform experience, setting a new direction across product and brand.',
        'Coordinated their launch through hx’s flagship annual event, leading the event experience design.',
      ] },
      { company: 'Miro', when: '2023 – 2024', title: 'Director, Head of Design', details: [
        'Led design for the integration of InVision Freehand into Miro, bringing AI capabilities and structured formats into the experience.',
        'Led a significant 20+ design organisation across 9 teams spanning structured data, AI, search, content management, integrations and solutions.',
        'Launched Miro’s first Intelligent Canvas at Miro Canvas 2024.',
      ] },
      { company: 'InVision', when: '2022 – 2023', title: 'VP, Head of Design · Director, Product Design', acquired: { by: 'Miro', what: 'Freehand' }, details: [
        'Led design for Freehand’s award-winning Intelligent Canvas, defining its strategic vision, narrative, design architecture and solutions packaging.',
        'Led the design organisation across product design, insights and brand, and co-led the wider product and technology organisation.',
        'Scaled four product design teams across the canvas and navigation experience, scale and enterprise readiness.',
        'Established Freehand’s brand experience and led major product marketing for the Intelligent Canvas launch, spanning live webinars, videos and articles.',
        'Executive sponsor for high-touch customer engagements.',
      ] },
      { company: 'Anaplan', when: '2018 – 2022', title: 'Head of Design Systems · Lead Product Designer', details: [
        'Co-led the design of an award-winning platform experience for real-time dashboards, reporting and monitoring.',
        'Led the design strategy for a platform customisation initiative that drove 35% user growth over two years.',
        'Established and scaled a multidisciplinary design systems team spanning design, engineering, content strategy, research and brand, supporting a technology organisation of more than 1,000.',
        'Scaled and co-led the product design and research team.',
        'Delivered accessibility, localisation and customisation capabilities through the design system, establishing shared foundations for platform delivery.',
        'Led experience integration for the Mintigo acquisition and narrative and creative for major product showcases with the C-suite.',
      ] },
      { company: 'Deloitte', when: '2016 – 2018', title: 'Lead Product Designer' },
      // clients: their logos stack in the logo slot, in this order
      { company: 'Independent Design Consultancy', when: '2012 – 2015', clients: ['Sky Sports', 'EE', 'Hitachi'] },
    ],
    education: {
      school: 'University of York',
      when: '2008 – 2012',
      degree: 'BEng Computer Science with Industry',
      // shown under the degree: a labelled block, the grade as a badge beside the label
      dissertation: { grade: '1st class', title: 'Manipulating 2D facial features against the 3D reflectance properties of human faces' },
    },
    // under the Principles label (from the leadership board's statement frame)
    statement: 'I want to create a culture where ideas are worth sharing. Where work has momentum, energy, and direction.',
    // the earlier Principles subhead, no longer shown
    principlesIntro: 'Our industry continues to shift in unexpected ways, but I feel these four principles describe the way I want to continue to run my teams.',
    // cultural principles (from the leadership board): `lead` and a two-line `short` show; `rest` keeps the full wording.
    // `field` picks each card's line motion; `exit` is the clip's first exit frame (the Blender scene's exit_start),
    // where the next card's clip starts: the hand leaving one card is the hand arriving at the next
    principles: [
      { lead: 'Hands-on creative leadership', short: 'Setting a high benchmark and building conviction in the direction.', rest: 'for setting a high benchmark and establishing conviction in direction.', field: 'follow', video: '/media/glove_wave.mp4', exit: 162 },
      { lead: 'Cross-functional collaboration', short: 'The only path to a cohesive end-to-end experience that grows the business.', rest: 'is the only unlock to a cohesive end-to-end experience, critical to driving business growth and customer advocacy.', field: 'flow', video: '/media/glove_shake.mp4', exit: 269 },
      { lead: 'Design teams have a unique power to inspire', short: 'Engaging Product, GTM and customers, and helping teams see the future.', rest: 'engage and activate Product, GTM and customers. It’s our opportunity to help teams see the future.', field: 'radiate', video: '/media/glove_cancan.mp4', exit: 337 },
      { lead: 'Candor and empathy', short: 'Both are essential to cultural and organisational success.', rest: 'are essential to both cultural and organisational success.', field: 'orbit', video: '/media/glove_heart.mp4', exit: 303 },
    ] satisfies { lead: string; short: string; rest: string; field: FieldVariant; video?: string; exit?: number }[],
    // talks, video and podcast appearances (newest first)
    media: [
      // backgrounds: a still from each appearance (YouTube's own frames, the shows' cover art), saved locally
      { kind: 'Keynote', title: 'Canvas 26: Miro Keynote', year: '2026', href: 'https://www.youtube.com/watch?v=qM-KxCr4I5I&t=1537s',
        poster: '/media/stills/canvas-26-keynote.jpg', play: { kind: 'youtube', id: 'qM-KxCr4I5I', start: 1537 } },
      { kind: 'Talk', title: 'How AI Is Changing the Face of Design', year: '2026', href: 'https://www.youtube.com/watch?v=1adNBQ4JGp4',
        loop: '/media/stills/ai-changing-design.mp4', poster: '/media/stills/ai-changing-design-loop.jpg', play: { kind: 'youtube', id: '1adNBQ4JGp4' } },
      // SXSW London, 3 June 2026: the cover is a photo at the festival wall; play opens the recording at 7:49
      // (a loop from the talk is ready as /media/stills/sxsw-london.mp4, if wanted back)
      { kind: 'Talk', title: 'Diamonds Are Not Forever: How AI Killed the Double Diamond, SXSW London', year: '2026',
        href: 'https://www.youtube.com/watch?v=i4I3yvtk3CA&t=469s',
        poster: '/media/stills/sxsw-london-cover.jpg', play: { kind: 'youtube', id: 'i4I3yvtk3CA', start: 469 } },
      { kind: 'Podcast', show: 'AI and Design', cover: '/media/podcast-cover.jpg', title: 'Copilot redesign, is AI ever done, and Miro’s Head of AI Design', year: '2026', href: 'https://podcasts.apple.com/us/podcast/copilot-redesign-is-ai-ever-done-amazon-proteus-miros/id1868571210?i=1000772037145',
        poster: '/media/podcast-cover.jpg',
        play: { kind: 'audio', src: 'https://hosting-media.riverside.com/media/clips/6a28a5b88067da6fa8ef2fee/designing-ai-composer-2026-6-10__1-45-59.mp3?response-content-disposition=inline&response-content-type=audio/mpeg', start: 30 * 60 + 10, cover: '/media/podcast-cover.jpg' } },
      // the video edition (Spotify: open.spotify.com/episode/2J6BIZephH1Qhlamb1LDeG); Spotify dated it "Jul 13" with no year, i.e. this year
      { kind: 'Podcast', show: 'Hired to Lead', cover: '/media/stills/hired-to-lead.jpg', title: 'Leading Design and Talent in the Age of AI', year: '2026', href: 'https://www.youtube.com/watch?v=Waoso-SxdnY',
        poster: '/media/stills/hired-to-lead.jpg', play: { kind: 'youtube', id: 'Waoso-SxdnY' } },
      { kind: 'Keynote', title: 'Canvas 24: Intelligent Canvas Keynote', year: '2024', href: 'https://www.youtube.com/watch?v=LGzQPdbxn-M',
        loop: '/media/stills/canvas-24.mp4', poster: '/media/stills/canvas-24-loop.jpg', play: { kind: 'youtube', id: 'LGzQPdbxn-M' } },
      { kind: 'Talk', title: 'Leaning Into Design Systems, DIBI Conference', year: '2022', href: 'https://www.youtube.com/watch?v=oVCpI81Ky6A',
        poster: '/media/stills/dibi-2022.jpg', play: { kind: 'youtube', id: 'oVCpI81Ky6A' } },
    ] satisfies MediaItem[],
  },
  contact: {
    title: "Let's talk",
    subtitle: "I'd love to hear from you",
  },
}
