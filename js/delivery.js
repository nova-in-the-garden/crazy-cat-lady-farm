// Farmers Market deliveries: what Granny buys at the roadside stand is brought to the house.
// A little delivery van pulls up on the road, the courier walks up the drive with a box,
// sets the parcel down by the porch steps, waves and heads back. Granny opens it ("Open delivery").
//
// Cozy rules:
//  - Shopping trips batch: purchases made before the courier sets off (and while he's still walking up)
//    all go in the same box. Anything bought after he's dropped it rides along on the next trip.
//  - Deliveries run 6 AM - 9 PM. Orders placed later wait for the first trip in the morning.
//  - Saved: the pending order and the parcels on the porch. A courier caught mid-walk by a reload just
//    starts his trip again.
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';
import { CROPS, SUPPLY_LABELS } from './state.js';
import { ROAD_Z } from './world.js';
import { sound } from './sound.js';

export const PARCEL_SPOT = new THREE.Vector3(-1.35, 0, -3.45);       // beside the porch steps
const DROP_SPOT = new THREE.Vector3(-0.85, 0, -2.75);                // where the courier stands to set it down
const VAN_STOP = new THREE.Vector3(3.6, 0, ROAD_Z + 0.75);
// up the drive: van -> drive -> porch (follows the dirt path)
const ROUTE = [[2.3, ROAD_Z - 0.4], [0.45, 20.2], [0.4, 17], [0.4, 13], [-0.5, 8], [0.25, 2], [-0.5, -1.2], [DROP_SPOT.x, DROP_SPOT.z]].map(([x, z]) => new THREE.Vector3(x, 0, z));
const WALK = 2.6, VAN_SPEED = 11, DISPATCH = 2.5, OPEN_HOURS = [6, 21];

function boxMesh(scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.46 * scale, 0.34 * scale, 0.38 * scale), mat('#c99a6b'), { y: 0.17 * scale }));
  g.add(mesh(new THREE.BoxGeometry(0.47 * scale, 0.02, 0.08 * scale), mat('#e8d3a6'), { y: 0.34 * scale + 0.005, cast: false }));     // tape
  g.add(mesh(new THREE.BoxGeometry(0.16 * scale, 0.1 * scale, 0.01), mat('#fff6ec'), { y: 0.2 * scale, z: 0.19 * scale + 0.006, cast: false })); // label
  g.add(mesh(new THREE.CircleGeometry(0.03 * scale, 8), mat('#e8798f'), { y: 0.2 * scale, z: 0.19 * scale + 0.012, cast: false }));
  return g;
}

/** A cheerful courier: cap, polo with a paw logo, shorts, a box in both arms. */
function buildCourier() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shirt = mat('#5fae9d'), shorts = mat('#7a5a44'), skin = mat('#e9b896', { flatShading: false }), cap = mat('#ef7f95');
  const legs = [-1, 1].map((s) => { const l = new THREE.Group(); l.position.set(s * 0.12, 0.62, 0); body.add(l);
    l.add(mesh(new THREE.BoxGeometry(0.15, 0.3, 0.16), shorts, { y: -0.12 }));
    l.add(mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), skin, { y: -0.4 }));
    l.add(mesh(new THREE.BoxGeometry(0.15, 0.08, 0.24), mat('#fff6ec'), { y: -0.58, z: 0.04 }));
    return l; });
  body.add(mesh(new THREE.BoxGeometry(0.46, 0.55, 0.3), shirt, { y: 0.92 }));
  const logo = canvasTexture(64, 64, (ctx) => { ctx.fillStyle = '#5fae9d'; ctx.fillRect(0, 0, 64, 64); drawPaw(ctx, 32, 36, 40, '#fff6ec'); });
  body.add(mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshStandardMaterial({ map: logo }), { x: -0.11, y: 1.05, z: 0.152, cast: false }));
  const head = new THREE.Group(); head.position.y = 1.43; body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.2, 14, 12), skin));
  [-1, 1].forEach((s) => head.add(mesh(new THREE.SphereGeometry(0.025, 6, 5), mat('#2b2230'), { x: s * 0.07, y: 0.02, z: 0.18, cast: false })));
  head.add(mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), mat('#8a4b4b'), { y: -0.06, z: 0.17, rz: Math.PI, cast: false }));
  head.add(mesh(new THREE.SphereGeometry(0.205, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap, { y: 0.03 }));
  head.add(mesh(new THREE.BoxGeometry(0.3, 0.025, 0.18), cap, { y: 0.06, z: 0.2 }));
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 0.29, 1.15, 0); body.add(a);
    a.add(mesh(new THREE.BoxGeometry(0.12, 0.42, 0.13), shirt, { y: -0.15 }));
    a.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), skin, { y: -0.4 }));
    return a; });
  const box = boxMesh(1); box.position.set(0, 0.78, 0.32); body.add(box);
  return { group: g, body, legs, arms, head, box };
}

/** The little delivery van (just for show on the road). */
function buildVan() {
  const g = new THREE.Group();
  const cream = mat('#fff3e0'), mint = mat('#9fd6bf'), dark = mat('#3d2b3a');
  g.add(mesh(new THREE.BoxGeometry(2.6, 1.25, 1.35), cream, { y: 0.95 }));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.85, 1.3), mint, { x: 1.55, y: 0.75 }));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.42, 1.1), mat('#bfe6f2', { emissive: '#bfe6f2', emissiveIntensity: 0.2 }), { x: 2.0, y: 0.95 }));
  const side = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fff3e0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c95c74'; ctx.textAlign = 'center'; ctx.font = '700 34px Fredoka, sans-serif'; ctx.fillText('Farmers Market', w / 2, 52);
    ctx.fillStyle = '#3f9a8b'; ctx.font = '600 24px Fredoka, sans-serif'; ctx.fillText('delivery', w / 2, 88); drawPaw(ctx, 40, 90, 30, '#ef7f95');
  });
  [1, -1].forEach((s) => g.add(mesh(new THREE.PlaneGeometry(2.3, 1.1), new THREE.MeshStandardMaterial({ map: side }), { y: 1.0, z: s * 0.68, ry: s > 0 ? 0 : Math.PI, cast: false })));
  [[-0.85, 1], [-0.85, -1], [1.35, 1], [1.35, -1]].forEach(([x, s]) => g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), dark, { x, y: 0.28, z: s * 0.62, rx: Math.PI / 2 })));
  g.add(mesh(new THREE.BoxGeometry(2.7, 0.08, 1.4), mint, { y: 1.6 }));
  return g;
}

export class Delivery {
  constructor(game) {
    this.game = game;
    const s = game.state;
    s.market ||= { pending: null, parcels: [] };
    this.courier = null; this.van = null; this.trip = null; this.dispatchT = DISPATCH;
    // parcels on the porch (up to 4 boxes shown; more just stack in the save)
    this.pile = new THREE.Group(); this.pile.position.copy(PARCEL_SPOT); game.scene.add(this.pile);
    this.refreshPile();
  }
  get m() { return this.game.state.market; }
  hasPending() { return !!this.m.pending; }
  /** Bought at the Farmers Market: add it to the next (or the current, still-walking) delivery. */
  order(give) {
    const t = this.trip;
    if (t && !t.dropped) { t.items = merge(t.items, give); this.m.pending = merge(this.m.pending, give); return; }
    this.m.pending = merge(this.m.pending, give);
    if (!t) this.dispatchT = Math.min(this.dispatchT, DISPATCH);
  }
  hours() { const h = this.game.state.hour; return h >= OPEN_HOURS[0] && h < OPEN_HOURS[1] && !this.game.day.bedtime; }
  statusText() {
    if (this.trip && !this.trip.dropped) return 'The courier is on the way to the porch!';
    if (!this.hours()) return "It's late, so it comes first thing tomorrow morning.";
    return 'It ships in a moment and lands by the porch steps.';
  }
  describe(gv) {
    if (!gv) return 'nothing';
    const parts = [];
    if (gv.food) parts.push(`${gv.food} cat food`);
    if (gv.supplies) Object.entries(gv.supplies).forEach(([k, v]) => parts.push(`${v} ${v > 1 || k === 'medicine' ? SUPPLY_LABELS[k].toLowerCase() : k}`));
    if (gv.seeds) Object.entries(gv.seeds).forEach(([k, v]) => parts.push(`${v} ${CROPS[k].name.toLowerCase()} seed${v > 1 ? 's' : ''}`));
    if (gv.yarn) parts.push(`${gv.yarn} ball${gv.yarn > 1 ? 's' : ''} of yarn`);
    if (gv.bait) parts.push(`${gv.bait} worm${gv.bait > 1 ? 's' : ''}`);
    return parts.join(', ');
  }
  refreshPile() {
    this.pile.clear();
    const n = Math.min(4, this.m.parcels.length);
    const spots = [[0, 0, 0, 0], [0.5, 0, 0.1, 0.4], [0.05, 0.34, 0.02, -0.3], [0.25, 0, -0.42, 0.9]];
    for (let i = 0; i < n; i++) { const b = boxMesh(1); const [x, y, z, r] = spots[i]; b.position.set(x, y, z); b.rotation.y = r; this.pile.add(b); }
    this.pile.position.y = this.game.world.groundHeight(PARCEL_SPOT.x, PARCEL_SPOT.z);
  }
  /** Action when she's by the parcels. */
  action(p) {
    if (!this.m.parcels.length) return null;
    if (Math.hypot(p.x - PARCEL_SPOT.x, p.z - PARCEL_SPOT.z) > 1.25) return null;
    const n = this.m.parcels.length;
    return { ok: true, label: n > 1 ? `Open ${n} deliveries` : 'Open delivery', run: () => this.unpack() };
  }
  unpack() {
    const g = this.game, s = g.state;
    let all = null; for (const gv of this.m.parcels) all = merge(all, gv);
    this.m.parcels = []; this.refreshPile();
    if (!all) return;
    if (all.food) g.api_food.add(all.food);
    if (all.supplies) Object.entries(all.supplies).forEach(([k, v]) => (s.supplies[k] = (s.supplies[k] || 0) + v));
    if (all.seeds) Object.entries(all.seeds).forEach(([k, v]) => (s.seeds[k] = (s.seeds[k] || 0) + v));
    if (all.yarn) s.yarn = (s.yarn || 0) + all.yarn;
    if (all.bait) s.bait = (s.bait || 0) + all.bait;
    sound.play('pickup'); g.lady.act();
    g.particles.emit(PARCEL_SPOT.clone().setY(0.5), { color: '#ffd76e', count: 12, speed: 0.8, up: 1.6, gravity: 1, size: 0.045, emissive: true });
    g.floatAtLady(`+ ${this.describe(all)}`, '#5b4256', 'shop');
    g.host.say(`Ooh, a parcel from the Farmers Market: ${this.describe(all)}. Everything's put away, dearie!`, 6);
    if (!s.flags.firstParcel) { s.flags.firstParcel = true; g.journal.log('The first Farmers Market delivery arrived on the porch. The courier even waved!'); }
    g.save();
  }

  update(dt, t) {
    const g = this.game;
    if (!g.playing && !this.trip) return;
    if (!this.trip) {
      if (this.m.pending && this.hours()) { this.dispatchT -= dt; if (this.dispatchT <= 0) this.startTrip(); }
      return;
    }
    const tr = this.trip;
    tr.t += dt;
    const c = this.courier, p = c.group.position;
    if (tr.phase === 'drive-in' || tr.phase === 'drive-out') {
      const goal = tr.phase === 'drive-in' ? VAN_STOP.x : -60;
      const dx = goal - this.van.position.x, st = Math.sign(dx) * Math.min(Math.abs(dx), VAN_SPEED * dt * Math.min(1, 0.25 + Math.abs(dx) / 6));
      this.van.position.x += st;
      if (Math.abs(goal - this.van.position.x) < 0.05) {
        if (tr.phase === 'drive-in') { tr.phase = 'walk-up'; tr.i = 0; c.group.visible = true; p.set(VAN_STOP.x - 1.2, 0, VAN_STOP.z - 0.9); sound.play('click'); }
        else this.endTrip();
      }
      return;
    }
    if (tr.phase === 'walk-up' || tr.phase === 'walk-back') {
      const route = tr.phase === 'walk-up' ? ROUTE : tr.back;
      const w = route[tr.i];
      const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.08) {
        tr.i++;
        if (tr.i >= route.length) {
          if (tr.phase === 'walk-up') { tr.phase = 'drop'; tr.dt = 0; c.group.rotation.y = Math.atan2(PARCEL_SPOT.x - p.x, PARCEL_SPOT.z - p.z); }
          else { c.group.visible = false; tr.phase = 'drive-out'; }
        }
      } else {
        const st = Math.min(d, WALK * dt); p.x += (dx / d) * st; p.z += (dz / d) * st;
        const want = Math.atan2(dx, dz); c.group.rotation.y += shortest(want - c.group.rotation.y) * Math.min(1, dt * 10);
      }
      p.y = g.world.groundHeight(p.x, p.z);
      const ph = tr.t * 9;
      c.legs[0].rotation.x = Math.sin(ph) * 0.6; c.legs[1].rotation.x = -Math.sin(ph) * 0.6;
      c.body.position.y = Math.abs(Math.sin(ph)) * 0.04;
      if (tr.phase === 'walk-back' || !c.box.visible) { c.arms[0].rotation.x = -Math.sin(ph) * 0.5; c.arms[1].rotation.x = Math.sin(ph) * 0.5; }
      else { c.arms[0].rotation.x = c.arms[1].rotation.x = -1.2; }
      this.nudgeLady(p);
      return;
    }
    if (tr.phase === 'drop') {
      tr.dt += dt;
      const k = Math.min(1, tr.dt / 0.8);
      c.body.rotation.x = Math.sin(k * Math.PI) * 0.45;                   // bend down to set it down
      c.legs.forEach((l) => (l.rotation.x = 0));
      if (tr.dt > 0.5 && c.box.visible) { c.box.visible = false; this.deliver(); }
      if (tr.dt > 0.9) { // wave
        c.body.rotation.x = 0;
        const lp = g.lady.group.position;
        c.group.rotation.y += shortest(Math.atan2(lp.x - p.x, lp.z - p.z) - c.group.rotation.y) * Math.min(1, dt * 4);
        c.arms[1].rotation.x = -0.3; c.arms[1].rotation.z = 2.5 + Math.sin(tr.dt * 12) * 0.35; c.arms[0].rotation.x = 0;
      }
      if (tr.dt > 2.6) { c.arms[1].rotation.z = 0; tr.phase = 'walk-back'; tr.i = 0; tr.back = ROUTE.slice(0, -1).reverse().concat([new THREE.Vector3(VAN_STOP.x - 1.2, 0, VAN_STOP.z - 0.9)]); }
    }
  }
  nudgeLady(p) {
    // he steps around Granny rather than through her (she gets a polite little nudge)
    const lp = this.game.lady.group.position, dx = lp.x - p.x, dz = lp.z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.55 && d > 0.001 && !this.game.sitting) { lp.x += (dx / d) * (0.55 - d); lp.z += (dz / d) * (0.55 - d); }
  }
  startTrip() {
    const g = this.game;
    if (!this.van) { this.van = buildVan(); g.scene.add(this.van); }
    if (!this.courier) { this.courier = buildCourier(); g.scene.add(this.courier.group); }
    this.van.visible = true; this.van.position.set(60, 0, VAN_STOP.z); this.van.rotation.y = Math.PI;   // drives in from the east, nose first
    this.courier.group.visible = false; this.courier.box.visible = true; this.courier.body.rotation.x = 0;
    this.trip = { phase: 'drive-in', t: 0, i: 0, items: this.m.pending, dropped: false };
    this.dispatchT = DISPATCH;
  }
  deliver() {
    const g = this.game, tr = this.trip;
    tr.dropped = true;
    if (this.m.pending) this.m.parcels.push(this.m.pending);
    this.m.pending = null;
    this.refreshPile();
    sound.play('pop');
    g.ui.banner('Your Farmers Market order is on the porch 📦', 'parcel');
    if (!g.state.flags.parcelHint) { g.state.flags.parcelHint = true; setTimeout(() => g.host.say('A delivery! The parcel is by the porch steps. Walk over and press E to open it.', 7), 1500); }
    g.save();
  }
  endTrip() {
    this.van.visible = false; this.courier.group.visible = false;
    this.trip = null; this.dispatchT = DISPATCH;
  }
  /** Debug/tests: fast-forward the courier. */
  step(seconds, dt = 0.05) { for (let s = 0; s < seconds; s += dt) this.update(dt, s); }
  get phase() { return this.trip ? this.trip.phase : 'idle'; }
}

function merge(a, b) {
  if (!b) return a ? JSON.parse(JSON.stringify(a)) : null;
  const r = a ? JSON.parse(JSON.stringify(a)) : {};
  for (const k of ['food', 'yarn', 'bait']) if (b[k]) r[k] = (r[k] || 0) + b[k];
  for (const k of ['supplies', 'seeds']) if (b[k]) { r[k] ||= {}; for (const [n, v] of Object.entries(b[k])) r[k][n] = (r[k][n] || 0) + v; }
  return r;
}
function shortest(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
