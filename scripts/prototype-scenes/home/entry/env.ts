// Runs before anything from the app: the bits of a Next runtime the home page
// expects, and canned answers for the APIs it calls (there is no server here).
const g = globalThis as unknown as { process?: { env: Record<string, string | undefined> } };
g.process ??= { env: {} };
Object.assign(g.process.env, { NODE_ENV: "production", NEXT_PUBLIC_OFFLINE_MODE: "true" });

// The channels the home cards come from (their own space names), for the sidebar.
const SPACES = ["Core Banking Migration", "KYC Onboarding", "Roadmaps", "PayGrid", "FlexFund"].map((name, i) => ({
  id: name.toLowerCase().replace(/[^a-z]+/g, "-"),
  name,
  description: "",
  emoji: ["🏦", "🪪", "🗺️", "💳", "📈"][i],
  canvasCount: 3 + i,
}));
const ANSWERS: Record<string, unknown> = {
  "/api/spaces": { spaces: SPACES, spaceSections: [] },
  "/api/canvases": { canvases: [] },
  "/api/calendar/today": { events: [] },
};
const native = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const path = new URL(url, window.location.href).pathname;
  if (path.startsWith("/api/")) {
    return Promise.resolve(new Response(JSON.stringify(ANSWERS[path] ?? {}), { status: 200, headers: { "content-type": "application/json" } }));
  }
  return native(input, init);
}) as typeof fetch;
