// Granny's emotes (the emote wheel: T or the 😺 button) and little "activities" like doing the dishes.
// An activity takes over her pose for a while, can show props in her hands, and ends when it's done
// or as soon as she walks off. Nearby cats react to emotes in their own ways.
import * as THREE from 'three';
import { mat, mesh } from './util.js';
import { sound } from './sound.js';

export const EMOTES = [
  { id: 'smoke', icon: '🚬', label: 'Smoke a ciggy' },
  { id: 'coffee', icon: '☕', label: 'Sip coffee' },
  { id: 'knit', icon: '🧶', label: 'Knitting' },
  { id: 'babies', icon: '😱', label: 'MY BABIES!' },
  { id: 'dance', icon: '💃', label: 'Dance party' },
  { id: 'meow', icon: '🐱', label: 'Meow!' },
  { id: 'fist', icon: '✊', label: 'Shake fist at sky' },
  { id: 'nap', icon: '💤', label: 'Nap right here' },
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, k) => a + (b - a) * k;

/** Scrubbing / washing pose: both hands forward over a basin, rubbing. */
export function scrubPose(p, t, k) {
  p.arms[0].rotation.x = lerp(p.arms[0].rotation.x, -1.05 + Math.sin(t * 9) * 0.12, k);
  p.arms[1].rotation.x = lerp(p.arms[1].rotation.x, -1.05 - Math.sin(t * 9) * 0.12, k);
  p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, 0.32 + Math.cos(t * 9) * 0.06, k);
  p.arms[1].rotation.z = lerp(p.arms[1].rotation.z, -0.32 - Math.cos(t * 9) * 0.06, k);
  p.body.rotation.x = lerp(p.body.rotation.x, 0.12, k);
  p.head.rotation.x = 0.25 * k;
}

export class Emotes {
  constructor(game) {
    this.g = game;
    this.active = null;
    this.buildProps();
    this.buildWheel();
  }

  /* ---------------- props ---------------- */
  buildProps() {
    const L = this.g.lady.parts, P = {};
    const hide = (o) => { o.visible = false; o.traverse((m) => { if (m.isMesh) m.userData.isLady = true; }); return o; };
    // a cartoony cigarette with a glowing ember
    P.cig = hide(new THREE.Group()); L.hand.add(P.cig);
    P.cig.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 6), mat('#ffffff'), { y: -0.04, z: 0.07, rx: Math.PI / 2, cast: false }));
    P.cig.add(mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.03, 6), mat('#e0a35c'), { y: -0.04, z: 0.025, rx: Math.PI / 2, cast: false }));
    P.ember = mesh(new THREE.SphereGeometry(0.011, 6, 5), new THREE.MeshStandardMaterial({ color: '#ff7a3a', emissive: '#ff5a1a', emissiveIntensity: 1.2 }), { y: -0.04, z: 0.122, cast: false });
    P.cig.add(P.ember);
    // her favorite mug ("#1 CAT MOM")
    P.mug = hide(new THREE.Group()); L.hand.add(P.mug);
    P.mug.add(mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.12, 12), mat('#f3a5b8', { flatShading: false }), { y: -0.12, z: 0.06 }));
    P.mug.add(mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.01, 12), mat('#6b4226'), { y: -0.065, z: 0.06, cast: false }));
    P.mug.add(mesh(new THREE.TorusGeometry(0.035, 0.012, 4, 10), mat('#f3a5b8'), { x: 0.065, y: -0.12, z: 0.06, ry: Math.PI / 2 }));
    // knitting: a needle in each hand and a lumpy pink scarf in progress
    const needle = (parent, s) => { const n = hide(new THREE.Group()); parent.add(n); n.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 5), mat('#d9b07a'), { y: -0.02, z: 0.1, rx: 1.1, rz: s * 0.5, cast: false })); n.add(mesh(new THREE.SphereGeometry(0.016, 6, 5), mat(s > 0 ? '#f58fa8' : '#9fd0ef'), { y: -0.1, z: -0.03, cast: false })); return n; };
    P.needleR = needle(L.hand, 1); P.needleL = needle(L.leftHand, -1);
    P.scarf = hide(new THREE.Group()); L.hand.add(P.scarf);
    for (let i = 0; i < 5; i++) P.scarf.add(mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), mat(i % 2 ? '#f6c6d6' : '#e56f95'), { x: -0.1, y: -0.08 - i * 0.034, z: 0.12, cast: false }));
    // the yarn ball (lives in the world, at her feet) with a strand up to her hands
    P.yarn = new THREE.Group(); P.yarn.visible = false; this.g.scene.add(P.yarn);
    P.yarn.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), mat('#e56f95', { flatShading: false }), { y: 0.1 }));
    for (let i = 0; i < 4; i++) P.yarn.add(mesh(new THREE.TorusGeometry(0.1, 0.008, 4, 20), mat('#f6c6d6'), { y: 0.1, rx: i * 0.8, ry: i * 1.3, cast: false }));
    P.strand = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#e56f95' }));
    P.strand.frustumCulled = false; P.strand.visible = false; this.g.scene.add(P.strand);
    // smoke rings
    P.rings = [];
    for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 16), new THREE.MeshStandardMaterial({ color: '#eeeaf2', transparent: true, opacity: 0, depthWrite: false })); r.visible = false; this.g.scene.add(r); P.rings.push({ m: r, life: 0, v: new THREE.Vector3() }); }
    this.P = P;
  }
  showProps(names = []) { ['cig', 'mug', 'needleR', 'needleL', 'scarf'].forEach((n) => (this.P[n].visible = names.includes(n))); }
  puffRing() {
    const r = this.P.rings.find((x) => x.life <= 0); if (!r) return;
    const h = new THREE.Vector3(); this.g.lady.parts.head.getWorldPosition(h);
    const hd = this.g.lady.group.rotation.y;
    r.m.position.set(h.x + Math.sin(hd) * 0.32, h.y - 0.08, h.z + Math.cos(hd) * 0.32);
    r.v.set(Math.sin(hd) * 0.25, 0.45, Math.cos(hd) * 0.25);
    r.m.rotation.set(Math.PI / 2 + 0.3, 0, 0); r.m.scale.setScalar(0.6);
    r.life = 2.6; r.m.visible = true;
  }

  /* ---------------- the wheel ---------------- */
  buildWheel() {
    const btn = document.createElement('button'); btn.id = 'emote-btn'; btn.type = 'button'; btn.className = 'hidden';
    btn.innerHTML = '<span class="ico">😺</span><span>Emotes</span><kbd>T</kbd>'; btn.title = 'Emotes: smoke, coffee, knitting, MY BABIES!, dance, meow...';
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleWheel(); });
    this.btn = btn;
    const side = document.getElementById('side-btns'); (side || document.body).appendChild(btn);
    const w = document.createElement('div'); w.id = 'emote-wheel'; w.className = 'hidden';
    w.innerHTML = `<div class="wheel-ring">${EMOTES.map((e, i) => {
      const a = (i / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
      return `<button type="button" data-emote="${e.id}" style="--x:${Math.cos(a).toFixed(3)};--y:${Math.sin(a).toFixed(3)}"><span class="e">${e.icon}</span><span class="l">${e.label}</span><kbd>${i + 1}</kbd></button>`;
    }).join('')}<div class="wheel-hub">Granny's<br><b>Emotes</b><small>pick one · walk to stop</small></div></div>`;
    w.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-emote]'); if (b) this.play(b.dataset.emote); else this.toggleWheel(false); });
    document.body.appendChild(w);
    this.wheel = w;
  }
  show() { this.btn.classList.remove('hidden'); }
  get wheelOpen() { return !this.wheel.classList.contains('hidden'); }
  toggleWheel(v = !this.wheelOpen) {
    if (v && (this.g.blocked || this.g.fainted)) return;
    this.wheel.classList.toggle('hidden', !v); sound.play('click');
  }
  key(n) { const e = EMOTES[n - 1]; if (e) this.play(e.id); }

  /* ---------------- running activities ---------------- */
  /** a = { id, dur (0 = until she moves), pose(parts, t, k, a), tick(dt, a), end(a, cancelled), props: [], stand } */
  start(a) {
    const g = this.g;
    if (this.active) this.stop(true);
    if (a.stand && g.sitting) g.standUp();
    a.t = 0; a.k = 0;
    this.active = a;
    this.prevTool = g.lady.tool; g.lady.setTool(null);
    this.showProps(a.props || []);
    g.lady.setPose((p, t, dt) => { a.k = Math.min(1, a.t * 4); if (a.pose) a.pose(p, a.t, a.k, a, dt); });
    a.start?.(a);
    return a;
  }
  stop(cancelled = false) {
    const a = this.active; if (!a) return;
    this.active = null;
    this.g.lady.setPose(null);
    this.showProps([]);
    this.P.yarn.visible = false; this.P.strand.visible = false;
    if (this.prevTool !== undefined) this.g.lady.setTool(this.prevTool);
    a.end?.(a, cancelled);
  }
  get busy() { return !!this.active; }
  update(dt) {
    const a = this.active;
    for (const r of this.P.rings) {
      if (r.life <= 0) continue;
      r.life -= dt; r.m.position.addScaledVector(r.v, dt); r.v.multiplyScalar(1 - dt * 0.6);
      r.m.scale.setScalar(0.6 + (2.6 - r.life) * 0.7); r.m.material.opacity = Math.min(0.8, r.life * 0.5);
      if (r.life <= 0) r.m.visible = false;
    }
    if (!a) return;
    a.t += dt;
    a.tick?.(dt, a);
    if (a.dur && a.t >= a.dur) this.stop(false);
  }

  /* ---------------- the emotes ---------------- */
  play(id) {
    const g = this.g;
    this.toggleWheel(false);
    if (!g.playing || g.blocked || g.fainted) return;
    if (g.sitting && (g.sitting.seat.kind === 'tub' || g.sitting.seat.kind === 'toilet')) { g.host.say("Not in here, dearie! A lady needs her privacy.", 3); return; }
    if (this.active && this.active.chore) return;
    const make = this['e_' + id]; if (!make) return;
    this.start(make.call(this));
    g.state.stats.emotes = (g.state.stats.emotes || 0) + 1;
    if (!g.state.flags['emote_' + id]) { g.state.flags['emote_' + id] = true; this.firstLog(id); }
  }
  firstLog(id) {
    const lines = {
      smoke: 'Granny snuck a cigarette behind the cottage and blew a perfect smoke ring. Then coughed for a solid minute.',
      knit: 'Granny started knitting something lumpy and pink. The cats immediately declared war on the yarn.',
      babies: 'Granny yelled "MY BABIES!" across the whole sanctuary and every cat came running.',
      dance: 'Granny threw a dance party. The cats danced too (badly).',
      meow: 'Granny meowed at the cats. The cats meowed back. A real conversation, probably.',
    };
    if (lines[id]) this.g.journal.log(lines[id]);
  }
  cats(r) { return this.g.cats.freeCats(r); }
  ladyPos() { return this.g.lady.group.position; }
  ring(i, n, r) { const p = this.ladyPos(), h = this.g.lady.group.rotation.y + (i / Math.max(1, n)) * Math.PI * 2; return new THREE.Vector3(p.x + Math.sin(h) * r, 0, p.z + Math.cos(h) * r); }

  e_smoke() {
    const g = this;
    return {
      id: 'smoke', dur: 10, props: ['cig'],
      start: () => {
        this.g.host.say(pick(["Just one, dearie. Don't tell the vet.", "Don't tell the cats... they worry.", 'A little puff while nobody\'s looking.']), 4);
        this.cats(6).forEach((c, i) => { const p = this.ladyPos(), a = Math.atan2(c.pos.x - p.x, c.pos.z - p.z); this.g.cats.react(c, { spot: new THREE.Vector3(p.x + Math.sin(a) * 3, 0, p.z + Math.cos(a) * 3), anim: 'sit', t: 9, speed: 1.6 }); setTimeout(() => this.g.floatAt(c.pos, pick(['😾 *sniff*', 'ew, Granny', '😾']), '#8d7388'), 600 + i * 400); });
      },
      pose: (p, t, k) => {
        const u = (t % 3) / 3, up = t < 7.6 ? Math.sin(Math.min(1, u / 0.35) * Math.PI) : 0;
        p.arms[1].rotation.x = lerp(p.arms[1].rotation.x, -2.25 * up - 0.4 * (1 - up), k); p.arms[1].rotation.z = 0.4 * k;
        p.arms[0].rotation.x = lerp(p.arms[0].rotation.x, -0.35, k); p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, -0.75, k); // hand on hip
        p.head.rotation.x = -0.12 * up * k;
        if (t > 7.8) { const c = Math.sin((t - 7.8) * 22) * Math.max(0, 1 - (t - 7.8) / 2.2); p.body.rotation.x = 0.25 * Math.abs(c); p.head.rotation.x = 0.3 * Math.abs(c); }
        g.P.ember.material.emissiveIntensity = 1 + up * 2.5;
      },
      tick: (dt, a) => {
        const u = (a.t % 3) / 3, cyc = Math.floor(a.t / 3);
        if (u > 0.42 && a.last !== cyc && a.t < 7.6) { a.last = cyc; this.puffRing(); setTimeout(() => this.puffRing(), 250); }
        if (a.t > 7.8 && !a.coughed) { a.coughed = true; sound.play('cough'); this.g.host.say(pick(['*COUGH* *HACK* ...smooth.', '*cough cough* These things\'ll kill ya, dearie.', '*wheeze* ...nope, still got it.']), 3); }
      },
    };
  }
  e_coffee() {
    return {
      id: 'coffee', dur: 7, props: ['mug'],
      start: () => {
        this.g.host.say(pick(['Ahh, a nice cup of decaf. Just kidding, it\'s rocket fuel.', 'Coffee and cats. What more does a Granny need?']), 4);
        const c = this.cats(8)[0]; if (c) { this.g.cats.react(c, { spot: this.ring(0, 1, 0.75), anim: 'sit', t: 7, speed: 1.6, onArrive: (cc) => this.g.floatAt(cc.pos, '☕?', '#8d7388') }); }
      },
      pose: (p, t, k) => {
        const u = (t % 2.6) / 2.6, up = u < 0.45 ? Math.sin((u / 0.45) * Math.PI) : 0;
        p.arms[1].rotation.x = lerp(p.arms[1].rotation.x, -1.0 - 1.3 * up, k); p.arms[1].rotation.z = 0.35 * k;
        p.arms[0].rotation.x = lerp(p.arms[0].rotation.x, -0.9, k); p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, 0.35, k);
        p.head.rotation.x = -0.22 * up * k;
      },
      tick: (dt, a) => { a.st = (a.st || 0) - dt; if (a.st <= 0) { a.st = 0.35; const v = new THREE.Vector3(); this.g.lady.parts.hand.getWorldPosition(v); this.g.particles.emit(v.setY(v.y + 0.02), { color: '#fff6e8', count: 1, speed: 0.05, up: 0.5, gravity: -0.3, size: 0.03, emissive: true, life: 1 }); } },
      end: (a, c) => { if (!c) this.g.host.say('Mmm. Perfect.', 2); },
    };
  }
  e_knit() {
    const P = this.P;
    return {
      id: 'knit', dur: 0, props: ['needleR', 'needleL', 'scarf'],
      start: (a) => {
        const p = this.ladyPos(), h = this.g.lady.group.rotation.y, sit = !!this.g.sitting;
        a.home = new THREE.Vector3(p.x + Math.sin(h + 0.5) * 0.7, this.g.world.groundHeight(p.x, p.z) - (sit ? 0 : 0) , p.z + Math.cos(h + 0.5) * 0.7);
        if (sit) a.home.y = this.g.world.groundHeight(a.home.x, a.home.z);
        a.ball = a.home.clone(); a.vel = new THREE.Vector3();
        P.yarn.position.copy(a.ball); P.yarn.visible = true; P.strand.visible = true;
        this.g.host.say(pick(['Knit one, purl one...', 'A sweater for every cat. That\'s only... oh dear.', 'Shh, Granny\'s counting stitches.']), 4);
        const c = this.cats(15)[0];
        if (c) {
          a.cat = c;
          this.g.cats.react(c, { spot: a.home.clone().setY(0), near: 0.35, anim: 'pounce', hop: 1.1, t: 9999, speed: 2.2, look: a.ball,
            onArrive: (cc) => this.g.floatAt(cc.pos, '*bats at yarn*', '#c95c74'),
            onHop: () => { const ang = Math.random() * Math.PI * 2; a.vel.set(Math.cos(ang) * 0.9, 0, Math.sin(ang) * 0.9); sound.play('play'); } });
          setTimeout(() => { if (this.active === a) this.g.host.say(`Hey! ${c.data.name}, that's my yarn!`, 3); }, 5500);
        }
      },
      pose: (p, t, k) => {
        p.arms[1].rotation.x = lerp(p.arms[1].rotation.x, -1.0 + Math.sin(t * 7) * 0.1, k); p.arms[0].rotation.x = lerp(p.arms[0].rotation.x, -1.0 - Math.sin(t * 7) * 0.1, k);
        p.arms[1].rotation.z = lerp(p.arms[1].rotation.z, -0.42, k); p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, 0.42, k);
        p.head.rotation.x = 0.3 * k;
      },
      tick: (dt, a) => {
        // the ball rolls when the cat bats it, then drifts back toward her feet
        a.ball.addScaledVector(a.vel, dt); a.vel.multiplyScalar(1 - dt * 2.2);
        a.ball.x += (a.home.x - a.ball.x) * dt * 0.4; a.ball.z += (a.home.z - a.ball.z) * dt * 0.4;
        P.yarn.position.copy(a.ball); P.yarn.rotation.x += a.vel.z * dt * 8; P.yarn.rotation.z -= a.vel.x * dt * 8;
        const hv = new THREE.Vector3(); this.g.lady.parts.hand.getWorldPosition(hv);
        const pos = P.strand.geometry.attributes.position; pos.setXYZ(0, a.ball.x, a.ball.y + 0.15, a.ball.z); pos.setXYZ(1, hv.x, hv.y, hv.z); pos.needsUpdate = true;
        if (a.t > 12 && !a.done1) { a.done1 = true; this.g.floatAtLady('Another row done! 🧶', '#c95c74'); }
      },
      end: (a) => { if (a.cat && a.cat.task && a.cat.task.type === 'emote') a.cat.task = { type: 'idle', anim: 'groom', t: 3 }; },
    };
  }
  e_babies() {
    return {
      id: 'babies', dur: 5, stand: true,
      start: () => {
        sound.play('scream');
        this.g.host.say('MY BAAAABIES!!! 😱', 4);
        const cats = this.cats(80);
        cats.forEach((c, i) => this.g.cats.react(c, { spot: this.ring(i, cats.length, 1.0 + (i % 2) * 0.35), anim: 'sit', t: 14, speed: 3.6, near: 0.3,
          onArrive: (cc) => { this.g.cats.flashIcon(cc, 'heart', 2); if (Math.random() < 0.5) sound.play('meow'); } }));
        if (!cats.length) setTimeout(() => this.g.host.say('...where IS everybody?', 3), 2500);
      },
      pose: (p, t, k) => {
        const shake = Math.sin(t * 30) * 0.12;
        p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, -2.75 + shake, k); p.arms[1].rotation.z = lerp(p.arms[1].rotation.z, 2.75 - shake, k);
        p.arms[0].rotation.x = p.arms[1].rotation.x = 0;
        p.head.rotation.x = -0.35 * k; p.body.position.y = Math.abs(Math.sin(t * 10)) * 0.06 * k;
      },
    };
  }
  e_dance() {
    return {
      id: 'dance', dur: 10, stand: true,
      start: () => {
        sound.play('dance');
        this.g.host.say(pick(['Shake it, kitties! 💃', 'Granny\'s still got the moves!', 'Everybody do the Cat Lady Shuffle!']), 4);
        const cats = this.cats(14);
        cats.forEach((c, i) => this.g.cats.react(c, { spot: this.ring(i, cats.length, 1.5), anim: 'stand', hop: 0.8, spin: 4 * (i % 2 ? 1 : -1), t: 11, speed: 2.4, near: 0.3 }));
      },
      pose: (p, t, k) => {
        p.body.rotation.y = Math.sin(t * 4) * 0.5 * k;
        p.body.position.y = Math.abs(Math.sin(t * 8)) * 0.09 * k;
        p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, -(1.6 + Math.sin(t * 8) * 0.9), k);
        p.arms[1].rotation.z = lerp(p.arms[1].rotation.z, 1.6 - Math.sin(t * 8) * 0.9, k);
        p.legs[0].rotation.x = Math.max(0, Math.sin(t * 8)) * -0.6 * k; p.legs[1].rotation.x = Math.max(0, -Math.sin(t * 8)) * -0.6 * k;
        p.head.rotation.z = Math.sin(t * 8) * 0.2 * k;
      },
      tick: (dt, a) => {
        a.ft = (a.ft || 0) - dt;
        if (a.ft <= 0) { a.ft = 0.3; const v = this.ladyPos(); this.g.particles.emit(new THREE.Vector3(v.x, v.y + 2.2, v.z), { color: pick(['#f58fa8', '#ffd35c', '#9fd0ef', '#c8aaf2']), count: 3, speed: 1.4, up: 1, gravity: 1, size: 0.05, emissive: true, life: 1.1, spread: 0.6 }); }
        if (Math.floor(a.t / 1.6) !== a.beat) { a.beat = Math.floor(a.t / 1.6); if (a.beat % 2 === 0) sound.play('dance'); }
      },
    };
  }
  e_meow() {
    return {
      id: 'meow', dur: 4.2,
      start: () => {
        sound.play('meow');
        this.g.floatAtLady('MEOW! 🐱', '#c95c74');
        this.g.host.say(pick(['Meow meow? MEOW.', 'Mrrrow! (That means "dinner" in cat.)', 'Meeeow! Did I say that right?']), 3.5);
        this.cats(20).forEach((c, i) => {
          this.g.cats.react(c, { anim: 'sit', t: 4.5, near: 99 });
          setTimeout(() => { this.g.floatAt(c.pos, pick(['Meow?', 'Mrrp!', 'Mew!', 'MROWR', '...meow', 'Mrrrow?']), '#5b4256'); sound.play('meow'); }, 900 + i * 380);
        });
      },
      pose: (p, t, k) => {
        p.arms[0].rotation.x = lerp(p.arms[0].rotation.x, -2.25, k); p.arms[1].rotation.x = lerp(p.arms[1].rotation.x, -2.25, k);
        p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, 0.55, k); p.arms[1].rotation.z = lerp(p.arms[1].rotation.z, -0.55, k);
        p.head.rotation.z = Math.sin(t * 3) * 0.25 * k;
        p.body.position.y = Math.abs(Math.sin(t * 5)) * 0.03;
      },
    };
  }
  e_fist() {
    return {
      id: 'fist', dur: 5, stand: true,
      start: () => {
        this.g.host.say(pick(['Dang crows! I see you!', 'You call THAT rain?!', 'Back in MY day the sky was bluer!', 'Don\'t you look at me like that, Sky.']), 4);
        this.cats(8).forEach((c, i) => { this.g.cats.react(c, { anim: 'sit', t: 5, near: 99 }); setTimeout(() => this.g.floatAt(c.pos, '❓', '#8d7388'), 700 + i * 300); });
      },
      pose: (p, t, k) => {
        p.arms[1].rotation.z = lerp(p.arms[1].rotation.z, 2.3, k); p.arms[1].rotation.x = Math.sin(t * 24) * 0.25 * k;
        p.arms[0].rotation.x = lerp(p.arms[0].rotation.x, -0.35, k); p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, -0.75, k);
        p.head.rotation.x = -0.45 * k; p.body.rotation.z = Math.sin(t * 24) * 0.03 * k;
      },
    };
  }
  e_nap() {
    const g = this.g;
    return {
      id: 'nap', dur: 0,
      start: (a) => {
        a.floor = !g.sitting;
        if (a.floor) g.lady.setSitting(true);
        g.host.say(pick(['Just resting my eyes...', 'Five minutes, dearie. Zzz...']), 3);
        const c = this.cats(10)[0];
        if (c) setTimeout(() => { if (this.active === a) g.cats.react(c, { spot: this.ring(0, 1, 0.55).setX(this.ladyPos().x + 0.45), anim: 'sleep', t: 9999, speed: 1.4, near: 0.2, onArrive: (cc) => g.floatAt(cc.pos, `${cc.data.name} curls up beside you`, '#c95c74') }); a.cat = c; }, 2500);
      },
      pose: (p, t, k, a) => {
        if (a.floor) { p.body.position.y = -0.44 * k; }
        p.head.rotation.x = lerp(0, 0.5 + Math.sin(t * 1.4) * 0.05, k); p.head.rotation.z = 0.2 * k;
        p.eyes.forEach((e) => (e.scale.y = 0.12));
      },
      tick: (dt, a) => {
        g.state.lady.energy = Math.min(100, g.state.lady.energy + dt * 0.5);
        a.zt = (a.zt || 1) - dt;
        if (a.zt <= 0) { a.zt = 2.2; g.floatAtLady('Z z z', '#7a8fd0'); if (Math.random() < 0.4) sound.play('snore'); }
      },
      end: (a) => { if (a.floor && !g.sitting) g.lady.setSitting(false); if (a.cat && a.cat.task && a.cat.task.type === 'emote') a.cat.task = { type: 'idle', anim: 'stretch', t: 2.5 }; },
    };
  }
}
