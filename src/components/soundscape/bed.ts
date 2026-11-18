/* The sampled sound beds, ported from sound-lab/index.html: two moods the
   viewer can switch between under the board's one-shot sounds.

   - Lullaby: rubato piano over a long reverb; strings, then horns, fade in
     as the room gets busier.
   - Lofi: a laid-back swung beat with 7th-ish chord stabs, electric bass and
     vinyl crackle; drums and melody fill out with activity.

   Both follow the board's activity (creations, votes, reactions) through the
   `getActivity` hook, so the music genuinely comes from the collaboration.

   Tone.js + Tonal and the instrument samples (~20MB, cached) come from the
   network at runtime — exactly as the lab does — loaded only when a bed is
   first switched on, so the page costs nothing until then. Keyed to match
   audio.ts: D major pentatonic. */

export type BedStyle = "lullaby" | "lofi";
export type BedStatus = "idle" | "loading" | "playing" | "error";

// The lab's per-style presets (tempo in bps, reverb wet, filter cutoff Hz).
const PRESETS: Record<BedStyle, { tempo: number; wet: number; cutoff: number }> = {
  lullaby: { tempo: 0.5, wet: 0.55, cutoff: 2200 },
  lofi: { tempo: 1.6, wet: 0.28, cutoff: 3400 },
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// audio.ts ScaleName → Tonal's scale names (the lab's mapping).
const TONAL_SCALE_NAMES: Record<string, string> = {
  majorPent: "major pentatonic",
  minorPent: "minor pentatonic",
  major: "major",
  dorian: "dorian",
  lydian: "lydian",
  aeolian: "aeolian",
};

/* ————— CDN loading (the lab's script tags, made lazy) ————— */

declare global {
  interface Window {
    Tone?: any;
    Tonal?: any;
  }
}

// Versions are PINNED (the lab floated on @15/latest): a compromised or
// hijacked "latest" can't be slipped under this page. Supply-chain TODO for
// anything beyond the prototype: add Subresource Integrity hashes
// (`s.integrity = "sha384-…"` computed from these exact files) or vendor the
// two libraries as npm deps — a pin alone doesn't verify the bytes.
// If the bed reports "failed to load", check these paths still exist and
// bump the pins.
const CDN_SCRIPTS = [
  "https://unpkg.com/tone@15.0.4/build/Tone.js",
  "https://unpkg.com/tonal@6.4.0/browser/tonal.min.js",
];

let scriptsPromise: Promise<void> | null = null;
function loadScripts(): Promise<void> {
  if (window.Tone && window.Tonal) return Promise.resolve();
  if (scriptsPromise) return scriptsPromise;
  const load = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.appendChild(s);
    });
  scriptsPromise = Promise.all(CDN_SCRIPTS.map(load)).then(() => undefined);
  // A failed fetch shouldn't poison every later attempt.
  scriptsPromise.catch(() => (scriptsPromise = null));
  return scriptsPromise;
}

/* ————— sample maps (from the lab) ————— */

const SALAMANDER_URLS: Record<string, string> = {};
for (let oct = 1; oct <= 6; oct++) {
  for (const [note, file] of [["A", "A"], ["C", "C"], ["D#", "Ds"], ["F#", "Fs"]] as const) {
    if (oct === 1 && note !== "A") continue;
    SALAMANDER_URLS[`${note}${oct}`] = `${file}${oct}.mp3`;
  }
}
const INSTRUMENT_BASE = "https://nbrosowsky.github.io/tonejs-instruments/samples/";
const VIOLIN_URLS = Object.fromEntries(
  ["A3", "A4", "A5", "C4", "C5", "C6", "E4", "E5", "E6", "G4", "G5", "G6"].map((n) => [n, n + ".mp3"]),
);
const HORN_URLS: Record<string, string> = {
  A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", G2: "G2.mp3",
  D3: "D3.mp3", F3: "F3.mp3", A3: "A3.mp3", C4: "C4.mp3",
  D5: "D5.mp3", F5: "F5.mp3",
};
const BASS_URLS = Object.fromEntries(
  ["E1", "G1", "A#1", "C#2", "E2", "G2", "A#2", "C#3", "E3", "G3"].map((n) => [n, n.replace("#", "s") + ".mp3"]),
);

/* ————— the bed ————— */

export function createSoundBed(opts: { getActivity: () => number; onStatus: (s: BedStatus, detail?: string) => void }) {
  const { getActivity, onStatus } = opts;
  let style: BedStyle = "lullaby";
  // Harmony — defaults match audio.ts (D major pentatonic); the viewer's
  // tune controls change both engines together, live.
  let key = 2;
  let scaleId = "majorPent";
  let running = false;
  let loaded = false;
  // Start generation: stop() (or a newer start) bumps it, so a start that is
  // still awaiting its samples when the viewer mutes aborts instead of
  // playing into the mute.
  let seq = 0;
  // Instruments and buses, built once on first start.
  const n: Record<string, any> = {};
  let timers: number[] = [];
  let transportIds: number[] = [];
  let followTimer = 0;
  let chordDegree = 0;
  let progIndex = -1;
  let measure = 0;

  const timer = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

  function scaleNotes(octave: number): string[] {
    return window.Tonal.Scale.get(`${NOTE_NAMES[key]}${octave} ${TONAL_SCALE_NAMES[scaleId]}`).notes;
  }
  function chordTones(octave: number, count = 3): string[] {
    const low = scaleNotes(octave);
    const notes = [...low, ...scaleNotes(octave + 1), ...scaleNotes(octave + 2)];
    const d = chordDegree % low.length;
    const tones: string[] = [];
    for (let i = 0; i < count; i++) tones.push(notes[d + i * 2]!);
    return tones;
  }
  // The lab's progressions: a pentatonic branch and a diatonic one per style.
  const progression = () => {
    if (scaleId.endsWith("Pent")) return [0, 3, 1, 4];
    return style === "lofi" ? [1, 4, 0, 5] : [0, 5, 3, 4];
  };
  const advanceChord = () => {
    progIndex = (progIndex + 1) % progression().length;
    chordDegree = progression()[progIndex]!;
  };

  const density = () => Math.max(0.5 + getActivity() * 4, 0.05);
  const velocity = (base: number) => Math.min(base * (0.8 + getActivity() * 0.6), 1);
  const tempoRatio = () => PRESETS[style].tempo / (1 / 3.2);

  function play(note: string | undefined, dur: number, vel: number) {
    if (running && note) n.piano.triggerAttackRelease(note, dur, undefined, vel);
  }
  const audible = (g: any) => g && g.gain.value > 0.05;

  /** A self-rescheduling voice whose spacing breathes with activity. */
  function voice(baseIntervalSec: number, fire: () => void) {
    const loop = () => {
      if (!running) return;
      fire();
      const wait = (baseIntervalSec / (density() * tempoRatio())) * (0.5 + Math.random());
      timer(loop, wait * 1000);
    };
    timer(loop, Math.random() * 3000);
  }

  /* — lullaby voices (lab names kept) — */
  function midNote() {
    const tones = chordTones(3);
    const note = tones[Math.floor(Math.random() * tones.length)];
    const vel = velocity(0.2 + Math.random() * 0.28);
    play(note, 8, vel);
    if (Math.random() < 0.55) {
      const other = tones[Math.floor(Math.random() * tones.length)];
      timer(() => play(other, 8, vel * 0.8), 150 + Math.random() * 450);
    }
  }
  function stringNote() {
    if (!n.violin || !audible(n.stringGain)) return;
    const tones = chordTones(4);
    const note = tones[Math.floor(Math.random() * tones.length)];
    if (running && note) n.violin.triggerAttackRelease(note, 3.5, undefined, velocity(0.18 + Math.random() * 0.1));
  }
  function hornSwell() {
    if (!n.horn || !audible(n.hornGain)) return;
    const tones = chordTones(2);
    const note = tones[Math.random() < 0.6 ? 0 : 1];
    if (running && note) n.horn.triggerAttackRelease(note, 4, undefined, velocity(0.16 + Math.random() * 0.08));
  }
  function sparkle() {
    const notes = scaleNotes(5);
    play(notes[Math.floor(Math.random() * notes.length)], 6, velocity(0.1 + Math.random() * 0.08));
  }
  function nextChord() {
    if (!running) return;
    advanceChord();
    play(chordTones(2)[0], 12, velocity(0.3));
    timer(nextChord, (18000 + Math.random() * 10000) / tempoRatio());
  }

  /* — lofi voices — */
  function lofiMelody() {
    if (Math.random() > 0.25 + getActivity()) return;
    const notes = scaleNotes(5);
    const runLen = 1 + Math.floor(Math.random() * 3);
    let idx = Math.floor(Math.random() * notes.length);
    for (let i = 0; i < runLen; i++) {
      const note = notes[idx];
      timer(() => play(note, 2, velocity(0.16 + Math.random() * 0.1)), i * (200 + Math.random() * 150));
      idx = Math.max(0, Math.min(notes.length - 1, idx + Math.floor(Math.random() * 3) - 1));
    }
  }
  function bassNote(note: string | undefined, t: number, vel: number) {
    if (!audible(n.bassGain) || !note) return;
    if (n.bass) n.bass.triggerAttackRelease(note, 0.5, t, vel);
    else n.piano.triggerAttackRelease(note, 0.8, t, vel * 0.9);
  }
  function chordStab(t: number) {
    chordTones(3, 4).forEach((note, i) => {
      if (note) n.piano.triggerAttackRelease(note, 1.8, t + i * 0.02, velocity(0.2 + Math.random() * 0.08));
    });
  }
  function startTransport() {
    const Tone = window.Tone;
    let step = 0;
    measure = 0;
    Tone.Transport.swing = 0.3;
    Tone.Transport.swingSubdivision = "8n";
    Tone.Transport.bpm.value = Math.max(40, PRESETS.lofi.tempo * 60);
    transportIds.push(
      Tone.Transport.scheduleRepeat((t: number) => {
        const s = step++ % 8;
        const a = getActivity();
        if (s === 0) n.kick.triggerAttackRelease("C1", "8n", t, 0.9);
        if (s === 5 && Math.random() < 0.65) n.kick.triggerAttackRelease("C1", "8n", t, 0.55);
        if (s === 2 || s === 6) n.snare.triggerAttackRelease("16n", t, 0.5 + Math.random() * 0.2);
        if (s % 2 === 0 || Math.random() < 0.2 + a * 0.7) n.hat.triggerAttackRelease("32n", t, 0.15 + Math.random() * 0.2);
        if (s === 0) bassNote(chordTones(1)[0], t, 0.5);
        if (s === 5 && Math.random() < 0.5) bassNote(chordTones(1)[Math.random() < 0.5 ? 0 : 2], t, 0.35);
      }, "8n"),
    );
    transportIds.push(
      Tone.Transport.scheduleRepeat((t: number) => {
        if (Math.random() < 0.12) n.pop.triggerAttackRelease("64n", t, Math.random() * 0.5);
      }, "16n"),
    );
    transportIds.push(
      Tone.Transport.scheduleRepeat((t: number) => {
        if (measure % 2 === 0) advanceChord();
        measure++;
        chordStab(t);
      }, "1m"),
    );
    n.crackle.start();
    Tone.Transport.start("+0.05");
  }

  /* — graph + samples, built once (the lab's lullabyInit) — */
  async function init(): Promise<boolean> {
    if (loaded) return true;
    onStatus("loading", "loading Tone.js…");
    try {
      await loadScripts();
    } catch {
      onStatus("error", "audio libraries failed to load — offline?");
      return false;
    }
    const Tone = window.Tone;
    await Tone.start();
    onStatus("loading", "loading instrument samples…");
    try {
      const out = new Tone.Gain(0.9).toDestination();
      n.verb = new Tone.Reverb({ decay: 14, wet: PRESETS[style].wet }).connect(out);
      await n.verb.ready;
      n.filter = new Tone.Filter(PRESETS[style].cutoff, "lowpass").connect(n.verb);
      const loadSampler = (urls: Record<string, string>, baseUrl: string, release: number) =>
        new Promise((resolve, reject) => {
          const s = new Tone.Sampler({ urls, release, baseUrl, onload: () => resolve(s), onerror: reject });
        });

      const [piano, violin, horn, bass] = await Promise.all([
        loadSampler(SALAMANDER_URLS, "https://tonejs.github.io/audio/salamander/", 6),
        loadSampler(VIOLIN_URLS, INSTRUMENT_BASE + "violin/", 2).catch(() => null),
        loadSampler(HORN_URLS, INSTRUMENT_BASE + "french-horn/", 2).catch(() => null),
        loadSampler(BASS_URLS, INSTRUMENT_BASE + "bass-electric/", 0.5).catch(() => null),
      ]);
      n.piano = piano;
      n.lullabyIn = new Tone.Gain(1).connect(n.filter);
      n.wobble = new Tone.Vibrato(0.6, 0.08).connect(n.filter);
      n.lofiIn = new Tone.Gain(0).connect(n.wobble);
      n.piano.connect(n.lullabyIn);
      n.piano.connect(n.lofiIn);

      n.stringGain = new Tone.Gain(0).connect(n.filter);
      n.violin = violin;
      if (violin) (violin as any).connect(n.stringGain);

      n.hornGain = new Tone.Gain(0).connect(n.filter);
      n.horn = horn;
      if (horn) (horn as any).connect(n.hornGain);

      n.bass = bass;
      n.bassGain = new Tone.Gain(0).connect(n.lofiIn);
      if (bass) (bass as any).connect(n.bassGain);

      n.drumGain = new Tone.Gain(0).connect(out);
      const drumVerbSend = new Tone.Gain(0.06).connect(n.verb);
      n.drumGain.connect(drumVerbSend);
      const drumTone = new Tone.Filter(3800, "lowpass").connect(n.drumGain);
      n.kick = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 2, envelope: { attack: 0.002, decay: 0.4, sustain: 0 } }).connect(drumTone);
      const snareFilter = new Tone.Filter(1100, "bandpass").connect(drumTone);
      n.snare = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.08, sustain: 0 }, volume: -10 }).connect(snareFilter);
      const hatFilter = new Tone.Filter(3000, "highpass").connect(drumTone);
      n.hat = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.025, sustain: 0 }, volume: -19 }).connect(hatFilter);

      n.crackleGain = new Tone.Gain(0).connect(out);
      const crackleFilter = new Tone.Filter(1500, "highpass").connect(n.crackleGain);
      n.crackle = new Tone.Noise({ type: "pink", volume: -34 }).connect(crackleFilter);
      n.pop = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.012, sustain: 0 }, volume: -14 }).connect(crackleFilter);
      loaded = true;
      return true;
    } catch (err) {
      onStatus("error", "samples failed to load: " + ((err as Error).message || String(err)));
      return false;
    }
  }

  // The lab's follow loop: layers fade in and out with the room's activity.
  function follow() {
    followTimer = window.setInterval(() => {
      if (!running || !n.stringGain) return;
      const a = getActivity();
      const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
      if (style === "lullaby") {
        n.stringGain.gain.rampTo(clamp01((a - 0.08) / 0.27) * 0.55, 1.5);
        n.hornGain.gain.rampTo(clamp01((a - 0.28) / 0.32) * 0.45, 2);
        n.drumGain?.gain.rampTo(0, 0.8);
        n.crackleGain?.gain.rampTo(0, 1);
      } else {
        n.stringGain.gain.rampTo(0, 1);
        n.hornGain.gain.rampTo(0, 1);
        n.drumGain.gain.rampTo(clamp01((a - 0.08) / 0.3) * 0.9, 0.8);
        n.bassGain.gain.rampTo(clamp01((a - 0.18) / 0.3), 1);
        n.crackleGain.gain.rampTo(0.6, 1);
      }
    }, 400);
  }

  async function start(nextStyle: BedStyle) {
    const mySeq = ++seq;
    stopInternal();
    style = nextStyle;
    if (!(await init())) return;
    // Superseded (newer start) or stopped (mute) while the samples loaded.
    if (mySeq !== seq) return;
    if (n.verb) n.verb.wet.value = PRESETS[style].wet;
    if (n.filter) n.filter.frequency.value = PRESETS[style].cutoff;
    running = true;
    progIndex = -1;
    if (style === "lullaby") {
      n.lullabyIn.gain.value = 1;
      n.lofiIn.gain.value = 0;
      nextChord();
      voice(3.2, midNote);
      voice(9, sparkle);
      voice(7, stringNote);
      voice(12, hornSwell);
    } else {
      n.lullabyIn.gain.value = 0;
      n.lofiIn.gain.value = 1;
      advanceChord();
      startTransport();
      voice(2.2, lofiMelody);
    }
    follow();
    onStatus("playing");
  }

  function stop() {
    seq++;
    stopInternal();
    onStatus("idle");
  }

  function stopInternal() {
    if (!running) return;
    running = false;
    timers.forEach(clearTimeout);
    timers = [];
    window.clearInterval(followTimer);
    const Tone = window.Tone;
    if (Tone) {
      transportIds.forEach((id) => Tone.Transport.clear(id));
      transportIds = [];
      Tone.Transport.stop();
    }
    if (n.crackle && n.crackle.state === "started") n.crackle.stop();
  }

  /** Hard mute on Tone's output. stop() alone lets already-triggered notes
   *  ring out through the 14s reverb — musical on a bed switch, wrong on
   *  mute, which must be silence NOW. */
  function setMuted(m: boolean) {
    if (window.Tone) window.Tone.Destination.mute = m;
  }

  return {
    get running() {
      return running;
    },
    get style() {
      return style;
    },
    start,
    stop,
    setMuted,
    setKey(k: number) {
      key = k;
    },
    setScale(id: string) {
      if (TONAL_SCALE_NAMES[id]) scaleId = id;
    },
    dispose() {
      stop();
      // Tone nodes are tiny next to the samplers; dropping references is
      // enough for a page-leave in a prototype.
      Object.keys(n).forEach((k) => delete n[k]);
      loaded = false;
    },
  };
}

export type SoundBed = ReturnType<typeof createSoundBed>;
