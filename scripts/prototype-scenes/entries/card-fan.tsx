// "Important over urgent." → public/media/simplify/card-fan.html
// The real Home (the my-canvas-prototype home page, built by ../home/build-home.ts into
// home-fan.html beside this page, and played here in an iframe), then the board.
import { HomeToBoardScene } from "@/components/portfolio/HomeToBoardScene";
import { mount } from "./frame";

mount(() => <HomeToBoardScene homeSrc="home-fan.html" />);
