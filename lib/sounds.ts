"use client";

/**
 * Short sounds for competition day, made with WebAudio (no sound files).
 * One switch for all of them: the 🔔 button in the organiser alert bar (localStorage "gt-alert-sound").
 *
 * Browsers start audio "suspended" unless it is created during a tap. So one shared AudioContext is created
 * and resumed on the first tap anywhere on the page, and every sound reuses it — otherwise sounds triggered
 * later by fresh data (a referee's check-in) are silent. Sounds are loud on purpose (busy hall): square /
 * sawtooth waves through a compressor, near full volume.
 */
export type SoundKind = "alert" | "checkin" | "result" | "roundStart";

export const SOUND_KEY = "gt-alert-sound";

type Tune = { notes: number[]; step: number; len: number; type: OscillatorType };
const TUNES: Record<SoundKind, Tune> = {
  alert: { notes: [784, 1046, 784, 1046], step: 0.18, len: 0.16, type: "square" },
  // เช็คอิน: clear "ding-ding"
  checkin: { notes: [1175, 1568], step: 0.12, len: 0.22, type: "square" },
  // ลงผล มีคนชนะ: rising three-note chime
  result: { notes: [784, 988, 1319], step: 0.13, len: 0.3, type: "sawtooth" },
  // เริ่มแข่งรอบใหม่: fanfare
  roundStart: { notes: [523, 659, 784, 1046, 1046], step: 0.16, len: 0.34, type: "sawtooth" },
};
const VIBRATE: Record<SoundKind, number[]> = { alert: [150, 80, 150], checkin: [60], result: [100, 60, 100], roundStart: [250, 100, 250, 100, 400] };

let ctx: AudioContext | null = null;
let out: AudioNode | null = null;
const lastPlayed: Partial<Record<SoundKind, number>> = {};

function audio(): { ctx: AudioContext; out: AudioNode } | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctx();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 10; comp.ratio.value = 6;
      const master = ctx.createGain(); master.gain.value = 1.6;
      comp.connect(master); master.connect(ctx.destination);
      out = comp;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return { ctx, out: out! };
  } catch { return null; }
}

/** Call once on the client: the first tap anywhere unlocks sound for the rest of the visit. */
export function unlockSoundOnFirstTap() {
  if (typeof window === "undefined") return;
  const unlock = () => { audio(); };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
}

export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) === "1"; } catch { return false; }
}

/**
 * `force`: play even when the switch is off (the switch's own test beep).
 * `unlessRecent`: skip when the same sound already played in the last few seconds (the admin's own tap
 * plays at once; the refresh that follows must not repeat it).
 */
export function play(kind: SoundKind, { force = false, unlessRecent = false } = {}) {
  if (!force && !soundOn()) return;
  const now = Date.now();
  if (unlessRecent && now - (lastPlayed[kind] ?? 0) < 4000) return;
  lastPlayed[kind] = now;
  const a = audio();
  if (a) {
    const t = TUNES[kind], start = a.ctx.currentTime + 0.01;
    t.notes.forEach((f, i) => {
      const o = a.ctx.createOscillator(), g = a.ctx.createGain(), at = start + i * t.step;
      o.type = t.type; o.frequency.value = f; o.connect(g); g.connect(a.out);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.9, at + 0.01);
      g.gain.setValueAtTime(0.9, at + t.len * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, at + t.len);
      o.start(at); o.stop(at + t.len + 0.02);
    });
  }
  try { navigator.vibrate?.(VIBRATE[kind]); } catch { /* no vibration */ }
}
