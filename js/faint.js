// The starving-Granny gag: when her hunger hits 0 she keels over, and every cat on the farm comes
// running to "nibble" her (cartoony nom-noms, a twitching leg, a 😱). Then the screen fades and she
// wakes up in her bed a few hours later (or next morning), a bit poorer from the doctor's house call.
// Nobody gets hurt. The cats are not sorry.
import * as THREE from 'three';
import { sound } from './sound.js';

export const HUNGER_WARN = 15;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const NOMS = ['nom nom', 'NOM', '*nibble*', 'mrrrnom', '*chomp*', 'nom?', 'tastes like cardigan', 'nom nom nom'];

export class Faint {
  constructor(game) { this.g = game; this.on = null; this.warned = false; }
  get active() { return !!this.on; }

  update(dt) {
    const g = this.g, L = g.state.lady;
    if (!this.on) {
      if (!g.playing || !g.started) return;
      if (L.hunger > 30) this.warned = false;
      if (L.hunger <= HUNGER_WARN && L.hunger > 0 && !this.warned) {
        this.warned = true;
        g.host.say(g.state.meals > 0 ? "Ohh... I'm so hungry I could faint, dearie! Quick, eat a home-cooked meal in the kitchen!" : "Ohh... I'm so hungry I could faint! Harvest some veggies and cook a meal, quick!", 7);
        g.ui.flashHunger();
      }
      if (L.hunger <= 0 && !g.blocked && !g.vet.exam && !g.cats.list.some((c) => c.escort)) this.begin();
      return;
    }
    this.step(dt);
  }

  begin() {
    const g = this.g;
    g.emotes.stop(true); g.emotes.toggleWheel(false);
    if (g.sitting) g.standUp();
    g.catMenu.close?.(); g.statsCard.close?.();
    const p = g.lady.group.position, h = g.lady.group.rotation.y;
    // she falls backwards: her body ends up lying behind where she stood
    const center = new THREE.Vector3(p.x - Math.sin(h) * 0.85, p.y, p.z - Math.cos(h) * 0.85);
    this.on = { t: 0, center, feet: p.clone(), h, cats: [], nomT: 1, gaspT: 2.5, twitchT: 0, twitch: 0 };
    g.fainted = true;
    g.state.stats.faints = (g.state.stats.faints || 0) + 1;
    g.host.say(pick(['Oh my... everything is... spinning...', 'Is it... dinner time... already...?', 'So... hungry... tell the cats... I love them...']), 3);
    if (window.ccl) window.ccl.state.speed = 0;
    g.lady.setPose((parts, t, dt) => this.pose(parts, dt));
  }

  /** Wobble, keel over backwards, then lie there with a twitching leg. */
  pose(P, dt) {
    const f = this.on; if (!f) return;
    const t = f.t;
    if (t < 1.3) {
      P.body.rotation.z = Math.sin(t * 9) * 0.16 * Math.min(1, t * 2);
      P.head.rotation.x = 0.3 * Math.min(1, t);
      P.arms[0].rotation.z = -0.4; P.arms[1].rotation.z = 0.4;
    } else {
      const k = Math.min(1, (t - 1.3) / 0.45), e = k * k;
      P.body.rotation.set(-Math.PI / 2 * e, 0, 0);
      P.body.position.y = 0.3 * e + (k >= 1 ? Math.max(0, Math.sin((t - 1.75) * 14) * 0.05 * Math.max(0, 1 - (t - 1.75) * 2)) : 0);
      P.arms[0].rotation.set(0, 0, -1.3 * e); P.arms[1].rotation.set(0, 0, 1.3 * e);
      P.head.rotation.set(0, 0, 0.35 * e);
      P.legs[0].rotation.x = -0.15 * e; P.legs[1].rotation.x = -0.1 * e - f.twitch;
      P.eyes.forEach((y) => (y.scale.y = 0.12));
    }
  }

  step(dt) {
    const g = this.g, f = this.on;
    f.t += dt;
    // her leg twitches now and then
    f.twitchT -= dt; if (f.twitchT <= 0) { f.twitchT = 0.6 + Math.random() * 1.2; f.tw = 0.35; }
    f.tw = Math.max(0, (f.tw || 0) - dt); f.twitch = f.tw > 0 ? Math.abs(Math.sin(f.tw * 40)) * 0.6 : 0;
    if (f.t >= 1.75 && !f.fell) { f.fell = true; sound.play('thud'); g.particles.emit(f.center.clone().setY(f.center.y + 0.1), { color: '#efe2c8', count: 12, speed: 1.5, up: 1, gravity: 2, size: 0.07, life: 0.7, spread: 1 }); }
    if (f.t >= 2.0 && !f.called) { f.called = true; this.swarm(); }
    if (f.t >= 3.6 && !f.cried) {
      f.cried = true;
      g.host.say(f.cats.length ? pick(["Help! They think I'm a casserole! 😱", 'Not the cardigan! It\'s CASHMERE! 😱', 'I FED you this MORNING! 😱']) : 'Lucky for Granny, no cats are around to nibble her... yet. 😱', 4);
    }
    if (f.t >= 2.4) {
      f.nomT -= dt;
      const here = f.cats.filter((c) => c.task && c.task.type === 'emote' && c.task.arrived);
      if (f.nomT <= 0 && here.length) { f.nomT = 0.35 + Math.random() * 0.35; const c = pick(here); g.floatAt(c.pos, pick(NOMS), '#c95c74'); if (Math.random() < 0.5) sound.play('nom'); }
      f.gaspT -= dt;
      if (f.gaspT <= 0) { f.gaspT = 1.6; g.floatAt(f.center.clone().setY(f.center.y + 0.2), '😱', '#c95c74'); }
    }
    if (f.t >= 10 && !f.fading) { f.fading = true; g.ui.sleepFade(() => this.wake()); }
  }

  /** Every cat on the farm sprints over and piles on. */
  /** Where the cats go. Her fallen body is worked out from her pose: she lies on her back along the line from
   *  where her feet were (s = 0) to the top of her hair (s = 1.85), body lifted 0.3 so her skirt is ~0.4 thick,
   *  arms flung out sideways to about 0.7 m at s = 1.1. Ring cats sit just outside that outline, noses at her
   *  edge, facing in (so the nibbling head-bob reaches her without poking inside); up to two sit ON her at the
   *  right height (one across her skirt, one on her chest facing her face). Nothing overlaps her or each other. */
  slots() {
    const g = this.g, f = this.on;
    const foot = f.feet, fwd = new THREE.Vector3(Math.sin(f.h), 0, Math.cos(f.h)), side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const at = (s, lat, y = null) => { const v = foot.clone().addScaledVector(fwd, -s).addScaledVector(side, lat); v.y = y ?? g.world.groundHeight(v.x, v.z); return v; };
    const top = [
      { s: 1.05, lat: 0, y: 0.56, look: at(1.9, 0) }, // on her chest, staring into her face
      { s: 0.32, lat: 0, y: 0.62, look: at(0.32, 2) }, // sprawled across her skirt
    ];
    // [along her body, sideways edge] — sides of the skirt, beside her chest, her hands, her head, then feet and hair
    // [along her body, sideways, outward angle (0 = straight out the side, 1 = straight off her feet)], spaced so even big cats don't overlap
    const edge = [[0.42, 0.4, 0], [0.42, -0.4, 0], [-0.06, 0, 1], [1.12, 0.74, 0], [1.12, -0.74, 0], [0.0, 0.26, 0.6], [0.0, -0.26, 0.6], [1.7, 0.33, 0], [1.7, -0.33, 0], [1.92, 0, -1]];
    const ring = edge.map(([s, lat, a]) => {
      const surf = at(s, lat);
      const out = a === 1 ? fwd.clone() : a === -1 ? fwd.clone().negate() : side.clone().multiplyScalar(Math.sign(lat) * (1 - a)).addScaledVector(fwd, a).normalize();
      return { surf, out };
    });
    return { top, ring, at };
  }
  swarm() {
    const g = this.g, f = this.on, c0 = f.center;
    const cats = g.cats.freeCats(400);
    const { top, ring } = this.slots();
    const nTop = cats.length >= 4 ? 2 : cats.length >= 3 ? 1 : 0;
    f.cats = cats.slice(0, nTop + ring.length);
    f.cats.forEach((c, i) => {
      // far-away cats come running from just out of view so they arrive in time
      const d = Math.hypot(c.pos.x - c0.x, c.pos.z - c0.z);
      if (d > 16) { const k = 12 / d; c.pos.set(c0.x + (c.pos.x - c0.x) * k, c.pos.y, c0.z + (c.pos.z - c0.z) * k); }
      const sc = g.cats.def(c)?.scale || 1;
      let spot, look;
      if (i < nTop) { const t = top[i]; spot = this.slots().at(t.s, t.lat, t.y); look = t.look; }
      else { const r = ring[i - nTop]; spot = r.surf.clone().addScaledVector(r.out, 0.52 * sc); look = r.surf; }
      g.cats.react(c, { spot, snap: true, anim: 'eat', t: 30, speed: 3.4, near: 0.3, look, swarm: true, onArrive: (cc) => { if (Math.random() < 0.6) sound.play('meow'); g.cats.flashIcon(cc, 'heart', 1); } });
    });
    // any extra cats sit in a looser outer circle, watching (and waiting their turn)
    cats.slice(f.cats.length).forEach((c, i, arr) => {
      const a = (i / arr.length) * Math.PI * 2, spot = c0.clone().add(new THREE.Vector3(Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2));
      spot.y = g.world.groundHeight(spot.x, spot.z);
      g.cats.react(c, { spot, snap: true, anim: 'sit', t: 30, speed: 3, near: 0.3, look: c0, swarm: true });
      f.cats.push(c);
    });
    if (cats.length) sound.play('meow');
  }

  wake() {
    const g = this.g, s = g.state, L = s.lady;
    const fee = Math.min(s.coins, Math.min(30, Math.max(5, Math.round(s.coins * 0.2))));
    s.coins -= fee;
    let morning = false;
    if (s.hour + 4 >= 22) { g.overnight(); morning = true; }
    else { const h = g.day.advance(4); const ripe = g.garden.grow(h); g.cats.simulate(h); if (ripe.length) g.notifyRipe(ripe); }
    L.hunger = 35; L.energy = Math.max(L.energy, 50);
    // back in her own bed
    g.lady.setPose(null); g.lady.setSitting(false);
    const bp = g.world.cottage.bedPos;
    if (window.ccl) window.ccl.teleport(bp.x, bp.z, Math.PI); else g.lady.group.position.copy(bp);
    this.on.cats.forEach((c) => { if (c.task && c.task.type === 'emote') c.task = { type: 'idle', anim: 'groom', t: 4 }; });
    this.on = null; g.fainted = false; this.warned = false;
    const n = s.stats.faints || 1;
    g.journal.log(n === 1 ? 'Granny fainted from hunger and the cats tried to eat her. She\'s fine. The cats are not sorry.' : pick(['The cats tried to eat Granny. Again.', 'Granny fainted again. The cats called dibs on the cardigan.', 'Another hunger faint. The cats rated Granny 4 out of 5 stars.']));
    g.ui.banner(`Granny fainted! 🩺 −${fee} coins for the doctor's house call`, 'warn');
    setTimeout(() => g.host.say(morning ? "Ooh, my head... it's morning?! Note to self: EAT something. The cats looked a little too hungry." : "Ooh, my head... Doc Whiskers says EAT something, dearie. The cats looked a little too hungry.", 8), 1200);
    g.save();
  }
}
