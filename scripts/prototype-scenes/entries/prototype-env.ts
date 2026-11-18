// Side effects, imported before any prototype module, for scenes built from the
// prototype's production components:
// - pin the tab persona (lib/localUser reads it at load), so the scene posts as the same
//   person every time, as on the live board, instead of a random guest;
// - answer the prototype's own /api/* calls (e.g. chat-session titles) with an empty reply:
//   there's no prototype server behind the portfolio, and a 404 would only be console noise.
try {
  window.localStorage.setItem("vlab.persona", "Sarah Chen");
} catch {}
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (new URL(url, window.location.href).pathname.startsWith("/api/")) {
    return Promise.resolve(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
  }
  return nativeFetch(input, init);
};
