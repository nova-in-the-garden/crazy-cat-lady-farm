// Bingo night! Every 7th day a little lavender bus stops at the end of the drive around 7 PM.
// Board it (E) and Granny rides to St. Purrpetua's church hall for a game of bingo against the
// rival grannies: sleepy Edna, loud Bertha... and Mildred, who CHEATS. Tap called numbers to daub
// your card, then hit BINGO! with a full row, column or diagonal. Catch Mildred daubing numbers nobody
// called and you can call her out.
// Prizes: coins, a blue-ribbon seed pack, yarn, or (rarely) a mystery cat in a box (only if there's room).
// Lose and Granny shakes her fist at the sky the whole ride home. The bus drops her back at 9:30 PM.
// Saved: state.bingo.last (the day she last went), wins and games. A game in progress isn't saved
// (reload mid-game and the bus is still waiting at the end of the drive).
import * as THREE from 'three';
import { mat, mesh, canvasTexture } from './util.js';
import { ROAD_Z } from './world.js';
import { MAX_CATS } from './catData.js';
import { sound } from './sound.js';

export const BINGO_EVERY = 7, BUS_ARRIVE = 18.8, BUS_LEAVE = 21, HOME_HOUR = 21.5, CALL_SECONDS = 3.5;
// Father Tom's little sayings for some numbers (the rest he just reads out twice, slowly)
const NICK = { 1: 'Kelly\'s eye', 7: 'Lucky seven', 9: 'Nine lives!', 11: 'Legs eleven', 13: 'Unlucky for some', 21: 'Key of the door', 22: 'Two little ducks', 33: 'All the threes', 44: 'Droopy drawers', 55: 'Snakes alive', 66: 'Clickety click', 69: 'Either way up', 75: 'The last one, dearies' };
const BUS_STOP = new THREE.Vector3(-1.6, 0, ROAD_Z + 0.8);
export const BOARD_SPOT = new THREE.Vector3(-0.9, 0, ROAD_Z - 1.3);
const LETTERS = 'BINGO';
const RIVALS = [
  { id: 'mildred', name: 'Mildred', face: '👵', hair: '#9b6fd0', daub: 0.95, cheat: 0.3, lines: ['B-4? I had that. I always have that.', 'Hmph. Beginner\'s luck, Granny.', 'Don\'t look at my card!', 'My lucky troll doll says I win tonight.'] },
  { id: 'edna', name: 'Edna', face: '👵', hair: '#e8e2d6', daub: 0.7, lines: ['Eh? What number?', 'zzz... wha? Did I win?', 'Speak up, Father Tom!', 'Is it N-30 or N-13? My hearing aid\'s full of cat hair.'] },
  { id: 'bertha', name: 'Bertha', face: '👵', hair: '#e8987f', daub: 0.88, lines: ['OHHH so close!', 'WHO BROUGHT THE LEMON BARS?!', 'I can FEEL it tonight, girls!', 'Come on, O-69!'] },
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const label = (n) => `${LETTERS[Math.floor((n - 1) / 15)]}-${n}`;

/** A 5x5 card: column c holds numbers from c*15+1..c*15+15, the middle is FREE (0). */
function makeCard() {
  const cols = [];
  for (let c = 0; c < 5; c++) { const pool = Array.from({ length: 15 }, (_, i) => c * 15 + i + 1); const col = []; for (let r = 0; r < 5; r++) col.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); cols.push(col); }
  const cells = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cells.push(r === 2 && c === 2 ? 0 : cols[c][r]);
  return { cells, daub: cells.map((n) => n === 0) };
}
const LINES = (() => { const L = []; for (let i = 0; i < 5; i++) { L.push([0, 1, 2, 3, 4].map((c) => i * 5 + c)); L.push([0, 1, 2, 3, 4].map((r) => r * 5 + i)); } L.push([0, 6, 12, 18, 24]); L.push([4, 8, 12, 16, 20]); return L; })();
export const hasBingo = (card) => LINES.find((l) => l.every((i) => card.daub[i])) || null;

function busSign() {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fff6ec'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c95c74'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 64px Fredoka, sans-serif'; ctx.fillText('BINGO BUS', w / 2, h / 2 - 6);
    ctx.fillStyle = '#7a5aa8'; ctx.font = '600 24px Fredoka, sans-serif'; ctx.fillText("St. Purrpetua's Church Hall", w / 2, h - 18);
  });
}
function buildBus() {
  const g = new THREE.Group();
  const lav = mat('#c8aaf2'), cream = mat('#fff3e0'), dark = mat('#3d2b3a'), glass = mat('#bfe6f2', { emissive: '#ffe9a8', emissiveIntensity: 0.35 });
  g.add(mesh(new THREE.BoxGeometry(4.6, 1.5, 1.6), lav, { y: 1.15 }));
  g.add(mesh(new THREE.BoxGeometry(4.62, 0.22, 1.62), cream, { y: 0.62 }));
  g.add(mesh(new THREE.BoxGeometry(4.5, 0.12, 1.5), cream, { y: 1.95 }));
  for (let i = 0; i < 5; i++) [1, -1].forEach((s) => g.add(mesh(new THREE.BoxGeometry(0.62, 0.5, 0.03), glass, { x: -1.7 + i * 0.78, y: 1.35, z: s * 0.81, cast: false })));
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.6, 1.3), glass, { x: 2.31, y: 1.35, cast: false }));                 // windshield
  g.add(mesh(new THREE.BoxGeometry(0.55, 1.15, 0.03), mat('#9b7fc9'), { x: 1.75, y: 0.98, z: 0.81, cast: false })); // door
  const sign = mesh(new THREE.PlaneGeometry(2.6, 0.62), new THREE.MeshStandardMaterial({ map: busSign() }), { y: 2.3, z: 0, cast: false });
  const signB = sign.clone(); signB.rotation.y = Math.PI; g.add(sign); g.add(signB);
  [-0.06, 0.06].forEach((dz) => g.add(mesh(new THREE.BoxGeometry(2.7, 0.7, 0.03), lav, { y: 2.3, z: dz })));
  [[-1.5, 1], [-1.5, -1], [1.5, 1], [1.5, -1]].forEach(([x, s]) => { g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), dark, { x, y: 0.34, z: s * 0.72, rx: Math.PI / 2 })); g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.25, 10), cream, { x, y: 0.34, z: s * 0.72, rx: Math.PI / 2, cast: false })); });
  [1, -1].forEach((s) => g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), mat('#fff6c8', { emissive: '#ffe28a', emissiveIntensity: 0.8 }), { x: 2.32, y: 0.75, z: s * 0.55, cast: false })));
  // grannies in the windows
  ['#9b6fd0', '#e8e2d6', '#e8987f'].forEach((hair, i) => { g.add(mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('#f9d6bf'), { x: -1.7 + i * 0.78, y: 1.32, z: 0.6 })); g.add(mesh(new THREE.SphereGeometry(0.19, 10, 8), mat(hair), { x: -1.72 + i * 0.78, y: 1.45, z: 0.58, sy: 0.8 })); });
  return g;
}

export class Bingo {
  constructor(game) {
    this.g = game; this.active = null; this.bus = null; this.busState = 'away'; this.busX = -60;
    const el = document.createElement('div'); el.id = 'bingo'; el.className = 'hidden';
    document.body.appendChild(el); this.el = el;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cell = e.target.closest('[data-cell]'); if (cell) { this.daub(+cell.dataset.cell); return; }
      const b = e.target.closest('button[data-act]'); if (!b) return;
      if (b.dataset.act === 'bingo') this.shout();
      else if (b.dataset.act === 'callout') this.callOut();
      else if (b.dataset.act === 'home') this.rideHome();
    });
  }
  get s() { return this.g.state; }
  isBingoDay(day = this.s.day) { return day % BINGO_EVERY === 0; }
  daysUntil() { const d = this.s.day; return (BINGO_EVERY - (d % BINGO_EVERY)) % BINGO_EVERY; }
  busWanted() { const s = this.s; return this.isBingoDay() && s.bingo.last !== s.day && s.hour >= BUS_ARRIVE && s.hour < BUS_LEAVE && !this.g.day.bedtime; }

  /* ---------------- the bus at the end of the drive ---------------- */
  updateBus(dt) {
    const g = this.g;
    if (!this.bus) { this.bus = buildBus(); this.bus.visible = false; g.scene.add(this.bus); }
    const want = this.busWanted() || (this.active && this.active.phase !== 'done');
    if (want && (this.busState === 'away' || this.busState === 'leaving')) {
      if (this.busState === 'away') this.busX = -60;
      this.busState = 'arriving'; this.bus.visible = true;
      if (g.playing && !this.active) { g.ui.banner('🚌 The Bingo Bus is here! 🎱'); sound.play('honk'); g.host.say("The Bingo Bus! It's at the end of the drive. Let's go win something, dearie! Mildred's going DOWN.", 7); }
    }
    if (!want && (this.busState === 'arriving' || this.busState === 'waiting')) {
      this.busState = 'leaving';
      if (g.playing && this.isBingoDay() && this.s.bingo.last !== this.s.day) { g.host.say('Oh no, we missed the Bingo Bus! Mildred will be unbearable. Next week, dearie.', 6); }
    }
    if (this.busState === 'arriving') { const dx = BUS_STOP.x - this.busX; this.busX += Math.sign(dx) * Math.min(Math.abs(dx), dt * Math.max(1.2, Math.abs(dx) * 1.2)); if (Math.abs(dx) < 0.03) { this.busX = BUS_STOP.x; this.busState = 'waiting'; } }
    if (this.busState === 'leaving') { this.busX += dt * Math.min(14, 2 + (this.busX - BUS_STOP.x) * 1.5); if (this.busX > 60) { this.busState = 'away'; this.bus.visible = false; } }
    if (this.bus.visible) { this.bus.position.set(this.busX, this.g.world.groundHeight(this.busX, BUS_STOP.z), BUS_STOP.z); this.bus.rotation.y = 0; }
  }
  action(p) {
    if (this.busState !== 'waiting' || this.active) return null;
    if (Math.hypot(p.x - BOARD_SPOT.x, p.z - BOARD_SPOT.z) > 2.2) return null;
    return { ok: true, label: 'Board the Bingo Bus 🚌🎱', run: () => this.board() };
  }
  /** Morning reminders on bingo day (from dawn) and an evening nudge. */
  dawn() {
    if (this.isBingoDay()) setTimeout(() => { this.g.ui.banner('🎱 Tonight is BINGO NIGHT!'); this.g.host.say('It\'s BINGO NIGHT! The bus stops at the end of the drive around 7 PM. Don\'t be late, dearie!', 7); }, 4000);
  }
  update(dt) {
    this.updateBus(dt);
    const s = this.s;
    if (this.isBingoDay() && s.bingo.last !== s.day && s.hour >= 17.5 && s.hour < BUS_ARRIVE && this.nudged !== s.day && this.g.playing) { this.nudged = s.day; this.g.host.say('The Bingo Bus comes at 7! Better head down to the end of the drive soon.', 6); }
    const a = this.active; if (!a || a.phase !== 'play') return;
    a.t += dt; a.callT -= dt;
    if (a.callT <= 0) { a.callT = CALL_SECONDS; this.callNext(); }
    // rivals daub at a human pace after each call (Edna is slow), and only then can they shout BINGO
    let changed = false;
    for (const r of a.rivals) {
      while (r.pending && r.pending.length && r.pending[0].at <= a.t) { r.card.daub[r.pending.shift().i] = true; changed = true; }
    }
    if (changed) {
      this.render();
      const winner = a.rivals.find((r) => hasBingo(r.card));
      if (winner && a.calls.length > 4 && !a.winning) { a.winning = true; setTimeout(() => this.rivalWins(winner), 600); }
    }
  }

  /* ---------------- the game ---------------- */
  board() {
    const g = this.g;
    g.emotes.stop(true); g.catMenu.close?.();
    this.active = { phase: 'riding', t: 0 };
    sound.play('click');
    g.ui.sleepFade(() => this.begin());
  }
  begin() {
    const g = this.g, s = this.s;
    s.bingo.games = (s.bingo.games || 0) + 1;
    this.active = { phase: 'play', t: 0, callT: 3, calls: [], pool: Array.from({ length: 75 }, (_, i) => i + 1), card: makeCard(), log: [], cheatFresh: 0, falseCalls: 0,
      rivals: RIVALS.map((r) => ({ ...r, card: makeCard(), cheats: [], shout: '' })) };
    this.el.classList.remove('hidden');
    this.render();
    this.log('Father Tom taps the microphone. "Welcome to BINGO NIGHT, ladies!"');
    if (!s.flags.bingoHello) { s.flags.bingoHello = true; g.journal.log('Granny took the Bingo Bus to St. Purrpetua\'s for bingo night. Mildred was already there, "warming up" her daubers.'); }
  }
  callNext() {
    const a = this.active; if (!a || a.phase !== 'play' || !a.pool.length) return null;
    // the caller favors numbers that are on somebody's card a little, so games don't drag on
    const n = a.pool.splice(Math.floor(Math.random() * a.pool.length), 1)[0];
    a.calls.push(n); sound.play('tap');
    // rivals daub (Edna dozes off sometimes), Mildred sneaks in an extra one...
    for (const r of a.rivals) {
      const i = r.card.cells.indexOf(n);
      if (i >= 0 && Math.random() < r.daub) { (r.pending ||= []).push({ i, at: a.t + (r.id === 'edna' ? 1.4 : 0.6) + Math.random() * 1.2 }); r.pending.sort((x, y) => x.at - y.at); }
      if (r.cheat && Math.random() < r.cheat) {
        const free = r.card.cells.map((v, k) => k).filter((k) => !r.card.daub[k] && !a.calls.includes(r.card.cells[k]));
        if (free.length) { const k = pick(free); r.card.daub[k] = true; r.cheats.push(k); a.cheatFresh = 2; this.log(`👀 Mildred just daubed ${label(r.card.cells[k])}... nobody called that!`, 'cheat'); }
      } else if (Math.random() < 0.12) this.log(`${r.name}: "${pick(r.lines)}"`);
    }
    if (a.cheatFresh > 0) a.cheatFresh--;
    a.annAt = performance.now();
    const nick = NICK[n];
    if (nick && Math.random() < 0.7) this.log(`Father Tom: "${nick}... ${label(n)}!"`);
    const winner = a.rivals.find((r) => hasBingo(r.card));
    this.render();
    if (winner && a.calls.length > 4 && !a.winning) { a.winning = true; setTimeout(() => this.rivalWins(winner), 600); }
    if (!a.pool.length) this.end(false, null);
    return n;
  }
  daub(i) {
    const a = this.active; if (!a || a.phase !== 'play') return;
    const n = a.card.cells[i]; if (n === 0 || a.card.daub[i]) return;
    if (!a.calls.includes(n)) { this.log(`"${label(n)} hasn't been called, dearie. You're not Mildred." 😤`); sound.play('nope'); this.render(); return; }
    a.card.daub[i] = true; sound.play('pickup'); this.render();
  }
  shout() {
    const a = this.active; if (!a || a.phase !== 'play') return;
    if (hasBingo(a.card)) { this.end(true); return; }
    a.falseCalls++; sound.play('nope');
    this.log(a.falseCalls > 1 ? 'Father Tom: "Granny, that\'s TWICE." The whole hall giggles.' : 'False bingo! Mildred cackles like a goose. 🪿', 'bad');
    this.render();
  }
  callOut() {
    const a = this.active; if (!a || a.phase !== 'play') return;
    const m = a.rivals.find((r) => r.id === 'mildred');
    if (!m.cheats.length) { this.log('Mildred: "Accusations! In a house of GOD!"'); this.render(); return; }
    m.cheats.forEach((k) => (m.card.daub[k] = false)); m.cheats = []; a.cheatFresh = 0; a.caught = (a.caught || 0) + 1;
    m.cheat = Math.max(0.08, m.cheat * 0.5);
    this.log(pick(['Father Tom confiscates Mildred\'s dauber. "I have NO idea how those got there," she sniffs.', 'Busted! Mildred\'s extra daubs get wiped. She mutters about "witch hunts".', 'The hall gasps! Mildred pretends to faint. Nobody falls for it.']), 'good');
    sound.play('chime'); this.render();
    if (!this.s.flags.bingoBust) { this.s.flags.bingoBust = true; this.g.journal.log('Granny caught Mildred cheating at bingo. In front of EVERYONE. Best night of her life.'); }
  }
  rivalWins(r) {
    const a = this.active; if (!a || a.phase !== 'play') return;
    this.log(`${r.name}: "BINGO!!!"${r.cheats.length ? ' 👀 (with a few numbers nobody called...)' : ''}`, 'bad');
    this.end(false, r);
  }
  /** Win: roll a prize (a mystery cat only if there's room for one more). */
  rollPrize() {
    const g = this.g, room = g.cats.roomForMore() && g.state.cats.length < MAX_CATS;
    const r = Math.random();
    if (room && r < 0.12) return { kind: 'cat', text: 'a MYSTERY CAT IN A BOX 📦🐱' };
    if (r < 0.42) { const n = 20 + Math.floor(Math.random() * 21); return { kind: 'coins', n, text: `${n} coins 🪙` }; }
    if (r < 0.72) return { kind: 'seeds', text: 'a blue-ribbon seed pack (3 pumpkin, 2 catnip, 2 chamomile) 🌱' };
    return { kind: 'yarn', n: 3, text: '3 balls of fancy yarn 🧶' };
  }
  givePrize(p) {
    const g = this.g, s = this.s;
    if (p.kind === 'coins') s.coins += p.n;
    else if (p.kind === 'seeds') { s.seeds.pumpkin += 3; s.seeds.catnip += 2; s.seeds.chamomile += 2; }
    else if (p.kind === 'yarn') s.yarn = (s.yarn || 0) + p.n;
    else if (p.kind === 'cat') { const d = g.cats.newArrival(); if (!d) { s.coins += 25; p.text = '25 coins (the box was empty... or was it?)'; } else p.catId = d.id; }
  }
  end(won, rival = null) {
    const a = this.active; if (!a || a.phase !== 'play') return;
    a.phase = 'over'; a.won = won; a.rival = rival && rival.name;
    const s = this.s, g = this.g;
    if (won) {
      s.bingo.wins = (s.bingo.wins || 0) + 1; a.prize = this.rollPrize(); this.givePrize(a.prize);
      sound.play('chime');
      this.log(`GRANNY: "BINGO!!!" She wins ${a.prize.text}!`, 'good');
      g.journal.log(`Granny WON at bingo night and brought home ${a.prize.text.replace(/ [^\w)]+$/u, '')}. ${pick(['Mildred demanded a recount.', 'Mildred called it "rigged".', 'Edna slept through it.'])}`);
    } else {
      this.log(rival ? `${rival.name} wins. Granny's eye twitches.` : 'Out of numbers! Nobody wins. Bertha eats all the lemon bars.', 'bad');
      g.journal.log(rival && rival.id === 'mildred' ? 'Mildred "won" bingo night. Granny shook her fist at the sky the whole ride home.' : `${rival ? rival.name : 'Nobody'} won bingo night. Granny shook her fist at the sky the whole ride home anyway.`);
    }
    s.bingo.last = s.day;
    this.render(); g.save();
  }
  rideHome() {
    const a = this.active; if (!a || a.phase !== 'over') return;
    a.phase = 'ride'; this.render();
    setTimeout(() => this.g.ui.sleepFade(() => this.arrive()), a.won ? 1600 : 3200);
  }
  arrive() {
    const g = this.g, s = this.s, a = this.active;
    this.active = null; this.el.classList.add('hidden');
    s.hour = Math.max(s.hour, HOME_HOUR); g.day.apply();
    if (window.ccl) window.ccl.teleport(BOARD_SPOT.x, BOARD_SPOT.z, Math.PI);
    this.busState = 'leaving';
    if (a && !a.won) { setTimeout(() => { g.emotes.play('fist'); g.host.say(a.rival === 'Mildred' ? 'MILDRED CHEATED! I SAW HER! Next week, Mildred. NEXT WEEK! ✊' : 'Rigged! The whole thing was RIGGED! ✊', 6); }, 600); }
    else if (a && a.prize) setTimeout(() => g.host.say(a.prize.kind === 'cat' ? 'A mystery cat in a box! The little one is waiting by the gate for a welcome vet check. 🐱' : `What a night! I won ${a.prize.text}. Mildred's face! Ha!`, 7), 600);
    g.save();
  }
  log(text, cls = '') { const a = this.active; if (!a) return; a.log.unshift({ text, cls }); a.log = a.log.slice(0, 6); }
  render() {
    const a = this.active; if (!a || !a.card) return;
    const last = a.calls[a.calls.length - 1];
    const recent = a.calls.slice(-6, -1).reverse().map((n) => `<span>${label(n)}</span>`).join('');
    const can = hasBingo(a.card);
    const m = a.rivals.find((r) => r.id === 'mildred');
    const cardHtml = `<div class="bg-card"><div class="bg-letters">${[...LETTERS].map((l) => `<b>${l}</b>`).join('')}</div><div class="bg-grid">${a.card.cells.map((n, i) => {
      const d = a.card.daub[i], called = n && a.calls.includes(n);
      return `<button type="button" data-cell="${i}" class="${n === 0 ? 'free ' : ''}${d ? 'daub ' : ''}${called && !d ? 'called' : ''}">${n === 0 ? '🐾<small>FREE</small>' : n}</button>`; }).join('')}</div></div>`;
    const rivals = a.rivals.map((r) => { const nd = r.card.daub.filter(Boolean).length - 1; const best = Math.max(...LINES.map((l) => l.filter((i) => r.card.daub[i]).length));
      return `<div class="bg-rival ${r.id}"><div class="bg-face" style="--hair:${r.hair}">${r.face}${r.id === 'mildred' ? '<i>🕶️</i>' : r.id === 'edna' ? '<i>💤</i>' : '<i>📣</i>'}</div><b>${r.name}</b><span>${nd} daubed · ${'●'.repeat(best)}${'○'.repeat(5 - best)}</span></div>`; }).join('');
    let foot = '';
    if (a.phase === 'play') foot = `<button type="button" data-act="bingo" class="bg-shout ${can ? 'ready' : ''}">BINGO!</button>${a.cheatFresh > 0 || m.cheats.length ? `<button type="button" data-act="callout" class="bg-callout ${a.cheatFresh > 0 ? 'hot' : ''}">👉 Call out Mildred!</button>` : ''}`;
    else if (a.phase === 'over') foot = `<div class="bg-result ${a.won ? 'won' : 'lost'}">${a.won ? `🎉 YOU WON! Prize: ${a.prize.text}` : `${a.rival ? `${a.rival} won.` : 'Nobody won.'} ${a.rival === 'Mildred' ? 'She CHEATED. Everyone knows it.' : 'Next week, Granny.'}`}</div><button type="button" data-act="home" class="bg-home">🚌 Ride the bus home</button>`;
    else if (a.phase === 'ride') foot = `<div class="bg-ride ${a.won ? 'won' : 'lost'}"><span class="bus">🚌</span><span class="granny">👵${a.won ? '🏆' : '<i class="fist">✊</i>'}</span>${a.won ? 'Humming all the way home...' : '*shakes fist at the sky the whole ride home*'}</div>`;
    this.el.innerHTML = `<div class="bg-hall"><div class="bg-head"><div><h2>🎱 Bingo Night</h2><span>St. Purrpetua's Church Hall · Father Tom is calling</span></div>
      <div class="bg-ball">${last ? `<b>${LETTERS[Math.floor((last - 1) / 15)]}</b><em>${last}</em>` : '<em>...</em>'}</div><div class="bg-recent">${recent}</div></div>
      <div class="bg-body"><div class="bg-left">${cardHtml}<div class="bg-foot">${foot}</div></div>
      <div class="bg-right"><div class="bg-rivals">${rivals}</div><div class="bg-log">${a.log.map((l) => `<p class="${l.cls}">${l.text}</p>`).join('')}</div></div></div>${this.announceHtml(a, last)}</div>`;
  }
  announceHtml(a, n) {
    const age = a.phase === 'play' && n && a.annAt ? performance.now() - a.annAt : 1e9;
    if (age > 2200) return '';
    return `<div class="bg-announce" style="animation-delay:-${Math.round(age)}ms"><div class="ball" style="animation-delay:-${Math.round(age)}ms"><b>${LETTERS[Math.floor((n - 1) / 15)]}</b><em>${n}</em></div><span>${NICK[n] ? `${NICK[n]}!` : `${label(n)}... ${label(n)}!`}</span></div>`;
  }
}
