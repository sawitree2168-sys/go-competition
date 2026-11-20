"use client";

/**
 * Short sounds for competition day, made with WebAudio (no sound files).
 * One switch for all of them: the 🔔 button in the organiser alert bar (localStorage "gt-alert-sound").
 * Browsers only allow sound after the person has tapped the page once.
 */
export type SoundKind = "alert" | "checkin" | "result" | "roundStart";

export const SOUND_KEY = "gt-alert-sound";

const TUNES: Record<SoundKind, { notes: number[]; step: number; len: number; gain: number; type: OscillatorType }> = {
  alert: { notes: [784, 1046], step: 0.22, len: 0.2, gain: 0.25, type: "sine" },
  // เช็คอิน: one soft "ding"
  checkin: { notes: [988], step: 0.15, len: 0.18, gain: 0.18, type: "sine" },
  // ลงผล มีคนชนะ: rising two-note chime
  result: { notes: [659, 988], step: 0.14, len: 0.28, gain: 0.22, type: "triangle" },
  // เริ่มแข่งรอบใหม่: short fanfare
  roundStart: { notes: [523, 659, 784, 1046], step: 0.15, len: 0.32, gain: 0.25, type: "triangle" },
};
const VIBRATE: Record<SoundKind, number[]> = { alert: [120, 80, 120], checkin: [40], result: [80, 60, 80], roundStart: [200, 100, 200, 100, 300] };

export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) === "1"; } catch { return false; }
}

export function play(kind: SoundKind, force = false) {
  if (!force && !soundOn()) return;
  const t = TUNES[kind];
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    t.notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime + i * t.step;
      o.type = t.type; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(t.gain, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + t.len);
      o.start(at); o.stop(at + t.len + 0.02);
    });
    window.setTimeout(() => void ctx.close(), (t.notes.length * t.step + t.len) * 1000 + 300);
  } catch { /* no audio */ }
  try { navigator.vibrate?.(VIBRATE[kind]); } catch { /* no vibration */ }
}
