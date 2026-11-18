// The app's session hooks, at rest: nobody signed in, chat minimised, voice idle.
const noop = () => {};
const chat = { chatMode: "minimized", resizeHovered: false, isLoading: false, messages: [], setChatMode: noop, append: noop, openFullscreen: noop, registerHandlers: noop };
export const useChat = () => chat;
const voice = { state: "idle", isConnected: false, isMuted: false, connect: noop, disconnect: noop, toggleMute: noop };
export const useRealtimeVoice = () => voice;
const auth = { user: null, loading: false, isConfigured: false, signInWithGoogle: noop, signOut: noop };
export const useAuth = () => auth;
export const useDockMenu = noop;
