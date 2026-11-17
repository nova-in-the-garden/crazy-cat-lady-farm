// Adoption days: once cats are healthy, happy and bonded (3+ hearts), kind people sometimes
// visit hoping to adopt a cat with a certain personality. You choose who goes (with a confirm
// step), the fee goes into the sanctuary's coins, the journal keeps a goodbye photo,
// and that cat's bed and bowl in the Cats' House free up for the next rescue.
import * as THREE from 'three';
import { ADOPTERS, PERSONALITIES } from './catData.js';
import { mat, mesh, canvasTexture } from './util.js';
import { icon } from './ui.js';
import { sound } from './sound.js';
import { catPortrait } from './statsCard.js';
import { hearts } from './journal.js';

const SPOT = new THREE.Vector3(2.3, 0, 3.2);   // where visitors wait (by the main path, near the porch)
const GATE = new THREE.Vector3(0.2, 0, 15.5);

function nameTag(text) {
  const tex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.font = '600 40px Fredoka, sans-serif';
    const tw = Math.min(500, ctx.measureText(text).width + 60);
    ctx.fillStyle = 'rgba(232, 246, 255, 0.95)'; ctx.strokeStyle = '#6b9fc4'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(256 - tw / 2, 12, tw, 72, 36); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3d5a78'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 50);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(1.9, 0.36, 1); sp.position.y = 2.25; sp.renderOrder = 10;
  return sp;
}

/** A simple, friendly villager (rounded body, head, hat, a little cat carrier). */
function buildVisitor(a) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  body.add(mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.95, 12), mat(a.coat, { flatShading: false }), { y: 0.62 }));
  body.add(mesh(new THREE.SphereGeometry(0.26, 12, 10), mat(a.coat, { flatShading: false }), { y: 1.1, sy: 0.7 }));
  [-1, 1].forEach((s) => { body.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6), mat('#5b4256'), { x: s * 0.12, y: 0.15 })); });
  body.add(mesh(new THREE.SphereGeometry(0.22, 14, 12), mat('#f5d3bd', { flatShading: false }), { y: 1.42 }));
  [-1, 1].forEach((s) => body.add(mesh(new THREE.SphereGeometry(0.028, 6, 5), mat('#2b2230'), { x: s * 0.075, y: 1.45, z: 0.2, cast: false })));
  body.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), mat('#f4a3b5'), { x: 0.12, y: 1.38, z: 0.17, cast: false }));
  body.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), mat('#f4a3b5'), { x: -0.12, y: 1.38, z: 0.17, cast: false }));
  body.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), mat(a.hat), { y: 1.6 }));
  body.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.2, 14), mat(a.hat), { y: 1.7 }));
  body.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#fff6ec'), { x: 0.16, y: 1.68, z: 0.08 }));
  // a pet carrier in hand
  const car = new THREE.Group(); car.position.set(0.42, 0.42, 0.05); body.add(car);
  car.add(mesh(new THREE.BoxGeometry(0.3, 0.26, 0.42), mat('#fff6ec'), {}));
  car.add(mesh(new THREE.BoxGeometry(0.31, 0.18, 0.02), mat('#9fb0c4'), { z: 0.21, cast: false }));
  car.add(mesh(new THREE.TorusGeometry(0.09, 0.02, 4, 10, Math.PI), mat('#c1906a'), { y: 0.15 }));
  return { group: g, body };
}

export class Adoption {
  constructor(game) {
    this.game = game; this.npc = null; this.walk = null;
    const s = game.state;
    s.visitor ||= null;
    this.buildUI();
    if (s.visitor && s.visitor.day === s.day) this.spawn(); else s.visitor = null;
  }
  get visitor() { return this.game.state.visitor; }
  adopter() { return ADOPTERS[this.visitor.who]; }

  /** Each morning: maybe someone is coming by today (only when a cat is ready for a home). */
  dawn() {
    const g = this.game, s = g.state;
    this.leave(true);
    s.visitor = null;
    const ready = g.cats.joined().filter((c) => g.cats.adoptable(c).ok);
    if (!ready.length) return;
    const since = s.day - (s.flags.lastVisitorDay || 0);
    if (since < 2 && Math.random() > 0.25) return;
    if (Math.random() > 0.7) return;
    this.schedule(ready);
  }
  /** Book a visitor for today. wants = a personality (usually one of the ready cats'). */
  schedule(ready = this.game.cats.joined().filter((c) => this.game.cats.adoptable(c).ok), hour = 10) {
    const s = this.game.state;
    const pers = ready.length && Math.random() < 0.75 ? ready[Math.floor(Math.random() * ready.length)].def.personality : Object.keys(PERSONALITIES)[Math.floor(Math.random() * Object.keys(PERSONALITIES).length)];
    s.visitor = { who: Math.floor(Math.random() * ADOPTERS.length), wants: pers, day: s.day, hour, arrived: false };
    s.flags.lastVisitorDay = s.day;
    return s.visitor;
  }
  spawn() {
    const v = this.visitor, a = this.adopter();
    if (this.npc) this.game.scene.remove(this.npc.group);
    this.npc = buildVisitor(a);
    this.npc.group.add(nameTag(`${a.name} (visitor)`));
    this.npc.group.position.copy(v.arrived ? SPOT : GATE);
    this.npc.group.rotation.y = Math.PI;
    this.npc.position = this.npc.group.position;
    this.game.scene.add(this.npc.group);
    if (!v.arrived) this.walk = { to: SPOT.clone(), arrive: true };
  }
  /** The visitor walks back out of the gate (with the adopted cat, if any). */
  leave(instant = false) {
    if (!this.npc) return;
    if (instant) { this.game.scene.remove(this.npc.group); this.npc = null; this.walk = null; return; }
    this.walk = { to: GATE.clone(), leave: true };
  }

  update(dt, t) {
    const g = this.game, s = g.state, v = this.visitor;
    if (v && !this.npc && g.playing && s.day === v.day && s.hour >= v.hour && s.hour < 18) {
      this.spawn();
      const a = this.adopter();
      g.host.say(`A visitor! ${a.name}, ${a.who}, is hoping to adopt a ${PERSONALITIES[v.wants].label.toLowerCase()} cat. Go say hello by the path, dearie.`, 9);
      g.journal.log(`${a.name} came by hoping to adopt a ${PERSONALITIES[v.wants].label.toLowerCase()} cat.`);
    }
    // visitors head home in the evening if nobody was a match
    if (v && this.npc && !this.walk && (s.hour >= 18 || s.day !== v.day)) {
      g.host.say(`${this.adopter().name} is heading home. Maybe next time! There's no rush to say goodbye to anyone.`, 6);
      s.visitor = null; this.leave();
    }
    if (!this.npc) return;
    const p = this.npc.group.position, w = this.walk;
    if (w) {
      const dx = w.to.x - p.x, dz = w.to.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.1) {
        if (w.arrive) { this.visitor.arrived = true; this.npc.group.rotation.y = Math.atan2(-p.x, -p.z - 1); }
        if (w.leave) { g.scene.remove(this.npc.group); this.npc = null; g.cats.departing.forEach((c) => (c.leaving.done = true)); }
        this.walk = null;
      } else {
        const st = Math.min(d, 1.5 * dt); p.x += (dx / d) * st; p.z += (dz / d) * st;
        this.npc.group.rotation.y = Math.atan2(dx, dz);
        this.npc.body.position.y = Math.abs(Math.sin(t * 9)) * 0.05;
      }
    } else {
      this.npc.body.position.y = 0;
      this.npc.body.rotation.z = Math.sin(t * 1.4) * 0.03;
      // gently keep her from walking through the visitor
      const lp = g.lady.group.position, dx = lp.x - p.x, dz = lp.z - p.z, dd = Math.hypot(dx, dz);
      if (dd < 0.6 && dd > 0.001) { lp.x = p.x + (dx / dd) * 0.6; lp.z = p.z + (dz / dd) * 0.6; }
    }
  }

  /** E near the visitor. */
  action(p) {
    if (!this.npc || this.walk || !this.visitor) return null;
    const q = this.npc.group.position;
    if (Math.hypot(p.x - q.x, p.z - q.z) > 1.6) return null;
    return { ok: true, label: `Talk to ${this.adopter().name} about adopting a cat`, run: () => this.open() };
  }

  /* ---------------- the adoption card ---------------- */
  buildUI() {
    const el = document.createElement('div');
    el.id = 'adopt'; el.className = 'overlay-modal hidden';
    el.innerHTML = '<div class="gcard ad-card"></div>';
    document.body.appendChild(el);
    this.el = el; this.card = el.querySelector('.ad-card');
    el.addEventListener('click', (e) => {
      if (e.target === el) { this.close(); return; }
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const a = b.dataset;
      if (a.close) this.close();
      else if (a.pick) { this.picked = a.pick; sound.play('click'); this.render(); }
      else if (a.act === 'back') { this.picked = null; this.render(); }
      else if (a.act === 'confirm') this.confirm();
    });
  }
  get isOpen() { return !this.el.classList.contains('hidden'); }
  open() { this.picked = null; this.el.classList.remove('hidden'); this.game.adoptOpen = true; this.game.catMenu.close(); sound.play('page'); this.render(); }
  close() { this.el.classList.add('hidden'); this.game.adoptOpen = false; }
  render() {
    const g = this.game, v = this.visitor; if (!v) { this.close(); return; }
    const a = this.adopter(), cats = g.cats, want = PERSONALITIES[v.wants];
    const head = `<div class="jr-head">${icon('door', 28)}<h2>Adoption visit</h2><span class="coins-pill">${icon('coin', 20)}<b>${g.state.coins}</b></span><button type="button" class="jr-close" data-close="1" title="Close (Esc)">&times;</button></div>`;
    if (this.picked) {
      const c = cats.byId(this.picked); if (!c) { this.picked = null; this.render(); return; }
      const fee = cats.adoptionFee(c, v.wants);
      this.card.innerHTML = `${head}<div class="ad-confirm">${catPortrait(c.def.look, 110)}
        <h3>Say goodbye to ${c.data.name}?</h3>
        <p>${c.data.name} will go home with <b>${a.name}</b>, ${a.who}. ${c.def.personality === v.wants ? 'A perfect match!' : `${pron2(c)} isn't quite the ${want.label.toLowerCase()} cat they hoped for, but they'd still love ${c.def.sex === 'girl' ? 'her' : 'him'}.`}</p>
        <p class="ad-fee">${icon('coin', 22)} Adoption fee: <b>${fee} coins</b></p>
        <p class="ad-note">This can't be undone. ${c.data.name}'s bed and bowl will be free for the next cat who needs a home.</p>
        <div class="ex-foot"><button type="button" class="ghost" data-act="back">Not yet</button><button type="button" data-act="confirm">Yes, adopt out ${c.data.name}</button></div></div>`;
      return;
    }
    const list = cats.joined().map((c) => ({ c, st: cats.adoptable(c) }));
    this.card.innerHTML = `${head}<p class="ad-ask"><b>${a.name}</b>, ${a.who}, would love a <b>${want.label.toLowerCase()}</b> cat (${want.blurb.toLowerCase()}). Cats need 3+ bond hearts, good health and a happy mood to be ready. Healthier, happier, closer cats bring a higher fee.</p>
      <div class="ad-list">${list.map(({ c, st }) => { const match = c.def.personality === v.wants;
        return `<div class="ad-cat ${st.ok ? '' : 'no'} ${match ? 'match' : ''}">${catPortrait(c.def.look, 52)}<div><b>${c.data.name}</b>${hearts(cats.level(c), 13)}<span>${PERSONALITIES[c.def.personality].label}${match ? ' · <em>perfect match!</em>' : ''}</span><small>${st.why}</small></div>
        <button type="button" data-pick="${c.data.id}" ${st.ok ? '' : 'disabled'}>${st.ok ? `${icon('coin', 15)}${cats.adoptionFee(c, v.wants)}` : 'Not ready'}</button></div>`; }).join('') || '<p class="jr-empty">No cats yet.</p>'}</div>
      <p class="ad-note">No pressure: you can also just wave goodbye. ${a.name.split(' ')[0]} will head home at 6 PM.</p>`;
  }
  confirm() {
    const g = this.game, c = g.cats.byId(this.picked), v = this.visitor; if (!c || !v) return;
    const a = { ...this.adopter(), npc: this.npc ? this.npc.group : null };
    const fee = g.cats.adoptionFee(c, v.wants);
    const name = c.data.name;
    this.close();
    g.cats.adoptOut(c, a, fee);
    g.floatAt(c.pos, `+${fee} coins · Goodbye, ${name}!`, '#c99a2a', 'coin');
    g.host.say(`Goodbye, ${name}, sweetheart. Be happy with ${a.name}! *sniff* That's what we do this for, dearie: ${fee} coins for the sanctuary, and a free bed for the next cat who needs us.`, 9);
    this.game.state.visitor = null;
    this.leave();
  }
}
function pron2(c) { return c.def.sex === 'girl' ? 'She' : 'He'; }
