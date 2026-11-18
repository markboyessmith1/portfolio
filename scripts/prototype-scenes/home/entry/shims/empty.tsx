import type { ReactNode } from "react";
// Chrome the home page doesn't show at rest (the chat shell, the widget docks).
const Nothing = () => null;
export const ChatShell = Nothing;
export const RunningWidgetDock = Nothing;
export const ContentWidgetDock = Nothing;
export const FrozenRouter = ({ children }: { children: ReactNode }) => <>{children}</>;
export default Nothing;
