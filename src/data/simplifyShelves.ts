import type { ShelfData } from '../components/shelf/PagedShelf'

/* The "Simplifying the canvas" case study's shelves: ported from the C26 Fall
   prototype's portfolio home, the Direction tab (src/data/portfolioShelves.ts),
   word for word. Clips live in public/media/simplify/; the cards that were live,
   interactive scenes (or shader textures) there are stills of them, captured from
   the prototype, in public/media/simplify/stills/. */

const DIR = '/media/simplify'

export const SIMPLIFY_SHELVES: ShelfData[] = [
  {
    id: "simplify-simplicity",
    kicker: "01",
    title: "Radical Simplicity.",
    cards: [
      {
        id: "simple-tools",
        eyebrow: "Tools",
        title: "A handful of tools made for the agentic era, and one prompt to make anything.",
        body: "The toolbar is rebuilt around working with agents: the few tools you reach for by hand, a prompt that makes whatever you describe, and your voice when you’d rather talk.",
        // the live scene: the real toolbar (my-canvas-prototype) folding down to the unified bar,
        // then into voice mode and out (scripts/prototype-scenes: build-home.ts toolbar + build.ts toolbar-voice)
        media: { kind: 'embed', src: `${DIR}/toolbar-voice.html`, label: "One long toolbar compacts: every extra tool drops away until cursor, comment, pen, sticky, reactions and more are left. Then the AI arrives: a prompt grows out of the bar and a voice button pops in. A click splits the bar into voice mode like liquid, listening then speaking, and a second click lets it flow back together." },
        ratio: 1.4009,
      },
      {
        id: "simple-chrome",
        eyebrow: "Less chrome",
        title: "50% less chrome, 50% more room for the work.",
        body: "The interface steps back. A single toolbar shaped around what you're doing — creating, reviewing or running a session — replaces a wall of buttons.",
        media: { kind: 'image', src: `${DIR}/stills/simple-chrome.jpg`, alt: "50% less chrome, 50% more room for the work." },
        ratio: 1.2059,
      },
      {
        id: "simple-home",
        eyebrow: "Home",
        title: "Your spaces, boards and people in one calm place, so you pick up right where you left off.",
        body: "Your spaces, boards and people in one calm place, so you can pick up where you left off, see who’s around and get straight back to the work.",
        media: { kind: 'video', src: `${DIR}/home-v2.mp4`, label: "Your spaces, boards and people in one calm place, so you pick up right where you left off." },
        ratio: 1.8286,
      },
      {
        id: "decide-landing",
        eyebrow: "Your landing spot",
        title: "Important over urgent.",
        body: "A calm place to land. Miro brings up the decisions, reviews and blockers that actually need you and holds back the rest, so you spend the day on what matters instead of whatever is loudest.",
        media: { kind: 'image', src: `${DIR}/stills/decide-landing.jpg`, alt: "Important over urgent." },
        ratio: 1.2059,
      },
      {
        id: "decide-customize",
        eyebrow: "Make it yours",
        title: "Made to measure.",
        body: "Ask a question and get a page built to answer it. Miro pulls from the boards in your space to assemble the metrics, charts and open decisions you need, then you shape it block by block as the work changes.",
        media: { kind: 'image', src: `${DIR}/stills/decide-customize.jpg`, alt: "Made to measure." },
        ratio: 1.2059,
      },
      {
        id: "value-memory",
        eyebrow: "And after",
        title: "Every board remembers its decisions and sources, so anyone can pick up where the team left off.",
        body: "Every board keeps its decisions, sources and history, so anyone — person or agent — can pick up exactly where the team left off.",
        media: { kind: 'image', src: `${DIR}/stills/value-memory.jpg`, alt: "Every board remembers its decisions and sources, so anyone can pick up where the team left off." },
        ratio: 0.5882,
      },
    ],
  },
  {
    id: "simplify-momentum",
    kicker: "02",
    title: "Forward Momentum.",
    cards: [
      {
        id: "decide-create",
        eyebrow: "Create",
        title: "A meeting. A project. A rocket launch.",
        body: "Say what you're starting and Miro spins it up: the board, the people, the agenda or plan, and the agents to help. You skip the setup and go straight to the work, whether it takes an hour or a quarter.",
        media: { kind: 'image', src: `${DIR}/stills/decide-create.jpg`, alt: "A meeting. A project. A rocket launch." },
        ratio: 1.7353,
      },
      {
        id: "simple-essence",
        eyebrow: "One step ahead",
        title: "You ask. It’s already on it.",
        body: "Describe what you need and watch the agent work on the board as you ask. Add a detail or change your mind, and it adjusts as you go.",
        media: { kind: 'video', src: `${DIR}/agent-mode.mp4`, label: "You ask. It’s already on it." },
        ratio: 1.4222,
      },
      {
        id: "simple-shake",
        eyebrow: "Natural interaction",
        title: "Point, sketch or shake your cursor, and an agent makes it right where you are.",
        body: "Guide agents the way you’d expect in a visual world — point at things, select them, gesture and sketch. Shake your cursor and an agent follows; just start typing and it makes what you describe, right where you are.",
        media: { kind: 'video', src: `${DIR}/shake.mp4`, label: "Point, sketch or shake your cursor, and an agent makes it right where you are." },
        ratio: 1.2574,
      },
      {
        id: "simple-voice",
        eyebrow: "Voice mode",
        title: "Think out loud, and the board turns your words into stickies, diagrams and next steps.",
        body: "Talk to the board like you'd talk to your team. Think out loud, ramble, change your mind halfway — Miro listens, turns it into stickies, diagrams and next steps, and keeps up while you keep talking.",
        media: { kind: 'video', src: `${DIR}/voice-mode.mp4`, label: "Think out loud, and the board turns your words into stickies, diagrams and next steps." },
        ratio: 1.7778,
      },
      {
        id: "simple-autocomplete",
        eyebrow: "Autocomplete",
        title: "You start it. Sidekick finishes it.",
        body: "Tab in a sticky and Sidekick’s best idea is already there, in grey. When a cluster grows, it offers the rest of the row. One more Tab and it lands.",
        media: { kind: 'image', src: `${DIR}/stills/simple-autocomplete.jpg`, alt: "You start it. Sidekick finishes it." },
        ratio: 1.2059,
      },
      {
        id: "momentum-recipes",
        eyebrow: "Recipes",
        title: "Your team’s best moves, saved as recipes, one slash away in any prompt.",
        body: "Explore, align, decide, prototype, test: the team’s recipes sit in the prompt box, so anyone can run the play that works.",
        media: { kind: 'image', src: `${DIR}/stills/momentum-recipes.jpg`, alt: "Your team’s best moves, saved as recipes, one slash away in any prompt." },
        ratio: 1.2059,
      },
      {
        id: "simple-decisions",
        eyebrow: "Live meeting board",
        title: "Talk it through. Decide on the board.",
        body: "Sidekick listens in. When the room weighs options, goes in circles or needs to commit, the right widget lands on the board, and people decide right there.",
        media: { kind: 'image', src: `${DIR}/stills/simple-decisions.jpg`, alt: "Talk it through. Decide on the board." },
        ratio: 1.2059,
      },
      {
        id: "momentum-decide",
        eyebrow: "Decisions",
        title: "Big decisions, made together, with agents doing the legwork.",
        body: "A prototype lands on the board and the team gathers round it — people and agents bring the data, the research and the plan, so the call gets made in one place.",
        media: { kind: 'image', src: `${DIR}/stills/momentum-decide.jpg`, alt: "Big decisions, made together, with agents doing the legwork." },
        ratio: 1.4706,
      },
      {
        id: "viz-products",
        eyebrow: "Vibe-coded products",
        title: "Describe an app and it runs right on the board, surrounded by the team’s comments and research.",
        body: "Describe an app and it comes to life on the canvas — clickable, working, and surrounded by the team's comments, flows and research instead of hidden in a link.",
        media: { kind: 'video', src: `${DIR}/prototypes.mp4`, label: "Describe an app and it runs right on the board, surrounded by the team’s comments and research." },
        ratio: 1.7778,
      },
      {
        id: "value-complexity",
        eyebrow: "The impossible",
        title: "Messy cross-team problems, mapped end to end on live data and worked on together.",
        body: "Take on the messy, cross-team questions. Map a full customer journey end to end, wired to live product, support and research data — the journey updates itself, the hot spots surface on their own, and everyone works the problem together.",
        media: { kind: 'image', src: `${DIR}/stills/value-complexity.jpg`, alt: "Messy cross-team problems, mapped end to end on live data and worked on together." },
        ratio: 1.2059,
      },
    ],
  },
  {
    id: "simplify-humanity",
    kicker: "03",
    title: "Humanity.",
    cards: [
      {
        id: "decide-spaces",
        eyebrow: "Spaces",
        title: "Everybody and everything in the same space.",
        body: "Spaces bring your people and your agents together around a shared goal. The boards, docs, decisions and progress live in one place, so everyone, human or agent, knows what we're aiming for and what comes next.",
        media: { kind: 'image', src: `${DIR}/stills/decide-spaces.jpg`, alt: "Everybody and everything in the same space." },
        ratio: 1.2059,
      },
      {
        id: "simple-share",
        eyebrow: "Share",
        title: "Share knows who you work with and what’s up next.",
        body: "Bring people, teams and agents onto the board in one place. Share with a Slack channel, invite the agent that's already helping, or add the person you're meeting next — Miro knows your 1:1 with Marcus is in an hour.",
        media: { kind: 'image', src: `${DIR}/stills/simple-share.jpg`, alt: "Share knows who you work with and what’s up next." },
        ratio: 1.2059,
      },
      {
        id: "simple-huddle",
        eyebrow: "Huddles",
        title: "One tap and you’re talking, right on the board, with everyone who’s there.",
        body: "One tap on the headset and you’re talking, right on the board. Camera and mic are there when you want them, and everyone sees who’s in.",
        media: { kind: 'image', src: `${DIR}/stills/simple-huddle.jpg`, alt: "One tap and you’re talking, right on the board, with everyone who’s there." },
        ratio: 1.2059,
      },
      {
        id: "human-details",
        eyebrow: "Details",
        title: "Tiny details, made for people, by people.",
        body: "From the brand to the smallest interaction, crafted by hand so the work feels human.",
        media: { kind: 'video', src: `${DIR}/brand-details.mp4`, label: "Tiny details, made for people, by people." },
        ratio: 1.7778,
      },
      {
        id: "simple-sound",
        eyebrow: "Soundscape",
        title: "Soft, living sound tells you when someone joins, reacts, or an agent finishes.",
        body: "Quiet, interactive sound that makes the canvas feel alive — waiting music that moves with the board while agents work, soft cues when someone joins, reacts or finishes, and collaboration themes your team can pick for the room.",
        media: { kind: 'image', src: `${DIR}/stills/simple-sound.jpg`, alt: "Soft, living sound tells you when someone joins, reacts, or an agent finishes." },
        ratio: 0.5882,
      },
    ],
  },
  {
    id: "simplify-misc",
    title: "And more.",
    cards: [
      {
        id: "viz-details",
        eyebrow: "Details that matter",
        title: "Tables that feel instant, because we sweat every detail so the work never waits on the tool.",
        body: "Tables that feel instant: type, sort, resize and fill without thinking about it. We sweat every detail so the work never waits on the tool.",
        media: { kind: 'video', src: `${DIR}/tables.mp4`, label: "Tables that feel instant, because we sweat every detail so the work never waits on the tool." },
        ratio: 1.7778,
      },
      {
        id: "simple-create",
        eyebrow: "Create anything",
        title: "Describe it and make it: a sticker, a custom widget, or a whole interactive playground.",
        body: "Describe what you need and make it: a sticker for your team, a custom widget for your workflow, or an entire interactive playground — built with AI, right on the board.",
        media: { kind: 'video', src: `${DIR}/widget-creator.mp4`, label: "Describe it and make it: a sticker, a custom widget, or a whole interactive playground." },
        ratio: 1.7778,
      },
      {
        id: "viz-slides",
        eyebrow: "Slides",
        title: "Present straight from the work.",
        body: "Turn frames into a deck in a click. The story and the thinking behind it live in the same place, so the presentation never drifts from the source.",
        media: { kind: 'image', src: `${DIR}/stills/viz-slides.jpg`, alt: "Present straight from the work." },
        ratio: 0.7353,
      },
      {
        id: "viz-docs",
        eyebrow: "Docs",
        title: "Docs that sit next to the thinking.",
        body: "Write specs, briefs and notes on the canvas beside the diagrams and stickies they came from — and let agents keep them up to date as the board changes.",
        media: { kind: 'image', src: `${DIR}/stills/viz-docs.jpg`, alt: "Docs that sit next to the thinking." },
        ratio: 0.7353,
      },
      {
        id: "viz-games",
        eyebrow: "Games",
        title: "Make a game for your team in a minute.",
        body: "Icebreakers, quizzes, retro games — generated on the spot and played together, live, on the board.",
        media: { kind: 'image', src: `${DIR}/stills/viz-games.jpg`, alt: "Make a game for your team in a minute." },
        ratio: 0.7353,
      },
      {
        id: "viz-everything",
        eyebrow: "Everything else",
        title: "Every format, a first-class citizen.",
        body: "Tables, charts, timelines, videos, live data. Every one is visual and multiplayer by default, right next to the work.",
        media: { kind: 'image', src: `${DIR}/stills/viz-everything.jpg`, alt: "Every format, a first-class citizen." },
        ratio: 1.5074,
      },
    ],
  },
]

/** Under the Vision section's "Simplifying the canvas" row: the first investment, stripping
    back home, organisation and the canvas. The brand details film, then the landing spot as its live scene
    (public/media/simplify/card-fan.html, built by scripts/prototype-scenes/build.ts), then
    the Home and toolbar clips from the shelves above. */
const card = (id: string) => SIMPLIFY_SHELVES.flatMap((sh) => sh.cards).find((c) => c.id === id)!
export const SIMPLIFY_CANVAS_SHELF: ShelfData = {
  id: 'vision-simplify',
  title: 'Simplifying the canvas',
  cards: [
    // the toolbar first, then the brand film: tiny details, made by hand
    { ...card('simple-tools'), id: 'vision-simplify-tools' },
    { ...card('human-details'), id: 'vision-simplify-brand' },
    {
      ...card('decide-landing'),
      id: 'vision-simplify-landing',
      media: { kind: 'embed', src: `${DIR}/card-fan.html`, label: 'Important over urgent: Home builds with its sidebar and a fan of the few cards that need you; a cursor sweeps the fan, plays the Talktrack card and reacts with emoji, clicks it so it spins up with its chat, then clicks through to the board, which builds out' },
      ratio: 1.2059,
    },
    {
      id: 'vision-simplify-tables',
      eyebrow: 'Tables',
      title: 'Improving the fidelity of control on your data',
      body: '',
      media: { kind: 'video', src: `${DIR}/tables.mp4`, label: 'Tables on the canvas: finer control over your data' },
      ratio: 1280 / 720,
    },
  ],
}
