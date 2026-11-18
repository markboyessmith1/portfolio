// Builds the C26 Fall prototype's live portfolio scenes into self-contained
// pages in public/ (JS, CSS, fonts, avatars inlined) that shelf cards iframe
// (media kind 'embed'). Compiles the real components out of the prototype, so
// re-run after a scene changes there. Needs Bun and the prototype checked out.
//
//   bun scripts/prototype-scenes/build.ts            # every scene
//   bun scripts/prototype-scenes/build.ts create     # just one
//   C26_DIR=/path/to/c26-fall-prototype bun scripts/prototype-scenes/build.ts
//
// To add a scene: an entries/<name>.tsx that calls mount(Scene), plus a line in SCENES.
//
// The entries are staged into a throwaway dot-folder inside the prototype for
// the build (removed afterwards), so Bun resolves "@/..." and packages with the
// prototype's own tsconfig + node_modules. A resolver plugin instead breaks
// Bun's tree-shaking of @ariakit's re-export chunks ("ComboboxItem is not
// defined" / "import_ZDPYYVJP is not defined").
import { resolve } from "node:path";
import { cp, rm, mkdir } from "node:fs/promises";

/** Per-scene trims, for a scene built from the prototype's production components
 *  (whose import graph drags in far more than the scene shows):
 *  - `stub`: packages replaced by an empty module (features the scene never reaches);
 *  - `maxAssetKB`: larger images become a 1×1 blank (screenshots no visible path uses). */
type Trim = { stub?: string[]; maxAssetKB?: number };
/** entry name → [output under public/, page title, trims?] */
const SCENES: Record<string, [string, string, Trim?]> = {
  // the director; its Home half is a second page, built by ./home/build-home.ts (home-fan.html)
  "card-fan": ["media/simplify/card-fan.html", "Important over urgent"],
  // the director; the toolbar itself is a second page, built by ./home/build-home.ts toolbar (toolbar-page.html)
  "toolbar-voice": ["media/simplify/toolbar-voice.html", "A handful of tools made for the agentic era"],
  create: ["media/ai/create.html", "A meeting. A project. A rocket launch."],
  recipes: ["media/ai/recipes.html", "Your team’s best moves, saved as recipes"],
  decisions: ["media/ai/decisions.html", "Big decisions, made together"],
  huddle: ["media/ai/huddle.html", "One tap and you’re talking"],
  "multiplayer-chat": ["media/ai/multiplayer-chat.html", "Multiplayer chat"],
  // the live meeting board: Sidekick hears the huddle and works its options into an impact/effort 2×2
  "rda-matrix": ["media/ai/rda-matrix.html", "Real-time transcription"],
  // the real toolbar + board-channel sidebar: mermaid (diagram widget) and the journey/app
  // screenshots come in through the board's import graph but never render here
  "agent-sidebar": ["media/ai/agent-sidebar.html", "Sidebar", { stub: ["mermaid", "@mermaid-js/layout-elk"], maxAssetKB: 300 }],
  // the real activity column (AgentActivityStack + TaskPill), same trims: its drag-out pulls in the board
  "agent-task-cards": ["media/ai/agent-task-cards.html", "Agent task cards", { stub: ["mermaid", "@mermaid-js/layout-elk"], maxAssetKB: 300 }],
  // Claude builds a Kanban, Sidekick rearranges it (the real FlatCursor, the Kanban widget's styles)
  "agent-kanban": ["media/ai/agent-kanban.html", "Agents building on the canvas", { stub: ["mermaid", "@mermaid-js/layout-elk"], maxAssetKB: 300 }],
  // Generative: the real orb (BigNbaCard) offering to fill a fresh retro from Slack
  "next-best-action": ["media/ai/next-best-action.html", "Next best actions", { stub: ["mermaid", "@mermaid-js/layout-elk"], maxAssetKB: 300 }],
  // Generative: a prompt in the real prompt bar (PromptBarShell) builds a whole board; the
  // bar's module (UbtChatInput) pulls in the board, hence the same trims
  "board-creation": ["media/ai/board-creation.html", "Full board creation", { stub: ["mermaid", "@mermaid-js/layout-elk"], maxAssetKB: 300 }],
};

/** Files a scene loads at runtime by the prototype's own URL (an iframe's src, say),
 *  which can't be inlined: copied from the prototype into public/, and the URL in
 *  the bundle rewritten to match. prototype path → path under public/ */
const RUNTIME_FILES: Record<string, string> = {
  // the prototype on the decisions board (an iframe inside the scene)
  "/src/assets/portfolio/flexfund.html": "media/ai/flexfund.html",
};

const HERE = import.meta.dir;
const PUBLIC = resolve(HERE, "../../public");
const C26 = resolve(process.env.C26_DIR ?? resolve(HERE, "../../../../c26-fall-prototype"));
const STAGE = resolve(C26, ".portfolio-scenes-build");
const ASSET = "__SCENE_ASSET__";
const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", webp: "image/webp",
  woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf",
};

const wanted = process.argv.slice(2);
for (const name of wanted) if (!SCENES[name]) throw new Error(`unknown scene "${name}" (have: ${Object.keys(SCENES).join(", ")})`);
const names = wanted.length ? wanted : Object.keys(SCENES);

await rm(STAGE, { recursive: true, force: true });
await mkdir(STAGE, { recursive: true });
await cp(resolve(HERE, "entries"), STAGE, { recursive: true });
try {
  for (const name of names) await buildScene(name);
} finally {
  await rm(STAGE, { recursive: true, force: true });
}

async function buildScene(name: string) {
  const [out, title, trim = {}] = SCENES[name]!;
  // Only the named packages are routed (a broad resolver plugin breaks Bun's
  // tree-shaking of @ariakit, see the header): everything else resolves as normal.
  const stubs = trim.stub ?? [];
  const plugins: import("bun").BunPlugin[] = stubs.length
    ? [{
        name: "scene-stubs",
        setup(build) {
          const filter = new RegExp(`^(${stubs.map((p) => p.replace(/[/.]/g, "\\$&")).join("|")})(/.*)?$`);
          build.onResolve({ filter }, (a) => ({ path: a.path, namespace: "scene-stub" }));
          build.onLoad({ filter: /.*/, namespace: "scene-stub" }, () => ({
            contents: "const stub = new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : stub), apply: () => stub }); export default stub; export const render = stub, initialize = stub, run = stub, registerLayoutLoaders = stub;",
            loader: "js",
          }));
        },
      }]
    : [];
  const result = await Bun.build({
    plugins,
    entrypoints: [resolve(STAGE, `${name}.tsx`)],
    target: "browser",
    // Classic script: Chrome refuses module scripts from file://.
    format: "iife",
    minify: !process.env.NO_MINIFY,
    define: { "process.env.NODE_ENV": '"production"' },
    // Bun 1.3's "dataurl" loader emits "" in Bun.build, so assets go out as
    // files under a marker prefix and are swapped for data URIs below.
    publicPath: `${ASSET}/`,
    naming: { asset: "[name]-[hash].[ext]" },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`${name}: build failed`);
  }

  let js = "";
  let css = "";
  const assets = new Map<string, string>();
  for (const o of result.outputs) {
    // Check extensions first: Bun labels the CSS bundle kind "asset" too.
    if (o.path.endsWith(".js")) js += await o.text();
    else if (o.path.endsWith(".css")) css += await o.text();
    else if (o.kind === "asset") {
      const file = o.path.split("/").pop()!;
      const ext = file.split(".").pop()!.toLowerCase();
      const big = trim.maxAssetKB !== undefined && o.size > trim.maxAssetKB * 1024 && /^(png|jpe?g|webp)$/.test(ext);
      // a 1×1 transparent png in place of an oversized image nothing on screen uses
      const b64 = big ? "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" : Buffer.from(await o.arrayBuffer()).toString("base64");
      assets.set(file, `data:${big ? "image/png" : (MIME[ext] ?? "application/octet-stream")};base64,${b64}`);
    }
  }
  const inline = (s: string) =>
    s.replace(new RegExp(`${ASSET}/([\\w.-]+)`, "g"), (m, file: string) => assets.get(file) ?? m);
  js = inline(js);
  css = inline(css);
  if ((js + css).includes(ASSET)) throw new Error(`${name}: an asset was not inlined`);
  // Keep inlined code from closing its own tag; a classic script can't read
  // import.meta, so the page URL stands in for any bundled import.meta.url.
  const safe = (s: string) => s.replace(/<\/(script|style)/gi, "<\\/$1");
  js = js.replace(/import\.meta\.url/g, "document.baseURI");
  // runtime files the bundle references: bring each along and point the bundle at the copy
  for (const [from, to] of Object.entries(RUNTIME_FILES)) {
    if (!js.includes(from)) continue;
    await cp(resolve(C26, from.slice(1)), resolve(PUBLIC, to));
    js = js.split(from).join(`/${to}`);
    console.log(`${name}: copied ${from} → public/${to}`);
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="robots" content="noindex">
<style>${safe(css)}</style>
</head>
<body>
<div id="root"></div>
<script>${safe(js)}</script>
</body>
</html>
`;
  await Bun.write(resolve(PUBLIC, out), html);
  console.log(`${name}: wrote public/${out} — ${(html.length / 1024).toFixed(0)} KB`);
}
