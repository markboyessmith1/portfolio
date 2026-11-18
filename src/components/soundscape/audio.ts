/* The soundscape's ears — Web Audio, adapted from sound-lab/index.html.

   The lab's "cursor flyby" swoosh (a looping noise bed through a bandpass
   filter and an HRTF panner, gain following pointer speed) is turned inside
   out here: YOU are the listener, and every roaming cursor on the board
   carries its own flyby voice. A cursor swooping past your pointer gets loud
   and bright with speed, and the panner places it in space around you —
   left ear, right ear, near, far (wear headphones).

   Audio can only start from a user gesture (browser autoplay policy), so the
   board calls enable() from its sound toggle. Everything is lazy: no
   AudioContext, no nodes, until that first click. */

type Pt = { x: number; y: number };

/** Pixels per spatial unit: a cursor ~140px from yours sits at the panner's
 *  reference distance (full volume); the inverse rolloff fades it from there. */
const PX_PER_UNIT = 140;

/** The lab's speed→level law (speed in px/ms), turned well down from the
 *  lab's 0.35/0.55 — here six cursors share the air with the one-shots. */
const levelFromSpeed = (speed: number) => Math.min(speed * 0.14, 0.22);

/* ————— harmony (from the lab): every sound quantized to one key & scale ————— */

const SCALES: Record<string, number[]> = {
  majorPent: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};
export type ScaleName = keyof typeof SCALES;

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** What a creation sounds like — the lab's action-sound vocabulary, mapped
 *  onto the board's object kinds. */
export type ActionKind = "sticky" | "shape" | "text" | "reaction" | "vote" | "sticker" | "media";

/** Synthetic exponentially-decaying noise impulse — the lab's free reverb. */
function makeImpulse(ctx: AudioContext, seconds: number, decay: number) {
  const rate = ctx.sampleRate;
  const len = rate * seconds;
  const buf = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: rate });
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

type FlybyVoice = {
  pan: StereoPannerNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  last: { x: number; y: number; t: number } | null;
  /** Last applied level — lets a silent voice skip automation entirely. */
  level: number;
};

/** Flyby voices update at 20Hz, not every frame: six voices × four params at
 *  60Hz floods the audio thread's automation queue and it crackles. */
const FLYBY_UPDATE_MS = 50;
/** Only the loudest few flybys actually speak; the rest hold at zero. */
const FLYBY_MAX_AUDIBLE = 3;

export function createSoundscapeAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let dryBus: GainNode;
  let wetBus: GainNode;
  const voices = new Map<string, FlybyVoice>();
  // One looping noise source feeds every flyby voice (they only differ in
  // filter/gain/pan), instead of one buffer per cursor.
  let noise: AudioBufferSourceNode | null = null;
  let lastFlybyAt = 0;
  let enabled = false;
  let disposed = false;
  // Harmony state (the viewer gets controls for these later). D major
  // pentatonic: no wrong notes, so a busy room still sounds like music.
  let key = 2;
  let scale: ScaleName = "majorPent";
  let walkIndex = 4;

  /** nth note of the current scale, octave-aware; degree 0 = root of `octave`. */
  function scaleNote(degree: number, octave: number) {
    const steps = SCALES[scale]!;
    const oct = Math.floor(degree / steps.length);
    const idx = ((degree % steps.length) + steps.length) % steps.length;
    return midiToFreq(12 * (octave + 1 + oct) + key + steps[idx]!);
  }

  /** The lab's "melodic walk": each sound steps at most one scale degree from
   *  the last, so the room noodles a tune instead of spraying random notes. */
  function walkFreq(octave: number) {
    walkIndex += Math.floor(Math.random() * 3) - 1;
    walkIndex = Math.max(0, Math.min(SCALES[scale]!.length * 2 - 1, walkIndex));
    return scaleNote(walkIndex, octave);
  }

  function ensureCtx() {
    if (ctx) return ctx;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    dryBus = ctx.createGain();
    dryBus.connect(master);
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 2.8, 2.2);
    wetBus = ctx.createGain();
    wetBus.gain.value = 0.35;
    wetBus.connect(convolver);
    convolver.connect(master);
    return ctx;
  }

  /** The lab's flyby chain, one per cursor — but panned with a cheap
   *  StereoPanner instead of the lab's HRTF PannerNode. Six CONTINUOUS HRTF
   *  convolutions is what made the audio crackle; distance now attenuates the
   *  gain by hand (same inverse law) and HRTF is saved for the one-shots. */
  function voice(id: string): FlybyVoice {
    let v = voices.get(id);
    if (v) return v;
    const c = ctx!;
    if (!noise) {
      const len = c.sampleRate;
      const buf = new AudioBuffer({ numberOfChannels: 1, length: len, sampleRate: c.sampleRate });
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      noise = c.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      noise.start();
    }

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.value = 700;

    const gain = c.createGain();
    gain.gain.value = 0;

    const pan = c.createStereoPanner();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(pan);
    pan.connect(dryBus);
    const send = c.createGain();
    send.gain.value = 0.4;
    pan.connect(send);
    send.connect(wetBus);

    v = { pan, filter, gain, last: null, level: 0 };
    voices.set(id, v);
    return v;
  }

  /* ————— one-shot action sounds (the lab's SYNTHS, verbatim shapes) ————— */

  function env(out: AudioNode, peak: number, attack: number, release: number) {
    const now = ctx!.currentTime;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
    g.connect(out);
    return g;
  }

  const SYNTHS: Record<string, (out: AudioNode, freq: number) => void> = {
    // Bell-like "ting" with a quiet upper partial — the lab's sticky sound.
    ping(out, freq) {
      const c = ctx!;
      const now = c.currentTime;
      const g = env(out, 0.25, 0.005, 0.9);
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(freq * 2, now);
      o.connect(g);
      const o2 = c.createOscillator();
      o2.type = "sine";
      o2.frequency.value = freq * 2 * 2.76;
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.06, now);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      o2.connect(g2);
      g2.connect(out);
      o.start(now);
      o.stop(now + 1);
      o2.start(now);
      o2.stop(now + 0.5);
    },
    // Plucked string: triangle through a closing lowpass.
    pluck(out, freq) {
      const c = ctx!;
      const now = c.currentTime;
      const g = env(out, 0.3, 0.002, 0.35);
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(freq * 6, now);
      f.frequency.exponentialRampToValueAtTime(freq, now + 0.3);
      o.connect(f);
      f.connect(g);
      o.start(now);
      o.stop(now + 0.5);
    },
    // Three staggered partials — a small wind chime.
    chime(out, freq) {
      const c = ctx!;
      const now = c.currentTime;
      [1, 1.5, 2].forEach((ratio, i) => {
        const g = c.createGain();
        const t = now + i * 0.07;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.14 / (i + 1), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        g.connect(out);
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = freq * ratio;
        o.connect(g);
        o.start(t);
        o.stop(t + 1.3);
      });
    },
    // A downward blip.
    pop(out, freq) {
      const c = ctx!;
      const now = c.currentTime;
      const g = env(out, 0.35, 0.001, 0.12);
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, now);
      o.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.12);
      o.connect(g);
      o.start(now);
      o.stop(now + 0.2);
    },
    // A soft landing: pitch settles down a fifth.
    drop(out, freq) {
      const c = ctx!;
      const now = c.currentTime;
      const g = env(out, 0.3, 0.004, 0.6);
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(freq * 1.5, now);
      o.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.25);
      o.connect(g);
      o.start(now);
      o.stop(now + 0.7);
    },
  };

  // Which synth, octave and loudness each board action gets. Mapping follows
  // the lab's labels (ping = sticky, drop = image) and keeps the small
  // social acts (votes, reactions) higher and quieter than the big ones.
  const ACTION_VOICES: Record<ActionKind, { synth: keyof typeof SYNTHS; octave: number; boost: number }> = {
    sticky: { synth: "ping", octave: 5, boost: 1 },
    shape: { synth: "pluck", octave: 4, boost: 1.1 },
    text: { synth: "chime", octave: 5, boost: 0.9 },
    reaction: { synth: "pop", octave: 6, boost: 0.8 },
    vote: { synth: "pop", octave: 7, boost: 0.6 },
    sticker: { synth: "drop", octave: 5, boost: 0.9 },
    media: { synth: "drop", octave: 3, boost: 1.2 },
  };

  /** A creation sound at a board position, heard from where you are.
   *  `gain` scales it for far-listener scenes (see frame's boost);
   *  `panBoost` stretches the left/right axis so the 3D placement is
   *  unmistakable (the 360° vignette uses ~2.6). */
  function playAction(kind: ActionKind, pos: Pt, listener: Pt, gain = 1, panBoost = 1) {
    if (!enabled || !ctx || ctx.state !== "running") return;
    const { synth, octave, boost } = ACTION_VOICES[kind];
    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.rolloffFactor = 1.5;
    panner.positionX.value = ((pos.x - listener.x) / PX_PER_UNIT) * panBoost;
    panner.positionZ.value = (pos.y - listener.y) / PX_PER_UNIT;
    const out = ctx.createGain();
    out.gain.value = 1.3 * boost * gain;
    panner.connect(dryBus);
    const send = ctx.createGain();
    send.gain.value = 0.8;
    panner.connect(send);
    send.connect(wetBus);
    out.connect(panner);
    SYNTHS[synth]!(out, walkFreq(octave));
  }

  /** Called every animation frame by the board with each cursor's pixel
   *  position and yours; internally throttled to 20Hz. `boost` scales the
   *  levels for scenes whose listener sits far from the action (the story
   *  sections listen from the ring's centre, not under a passing cursor).
   *  `focusPx` adds a gaussian window around the listener: beyond it a
   *  cursor is silent, so only close passes swoosh. */
  function frame(cursors: { id: string; pos: Pt }[], you: Pt & { inside: boolean }, tMs: number, boost = 1, focusPx?: number) {
    if (!enabled || !ctx || ctx.state !== "running") return;
    if (tMs - lastFlybyAt < FLYBY_UPDATE_MS) return;
    lastFlybyAt = tMs;
    const t = ctx.currentTime;

    // Work out every voice's wanted level first, so only the loudest speak.
    const wanted: { v: FlybyVoice; level: number; pan: number; freq: number }[] = [];
    for (const { id, pos } of cursors) {
      const v = voice(id);
      if (!v.last) {
        v.last = { ...pos, t: tMs };
        continue;
      }
      const dt = Math.max(tMs - v.last.t, 1);
      const speed = Math.hypot(pos.x - v.last.x, pos.y - v.last.y) / dt;
      v.last = { ...pos, t: tMs };
      let level = 0;
      let pan = 0;
      let freq = 700;
      if (you.inside) {
        const dx = pos.x - you.x;
        const dy = pos.y - you.y;
        // The panner's old inverse distance law, done by hand on the gain.
        const dist = Math.hypot(dx, dy);
        const atten = 1 / (1 + Math.pow(dist / PX_PER_UNIT, 1.6));
        const focus = focusPx ? Math.exp(-((dist / focusPx) ** 2)) : 1;
        level = Math.min(0.4, levelFromSpeed(speed) * atten * focus * boost);
        pan = Math.max(-1, Math.min(1, dx / (PX_PER_UNIT * 2.5)));
        // Speed makes it loud and bright; stillness is silence.
        freq = 400 + Math.min(speed, 3) * 900;
      }
      wanted.push({ v, level, pan, freq });
    }
    wanted.sort((a, b) => b.level - a.level);
    for (let i = 0; i < wanted.length; i++) {
      const u = wanted[i]!;
      const level = i < FLYBY_MAX_AUDIBLE ? u.level : 0;
      if (level < 0.004 && u.v.level < 0.004) {
        // Already silent: skip the automation events entirely.
        if (u.v.level !== 0) {
          u.v.gain.gain.setTargetAtTime(0, t, 0.1);
          u.v.level = 0;
        }
        continue;
      }
      u.v.gain.gain.setTargetAtTime(level, t, 0.06);
      u.v.pan.pan.setTargetAtTime(u.pan, t, 0.06);
      u.v.filter.frequency.setTargetAtTime(u.freq, t, 0.08);
      u.v.level = level;
    }
  }

  async function enable() {
    const c = ensureCtx();
    // Flag first: a disable() racing in behind this call must have the last
    // word, not this function's resume finally landing.
    enabled = true;
    if (c.state === "suspended") await c.resume();
  }

  async function disable() {
    enabled = false;
    if (ctx && ctx.state === "running") await ctx.suspend();
  }

  return {
    get enabled() {
      return enabled;
    },
    enable,
    disable,
    frame,
    playAction,
    setKey(k: number) {
      key = k;
    },
    setScale(s: ScaleName) {
      scale = s;
      walkIndex = Math.min(walkIndex, SCALES[s]!.length * 2 - 1);
    },
    get disposed() {
      return disposed;
    },
    /** True once the context is actually producing sound — i.e. the browser
     *  has allowed audio, gesture or not. */
    get running() {
      return !!ctx && ctx.state === "running";
    },
    dispose() {
      disposed = true;
      enabled = false;
      void ctx?.close();
      ctx = null;
      noise = null;
      voices.clear();
    },
  };
}

export type SoundscapeAudio = ReturnType<typeof createSoundscapeAudio>;

/* One engine for the whole page: the cursor intro's swooshes and the board's
   sounds share buses, the unlock gesture and the mute. Recreated lazily if a
   previous page visit disposed it. */
let shared: SoundscapeAudio | null = null;
export function sharedSoundscapeAudio(): SoundscapeAudio {
  if (!shared || shared.disposed) shared = createSoundscapeAudio();
  return shared;
}
