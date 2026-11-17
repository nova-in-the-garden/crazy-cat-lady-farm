// Tiny synthesized sound effects (Web Audio, no sound files needed).
let ctx = null, master = null, muted = false;
try { muted = localStorage.getItem('ccl-muted') === '1'; } catch { /* ignore */ }

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  return true;
}
function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { freq = 1000, q = 1, vol = 0.3, type = 'bandpass', delay = 0 } = {}) {
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

const SOUNDS = {
  plow: () => { noise(0.18, { freq: 500, type: 'lowpass', vol: 0.5 }); tone(110, 0.12, { type: 'triangle', vol: 0.25, slide: -40 }); },
  seed: () => { tone(620, 0.08, { vol: 0.2, slide: 300 }); tone(900, 0.06, { vol: 0.12, delay: 0.06 }); },
  water: () => { noise(0.45, { freq: 2400, q: 0.7, vol: 0.25 }); noise(0.3, { freq: 900, q: 2, vol: 0.12, delay: 0.1 }); },
  fill: () => { for (let i = 0; i < 5; i++) tone(300 + i * 90, 0.09, { vol: 0.12, delay: i * 0.07 }); noise(0.5, { freq: 1500, vol: 0.12 }); },
  harvest: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { vol: 0.18, delay: i * 0.07, type: 'triangle' })); },
  cook: () => { for (let i = 0; i < 9; i++) tone(260 + Math.random() * 260, 0.07, { vol: 0.12, delay: i * 0.09, slide: 120 }); [659, 784, 988].forEach((f, i) => tone(f, 0.22, { vol: 0.14, delay: 0.85 + i * 0.09, type: 'triangle' })); },
  pickup: () => { tone(784, 0.07, { vol: 0.16 }); tone(1175, 0.1, { vol: 0.14, delay: 0.06 }); },
  sleep: () => { [784, 659, 523, 392].forEach((f, i) => tone(f, 0.35, { vol: 0.12, delay: i * 0.22 })); },
  nope: () => { tone(220, 0.12, { type: 'triangle', vol: 0.18, slide: -60 }); },
  click: () => { tone(1200, 0.03, { vol: 0.08 }); },
};

export const sound = {
  /** Call from a user gesture (e.g. the Start button) so the browser allows audio. */
  unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
  play(name) { if (muted || !ensure() || !SOUNDS[name]) return; try { SOUNDS[name](); } catch { /* ignore */ } },
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem('ccl-muted', muted ? '1' : '0'); } catch { /* ignore */ } return muted; },
};
