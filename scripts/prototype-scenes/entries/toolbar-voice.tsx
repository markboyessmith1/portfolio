// "A handful of tools made for the agentic era…" → public/media/simplify/toolbar-voice.html
// The real toolbar (the my-canvas-prototype Toolbar, built by ../home/build-home.ts toolbar
// into toolbar-page.html beside this page, and played here in an iframe): the crowded
// row folds into the unified bar, then a click on the voice button takes it into voice
// mode and back out.
import { ToolbarVoiceScene } from "@/components/portfolio/ToolbarVoiceScene";
import { mount } from "./frame";

mount(() => <ToolbarVoiceScene pageSrc="toolbar-page.html" />);
