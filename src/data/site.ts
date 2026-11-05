import type { VignetteKey } from '../components/miro/Vignettes'
import type { ShelfData } from '../components/shelf/PagedShelf'
import type { StatementScript } from '../components/StatementReveal'
import type { VideoRef } from '../components/VideoEmbed'
import type { MediaItem } from '../components/MediaCarousel'
import type { FieldVariant } from '../components/PrincipleField'
import { AI_SHELVES, VISION_SHELF } from './aiShelves'

export type WorkItem = {
  label: string
  title: string
  description: string
  href: string
  external?: boolean
  /** which 3D scene to render in the card's media slot */
  scene: SceneKey
  /** case study title (replaces title + description on the case page) */
  headline?: string
  /** short paragraph under the case study title, on the first screen */
  intro?: string
  /** a video card under the intro, on the first screen (components/VideoEmbed) */
  video?: VideoRef
  /** show the brand's wordmark above the title instead of the "Case study" label */
  brand?: 'miro'
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
  /** 'columns' layout: one card per column, title overlaid; they animate in
      one by one when the section is reached */
  columns?: { title: string; scene: SceneKey }[]
  /** 'statement' layout: one sentence centred across both columns, written
      live by the room, turn by turn (components/StatementReveal) */
  statement?: StatementScript
  /** 'split' layout: a paged shelf under the copy (components/shelf/PagedShelf) */
  shelf?: ShelfData
}

/** 'full', 'columns', 'statement' and 'split' span both columns (the copy column gives way).
    'split': the copy across both columns (heading and first paragraph left, the
    rest right), with the section's `shelf` below it. */
export type PanelLayout = 'single' | 'stack' | 'grid' | 'full' | 'columns' | 'statement' | 'split'

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
  work: [
    {
      label: 'Miro AI',
      title: 'Miro AI',
      brand: 'miro',
      description: 'Intelligence that meets you where you are',
      href: '/work/miro-ai',
      scene: 'miroAi',
      headline: 'Journey to the Intelligent Canvas',
      intro: 'In 2026, we took Miro on a transformational journey to bring the latest frontier capabilities to our 100 million users. In October 2026, six months after starting this journey, we launched the Intelligent Canvas 2.0 to our 100 million users around the world.',
      video: {
        id: 'qM-KxCr4I5I',
        start: 1537,
        title: 'Canvas 26: Miro Keynote',
        cursor: { name: 'Sidekick', hue: 'ocean', say: 'Watch Mark at the launch keynote' },
      },
      vignette: 'prompt',
      sections: [
        { heading: '', body: [], panel: 'blob', layout: 'single' },
        {
          heading: 'Our mission',
          body: [],
          panel: 'blob',
          layout: 'statement',
          // already largely written: Ana sharpens the opening (Turn → Make, cuts "into"), then Sidekick finishes it;
          // each comments after their edit
          statement: {
            start: 'Turn the canvas into the best shared, visual space for human-to-human and',
            by: 'Ben',
            steps: [
              { who: 'Ana', replace: 'Turn', with: 'Make' },
              // "Make the canvas into…" no longer reads: she cuts "into" too
              { who: 'Ana', replace: 'into ', with: '', say: 'Punchier' },
              { who: 'Sidekick', append: ' human-to-agent collaboration.', say: 'Finished it off' },
            ],
          },
        },
        {
          heading: 'A threat and an opportunity',
          group: 'The challenge',
          body: [
            'AI presented a unique threat to Miro. Teams were jumping right to building, and chatting with their agents for early, open-ended work. Collaboration and alignment were shifting later in the process, and smaller teams meant fewer seats.',
            'But the same shift made a shared canvas more relevant: to visualise and understand high volumes of agent work, untangle the emerging process bottlenecks, coordinate teams of humans and agents, and codify and spread the AI workflows that work in an organisation.',
          ],
          panel: 'blank',
          layout: 'single',
        },
        {
          heading: 'Why the canvas is hard',
          group: 'The challenge',
          body: [
            'The challenge was not to add a chatbot to Miro. It was to make AI a collaborator that could understand, create and edit work on a live, visual canvas. People could see a canvas full of content and reasonably expected AI to see it too, and to use the same tools they used.',
            'The nature of the canvas made that hard: 2D, unstructured, visual information; deep formats and a broad toolbox; and real-time collaboration. Together they made standard solutions and patterns difficult to use.',
          ],
          panel: 'blank',
          layout: 'single',
        },
        {
          heading: 'How we got here',
          group: 'The challenge',
          body: [
            'Miro’s AI had moved from chatbots in 2022–23, to the first canvas editing tools and action shortcuts in 2024, to Flows and format agents in early 2025, and Sidekicks and the Intelligent Canvas launch at Canvas ’25.',
            'Those one-shot format agents weren’t agentic. They didn’t see the canvas by default, couldn’t iterate and had a limited toolset. So in 2026 we worked towards a sharper goal: agents as equal collaborators that show their work, able to reason, plan and check that work, read and navigate the board, and edit and iterate seamlessly.',
          ],
          panel: 'blank',
          layout: 'single',
        },
        {
          heading: 'Start with the vision',
          group: 'How we designed',
          body: [
            'We defined the experience we wanted first: people and agents working together on the canvas. Those bets gave the team something to aim at while the technology moved underneath us.',
          ],
          panel: 'stack',
          layout: 'split',
          shelf: VISION_SHELF,
        },
        {
          heading: 'Experiment forward',
          group: 'How we designed',
          body: [
            'From there we used labs explorations to test what that vision could feel like. Chat offered a familiar starting point, while experiments brought interaction closer to the work itself.',
            'Not all of these shipped, and they were never meant to. They told us where the experience could go, and what to build next.',
          ],
          panel: 'stack',
          layout: 'split',
          shelf: AI_SHELVES[2],
        },
        {
          heading: 'Work in code',
          group: 'How we designed',
          body: [
            'We used high-fidelity, interactive prototypes to explore agent presence, voice and faster canvas editing as working experiences rather than static concepts. You can’t judge how an agent feels from a static frame.',
            'The team’s Vibe Lab also made interactive prototypes easier to share and build on.',
          ],
          panel: 'blob',
          layout: 'stack',
          more: ['stack'],
          vignettes: ['voice', 'point'],
        },
        {
          heading: 'Two entry points, one foundation',
          group: 'Strategy and execution',
          body: [
            'If people began their work in external agents, what distinctive role should Miro play? We pursued two paths: Sidekicks as an approachable experience inside the canvas, and MCP for people already working through external agents.',
            'They served different workflows, but drew on the same core read, write and update tools, so improvements to the most fundamental capabilities could benefit both.',
          ],
          panel: 'stack',
          layout: 'stack',
          more: ['blob'],
          vignettes: ['plan', 'prompt'],
        },
        {
          heading: 'Turning strategy into a program',
          group: 'Strategy and execution',
          body: [
            'We connected five formal teams (Surface, Behavior, Context, Harness and AI Trust) and two cross-functional efforts, BoardGen and evaluation infrastructure.',
            'Co-leading the program meant treating those pieces as one experience. A more capable agent wouldn’t help if people couldn’t tell what it was doing. A clearer UI wouldn’t help if the content it made was poor. And neither would reach some enterprise customers without the controls to enable AI confidently.',
          ],
          panel: 'blob',
          layout: 'single',
          vignettes: ['together'],
        },
        {
          heading: 'The quality pivot',
          body: [
            'Preparing for the Canvas ’26 launch, we recognised a serious gap: poor Sidekicks satisfaction, and canvas output that didn’t meet the bar. Before asking more people to try the product, we had to make the output worth keeping, so BoardGen V2 became a priority.',
            'New tools let agents work through formats they could reason about, such as SVG, Markdown, Mermaid, HTML and CSV, and translate that work into editable canvas content.',
            'At the review, MCP content retention was 79% on the new tools, versus 65% for the older tools and Sidekicks. MCP board-editing week-zero retention had risen from roughly 18% to 37%. Sidekicks had only recently moved to the new tools, so its longer-term results were still being assessed.',
          ],
          panel: 'blob',
          layout: 'single',
          vignettes: ['prompt'],
        },
        {
          heading: 'Making agents legible',
          body: [
            'We reworked the experience so AI felt connected to the canvas. Agent cursors moved where agents were actually reading and writing. Planning mode showed progress through longer tasks, and skills offered starting points for common uses.',
            'Compared with the first Intelligent Canvas, AI now wrote directly to the board instead of staging output for you to apply, and could make several artifacts in a turn rather than one. It found context on the board without being told what to select, and took voice and dictation as well as text.',
          ],
          panel: 'stack',
          layout: 'split',
          shelf: AI_SHELVES[0],
        },
        {
          heading: 'Earning trust',
          body: [
            'Admin controls could govern AI access by team and feature. Content-sensitive guardrails could keep AI and MCP away from boards with particular classifications, and AI attribution reached general availability. These capabilities helped customers get AI through security and compliance review.',
          ],
          panel: 'blank',
          layout: 'single',
        },
        {
          heading: 'What came next',
          body: [
            'With quality improving, the focus shifted to activation: helping people discover valuable uses and reducing friction to first value. We had deliberately not pushed activation before the quality work, to avoid sending more people into an experience that wasn’t yet strong enough.',
            'Beyond that, we were exploring more proactive and multiplayer ways for agents to work alongside people. These were directions under exploration, not all shipped capabilities.',
          ],
          panel: 'stack',
          layout: 'split',
          shelf: AI_SHELVES[1],
        },
        {
          heading: 'Reflection',
          body: [
            'In six months, a vision-led, code-first design practice turned an ambitious direction into a more capable canvas experience, and real product signals told us what to improve next.',
            'The product advanced when we treated AI as a collaborator in the workspace, and designed its capabilities, interactions, measurement and trust controls as one connected system.',
          ],
          panel: 'video',
          layout: 'full',
        },
        {
          heading: 'The Opportunity',
          group: 'Archived',
          body: [
            'This was a business-critical journey for Miro. As more and more businesses looked to agentic technologies to evolve their practices, we knew we had to deliver a collaboration experience that served humans and agents alike.',
            'Every week for six months, new technologies came to market, bringing new opportunities and new challenges. The moving goalposts meant we had to be on the front foot: playing with technologies as they came, and being brave enough to change direction based on what we saw.',
            'We also had to consider the diverse needs of our users. The AI adoption curve was an acute challenge. We wanted to bring the most advanced technologies without alienating the late majority who were just starting their journey with AI, so the experience had to progressively disclose capabilities as people engaged further.',
          ],
          panel: 'blob',
          layout: 'stack',
          more: ['stack'],
          vignettes: ['together', 'catchup'],
        },
        {
          heading: 'The vision',
          group: 'Archived',
          body: [
            'Our North Star was a platform built on familiar, intelligent capabilities: one that could create engaging canvas experiences for even the most complex use cases, and bring people and agents together to collaborate in real time, right in the canvas.',
            'A central part of that vision was using AI to extend what the canvas could do and how people could interact with it. Through custom-generated experiences and new ways to interact using voice and touch, the canvas could meet users where they were and adapt to how they wanted to work.',
          ],
          panel: 'stack',
          layout: 'stack',
          more: ['blob'],
          vignettes: ['together', 'voice'],
        },
        {
          heading: 'Meeting customers where they are',
          group: 'Archived',
          body: [
            'We created many exciting lab concepts along the way, notably real-time voice and engaging with AI purely through the canvas: pointing and clicking, or even joining a huddle with your agents.',
            'As we rolled out early concepts, we realised most of our users were still getting to grips with AI, or weren’t yet thinking about using it in a collaborative setting. So we held some of the new mechanisms back from the first release. Changing how the industry sees Miro would take longer, and early adoption of the most advanced capabilities was likely to be low.',
            'We also had to navigate formats that already existed but were better generated or served by AI, such as prototypes on the canvas versus MCP, an iframe, or a Claude artifact. The market had already moved, and our capability let us seize that opportunity.',
          ],
          panel: 'stack',
          layout: 'stack',
          more: ['blob'],
          vignettes: ['point', 'sort'],
        },
        {
          heading: 'Ownable moments',
          group: 'Archived',
          body: [
            'The role of experience was to strike the right balance between confidence, inspiration and approachability. I coached the team to discern, in every opportunity, whether we were creating a familiar moment or signalling something novel. We call these ownable moments.',
            'I’m proud of the moments of delight, particularly where you see the agent think or interact with you on the canvas: the cursor flies in, reads your content, then sketches alongside you or reacts to something you’ve added.',
            'I also changed my mind on single-player versus multiplayer. Tools like Granola showed the value of an agent that asks the questions you don’t want to ask the group, so the single-player experience mattered just as much as the multiplayer one we were gunning for.',
          ],
          panel: 'blob',
          layout: 'stack',
          more: ['stack'],
          vignettes: ['together', 'plan'],
        },
        {
          heading: 'Warmth, character, purpose',
          group: 'Archived',
          body: [],
          panel: 'blob',
          layout: 'columns',
          columns: [
            { title: 'Know when to guide', scene: 'blob' },
            { title: 'When to advise', scene: 'stack' },
            { title: 'When to follow', scene: 'knot' },
          ],
        },
        {
          heading: 'Generating new board content',
          group: 'Archived',
          body: [
            'The challenge was designing a system that could reliably produce high-quality results at speed. It needed to follow our house style, respect users’ customisation choices, and accurately reproduce the intended exercise.',
            'We were constrained by how much we could fit in the model’s context, and by our evolving understanding of prompt engineering as a design practice. Rigid expectations about how the model should render its output were limiting us, so we shifted towards flexible guidelines, working with what the model could reliably deliver.',
            'Sometimes accepting a limitation led to a stronger result. The model’s foundational training shaped its output, and pushing too hard against those tendencies made the results less reliable.',
          ],
          panel: 'blob',
          layout: 'single',
          vignettes: ['prompt'],
        },
        {
          heading: 'Designing multiplayer agentic experiences',
          group: 'Archived',
          body: [
            'People’s expectations of AI were largely shaped by single-player interactions. We saw value in supporting that individual experience, while also enabling teams to work alongside agents on a shared canvas.',
            'The difficult part was making that distinction clear. We needed ways to communicate when an interaction was personal and when it was shared, so people understood who they were collaborating with and how an agent’s actions would affect the team.',
          ],
          panel: 'blob',
          layout: 'stack',
          more: ['stack'],
          vignettes: ['together', 'catchup'],
        },
        {
          heading: 'Launch and rollout',
          group: 'Archived',
          body: [
            'The Intelligent Canvas 2.0 reimagined Home, Spaces, search and, of course, the agentic canvas experience. At this scale you won’t get it right first time, so we rolled out early to a small cohort and watched to understand the effect of the transformation.',
            'After a few early adjustments across the experience, we scaled into a private beta with a portion of our self-serve and enterprise customers, and rolled out to our entire user base from there.',
          ],
          panel: 'stack',
          layout: 'single',
        },
        {
          heading: 'What’s next',
          group: 'Archived',
          body: [
            'Every business I speak to is going through some sort of agentic transformation. For technology platforms, it’s an end-to-end journey that starts with the bones of the platform and runs all the way to pricing and packaging.',
            'What stood out on Miro’s journey was how hard it is to gauge customer readiness. Even with the most proactive organisations, the best way to create adoption for agentic experiences is to remove the hurdle itself: a proactive system where intelligence is simply there in the background, always working to help you meet your goals.',
          ],
          panel: 'video',
          layout: 'full',
        },
      ],
    },
    {
      label: 'Miro',
      title: 'Miro',
      brand: 'miro',
      description: 'Case study coming soon',
      href: '/work/miro',
      scene: 'knot',
      headline: 'Reimagining Miro for the Agentic Era',
      intro: 'In just six months, we reimagined the entire Miro experience for the second time, stripping back years of accrued complexity into a simple, coherent experience that allowed 100 million users around the world and their teams to access the latest intelligence capabilities.',
      heroBoard: true,
      stickers: true,
      // layout showcase: single, stacked pair, 2x2 grid, full width
      sections: [
        // no copy: just holds the opening panel (the headline board) in view
        { heading: '', body: [], panel: 'knot', layout: 'single' },
        { heading: 'The problem', body: ['Placeholder copy. Replace with the real story for this project.', 'What was broken or missing, and why it mattered.'], panel: 'blob', layout: 'stack', more: ['video'] },
        { heading: 'Approach', body: ['Placeholder copy. Replace with the real story for this project.', 'How the team explored, decided and built.'], panel: 'stack', layout: 'grid', more: ['video', 'knot', 'blob'] },
        {
          heading: 'Principles',
          body: [],
          panel: 'blob',
          layout: 'columns',
          columns: [
            { title: 'Radical Simplicity', scene: 'blob' },
            { title: 'Forward Momentum', scene: 'stack' },
            { title: 'Humanity', scene: 'knot' },
          ],
        },
        { heading: 'Outcome', body: ['Placeholder copy. Replace with the real story for this project.', 'What shipped, what changed, and what you learned.'], panel: 'video', layout: 'full' },
      ],
    },
    {
      label: 'Hyperexponential',
      title: 'Hyperexponential',
      description: 'Case study coming soon',
      href: '/work/hyperexponential',
      scene: 'video',
      sections: placeholderSections('video', ['stack', 'knot', 'blob']),
    },
    {
      label: 'Glitter',
      title: 'Glitter',
      description: 'Case study coming soon',
      href: '/work/glitter',
      scene: 'blob',
      sections: placeholderSections('blob', ['knot', 'video', 'stack']),
    },
    {
      label: 'InVision',
      title: 'InVision',
      description: 'Case study coming soon',
      href: '/work/invision',
      scene: 'stack',
      sections: placeholderSections('stack', ['video', 'blob', 'knot']),
    },
  ] satisfies WorkItem[],
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
    headline: 'AI Design Leader, Advisor',
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
        'Led a 20-person design organisation across nine teams spanning integrations, search, content management, solutions and use cases.',
        'Launched Miro’s first Intelligent Canvas at Miro Canvas 2024.',
      ] },
      { company: 'InVision', when: '2022 – 2023', title: 'VP, Head of Design · Director, Product Design', acquired: { by: 'Miro', what: 'Freehand' }, details: [
        'Led design for Freehand’s award-winning Intelligent Canvas, defining its strategic vision, narrative, design architecture and solutions packaging.',
        'Led the design organisation across product design, insights and brand, and co-led the wider product and technology organisation.',
        'Scaled four product design teams across the canvas and navigation experience, scale and enterprise readiness.',
        'Established Freehand’s brand experience and led major product marketing for the Intelligent Canvas launch, spanning live webinars, videos and articles.',
        'Served as executive sponsor for high-touch customer engagements.',
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
