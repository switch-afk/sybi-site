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

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

export function play(cue: keyof typeof CUES | string, enabled: boolean) {
  if (!enabled) return;
  const tones = CUES[cue];
  if (!tones) return;

  const ctx = ensureContext();
  if (!ctx) return;

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
