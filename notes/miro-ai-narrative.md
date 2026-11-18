# Journey to the Intelligent Canvas

In 2026, we took Miro on a transformational journey to bring the latest frontier capabilities to our 100 million users.

In October 2026, six months after starting this journey, we launched the Intelligent Canvas 2.0 to our 100 million users around the world and achieved our goal of a successful exit to Bending Spoons.

## Our mission

> Make the canvas the best shared, visual space for human-to-human and human-to-agent collaboration.

---

# The challenge

## An existential moment

AI presented a unique threat to Miro. Teams were jumping right to building, and chatting with their agents for early, open-ended work. Collaboration and alignment were shifting later in the process, and smaller teams meant fewer seats.

But the same shift made a shared canvas more relevant: to visualise and understand high volumes of agent work, untangle the emerging process bottlenecks, coordinate teams of humans and agents, and codify and spread the AI workflows that work in an organisation.

## Unexplored paths

The challenge was not to add a chatbot to Miro. It was to make AI a collaborator that could understand, create and edit work on a live, visual canvas. People could see a canvas full of content and reasonably expected AI to see it too, and to use the same tools they used.

The nature of the canvas made that hard: 2D, unstructured, visual information; deep formats and a broad toolbox; and real-time collaboration. Together they made standard solutions and patterns difficult to use.

Miro’s AI had moved from chatbots in 2022–23, to the first canvas editing tools and action shortcuts in 2024, to Flows and format agents in early 2025, and Sidekicks and the Intelligent Canvas launch at Canvas ’25.

Those one-shot format agents weren’t agentic. They didn’t see the canvas by default, couldn’t iterate and had a limited toolset. So in 2026 we worked towards a sharper goal: agents as equal collaborators that show their work, able to reason, plan and check that work, read and navigate the board, and edit and iterate seamlessly.

---

# How we designed

## Start with the vision

We defined the experience we wanted first: people and agents working together on the canvas. Those bets gave the team something to aim at while the technology moved underneath us.

**Use cases: The vision bets**

- **Next Level Board Gen**: Capable generation and agentic behaviour that make hitting a 9/10 feel effortless.
- **3p Agents on the Canvas**: Outside agents like Claude as first-class collaborators, doing real work right on the canvas.
- **Multiplayer AI**: AI that works in the room with everyone: people and agents shaping the same canvas together, in real time.
- **Custom AI Solutions**: Enterprises extend and tailor AI to their own workflows: custom widgets, Miro Build and solutions on the canvas.

## Experiment forward

From there we used labs explorations to test what that vision could feel like. Chat offered a familiar starting point, while experiments brought interaction closer to the work itself.

Not all of these shipped, and they were never meant to. They told us where the experience could go, and what to build next.

**Use cases: Exploring what comes next** (03)

Alongside the foundations, we explored emerging models such as JEV and more tactile canvas gestures. These experiments helped us imagine a canvas that responds more directly to people’s intentions—and opens up new possibilities for working with AI.

- **Write a sticky, click away, and it’s already in the right frame.**: My first test with a decision model: AI that doesn’t write, it just picks from a few options in a few hundred milliseconds.
- **A fast lane for Boardgen**: What decision models are, where they could fit in Boardgen, and what prototyping with them showed.
- **Infinite idea machine**: A sticky stack that never runs out of ideas.
- **Planning on the board**: Ask Sidekick for a plan and it checks the few things it needs first, then the plan lands on the board, and running it turns each workstream into a card.
- **Try on templates in Boardgen**: Hover a retro format and the board behind the chat turns into it, so you can see it before you pick.
- **The board builds while you type, one word at a time.**: Each circle and sticky lands as I finish its word, and backspacing takes it away again.
- **Grab stickies out of thin air and throw them across the board.**: When voice is this fast, maybe you don’t need a cursor.
- **Say “here” and “this”, and the board knows what you’re pointing at.**: It’s how you’d talk to someone standing next to you.
- **Ask which sweaters are beach-ready, and the board sorts them.**: Twelve pictures take about a second and a half.
- **Fast decision models on the canvas**: Every experiment, in order: 21 videos from the first sorting test to Clef sorting pictures, with notes on how each one works.
- **Multi AI bots with board as their backend**: A team of AI bots works a paid-tier launch in one chat, each writing its part to a shared board.

## Work in code

We used high-fidelity, interactive prototypes to explore agent presence, voice and faster canvas editing as working experiences rather than static concepts. You can’t judge how an agent feels from a static frame.

The team’s Vibe Lab also made interactive prototypes easier to share and build on.

---

# Strategy and execution

## Two entry points, one foundation

If people began their work in external agents, what distinctive role should Miro play? We pursued two paths: Sidekicks as an approachable experience inside the canvas, and MCP for people already working through external agents.

They served different workflows, but drew on the same core read, write and update tools, so improvements to the most fundamental capabilities could benefit both.

## Turning strategy into a program

We connected five formal teams (Surface, Behavior, Context, Harness and AI Trust) and two cross-functional efforts, BoardGen and evaluation infrastructure.

Co-leading the program meant treating those pieces as one experience. A more capable agent wouldn’t help if people couldn’t tell what it was doing. A clearer UI wouldn’t help if the content it made was poor. And neither would reach some enterprise customers without the controls to enable AI confidently.

## The quality pivot

Preparing for the Canvas ’26 launch, we recognised a serious gap: poor Sidekicks satisfaction, and canvas output that didn’t meet the bar. Before asking more people to try the product, we had to make the output worth keeping, so BoardGen V2 became a priority.

New tools let agents work through formats they could reason about, such as SVG, Markdown, Mermaid, HTML and CSV, and translate that work into editable canvas content.

At the review, MCP content retention was 79% on the new tools, versus 65% for the older tools and Sidekicks. MCP board-editing week-zero retention had risen from roughly 18% to 37%. Sidekicks had only recently moved to the new tools, so its longer-term results were still being assessed.

## Making agents legible

We reworked the experience so AI felt connected to the canvas. Agent cursors moved where agents were actually reading and writing. Planning mode showed progress through longer tasks, and skills offered starting points for common uses.

Compared with the first Intelligent Canvas, AI now wrote directly to the board instead of staging output for you to apply, and could make several artifacts in a turn rather than one. It found context on the board without being told what to select, and took voice and dictation as well as text.

**Use cases: New ways to work together** (01)

AI needed a place in the shared workspace. We explored how teams could talk to it, direct it and work alongside it—through multiplayer chat, expressive cursors, MCP-enabled agents, toolbar conversations and voice.

- **Start faster**: Skills that get you going.
- **Just tell me what you want, what you really really want**: Input modes and the plan proposal.
- **Let me see ya work**: Sidekick, Claude and Codex build a service diagram while the team adds notes alongside them.
- **Jamming with you**: One comment, two agents: Sidekick names the feedback themes, Claude pulls in the Jira tickets.
- **AI that catches you up**: Back from a break, Sidekick brings you up to speed.
- **We're all in this together**: People and agents on one sprint board, side by side.

## Earning trust

Admin controls could govern AI access by team and feature. Content-sensitive guardrails could keep AI and MCP away from boards with particular classifications, and AI attribution reached general availability. These capabilities helped customers get AI through security and compliance review.

## What came next

With quality improving, the focus shifted to activation: helping people discover valuable uses and reducing friction to first value. We had deliberately not pushed activation before the quality work, to avoid sending more people into an experience that wasn’t yet strong enough.

Beyond that, we were exploring more proactive and multiplayer ways for agents to work alongside people. These were directions under exploration, not all shipped capabilities.

**Use cases: From intention to momentum** (02)

The experience had to help people move work forward. Skills, board generation, connectors and flows brought context and action together, helping teams turn an initial thought into something they could build on.

- **Cursor identity**: Pick a color, an animal and a ride, and your cursor is yours, on the canvas too.
- **Proactive suggestions from a decision model**: A decision model reads what you're making, and only when it's sure does Sidekick offer the template that fits.
- **Multiplayer AI in cursor chat**: Say "miro" in cursor chat and Sidekick joins the conversation, does the work and tells you what it did.

## Reflection

In six months, a vision-led, code-first design practice turned an ambitious direction into a more capable canvas experience, and real product signals told us what to improve next.

The product advanced when we treated AI as a collaborator in the workspace, and designed its capabilities, interactions, measurement and trust controls as one connected system.

