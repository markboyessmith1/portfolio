// Builds a page of the my-canvas-prototype into one standalone page that a C26
// director scene plays in an iframe:
//   - the home page → public/media/simplify/home-fan.html (+ the files it loads, in
//     home/), for "Important over urgent." (HomeToBoardScene; built by ../build.ts as
//     `card-fan`);
//   - the toolbar → public/media/simplify/toolbar-page.html (+ toolbar/), for the
//     unified toolbar and voice mode (ToolbarVoiceScene; `toolbar-voice`).
//
//   bun scripts/prototype-scenes/home/build-home.ts             # home
//   bun scripts/prototype-scenes/home/build-home.ts toolbar     # toolbar
//   MY_CANVAS_DIR=/path/to/my-canvas-prototype bun scripts/prototype-scenes/home/build-home.ts
//
// The entry (./entry) is staged into a throwaway dot-folder inside that repo, so
// "@/..." and packages resolve with its own tsconfig + node_modules. A few modules
// are swapped for ./entry/shims (the Next runtime, the session hooks, chrome the
// home page doesn't show); `tldraw`, which only the board's toolbar code reaches,
// becomes an empty module. Tailwind is compiled with the repo's own
// @tailwindcss/postcss over its globals.css.
import { resolve, dirname } from "node:path";
import { cp, rm, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const HERE = import.meta.dir;
const PUBLIC = resolve(HERE, "../../../public");
const MC = resolve(process.env.MY_CANVAS_DIR ?? resolve(HERE, "../../../../../my-canvas-prototype"));
const STAGE = resolve(MC, ".portfolio-scenes-build");
/** page → [entry (in ./entry), output (in public/), folder beside it for the public files it loads, title] */
const PAGES: Record<string, [string, string, string, string]> = {
  home: ["main.tsx", "media/simplify/home-fan.html", "home", "Home"],
  toolbar: ["toolbar.tsx", "media/simplify/toolbar-page.html", "toolbar", "Toolbar"],
};
const PAGE = process.argv[2] ?? "home";
if (!PAGES[PAGE]) throw new Error(`unknown page "${PAGE}" (${Object.keys(PAGES).join(", ")})`);
const [ENTRY, OUT, FILES, TITLE] = PAGES[PAGE]!;

/** module specifier → shim (in ./entry/shims) */
const SHIMS: Record<string, string> = {
  "next/navigation": "next-navigation.ts",
  "next/link": "next-link.tsx",
  "@/hooks/useChat": "hooks.ts",
  "@/hooks/useRealtimeVoice": "hooks.ts",
  "@/hooks/useAuth": "hooks.ts",
  "@/hooks/useDockMenu": "hooks.ts",
  "@/components/ChatShell": "empty.tsx",
  "@/components/panels/RunningWidgetDock": "empty.tsx",
  "@/components/panels/ContentWidgetDock": "empty.tsx",
  "@/components/FrozenRouter": "empty.tsx",
};
/** packages replaced by a module of inert exports (named after the real ones) */
const HOLLOW = (process.env.HOLLOW ?? "tldraw").split(",").filter(Boolean);

await rm(STAGE, { recursive: true, force: true });
await mkdir(STAGE, { recursive: true });
await cp(resolve(HERE, "entry"), STAGE, { recursive: true });
try {
  await build();
} finally {
  await rm(STAGE, { recursive: true, force: true });
}

async function build() {
  // The real export names of each hollowed package, so named imports still bind.
  const names: Record<string, string[]> = {};
  for (const pkg of HOLLOW) {
    const list = Bun.spawnSync(["node", "--input-type=module", "-e", `const m = await import(${JSON.stringify(pkg)}); console.log(JSON.stringify(Object.keys(m))); process.exit(0)`], { cwd: MC, timeout: 60_000 });
    names[pkg] = list.exitCode === 0 ? (JSON.parse(list.stdout.toString().trim().split("\n").pop()!) as string[]) : [];
    if (list.exitCode !== 0) console.warn(`${pkg}: couldn't list exports (${list.stderr.toString().split("\n")[0]})`);
  }
  const esc = (s: string) => s.replace(/[/.()@]/g, "\\$&");
  const result = await Bun.build({
    entrypoints: [resolve(STAGE, ENTRY)],
    target: "browser",
    format: "iife",
    minify: !process.env.NO_MINIFY,
    define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_OFFLINE_MODE": '"true"' },
    publicPath: "__HOME_ASSET__/",
    naming: { asset: "[name]-[hash].[ext]" },
    plugins: [
      {
        name: "home-shims",
        setup(b) {
          b.onResolve({ filter: new RegExp(`^(${Object.keys(SHIMS).map(esc).join("|")})$`) }, (a) => ({ path: resolve(STAGE, "shims", SHIMS[a.path]!) }));
          // lottie-react's `browser` field is a UMD build whose CJS interop hands back the
          // whole module as `default` (React error #130 the moment a Lottie renders): use its ES build.
          b.onResolve({ filter: /^lottie-react$/ }, () => ({ path: resolve(MC, "node_modules/lottie-react/build/index.es.js") }));
          // root-relative url()s in the app's CSS are its public files: left as they are, copied below
          b.onResolve({ filter: /^\/[\w-]+\// }, (a) => (/\.css$/.test(a.importer) ? { path: a.path, external: true } : undefined));
          if (!HOLLOW.length) return;
          b.onResolve({ filter: new RegExp(`^(${HOLLOW.map(esc).join("|")})(/.*)?$`) }, (a) => ({ path: a.path, namespace: "hollow" }));
          b.onLoad({ filter: /.*/, namespace: "hollow" }, (a) => {
            const pkg = HOLLOW.find((p) => a.path === p || a.path.startsWith(p + "/"))!;
            const named = (names[pkg] ?? []).filter((n) => n !== "default" && /^[A-Za-z_$][\w$]*$/.test(n));
            return {
              contents: `const inert = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : inert), apply: () => inert, construct: () => inert });\nexport default inert;\n${named.map((n) => `export const ${n} = inert;`).join("\n")}`,
              loader: "js",
            };
          });
        },
      },
    ],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`${PAGE}: build failed`);
  }
  let js = "";
  let css = "";
  for (const o of result.outputs) {
    if (o.path.endsWith(".js")) js += await o.text();
    else if (o.path.endsWith(".css")) css += await o.text();
    else {
      // an imported asset (image/json…): beside the page
      const file = o.path.split("/").pop()!;
      await mkdir(resolve(PUBLIC, dirname(OUT), FILES, "_"), { recursive: true });
      await Bun.write(resolve(PUBLIC, dirname(OUT), FILES, "_", file), await o.arrayBuffer());
    }
  }
  js = js.split("__HOME_ASSET__/").join(`${FILES}/_/`);
  css = css.split("__HOME_ASSET__/").join(`${FILES}/_/`);

  // Tailwind, with the repo's own toolchain, over its globals.css + this entry's classes.
  const twScript = resolve(STAGE, "tw.mjs");
  await Bun.write(
    twScript,
    `import postcss from "postcss"; import tw from "@tailwindcss/postcss"; import { readFileSync } from "node:fs";
const from = ${JSON.stringify(resolve(MC, "src/app/globals.css"))};
const src = readFileSync(from, "utf8") + '\\n@source ' + JSON.stringify(${JSON.stringify(STAGE)}) + ';\\n';
const out = await postcss([tw()]).process(src, { from });
process.stdout.write(out.css);`,
  );
  const tw = Bun.spawnSync(["node", twScript], { cwd: MC, stdout: "pipe", stderr: "pipe", env: { ...process.env, NODE_ENV: "production" } });
  if (tw.exitCode !== 0) throw new Error(`${PAGE}: tailwind failed\n${tw.stderr.toString()}`);
  css = tw.stdout.toString() + "\n" + css;

  // Noto Sans (the app loads it through next/font): the latin subset Next downloaded.
  const media = resolve(MC, ".next/static/media");
  const noto = existsSync(media) ? (await readdir(media)).find((f) => f.endsWith("-s.p.woff2")) : undefined;
  if (noto) {
    await mkdir(resolve(PUBLIC, dirname(OUT), FILES, "fonts"), { recursive: true });
    await cp(resolve(media, noto), resolve(PUBLIC, dirname(OUT), FILES, "fonts/noto-sans-latin.woff2"));
    css = `@font-face { font-family: "Noto Sans"; src: url("/fonts/noto-sans-latin.woff2") format("woff2"); font-weight: 400 700; font-style: normal; font-display: swap; }\n` + css;
  } else console.warn(`${PAGE}: no Noto Sans in .next/static/media (run the app once); falling back to system sans`);

  // The app's public files, by their root-relative URL: bring each along, point at the copy.
  const used = new Set<string>();
  const rewrite = (s: string) =>
    s.replace(/(["'(])\/((?:[\w.-]+\/)*[\w. -]+\.(?:svg|png|jpe?g|webp|gif|mp4|webm|mp3|otf|ttf|woff2?|json))(?=["')?#])/g, (m, q: string, path: string) => {
      const real = decodeURIComponent(path);
      const src = real.startsWith("fonts/noto-sans-latin") ? null : resolve(MC, "public", real);
      if (src && !existsSync(src)) return m;
      used.add(real);
      return `${q}${FILES}/${path}`;
    });
  js = rewrite(js);
  css = rewrite(css);
  let bytes = 0;
  for (const path of used) {
    const src = resolve(MC, "public", path);
    if (!existsSync(src)) continue; // the Noto copy made above
    const dest = resolve(PUBLIC, dirname(OUT), FILES, path);
    await mkdir(dirname(dest), { recursive: true });
    await cp(src, dest);
    bytes += Bun.file(src).size;
  }

  const safe = (s: string) => s.replace(/<\/(script|style)/gi, "<\\/$1");
  js = js.replace(/import\.meta\.url/g, "document.baseURI");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<meta name="robots" content="noindex">
<style>${safe(css)}</style>
<style>html, body { margin: 0; height: 100%; overflow: hidden; } body { font-family: "Noto Sans", sans-serif; --font-noto-sans: "Noto Sans"; -webkit-font-smoothing: antialiased; }</style>
</head>
<body class="font-sans antialiased">
<div id="root"></div>
<script>${safe(js)}</script>
</body>
</html>
`;
  await Bun.write(resolve(PUBLIC, OUT), html);
  console.log(`${PAGE}: wrote public/${OUT} — ${(html.length / 1024).toFixed(0)} KB, + ${used.size} files in ${FILES}/ (${(bytes / 1024).toFixed(0)} KB)`);
}
