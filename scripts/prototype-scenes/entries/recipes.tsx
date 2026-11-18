// "Your team’s best moves, saved as recipes" → public/media/ai/recipes.html
// Laid out in fixed pixels for the prototype's wide card (820 × 680), so it's
// rendered at that size and scaled to the shelf card.
import { RecipesScene } from "@/components/portfolio/RecipesScene";
import { mount } from "./frame";

mount(RecipesScene, { design: { w: 820, h: 680 } });
