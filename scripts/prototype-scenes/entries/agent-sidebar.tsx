// "Sidebar": the board's multiplayer chat building up in the real board-channel sidebar
// → public/media/ai/agent-sidebar.html. The env import must come first: the
// prototype reads the persona when its modules load.
import "./prototype-env";
import { AgentSidebarScene } from "@/components/portfolio/AgentSidebarScene";
import { mount } from "./frame";

mount(AgentSidebarScene);
