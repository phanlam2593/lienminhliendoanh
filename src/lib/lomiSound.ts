// ─────────────────────────────────────────────────────────────────────────────
// TIẾNG CỦA LOMI (27/09) — tiếng "robot" nhỏ, tổng hợp ngay trên máy bằng Web Audio
// (không tải file âm thanh, không tốn dung lượng). Chỉ kêu khi người dùng chạm/kéo Lomi hoặc khi
// Lomi trả lời — không bao giờ tự kêu. Bật/tắt bằng nút loa trong khung chat Lomi; lựa chọn lưu
// trên máy (mặc định BẬT). iPhone gạt chế độ im lặng thì trình duyệt thường tự tắt tiếng.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "lmld:lomi-sound";
type Snd = "pop" | "greet" | "wee" | "happy" | "dizzy" | "msg";

let ac: AudioContext | null = null;
const listeners = new Set<(on: boolean) => void>();

export function lomiSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setLomiSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* bỏ qua */
  }
  listeners.forEach((f) => f(on));
}

export function onLomiSoundChange(f: (on: boolean) => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

function ctx(): AudioContext | null {
  try {
    if (!ac) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      if (!C) return null;
      ac = new C();
    }
    if (ac.state === "suspended") void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, o: { f0: number; f1?: number; dur?: number; type?: OscillatorType; vol?: number; at?: number; vib?: number }) {
  const { f0, f1 = f0, dur = 0.12, type = "sine", vol = 0.07, at = 0, vib = 0 } = o;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (vib) {
    const l = c.createOscillator();
    const lg = c.createGain();
    l.frequency.value = vib;
    lg.gain.value = f0 * 0.08;
    l.connect(lg).connect(osc.frequency);
    l.start(t);
    l.stop(t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function lomiSound(s: Snd) {
  if (!lomiSoundOn()) return;
  const c = ctx();
  if (!c) return;
  try {
    switch (s) {
      case "pop":
        tone(c, { f0: 520, f1: 1150, dur: 0.1 });
        break;
      case "greet":
        tone(c, { f0: 1100, f1: 1300, dur: 0.08 });
        tone(c, { f0: 1400, f1: 1700, dur: 0.1, at: 0.11 });
        break;
      case "wee":
        tone(c, { f0: 420, f1: 1500, dur: 0.38, vib: 9, vol: 0.05 });
        break;
      case "happy":
        [523, 659, 784, 1046].forEach((f, i) => tone(c, { f0: f, dur: 0.09, at: i * 0.07, type: "triangle", vol: 0.06 }));
        break;
      case "dizzy":
        tone(c, { f0: 700, f1: 260, dur: 0.7, type: "triangle", vib: 11, vol: 0.05 });
        break;
      case "msg":
        tone(c, { f0: 1568, dur: 0.12, type: "triangle", vol: 0.05 });
        tone(c, { f0: 2093, dur: 0.2, at: 0.08, type: "triangle", vol: 0.045 });
        break;
    }
  } catch {
    /* bỏ qua */
  }
}
