// Fishing at the pond: buy worm bait at the Farmers Market, walk to the shore and press E.
//  1. Cast: a power meter swings back and forth; press (E / Space / the big button) to cast.
//  2. Wait: the bobber floats... little nibbles... then it DIPS: press quick to hook it!
//  3. Reel: hold the button (or E / Space) to lift the green net zone, let go to drop it.
//     Keep the fish inside the zone to fill the catch bar. Too long outside and it wriggles free.
//  4. Caught: turn it into cat food for the pantry, or sell it for coins.
// One worm per cast. Cozy: nothing bad happens if a fish gets away (the worm is gone, that's all).
import * as THREE from 'three';
import { mat, mesh } from './util.js';
import { icon } from './ui.js';
import { sound } from './sound.js';

export const POND = { x: 9, z: 7.5, rx: 3.4, rz: 2.5 };
export const FISH = {
  minnow: { name: 'Minnow', emoji: '🐟', food: 1, coins: 2, w: 30, diff: 0.55 },
  sunfish: { name: 'Sunny sunfish', emoji: '🐠', food: 2, coins: 5, w: 25, diff: 0.8 },
  bass: { name: 'Largemouth bass', emoji: '🐟', food: 3, coins: 9, w: 17, diff: 1.05 },
  catfish: { name: 'Catfish (the irony)', emoji: '🐡', food: 4, coins: 12, w: 12, diff: 1.25 },
  boot: { name: 'Soggy old boot', emoji: '🥾', food: 0, coins: 0, w: 9, diff: 0.35, junk: true },
  koi: { name: 'GOLDEN KOI', emoji: '✨🐟', food: 5, coins: 30, w: 4, diff: 1.6, rare: true },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rollFish = () => { const tot = Object.values(FISH).reduce((n, f) => n + f.w, 0); let r = Math.random() * tot; for (const [k, f] of Object.entries(FISH)) { r -= f.w; if (r <= 0) return k; } return 'minnow'; };
/** 0 at the pond's middle, 1 at the water's edge (an oval). */
export const pondK = (x, z) => Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz);

export class Fishing {
  constructor(game) {
    this.g = game; this.active = null; this.hold = false;
    // bobber + line
    this.bobber = new THREE.Group(); this.bobber.visible = false; game.scene.add(this.bobber);
    this.bobber.add(mesh(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ef4f5f', { flatShading: false })));
    this.bobber.add(mesh(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#ffffff', { flatShading: false })));
    this.bobber.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 4), mat('#3d2b3a'), { y: 0.1 }));
    this.ripple = mesh(new THREE.RingGeometry(0.1, 0.13, 20), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }), { rx: -Math.PI / 2, cast: false });
    this.bobber.add(this.ripple);
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: '#f6f2ea', transparent: true, opacity: 0.85 }));
    this.line.frustumCulled = false; this.line.visible = false; game.scene.add(this.line);
    // the little HUD panel
    const el = document.createElement('div'); el.id = 'fish-ui'; el.className = 'gcard hidden';
    el.innerHTML = `<button type="button" class="cm-x" data-x="1" title="Stop fishing (Esc)">&times;</button>
      <div class="fi-title"></div><div class="fi-meter"><i class="fi-zone"></i><b class="fi-fish">🐟</b><span class="fi-power"></span></div>
      <div class="fi-prog"><i></i></div><div class="fi-choice"></div>
      <button type="button" class="fi-btn"></button>`;
    document.body.appendChild(el); this.el = el;
    const btn = el.querySelector('.fi-btn');
    const down = (e) => { e.preventDefault(); e.stopPropagation(); this.press(); };
    const up = (e) => { e.preventDefault(); this.hold = false; };
    btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up); btn.addEventListener('pointerleave', up); btn.addEventListener('pointercancel', up);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('[data-x]')) { this.stop(); return; }
      const c = e.target.closest('button[data-use]'); if (c) this.useCatch(c.dataset.use);
    });
    addEventListener('keyup', (e) => { if (e.code === 'KeyE' || e.code === 'Space') this.hold = false; });
  }

  /** Walking along the shore: offer to fish. */
  action(p) {
    const k = pondK(p.x, p.z);
    if (k < 1.0 || k > 1.85) return null;
    const s = this.g.state;
    if (this.g.day.bedtime) return { ok: false, label: 'The fish are asleep, dearie. So should you be!' };
    if (!(s.bait > 0)) return { ok: false, label: 'Fishing spot 🎣 Buy worm bait at the Farmers Market' };
    return { ok: true, label: `Go fishing 🎣 (${s.bait} worm${s.bait > 1 ? 's' : ''})`, run: () => this.start() };
  }
  start() {
    const g = this.g, L = g.lady, p = L.group.position;
    if (this.active || g.sitting) return;
    g.emotes.stop(true);
    const face = Math.atan2(POND.x - p.x, POND.z - p.z);
    L.group.rotation.y = face; if (window.ccl) window.ccl.state.heading = face;
    this.prevTool = L.tool; L.setTool('rod');
    this.active = { phase: 'aim', t: 0, power: 0, face };
    L.setPose((P, t) => this.pose(P, t));
    this.el.classList.remove('hidden'); this.render();
    if (!g.state.flags.fishHello) { g.state.flags.fishHello = true; g.host.say("Gone fishin'! Tap to cast, wait for the bobber to dip, then reel it in. Fish make great cat food... or coins!", 7); }
  }
  stop() {
    const g = this.g, a = this.active; if (!a) return;
    this.active = null; this.hold = false;
    this.bobber.visible = false; this.line.visible = false;
    g.lady.setPose(null); g.lady.setTool(this.prevTool ?? null);
    this.el.classList.add('hidden');
    g.save();
  }
  /** E / Space / the big button. */
  press() {
    const a = this.active; if (!a) return;
    if (a.phase === 'aim') this.cast();
    else if (a.phase === 'wait') { this.say('Too soon! Wait for the bobber to dip...'); a.early = (a.early || 0) + 1; }
    else if (a.phase === 'bite') this.hook();
    else if (a.phase === 'reel') this.hold = true;
    else if (a.phase === 'caught') this.useCatch(FISH[a.fish].junk ? 'toss' : 'food');
    else if (a.phase === 'lost') this.again();
  }
  cast() {
    const g = this.g, s = g.state, a = this.active;
    if (!(s.bait > 0)) { this.say('Out of worms! Buy bait at the Farmers Market.'); return; }
    s.bait--; s.stats.casts = (s.stats.casts || 0) + 1;
    const p = g.lady.group.position, dist = 1.2 + a.power * 2.6;
    let x = p.x + Math.sin(a.face) * dist, z = p.z + Math.cos(a.face) * dist;
    const k = pondK(x, z); if (k > 0.85) { x = POND.x + (x - POND.x) * 0.85 / k; z = POND.z + (z - POND.z) * 0.85 / k; }
    this.bobber.position.set(x, 0.05, z); this.bobber.visible = true; this.line.visible = true;
    Object.assign(a, { phase: 'wait', t: 0, wait: 2.5 + Math.random() * 4.5, nibble: 0.8 + Math.random(), castT: 0 });
    sound.play('splash'); g.lady.act();
    g.particles.emit(this.bobber.position.clone(), { color: '#bfe6f5', count: 12, speed: 1, up: 1.6, gravity: 6, size: 0.035, life: 0.6, spread: 0.2 });
    this.render();
  }
  hook() {
    const a = this.active;
    a.fish = rollFish(); const f = FISH[a.fish];
    Object.assign(a, { phase: 'reel', t: 0, zone: 0.35, zv: 0, fx: 0.5, fv: 0, ftarget: 0.5, prog: 0.3, diff: f.diff });
    sound.play('play'); this.hold = true;
    this.say(f.rare ? 'Whoa, something BIG and SHINY!' : pick(['Got one! Reel, Granny, reel!', 'Fish on!', 'Ooh, it\'s a fighter!']));
    this.render();
  }
  land() {
    const g = this.g, s = g.state, a = this.active, f = FISH[a.fish];
    a.phase = 'caught'; a.t = 0; this.hold = false;
    s.stats.fish = (s.stats.fish || 0) + (f.junk ? 0 : 1);
    sound.play(f.junk ? 'nope' : 'pickup');
    this.bobber.visible = false;
    g.floatAtLady(`${f.emoji} ${f.name}!`, f.rare ? '#c99a2a' : '#3f8fb5', f.junk ? null : 'fish');
    if (f.junk) g.host.say(pick(['A boot?! ...is that Mildred\'s? Serves her right.', 'Well, it\'s not a fish. The cats will sleep in it, probably.']), 5);
    else if (f.rare) g.host.say('A GOLDEN KOI! Mildred is going to be SO jealous!', 6);
    // the cats smell fish from a mile away
    if (!f.junk) g.cats.freeCats(14).slice(0, 4).forEach((c, i) => { const p = g.lady.group.position; const ang = a.face + Math.PI + (i - 1.5) * 0.6; g.cats.react(c, { spot: new THREE.Vector3(p.x + Math.sin(ang) * 1.1, 0, p.z + Math.cos(ang) * 1.1), near: 0.3, anim: 'sit', t: 6, speed: 2.6, look: p, onArrive: (cc) => g.floatAt(cc.pos, pick(['FISH?! 😻', 'mrrrow? 🐟', '*drool*']), '#c95c74') }); });
    if (!s.flags['fish_' + a.fish] && !f.junk) { s.flags['fish_' + a.fish] = true; g.journal.log(f.rare ? 'Granny caught a GOLDEN KOI at the pond. The cats have not stopped staring at it.' : `Granny caught her first ${f.name.toLowerCase()} at the pond. Every cat in the sanctuary showed up "just to look".`); }
    this.render();
  }
  useCatch(how) {
    const g = this.g, s = g.state, a = this.active; if (!a || a.phase !== 'caught') return;
    const f = FISH[a.fish];
    if (how === 'food' && f.food) { g.api_food.add(f.food); g.floatAtLady(`+${f.food} cat food 🐟`, '#5b4256', 'food'); sound.play('eat'); }
    else if (how === 'sell' && f.coins) { s.coins += f.coins; g.floatAtLady(`+${f.coins} coins`, '#c99a2a', 'coin'); sound.play('pickup'); }
    else g.floatAtLady('*splash* Back you go!', '#3f8fb5');
    g.save();
    this.again();
  }
  again() {
    const a = this.active; if (!a) return;
    if (!(this.g.state.bait > 0)) { this.say('That was my last worm. More at the Farmers Market!'); this.stop(); return; }
    Object.assign(a, { phase: 'aim', t: 0, fish: null, early: 0 });
    this.bobber.visible = false; this.line.visible = true; this.render();
  }
  say(text) { this.g.floatAtLady(text, '#3f8fb5'); }

  pose(P, t) {
    const a = this.active; if (!a) return;
    const castK = a.phase === 'wait' && a.castT < 0.5 ? Math.sin(a.castT / 0.5 * Math.PI) : 0;
    const reel = a.phase === 'reel' ? Math.sin(t * 14) * 0.08 : 0;
    P.arms[1].rotation.x = (a.phase === 'aim' ? -0.6 - a.power * 1.2 : -0.9) + castK * -1.4 + reel;
    P.arms[1].rotation.z = 0.15;
    P.arms[0].rotation.x = a.phase === 'reel' ? -1.0 + Math.cos(t * 14) * 0.25 : -0.7; P.arms[0].rotation.z = -0.35;
    P.body.rotation.x = a.phase === 'reel' ? -0.12 : 0;
  }
  update(dt, t) {
    const a = this.active; if (!a) return;
    a.t += dt;
    const g = this.g;
    if (g.fainted || g.day.bedtime) { this.stop(); return; }
    if (a.phase === 'aim') a.power = 0.5 - 0.5 * Math.cos(a.t * 2.6);
    if (a.phase === 'wait') {
      a.castT += dt;
      // little fake-out nibbles before the real bite
      a.nibble -= dt; if (a.nibble <= 0 && a.t < a.wait - 0.6) { a.nibble = 0.9 + Math.random() * 1.3; a.dip = 0.25; sound.play('tap'); }
      if (a.t >= a.wait) { a.phase = 'bite'; a.t = 0; sound.play('splash'); this.render(); g.floatAt(this.bobber.position, '❗', '#ef4f5f'); }
    } else if (a.phase === 'bite') {
      if (a.t > 1.4) { a.phase = 'lost'; a.t = 0; this.bobber.visible = false; this.say(pick(['It got away! Too slow, Granny.', 'Nibbled the worm clean off. Rude!'])); this.render(); }
    } else if (a.phase === 'reel') {
      // the fish darts about; the green zone rises while held and sinks when released
      a.fv += (a.ftarget - a.fx) * dt * 6 * a.diff; a.fv *= 1 - dt * 3; a.fx = Math.min(1, Math.max(0, a.fx + a.fv * dt));
      if (Math.random() < dt * 1.4 * a.diff) a.ftarget = Math.random();
      a.zv += (this.hold ? 2.4 : -2.0) * dt; a.zv *= 1 - dt * 1.5; a.zone += a.zv * dt;
      if (a.zone < 0) { a.zone = 0; a.zv = Math.max(0, a.zv); } if (a.zone > 0.68) { a.zone = 0.68; a.zv = Math.min(0, a.zv); }
      const inZone = a.fx >= a.zone && a.fx <= a.zone + 0.32;
      a.prog += (inZone ? 0.3 : -0.17 * a.diff) * dt;
      if (a.prog >= 1) this.land();
      else if (a.prog <= 0) { a.phase = 'lost'; a.t = 0; this.bobber.visible = false; this.say(pick(['Snap! It wriggled free.', 'The one that got away... 😤'])); this.render(); }
    }
    // bobber bob + line from the rod tip
    if (this.bobber.visible) {
      a.dip = Math.max(0, (a.dip || 0) - dt);
      const y = 0.05 + Math.sin(t * 3) * 0.012 - (a.phase === 'bite' ? 0.06 + Math.abs(Math.sin(t * 20)) * 0.04 : a.dip * 0.2) - (a.phase === 'reel' ? 0.05 : 0);
      this.bobber.position.y = y;
      if (a.phase === 'reel') { const p = g.lady.group.position; this.bobber.position.x += (p.x - this.bobber.position.x) * dt * a.prog * 0.3; this.bobber.position.z += (p.z - this.bobber.position.z) * dt * a.prog * 0.3; }
      this.ripple.scale.setScalar(1 + ((t * 0.8) % 1) * 2.5); this.ripple.material.opacity = 0.6 * (1 - ((t * 0.8) % 1));
    }
    if (this.line.visible) {
      const tip = new THREE.Vector3(); g.lady.rodTip.getWorldPosition(tip);
      const end = this.bobber.visible ? this.bobber.position.clone().setY(this.bobber.position.y + 0.08) : tip.clone().setY(tip.y - 0.5);
      const pos = this.line.geometry.attributes.position, sag = a.phase === 'reel' ? 0.05 : 0.35;
      for (let i = 0; i < 12; i++) { const u = i / 11; pos.setXYZ(i, tip.x + (end.x - tip.x) * u, tip.y + (end.y - tip.y) * u - Math.sin(u * Math.PI) * sag, tip.z + (end.z - tip.z) * u); }
      pos.needsUpdate = true;
    }
    this.renderBars();
  }
  render() {
    const a = this.active; if (!a) return;
    const s = this.g.state, f = a.fish && FISH[a.fish];
    const T = { aim: `Cast your line! ${icon('worm', 18)} ${s.bait} worm${s.bait === 1 ? '' : 's'} left`, wait: 'Waiting for a bite...', bite: '❗ BITE! Hook it, quick!', reel: 'Hold to lift the net, keep the fish inside!', caught: f ? `${f.emoji} You caught: <b>${f.name}</b>` : '', lost: 'It got away! 🐟💨' };
    const B = { aim: '🎣 Cast!', wait: '...shhh...', bite: '❗ Hook it!', reel: 'Hold to reel ⤴', caught: f && f.junk ? 'Toss it back' : 'Make cat food', lost: 'Cast again' };
    this.el.querySelector('.fi-title').innerHTML = T[a.phase];
    const btn = this.el.querySelector('.fi-btn'); btn.textContent = B[a.phase]; btn.className = `fi-btn ${a.phase}`;
    btn.style.display = a.phase === 'caught' ? 'none' : '';
    this.el.querySelector('.fi-meter').style.display = a.phase === 'aim' || a.phase === 'reel' ? '' : 'none';
    this.el.querySelector('.fi-prog').style.display = a.phase === 'reel' ? '' : 'none';
    this.el.querySelector('.fi-fish').style.display = a.phase === 'reel' ? '' : 'none';
    this.el.querySelector('.fi-zone').style.display = a.phase === 'reel' ? '' : 'none';
    this.el.querySelector('.fi-power').style.display = a.phase === 'aim' ? '' : 'none';
    this.el.querySelector('.fi-choice').innerHTML = a.phase === 'caught' ? (f.junk ? `<button type="button" data-use="toss">🥾 Toss it</button>`
      : `<button type="button" data-use="food">${icon('food', 20)} Cat food <b>+${f.food}</b></button><button type="button" data-use="sell">${icon('coin', 20)} Sell <b>+${f.coins}</b></button>`) : '';
    this.el.classList.toggle('bite', a.phase === 'bite');
    this.renderBars();
  }
  renderBars() {
    const a = this.active; if (!a) return;
    if (a.phase === 'aim') this.el.querySelector('.fi-power').style.width = `${Math.round(a.power * 100)}%`;
    if (a.phase === 'reel') {
      this.el.querySelector('.fi-zone').style.left = `${a.zone * 100}%`;
      this.el.querySelector('.fi-fish').style.left = `${a.fx * 100}%`;
      this.el.querySelector('.fi-prog i').style.width = `${Math.round(a.prog * 100)}%`;
    }
  }
  /** Testing helper: skip straight to a catch. */
  debugCatch(fish = 'bass') {
    if (!this.active) this.start();
    const a = this.active; if (a.phase === 'aim') this.cast();
    this.hook(); a.fish = fish; a.prog = 1; this.land();
    return a.fish;
  }
}
