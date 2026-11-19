// Hairballs: every so often a cat goes *HACK HACK* and leaves a little gross surprise somewhere around
// the house or yard. Granny scoops them up (E). Cozy rules: they never hurt anyone, there are at most
// HAIRBALL_MAX lying around, and they're saved in state.hairballs.
import * as THREE from 'three';
import { mat, mesh } from './util.js';
import { HAIRBALL_MAX } from './state.js';
import { LOOKS } from './catModel.js';
import { sound } from './sound.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Hairballs {
  constructor(game) {
    this.g = game;
    this.group = new THREE.Group(); game.scene.add(this.group);
    this.timer = 50 + Math.random() * 40;
    this.refresh();
  }
  get list() { return this.g.state.hairballs; }
  build(h) {
    const g = new THREE.Group();
    const fur = mat(h.c || '#8a7a6a', { flatShading: false, roughness: 1 });
    // a soggy little sausage of fur in a puddle of goo
    g.add(mesh(new THREE.CircleGeometry(0.17, 14), new THREE.MeshStandardMaterial({ color: '#c9d98a', transparent: true, opacity: 0.6, roughness: 0.15, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), { y: 0.012, rx: -Math.PI / 2, sx: 1.3, cast: false }));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(0.05 - i * 0.004, 8, 6), fur, { x: -0.07 + i * 0.05, y: 0.035, z: Math.sin(i * 1.7) * 0.02, sy: 0.75 }));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 3), fur, { x: -0.08 + i * 0.035, y: 0.06, z: (i % 2 ? 0.02 : -0.02), rz: (i - 2.5) * 0.4, rx: (i % 3 - 1) * 0.5, cast: false }));
    // wobbly green stink lines
    const stink = new THREE.Group(); stink.position.y = 0.12; g.add(stink);
    for (let i = 0; i < 3; i++) stink.add(mesh(new THREE.TorusGeometry(0.035, 0.007, 4, 10, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: '#9fcf6a', transparent: true, opacity: 0.7 }), { x: -0.06 + i * 0.06, y: i * 0.03, rz: i * 0.7, cast: false }));
    g.userData.stink = stink;
    g.position.set(h.x, this.g.world.groundHeight(h.x, h.z), h.z); g.rotation.y = h.r || 0; g.scale.setScalar(1.5);
    return g;
  }
  refresh() {
    this.group.clear();
    for (const h of this.list) this.group.add(this.build(h));
  }
  /** A cat hacks one up (or force one for testing). */
  spawn(c = null, at = null) {
    const g = this.g, list = this.list;
    if (list.length >= HAIRBALL_MAX) return null;
    if (!c && !at) {
      const cands = g.cats.joined().filter((x) => !x.escort && !x.caged && !g.cats.inKennel(x) && x.pos.y < 0.45 && !(x.task && (x.task.type === 'emote' || x.task.type === 'swing' || x.task.type === 'sleepAt')));
      if (!cands.length) return null;
      c = pick(cands);
    }
    const p = at || c.pos, hd = c ? c.heading : 0;
    const h = { x: +(p.x + Math.sin(hd) * 0.3).toFixed(2), z: +(p.z + Math.cos(hd) * 0.3).toFixed(2), r: +(Math.random() * 6).toFixed(2), c: c ? (LOOKS[c.def.look] || {}).base : undefined, by: c ? c.data.name : undefined };
    if (c) {
      c.task = { type: 'interact', t: 2.4, anim: 'groom' }; c.path = [];
      g.floatAt(c.pos, pick(['*HACK* *HACK* 🤢', '*hork* *hork* *HURK*', '*gack gack gack* 🤮']), '#6f8f3a');
      sound.play('cough');
    }
    list.push(h); this.group.add(this.build(h));
    if (c && Math.hypot(g.lady.group.position.x - h.x, g.lady.group.position.z - h.z) < 12) setTimeout(() => g.host.say(pick([`Oh, ${h.by}! Not on the floor... ew, it's still warm.`, `${h.by} left me a present. How thoughtful. 🤢`, `Ugh, a hairball! Better scoop that up, dearie.`]), 4), 900);
    g.save();
    return h;
  }
  action(p) {
    let best = -1, bd = 0.85;
    this.list.forEach((h, i) => { const d = Math.hypot(p.x - h.x, p.z - h.z); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return null;
    return { ok: true, label: 'Scoop up the hairball 🤢', run: () => this.scoop(best) };
  }
  scoop(i) {
    const g = this.g, s = g.state, h = this.list[i]; if (!h) return;
    this.list.splice(i, 1); this.refresh();
    g.lady.act(); sound.play('splash');
    g.particles.emit(new THREE.Vector3(h.x, g.world.groundHeight(h.x, h.z) + 0.1, h.z), { color: '#c9d98a', count: 10, speed: 0.6, up: 1, gravity: 4, size: 0.03, life: 0.6 });
    s.stats.hairballs = (s.stats.hairballs || 0) + 1;
    let line = pick(['Squish! 🤢 *gag*', 'Ewww, it\'s SOGGY!', 'Into the bin you go. *hurk*', 'Why is it always warm?!']);
    if (Math.random() < 0.25) { s.coins += 2; line = 'Ooh! There was a shiny coin in this one! (+2) Ew.'; }
    g.floatAtLady(line, '#6f8f3a');
    if (!s.flags.hairball) { s.flags.hairball = true; g.journal.log(`Granny scooped up her first hairball${h.by ? ` (courtesy of ${h.by})` : ''}. She has since washed her hands four times.`); }
    if (s.stats.hairballs === 25) g.journal.log('Granny has scooped 25 hairballs. She is considering a career in hazardous materials.');
    g.save();
  }
  update(dt, t) {
    const g = this.g;
    for (const m of this.group.children) { const st = m.userData.stink; st.position.y = 0.12 + ((t * 0.25) % 0.12); st.children.forEach((o, i) => { o.material.opacity = 0.7 * (1 - ((t * 0.25) % 0.12) / 0.12); o.rotation.z = i * 0.7 + Math.sin(t * 3 + i) * 0.3; }); }
    if (!g.playing || g.blocked || g.day.bedtime || g.cats.isNight()) return;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = 90 + Math.random() * 120; this.spawn(); }
  }
}
