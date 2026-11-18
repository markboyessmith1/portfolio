// "Big decisions, made together, with agents doing the legwork." → public/media/ai/decisions.html
// (the miro-ai case study's opening visual). Rendered at the prototype's large card
// (1000 × 680) and zoomed in on the dead centre of the scene so the board fills the tall
// hero card and runs off every edge, then pulled back 25% over the scene's 15s run. The
// camera never pans: it zooms around the fixed centre (plus a gentle pointer parallax).
// The scene fakes its own zoom-out by shrinking the prototype (its first iframe) while its
// cursors keep their size: they scale with the prototype here (113.6 = its resting width in
// design px, measured), so it all reads as one camera.
import { DecisionBoardScene } from "@/components/portfolio/DecisionBoardScene";
import { mount } from "./frame";

mount(DecisionBoardScene, {
  design: {
    w: 1000,
    h: 680,
    view: {
      cx: 500,
      cy: 340,
      h: 460, // the furthest out that still covers the card with the parallax's drift (680 × 0.75 zoom-out)
      zoomOut: { by: 0.25, ms: 15000 },
      parallax: 0.04,
      scaleWithFollow: { selector: ".mf-cursor", restWidth: 113.6, of: "iframe" },
    },
  },
  // its replay button always reads Replay, so loop it on its 15s run
  loopEvery: 15000,
});
