"use client";

/** Square-wave blips generated on the fly — no audio files in the repo. */

type Tone = { freq: number; length: number; type?: OscillatorType };

const CUES: Record<string, Tone[]> = {
  move: [{ freq: 440, length: 0.05 }],
  select: [
    { freq: 660, length: 0.06 },
    { freq: 990, length: 0.09 },
  ],
  coin: [
    { freq: 988, length: 0.07 },
    { freq: 1319, length: 0.16 },
  ],
  back: [{ freq: 220, length: 0.09, type: "triangle" }],
  error: [
    { freq: 196, length: 0.1 },
    { freq: 147, length: 0.16 },
  ],
};

let context: AudioContext | null = null;
let unlocked = false;

/** Creating an AudioContext before the page has had a user gesture makes the
 *  browser reject it and log a warning — and hovering a link is not a gesture.
 *  So nothing is created until unlockAudio() runs, which keeps the console
 *  clean instead of one warning per hover. */
function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  context = new Ctor();
  return context;
}

/** Call this from a real user gesture — pointerdown, keydown or touchstart.
 *  There is no way to start audio before any interaction; that restriction is
 *  the whole point of the browser policy. */
export function unlockAudio() {
  if (unlocked) return;
  const ctx = createContext();
  if (!ctx) return;

  if (ctx.state === "suspended") void ctx.resume();

  // iOS needs something to actually play during the gesture, not just a resume.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    /* harmless — the resume above is what matters on desktop */
  }

  unlocked = true;
}

export function play(cue: keyof typeof CUES | string, enabled: boolean) {
  // Silent until the first gesture, rather than attempting and being refused.
  if (!enabled || !unlocked || !context) return;

  const tones = CUES[cue];
  if (!tones) return;

  const ctx = context;
  if (ctx.state === "suspended") void ctx.resume();

  let offset = ctx.currentTime;
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type ?? "square";
    osc.frequency.setValueAtTime(tone.freq, offset);
    gain.gain.setValueAtTime(0.045, offset);
    gain.gain.exponentialRampToValueAtTime(0.0001, offset + tone.length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(offset);
    osc.stop(offset + tone.length);
    offset += tone.length;
  }
}

export const SFX_STORAGE_KEY = "sybi-sfx";
