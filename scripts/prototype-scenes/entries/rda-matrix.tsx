// Real-time transcription (the AI page's Real-time shelf) → public/media/ai/rda-matrix.html
// The prototype's live meeting board (RdaMatrixScene): Sidekick listens in a huddle, an
// impact/effort 2×2 lands, and each option it hears peels off the transcript as a sticky
// and rides into its quadrant. It keeps the caption room at the top that the card's
// still (stills/simple-decisions.jpg) was captured with.
import "./prototype-env";
import { RdaMatrixScene } from "@/components/portfolio/RdaMatrixScene";
import { mount } from "./frame";
mount(RdaMatrixScene);
