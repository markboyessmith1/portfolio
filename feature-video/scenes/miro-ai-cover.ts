// The Miro AI card's cover: the canvas with the toolbar centred; click it, pick
// the Workshop skill, type the prompt, then the page plays the build (the prompt
// match-cuts into the board's title, the camera follows the cursors as they lay
// the workshop out, then rises to the overview). Needs the portfolio dev server on :5173.
//   bun feature-video/scenes/miro-ai-cover.ts ~/Desktop/miro-ai-cover.mp4
// then: ffmpeg -i ~/Desktop/miro-ai-cover.mp4 -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 17 -tune animation -an -movflags +faststart public/media/miro-ai-cover.mp4
import { EASE_IN_OUT, EASE_OUT, sleep, startDemo } from "../scripts/demo-kit.ts";

const OUT = process.argv[2] ?? "~/Desktop/miro-ai-cover.mp4";
const PROMPT = "plan our Q3 launch";

// the card's shape (3:4). Headless Chrome screencasts in CSS pixels whatever the
// pixel ratio, so record a big viewport at 1x: the scene scales its 720 × 960
// design up to fill it (U = 3 → 2160 × 2880), and the capture is full resolution.
const U = Number(process.env.COVER_U ?? 3);
const demo = await startDemo({ base: "http://localhost:5173", path: "/cover/miro-ai", viewport: { width: 720 * U, height: 960 * U }, scale: 1 });
const { page, view } = demo;
await page.locator(".cover__bar .ct__field input").waitFor();
await sleep(800);
await page.evaluate(() => (window as any).__start()); // off camera: right in on the tools
await sleep(300);

await demo.placeCursor({ x: view.width - 3, y: view.height * 0.55 });
await demo.record();
await sleep(600);
await page.evaluate(() => (window as any).__pan(2600));
await sleep(2700); // panned across to the AI field

const field = (await page.locator(".cover__bar .ct__field input").boundingBox())!;
// the close-up crops the field: aim at its visible right end
const fx = Math.min(field.x + field.width - 90 * U, view.width - 60 * U);
await demo.glide(fx, field.y + field.height / 2, 800, EASE_OUT, 0.06);
await sleep(200);
await demo.click();
await page.evaluate(() => (window as any).__compose(900));
await sleep(1800); // compose opens with the skills (the camera move runs 1.6 s)
const skill = (await page.locator('.cover__bar [data-skill="Workshop"]').boundingBox())!;
await demo.glide(skill.x + skill.width / 2, skill.y + skill.height / 2, 520, EASE_IN_OUT, 0.05);
await sleep(250);
await demo.click();
await sleep(350);
await demo.type(PROMPT, 45);
await sleep(450);
await page.keyboard.press("Enter");
await sleep(300);
await demo.glide(view.width * 0.8, view.height * 0.7, 900, EASE_IN_OUT);
// the room's cursors take over from here: Mark's cursor fades out
await page.evaluate(() => (window as any).__hideMe());
await sleep(19500); // the build (a continuous dolly) and the rise to the overview
await demo.finish(OUT, { holdMs: 1200 });
