"use client";

/**
 * Short sounds for competition day, made with WebAudio (no sound files).
 * One switch for all of them: the 🔔 button in the organiser alert bar (localStorage "gt-alert-sound").
 *
 * Browsers start audio "suspended" unless it is created during a tap. So one shared AudioContext is created
 * and resumed on the first tap anywhere on the page, and every sound reuses it — otherwise sounds triggered
 * later by fresh data (a referee's check-in) are silent. Sounds are loud on purpose (busy hall): 
 * bell tones (instant strike, ring out) through a compressor, near full volume.
 */
export type SoundKind = "alert" | "checkin" | "result" | "roundStart";

export const SOUND_KEY = "gt-alert-sound";

// Bell sounds ("ติ๊ง~"): a pure tone that strikes instantly and rings out, plus quieter overtones.
type Tune = { notes: number[]; step: number; ring: number; partials: [number, number][]; times?: number[] };
const BELL: [number, number][] = [[1, 1], [2, 0.35], [3, 0.12]];      // ratio, loudness
const CHIME: [number, number][] = [[1, 1], [2.76, 0.25], [5.4, 0.08]]; // glassy bell
const RING: [number, number][] = [[1, 1], [2.4, 0.5], [3.9, 0.3], [5.2, 0.15]]; // boxing-ring bell, metallic
// ระฆังเวที: 3 quick strikes, played 3 times with a pause between
const RING_TIMES = [0, 1, 2].flatMap((g) => [0, 1, 2].map((i) => g * 1.4 + i * 0.28));
const TUNES: Record<SoundKind, Tune> = {
  alert: { notes: [1319, 1047, 1319, 1047], step: 0.2, ring: 0.5, partials: BELL },
  // เช็คอิน: "ติ๊ง-ติ๊ง"
  checkin: { notes: [1568, 2093], step: 0.16, ring: 0.9, partials: CHIME },
  // ลงผล มีคนชนะ: rising bell chime
  result: { notes: [1047, 1319, 1568, 2093], step: 0.12, ring: 1.1, partials: BELL },
  // เริ่มแข่งรอบใหม่: boxing-ring bell ติ๊ง-ติ๊ง-ติ๊ง × 3 (chosen 21 Nov 2026)
  roundStart: { notes: RING_TIMES.map(() => 1175), step: 0, ring: 1.2, partials: RING, times: RING_TIMES },
};
const VIBRATE: Record<SoundKind, number[]> = { alert: [150, 80, 150], checkin: [60], result: [100, 60, 100], roundStart: [120, 160, 120, 160, 120, 1000, 120, 160, 120, 160, 120, 1000, 120, 160, 120, 160, 120] };

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
      const master = ctx.createGain(); master.gain.value = 2.2;
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
      const at = start + (t.times ? t.times[i] : i * t.step);
      for (const [ratio, level] of t.partials) {
        const o = a.ctx.createOscillator(), g = a.ctx.createGain();
        o.type = "sine"; o.frequency.value = f * ratio; o.connect(g); g.connect(a.out);
        const ring = t.ring / ratio; // overtones die away sooner, like a real bell
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(level, at + 0.004);   // instant strike
        g.gain.exponentialRampToValueAtTime(0.0001, at + ring);   // ring out
        o.start(at); o.stop(at + ring + 0.05);
      }
    });
  }
  try { navigator.vibrate?.(VIBRATE[kind]); } catch { /* no vibration */ }
}
