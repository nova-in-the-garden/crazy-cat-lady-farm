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
  meow: () => { tone(620, 0.32, { type: 'triangle', vol: 0.14, slide: 260 }); tone(880, 0.22, { type: 'sine', vol: 0.08, delay: 0.14, slide: -380 }); },
  purr: () => { for (let i = 0; i < 6; i++) noise(0.16, { freq: 140, q: 3, vol: 0.22, type: 'lowpass', delay: i * 0.2 }); },
  eat: () => { for (let i = 0; i < 6; i++) noise(0.05, { freq: 2200, q: 2, vol: 0.12, delay: i * 0.18 }); },
  play: () => { tone(500, 0.08, { vol: 0.12, slide: 400 }); tone(700, 0.08, { vol: 0.1, delay: 0.25, slide: 500 }); noise(0.12, { freq: 3000, vol: 0.08, delay: 0.1 }); },
  brush: () => { for (let i = 0; i < 4; i++) noise(0.14, { freq: 4000, q: 0.6, vol: 0.08, delay: i * 0.18 }); },
  bond: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.26, { vol: 0.13, delay: i * 0.09, type: 'triangle' })); },
  check: () => { tone(880, 0.07, { vol: 0.1 }); tone(1320, 0.1, { vol: 0.08, delay: 0.07 }); },
  hmm: () => { tone(392, 0.14, { type: 'triangle', vol: 0.12 }); tone(349, 0.2, { type: 'triangle', vol: 0.1, delay: 0.13 }); },
  heal: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { vol: 0.11, delay: i * 0.08 })); noise(0.6, { freq: 6000, vol: 0.04 }); },
  scoop: () => { noise(0.25, { freq: 1800, q: 0.8, vol: 0.18 }); noise(0.2, { freq: 900, vol: 0.12, delay: 0.25 }); },
  mail: () => { [784, 988, 1319].forEach((f, i) => tone(f, 0.22, { vol: 0.14, delay: i * 0.12, type: 'triangle' })); },
  pop: () => { noise(0.12, { freq: 400, type: 'lowpass', vol: 0.4 }); tone(180, 0.1, { type: 'triangle', vol: 0.2, slide: -60 }); },
  scream: () => { tone(700, 0.55, { type: 'sawtooth', vol: 0.1, slide: 500 }); tone(1100, 0.6, { type: 'triangle', vol: 0.08, delay: 0.1, slide: -300 }); },
  cough: () => { for (let i = 0; i < 3; i++) noise(0.12, { freq: 500 + i * 90, q: 1.5, vol: 0.3, delay: i * 0.22 }); },
  dance: () => { [523, 659, 784, 659, 523, 784, 880, 784].forEach((f, i) => tone(f, 0.16, { type: 'square', vol: 0.05, delay: i * 0.2 })); },
  flush: () => { noise(1.4, { freq: 700, q: 0.5, vol: 0.35, type: 'lowpass' }); noise(1.0, { freq: 2400, q: 0.8, vol: 0.12, delay: 0.3 }); tone(300, 0.9, { vol: 0.05, slide: -200, delay: 0.4 }); },
  tap: () => { noise(0.9, { freq: 3000, q: 0.6, vol: 0.12 }); },
  splash: () => { noise(0.35, { freq: 1200, q: 0.6, vol: 0.3 }); noise(0.25, { freq: 3000, vol: 0.12, delay: 0.1 }); },
  thud: () => { tone(90, 0.3, { type: 'triangle', vol: 0.4, slide: -40 }); noise(0.2, { freq: 300, type: 'lowpass', vol: 0.4 }); },
  nom: () => { for (let i = 0; i < 4; i++) tone(300 + Math.random() * 200, 0.06, { type: 'square', vol: 0.05, delay: i * 0.11 }); },
  snore: () => { noise(0.8, { freq: 160, q: 4, vol: 0.25, type: 'lowpass' }); tone(110, 0.7, { type: 'sawtooth', vol: 0.03, slide: 30 }); },
  dish: () => { [1800, 2200, 1600].forEach((f, i) => tone(f, 0.06, { vol: 0.06, delay: i * 0.09 })); noise(0.3, { freq: 2600, vol: 0.06 }); },
  page: () => { noise(0.18, { freq: 3500, q: 0.5, vol: 0.1 }); },
};

export const sound = {
  /** Call from a user gesture (e.g. the Start button) so the browser allows audio. */
  unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
  play(name) { if (muted || !ensure() || !SOUNDS[name]) return; try { SOUNDS[name](); } catch { /* ignore */ } },
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem('ccl-muted', muted ? '1' : '0'); } catch { /* ignore */ } return muted; },
};
