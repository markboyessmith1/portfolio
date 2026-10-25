export type WorkItem = {
  label: string
  title: string
  description: string
  href: string
  external?: boolean
  /** which 3D scene to render in the card's media slot */
  scene: SceneKey
  /** case-study sections; each one sets what the right-hand panel shows */
  sections: CaseSection[]
}

export type SceneKey = 'knot' | 'blob' | 'stack' | 'video'

export type CaseSection = {
  heading: string
  body: string[]
  /** right-hand panel while this section is in view. The first section always
      shows the project's own card (the one that spun in from the homepage). */
  panel: SceneKey
  /** how the right-hand panel is arranged (default: single card).
      'full' spans both columns; the section's copy sits on top of it. */
  layout?: PanelLayout
  /** extra scenes for multi-card layouts (stack: 1 more, grid: 3 more) */
  more?: SceneKey[]
}

export type PanelLayout = 'single' | 'stack' | 'grid' | 'full'

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
      label: 'Miro',
      title: 'Miro',
      description: 'Case study coming soon',
      href: '/work/miro',
      scene: 'knot',
      // layout showcase: single, stacked pair, 2x2 grid, full width
      sections: [
        { heading: 'Overview', body: ['Placeholder copy. Replace with the real story for this project.', 'What the product is, who it is for, and your role.'], panel: 'knot', layout: 'single' },
        { heading: 'The problem', body: ['Placeholder copy. Replace with the real story for this project.', 'What was broken or missing, and why it mattered.'], panel: 'blob', layout: 'stack', more: ['video'] },
        { heading: 'Approach', body: ['Placeholder copy. Replace with the real story for this project.', 'How the team explored, decided and built.'], panel: 'stack', layout: 'grid', more: ['video', 'knot', 'blob'] },
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
  contact: {
    title: "Let's talk",
    subtitle: "I'd love to hear from you",
  },
}
