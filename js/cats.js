// The cats of the sanctuary: arrivals, soft needs, bond levels, behaviors and care.
// Nothing here is ever punishing: neglect only makes a cat a little less happy and lively.
import * as THREE from 'three';
import { createCat } from './catModel.js';
import { STARTER_CATS, PERSONALITIES, SPOTS, TOYS, BOND_LEVELS, bondLevel, ISSUES, pron, makeCatDef, MAX_CATS } from './catData.js';
import { sound } from './sound.js';

const NEED_KEYS = ['hunger', 'fun', 'clean', 'affection', 'energy'];
export const NEED_LABELS = { hunger: 'Full tummy', fun: 'Fun', clean: 'Clean & tidy', affection: 'Affection' };
const MIN_NEED = 8; // needs never hit zero: cats just get a bit mopey

/**
 * Wellbeing / neglect. For now everything is cozy: health only drifts down to a soft floor and
 * nothing bad ever happens. The owner plans real stakes later (a cat can decline and pass away
 * from long neglect). To add that: set NEGLECT.enabled = true, lower NEGLECT.floor to 0 and fill
 * in CatManager.onDecline(c), which is already called whenever a neglected cat's health hits the floor.
 */
export const NEGLECT = { enabled: false, floor: 30 };

// Doors and the porch steps: cats walk through these to get in and out of buildings.
const LINKS = {
  'out-porch': [[0, -3.4], [0, -4.7]],
  'porch-living': [[0, -5.9], [0, -7.4]],   // front door into the cottage living room
  // (the doorways between the cottage rooms come from the cottage itself: world.cottage.links)
  'out-clinic': [[-12, -4.9], [-12, -6.9]],
  'out-barn': [[8.5, -7], [10.9, -7]],   // the Cats' House (old barn) doorway faces west
};
// on her quilt in the cottage bedroom (bed centre is at x 2.55, z -13.25)
const BED_PILE = [[2.3, 0.94, -13.55], [2.85, 0.94, -13.15], [2.4, 0.94, -12.7]];
const NIGHT_SPOTS = [[-3.8, 0.37, -9.2], [1.35, 0.37, -7.15], [-1.6, 0.33, -8.3]]; // cottage living room (cat beds, rug)
export const EXAM_SPOT = new THREE.Vector3(-13.6, 0.95, -10.4);
export const RECOVERY_SPOT = new THREE.Vector3(-9.6, 0.1, -9.0);

export function defaultCatState(def) {
  return {
    id: def.id, arrived: false, named: false, name: '', joined: false, joinedDay: 0, trust: 0,
    pos: { x: def.spawn.x, z: def.spawn.z },
    needs: { hunger: 70, fun: 60, clean: 60, affection: 50, energy: 80 }, health: 92, slot: -1,
    bondXP: 0, discovered: { toy: false, spot: false, treat: false },
    firsts: {}, cd: {}, lastGiftDay: 0, mode: 'new',
  };
}

export class CatManager {
  constructor(game) {
    this.game = game;
    const s = game.state;
    this.defs = Object.fromEntries(STARTER_CATS.map((d) => [d.id, d]));
    s.adopted ||= [];
    const gone = new Set(s.adopted.map((a) => a.id));
    // the three starter cats always get a save entry (old saves get them added), unless adopted out;
    // later arrivals are generated and carry their own def in the save
    const old = s.cats || [];
    const extra = old.filter((c) => c.def && !this.defs[c.id]);
    extra.forEach((c) => (this.defs[c.id] = c.def));
    s.cats = [...STARTER_CATS.filter((d) => !gone.has(d.id)).map((d) => ({ ...defaultCatState(d), ...old.find((c) => c.id === d.id) })), ...extra.map((c) => ({ ...defaultCatState(c.def), ...c }))];
    // the Cats' House: one litter box per two cats, one bowl and bed per slot (old saves had a single cottage litter box)
    const house = game.world.catsHouse;
    if (!Array.isArray(s.litterBoxes)) s.litterBoxes = [];
    while (s.litterBoxes.length < house.litter.length) s.litterBoxes.push(s.litter && !s.litterBoxes.length ? s.litter : 0);
    s.bowls ||= {};
    s.cats.forEach((c) => {
      const base = defaultCatState(this.defs[c.id]);
      c.needs = { ...base.needs, ...c.needs }; c.discovered ||= {}; c.firsts ||= {}; c.cd ||= {};
      if (c.health === undefined) c.health = base.health;
      if (c.slot === undefined) c.slot = -1;
    });
    // give joined cats from older saves a Cats' House slot
    s.cats.filter((c) => c.joined && c.slot < 0).forEach((c) => (c.slot = this.freeSlot()));
    this.list = [];
    this.departing = [];
    s.cats.forEach((c) => c.arrived && this.spawn(c));
    s.cats.forEach((c) => { if (c.slot >= 0) { house.setBowl(c.slot, s.bowls[c.id]); if (c.named) house.setBedName(c.slot, c.name); } });
    house.setLitter(s.litterBoxes);
    this.arrivalTimer = 0;
    this.prevHour = s.hour;
    this.heartT = 0;
    this.ladyStill = 0;
    this.lastLadyPos = new THREE.Vector3();
  }

  get state() { return this.game.state; }
  /** First free bed/bowl slot in the Cats' House (0..9). */
  freeSlot() { const used = new Set(this.state.cats.map((c) => c.slot)); for (let i = 0; i < MAX_CATS; i++) if (!used.has(i)) return i; return MAX_CATS - 1; }
  /** Cats living here right now (arrived and not adopted out), including ones waiting for their Welcome Vet Check. */
  residents() { return this.state.cats.filter((c) => c.arrived).length; }
  roomForMore() { return this.state.cats.length < MAX_CATS; }
  absHours() { return this.state.day * 24 + this.state.hour; }
  def(c) { return this.defs[c.data ? c.data.id : c.id]; }
  joined() { return this.list.filter((c) => c.data.joined); }
  displayName(c) { const d = c.data || c; return d.named ? d.name : d.mode === 'stray' ? 'Shy stray' : 'New arrival'; }
  byId(id) { return this.list.find((c) => c.data.id === id); }
  level(c) { return bondLevel((c.data || c).bondXP); }
  personality(c) { return PERSONALITIES[this.def(c).personality]; }
  happiness(c) {
    const n = (c.data || c).needs;
    let h = 0.28 * n.hunger + 0.24 * n.fun + 0.18 * n.clean + 0.22 * n.affection + 0.08 * (n.energy ?? 80);
    if (this.game.vet && this.game.vet.activeCase((c.data || c).id)) h -= 10;
    return THREE.MathUtils.clamp(h, 0, 100);
  }
  mood(c) {
    const h = this.happiness(c);
    return h >= 75 ? 'Very happy' : h >= 55 ? 'Content' : h >= 35 ? 'A little mopey' : 'Needs some love';
  }

  /* ---------------- spawning ---------------- */
  spawn(data) {
    const def = this.defs[data.id];
    const model = createCat(def.look, def.scale);
    model.group.userData.catId = data.id;
    model.group.position.set(data.pos.x, 0, data.pos.z);
    this.game.scene.add(model.group);
    const c = { data, def, model, pos: model.group.position, heading: Math.random() * 6, task: null, timer: 1 + Math.random() * 2, speed: 0, path: [], stuck: 0, lastD: 0, perch: 0, iconT: 0, iconKind: null };
    this.list.push(c);
    this.refreshTag(c);
    this.applyCostume(c);
    model.group.traverse((o) => { if (o.isMesh && o.userData.isCat) o.userData.catId = data.id; });
    return c;
  }

  refreshTag(c) {
    const d = c.data;
    if (!d.joined) c.model.setTag(this.displayName(c), 'new');
    else c.model.setTag(d.name, 'name');
  }

  checkArrivals(dt) {
    const s = this.state;
    if (!this.game.playing) return;
    const waiting = s.cats.find((c) => !c.arrived);
    if (!waiting) { this.maybeNewArrival(dt); return; }
    const def = this.defs[waiting.id];
    const prevAll = s.cats.slice(0, s.cats.indexOf(waiting)).every((c) => c.joined);
    if (!prevAll || s.day < def.arriveDay || s.hour < 7 || s.hour > 19) { this.arrivalTimer = 0; return; }
    this.arrivalTimer += dt;
    if (this.arrivalTimer < (def.arriveDay === 1 ? 10 : 4)) return;
    this.arrive(waiting);
  }
  /**
   * After the three starter cats: while there's room (up to 10), new cats keep turning up:
   * rescues, shelter transfers, strays and neighbors' fosters. At most one a day, never while
   * another newcomer still waits for a Welcome Vet Check.
   */
  maybeNewArrival(dt) {
    const s = this.state;
    if (!this.roomForMore() || s.cats.some((c) => c.arrived && !c.joined)) return;
    if (s.day < 4 || s.hour < 9 || s.hour > 17) return;
    if (s.flags.arrivalRollDay === s.day) return;
    this.arrivalTimer += dt;
    if (this.arrivalTimer < 25) return; // a little while into the day
    this.arrivalTimer = 0;
    s.flags.arrivalRollDay = s.day;
    // busier when the sanctuary has lots of room, quieter when it's nearly full
    const chance = s.cats.length <= 4 ? 0.85 : s.cats.length <= 7 ? 0.6 : 0.4;
    if (Math.random() < chance) this.newArrival();
  }
  /** Create a brand-new cat and have it arrive now. Returns its save data. */
  newArrival() {
    const s = this.state;
    if (!this.roomForMore()) return null;
    const id = `cat${s.nextCat || 4}`; s.nextCat = (s.nextCat || 4) + 1;
    const taken = [...s.cats.map((c) => c.name), ...s.adopted.map((a) => a.name)];
    const def = makeCatDef(id, taken);
    this.defs[id] = def;
    const data = { ...defaultCatState(def), def };
    s.cats.push(data);
    this.arrive(data);
    return data;
  }

  arrive(data) {
    const def = this.defs[data.id];
    data.arrived = true; data.mode = def.arrival === 'stray' ? 'stray' : 'new';
    data.pos = { ...def.spawn };
    const c = this.spawn(data);
    c.task = { type: data.mode === 'stray' ? 'hide' : 'wait' };
    const g = this.game;
    sound.play('meow');
    if (def.starterIssue && ['cold', 'injury', 'ear'].includes(def.starterIssue)) setTimeout(() => g.host.say(`Poor thing looks a little poorly. The Welcome Vet Check will find out what's wrong, and the clinic kennels are ready.`, 6), 9500);
    if (data.mode === 'stray') {
      g.host.say(`Oh! There's a shy little stray hiding nearby (look for the ?). Go slowly, dearie. Sit with ${def.sex === 'girl' ? 'her' : 'him'} quietly so ${def.sex === 'girl' ? 'she' : 'he'} learns to trust you.`, 9);
    } else {
      g.host.say(`A new arrival at the gate! ${def.sourceLabel}. Every new kitty gets a Welcome Vet Check first, so let's walk ${def.sex === 'girl' ? 'her' : 'him'} to the clinic.`, 9);
    }
    g.journal.log(`A new cat arrived: ${def.sourceLabel.toLowerCase()}.`, data.id);
    g.save();
  }

  /** Called by the vet when the Welcome Vet Check is done and the cat has a name. */
  welcome(id, name) {
    const c = this.byId(id), d = c.data;
    d.name = name; d.named = true; d.joined = true; d.joinedDay = this.state.day; d.mode = 'free'; c.escort = false; c.path = []; c.routeKey = null;
    d.needs.affection = Math.max(d.needs.affection, 60);
    this.addBond(c, 2, true);
    this.refreshTag(c);
    if (d.slot < 0) d.slot = this.freeSlot();
    this.game.world.catsHouse.setBedName(d.slot, name);
    c.task = null; c.timer = 0.5;
    this.game.journal.log(`Welcome home, ${name}! ${pron(`{She} joined the sanctuary after {his} Welcome Vet Check.`, this.def(c))}`, id);
  }

  /* ---------------- bond ---------------- */
  addBond(c, amount, silent = false) {
    const d = c.data, before = this.level(c);
    d.bondXP += amount * (this.personality(c).bondGain || 1);
    const after = this.level(c);
    if (after > before && !silent) {
      const unlock = BOND_LEVELS[after].unlock;
      this.game.floatAt(c.pos, `Bond up! ${d.name}: ${BOND_LEVELS[after].label}`, '#c95c74', 'heart');
      this.game.host.say(`${d.name}'s bond with you grew to ${BOND_LEVELS[after].label}! ${pron(`{She} ${unlock}.`, this.def(c))}`, 6);
      this.game.journal.log(`${d.name} reached bond level ${after} (${BOND_LEVELS[after].label}): ${unlock}.`, d.id);
      sound.play('bond');
    }
  }
  cooldownReady(c, key, hours) { return this.absHours() - (c.data.cd[key] ?? -99) >= hours; }
  cooldownOk(c, key, hours) {
    const now = this.absHours(), last = c.data.cd[key] ?? -99;
    if (now - last < hours) return false;
    c.data.cd[key] = now; return true;
  }

  /* ---------------- care actions (from the cat menu) ---------------- */
  menuFor(c) {
    const s = this.state, d = c.data, vet = this.game.vet, cs = vet.activeCase(d.id);
    const fav = this.def(c).favToy;
    const nip = s.crops.catnip || 0;
    const nipOk = nip > 0 && this.cooldownReady(c, 'catnip', 6);
    const items = [
      { id: 'pet', label: 'Pet', icon: 'heart', ok: true },
      { id: 'wand', label: `Play: ${TOYS.wand}`, icon: 'wand', ok: true },
      { id: 'yarn', label: `Play: ${TOYS.yarn}`, icon: 'yarn', ok: true },
      { id: 'groom', label: 'Brush & groom', icon: 'brush', ok: true },
      { id: 'catnip', label: nip ? (nipOk ? `Catnip treat (${nip} left)` : 'Catnip treat (had one recently)') : 'Catnip treat (grow catnip!)', icon: 'catnip', ok: nipOk },
      this.dressItem(c),
      { id: 'stats', label: 'Stats card', icon: 'stats', ok: true },
    ];
    if (cs) {
      if (cs.stage === 'noticed') items.push({ id: 'clinic', label: 'Take to the clinic', icon: 'clinic', ok: true, highlight: true });
    }
    void fav;
    return items;
  }

  doCare(c, id) {
    const g = this.game, s = this.state, d = c.data, n = d.needs, def = this.def(c), name = d.name;
    const p = this.personality(c);
    const cs = g.vet.activeCase(d.id);
    c.task = { type: 'interact', t: 2.6 };
    c.heading = Math.atan2(g.lady.group.position.x - c.pos.x, g.lady.group.position.z - c.pos.z);
    g.lady.act();
    switch (id) {
      case 'feed': {
        if (g.api_food.consume(1) < 1) { g.host.say('The pantry is empty, dearie. Harvest some crops and cook them in the kitchen!', 5); c.task = null; return; }
        const ill = cs && cs.issue === 'stomach';
        n.hunger = Math.min(100, n.hunger + (ill ? 20 : 40));
        c.task = { type: 'interact', t: 3.2, anim: 'eat', bowl: true };
        this.showBowl(c);
        g.floatAt(c.pos, ill ? `${name} nibbles a little` : `${name} munches happily`, '#5b4256', 'food');
        if (this.cooldownOk(c, 'feed', 3)) this.addBond(c, 1);
        if (!d.discovered.treat) { d.discovered.treat = true; g.journal.log(`${name}'s favorite treat flavor is ${def.favTreat}.`, d.id); }
        sound.play('eat');
        break;
      }
      case 'pet': {
        n.affection = Math.min(100, n.affection + (def.personality === 'shy' && this.level(c) < 2 ? 15 : 25));
        c.task = { type: 'interact', t: 2.6, anim: 'sit' };
        g.particles.emit(c.pos.clone().setY(c.pos.y + 0.6), { color: '#f26d8f', count: 6, speed: 0.4, up: 1.2, gravity: 0.5, size: 0.05, emissive: true, life: 1.2 });
        this.flashIcon(c, 'heart');
        if (def.personality === 'shy' && this.level(c) < 2) g.floatAt(c.pos, `${name} leans into your hand, just a little`, '#5b4256', 'heart');
        else g.floatAt(c.pos, `${name} purrs`, '#c95c74', 'heart');
        if (this.cooldownOk(c, 'pet', 1.5)) this.addBond(c, 1);
        sound.play('purr');
        break;
      }
      case 'wand': case 'yarn': {
        const fav = def.favToy === id;
        n.fun = Math.min(100, n.fun + (fav ? 45 : 28));
        c.task = { type: 'interact', t: 2.8, anim: 'pounce' };
        c.model.pounce(); setTimeout(() => c.model.pounce(), 900);
        g.particles.emit(c.pos.clone().setY(c.pos.y + 0.3), { color: id === 'wand' ? '#c8aaf2' : '#f58fa8', count: 8, speed: 0.9, up: 1.8, size: 0.04 });
        if (fav && !d.discovered.toy) {
          d.discovered.toy = true;
          g.journal.log(`${name} LOVES the ${TOYS[id]}! Favorite toy discovered.`, d.id);
          g.host.say(`Look at ${pron('{him}', def)} go! ${name} absolutely loves the ${TOYS[id]}.`, 5);
        }
        g.floatAt(c.pos, fav ? `${name} goes wild for the ${TOYS[id]}!` : `${name} bats at the ${TOYS[id]}`, '#7a5bb5', id === 'wand' ? 'wand' : 'yarn');
        if (this.cooldownOk(c, 'play', 1.5)) this.addBond(c, fav ? 2 : 1);
        sound.play('play');
        break;
      }
      case 'groom': {
        n.clean = Math.min(100, n.clean + 30); n.affection = Math.min(100, n.affection + 5);
        c.task = { type: 'interact', t: 2.8, anim: 'sit' };
        g.particles.emit(c.pos.clone().setY(c.pos.y + 0.4), { color: '#ffe27a', count: 8, speed: 0.5, up: 1, gravity: 0.6, size: 0.035, emissive: true });
        g.floatAt(c.pos, cs && cs.issue === 'fleas' ? 'Brushing helps, but those fleas need the vet' : `${name}'s coat is all shiny`, '#5b4256', 'brush');
        if (this.cooldownOk(c, 'groom', 3)) this.addBond(c, 1);
        sound.play('brush');
        break;
      }
      case 'catnip': {
        if ((s.crops.catnip || 0) <= 0 || !this.cooldownOk(c, 'catnip', 6)) { c.task = null; return; }
        s.crops.catnip--;
        n.fun = Math.min(100, n.fun + 35); n.affection = Math.min(100, n.affection + 15);
        c.task = { type: 'interact', t: 3.4, anim: 'pounce' };
        c.model.pounce(); setTimeout(() => c.model.pounce(), 700); setTimeout(() => c.model.pounce(), 1400);
        g.particles.emit(c.pos.clone().setY(c.pos.y + 0.4), { color: '#8fd36f', count: 10, speed: 0.8, up: 1.6, gravity: 0.5, size: 0.04, emissive: true, life: 1.3 });
        g.particles.emit(c.pos.clone().setY(c.pos.y + 0.5), { color: '#c8aaf2', count: 8, speed: 0.6, up: 1.4, gravity: 0.4, size: 0.035, emissive: true, life: 1.3 });
        this.flashIcon(c, 'sparkle', 1.8);
        g.floatAt(c.pos, `${name} rolls around in the catnip, blissed out!`, '#5f9f4c', 'catnip');
        this.addBond(c, 2);
        if (!d.firsts.catnip) { d.firsts.catnip = true; g.journal.log(`${name} tried garden-grown catnip for the first time and did three zoomies laps.`, d.id); }
        sound.play('purr');
        break;
      }
      case 'dress': this.dress(c); break;
      case 'stats': c.task = null; g.statsCard.open(c); break;
      case 'clinic': this.escort(c); break;
      default: break;
    }
    void p; void s;
  }

  /* ---------------- knitted costumes ---------------- */
  costumeColors(c) {
    const P = [['#e56f95', '#fff6ec'], ['#7fc4b4', '#fff6ec'], ['#f5b04f', '#c95c74'], ['#b9a0dc', '#ffd76e'], ['#9fd0ef', '#ffffff'], ['#d9534f', '#fff6ec'], ['#8fd36f', '#f6c6d6']];
    let h = 0; for (const ch of (c.data || c).id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return P[h % P.length];
  }
  applyCostume(c) { c.model.setCostume?.(c.data.costume || {}, this.costumeColors(c)); }
  wearing(c) { const k = c.data.costume || {}; return [k.sweater && 'knit sweater', k.hat && 'bobble hat'].filter(Boolean); }
  dressItem(c) {
    const w = this.state.wardrobe, k = c.data.costume || {};
    if (!k.sweater && w.sweater > 0) return { id: 'dress', label: `Dress up: knit sweater (${w.sweater})`, icon: 'yarn', ok: true };
    if (!k.hat && w.hat > 0) return { id: 'dress', label: `Dress up: bobble hat (${w.hat})`, icon: 'yarn', ok: true };
    if (k.sweater || k.hat) return { id: 'dress', label: 'Take the costume off', icon: 'yarn', ok: true };
    return { id: 'dress', label: 'Dress up (knit one first: T, Knitting)', icon: 'yarn', ok: false };
  }
  dress(c) {
    const g = this.game, s = this.state, w = s.wardrobe, d = c.data, k = (d.costume ||= {});
    let put = null;
    if (!k.sweater && w.sweater > 0) { k.sweater = true; w.sweater--; put = 'sweater'; }
    else if (!k.hat && w.hat > 0) { k.hat = true; w.hat--; put = 'hat'; }
    else { if (k.sweater) w.sweater++; if (k.hat) w.hat++; k.sweater = k.hat = false; }
    this.applyCostume(c);
    c.task = { type: 'interact', t: 2.6, anim: put ? 'sit' : 'stretch' };
    if (put) {
      const p = this.personality(c), fussy = /independent|shy/i.test(this.def(c).personality);
      const lines = fussy ? [`${d.name} is NOT amused 😾`, `${d.name} tolerates the ${put}. Barely.`, `${d.name} glares. Fashion is pain.`] : [`${d.name} looks ADORABLE 😻`, `${d.name} struts like a supermodel!`, `So cozy! ${d.name} purrs in the ${put}`];
      g.floatAt(c.pos, lines[Math.floor(Math.random() * lines.length)], '#c95c74', 'yarn');
      g.particles.emit(c.pos.clone().setY(c.pos.y + 0.45), { color: '#f58fa8', count: 10, speed: 0.6, up: 1.2, gravity: 0.6, size: 0.035, emissive: true });
      this.addBond(c, fussy ? 0 : 1); sound.play(fussy ? 'nope' : 'purr');
      if (!d.firsts.costume) { d.firsts.costume = true; g.journal.log(`Granny dressed ${d.name} in a hand-knitted ${put}. ${fussy ? 'Revenge is being plotted.' : 'Photos were taken. So many photos.'}`, d.id); }
      void p;
    } else g.floatAt(c.pos, `${d.name} wriggles free. Naked and proud!`, '#8d7388');
    g.save();
  }

  showBowl(c) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.06, 12), new THREE.MeshStandardMaterial({ color: '#f4a3b5', roughness: 0.6 }));
    const f = new THREE.Vector3(Math.sin(c.heading), 0, Math.cos(c.heading));
    bowl.position.copy(c.pos).addScaledVector(f, 0.42 * this.def(c).scale); bowl.position.y = c.pos.y + 0.03;
    const food = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 10), new THREE.MeshStandardMaterial({ color: '#b9784a' }));
    food.position.y = 0.03; bowl.add(food);
    this.game.scene.add(bowl);
    setTimeout(() => { this.game.scene.remove(bowl); bowl.geometry.dispose(); }, 3400);
  }
  flashIcon(c, kind, t = 1.6) { c.iconKind = kind; c.iconT = t; }

  /** New arrival / stray actions and walking a cat to the clinic. */
  escort(c) {
    c.data.mode = c.data.joined ? 'free' : c.data.mode;
    c.escort = true; c.task = { type: 'escort' };
    this.game.host.say(c.data.joined ? `Come along, ${c.data.name}. We'll get you checked at the clinic.` : 'Come along, sweetie, the clinic is just past the garden. I\'ll walk with you.', 5);
    sound.play('meow');
  }
  befriend(c) {
    const g = this.game, d = c.data, def = this.def(c);
    const usedFood = g.state.food > 0 && g.api_food.consume(1) > 0;
    d.trust += usedFood ? 2 : 1;
    g.lady.act();
    if (usedFood) this.showBowl(c);
    g.particles.emit(c.pos.clone().setY(0.6), { color: '#f26d8f', count: 4, speed: 0.3, up: 0.8, gravity: 0.3, size: 0.045, emissive: true, life: 1.2 });
    if (d.trust >= 2) {
      d.mode = 'new';
      this.refreshTag(c);
      g.host.say(`${pron('{He}', def)} trusts you now! ${pron('Walk {him} to the clinic for {his} Welcome Vet Check.', def).replace(/^w/, 'W')}`, 7);
      g.journal.log(`The shy stray ${usedFood ? 'ate from your hand' : 'crept out to sniff your fingers'} and decided to trust you.`, d.id);
      c.task = { type: 'wait' };
    } else {
      g.floatAt(c.pos, usedFood ? 'The stray sniffs the food... and eats!' : 'You sit quietly. The stray inches a little closer.', '#5b4256', 'heart');
      g.host.say(usedFood ? 'Food helps! A little more patience, dearie.' : 'Good, slow and gentle. Try once more. A little cat food would help too.', 5);
    }
    sound.play('purr');
    g.save();
  }

  /* ---------------- per frame ---------------- */
  update(dt, hours, t) {
    const s = this.state, g = this.game;
    this.checkArrivals(dt);
    this.simulate(hours);
    // meals at 8 AM and 6 PM: the bowls in the Cats' House get filled from the pantry
    const h = s.hour;
    [8, 18].forEach((m) => { if (this.prevHour < m && h >= m) this.mealTime(m); });
    this.prevHour = h;

    const lp = g.lady.group.position;
    this.ladyStill = lp.distanceTo(this.lastLadyPos) < 0.01 ? this.ladyStill + dt : 0;
    this.lastLadyPos.copy(lp);
    for (const c of this.list) this.brain(c, dt, t);
    this.separate();
    this.updateDeparting(dt, t);
  }

  /* ---------------- adoption ---------------- */
  /** Is this cat ready to go to a forever home? Returns { ok, why }. */
  adoptable(c) {
    const d = c.data, cs = this.game.vet.activeCase(d.id);
    if (!d.joined) return { ok: false, why: 'Still settling in' };
    if (cs) return { ok: false, why: cs.stage === 'kennel' || cs.stage === 'healed' ? 'Still in the clinic' : 'Needs a vet check first' };
    if (this.level(c) < 3) return { ok: false, why: `Needs 3 bond hearts (has ${this.level(c)})` };
    if (d.health < 75) return { ok: false, why: 'Needs to be healthier' };
    if (this.happiness(c) < 55) return { ok: false, why: 'Needs to be happier' };
    return { ok: true, why: 'Healthy, happy & bonded' };
  }
  /** Adoption fee: higher for healthier, happier, more bonded cats (and a bonus for a perfect match). */
  adoptionFee(c, wants) {
    const match = this.def(c).personality === wants;
    return Math.round(30 + this.level(c) * 12 + this.happiness(c) * 0.3 + c.data.health * 0.2 + (match ? 20 : 0));
  }
  /** Say goodbye: the cat leaves with the adopter, coins are paid and the slot frees up. */
  adoptOut(c, adopter, fee) {
    const g = this.game, s = this.state, d = c.data, def = this.def(c);
    s.coins += fee;
    s.adopted.push({ id: d.id, name: d.name, day: s.day, family: adopter.name, fee, look: def.look, coat: def.coat, personality: def.personality, bond: this.level(c), def });
    s.cats = s.cats.filter((x) => x !== d);
    delete s.bowls[d.id];
    if (d.slot >= 0) { g.world.catsHouse.setBedName(d.slot, ''); g.world.catsHouse.setBowl(d.slot, false); }
    this.list = this.list.filter((x) => x !== c);
    if (g.catMenu.cat === c) g.catMenu.close();
    if (g.statsCard?.cat === c) g.statsCard.close();
    c.leaving = { follow: adopter.npc, t: 0 };
    c.model.setIcon('heart'); c.model.setTag(`${d.name} ♥ ${adopter.name}`, 'name');
    this.departing.push(c);
    g.journal.log(`Goodbye, ${d.name}! ${pron('{She}', def)} went home with ${adopter.name}, ${adopter.who}. Adoption fee: ${fee} coins.`, d.id, { photo: { id: d.id, name: d.name, look: def.look, family: adopter.name } });
    s.stats.adopted = (s.stats.adopted || 0) + 1;
    sound.play('bond');
    g.save();
  }
  updateDeparting(dt, t) {
    for (const c of this.departing) {
      const L = c.leaving, tgt = L.follow ? L.follow.position : new THREE.Vector3(0, 0, 16);
      const dx = tgt.x - c.pos.x, dz = tgt.z - c.pos.z, dist = Math.hypot(dx, dz);
      let anim = 'sit';
      if (dist > 0.9) { c.heading = Math.atan2(dx, dz); const st = Math.min(dist - 0.9, 2.2 * dt); c.pos.x += Math.sin(c.heading) * st; c.pos.z += Math.cos(c.heading) * st; anim = 'walk'; }
      c.pos.y += (this.game.world.groundHeight(c.pos.x, c.pos.z) - c.pos.y) * Math.min(1, dt * 10);
      c.model.group.rotation.y = c.heading;
      c.model.setAnim(anim); c.model.update(dt, t, anim === 'walk' ? 2.2 : 0);
      L.t += dt;
      if (L.done || L.t > 40) { this.game.scene.remove(c.model.group); c.gone = true; }
    }
    this.departing = this.departing.filter((c) => !c.gone);
  }

  simulate(hours) {
    if (hours <= 0) return;
    const s = this.state;
    const joined = this.joined();
    // each litter box gets used by the (up to two) cats assigned to it (cats in the clinic kennels use the kennel tray)
    joined.forEach((c) => { if (this.inKennel(c)) return; const b = this.boxOf(c); s.litterBoxes[b] = Math.min(1, (s.litterBoxes[b] || 0) + hours * 0.03); });
    for (const c of joined) {
      const n = c.data.needs, p = this.personality(c), sleeping = c.model.anim === 'sleep', asleep = sleeping ? 0.5 : 1;
      const kennel = this.inKennel(c);
      n.hunger -= hours * 4 * (p.hungerDecay || 1) * asleep;
      n.fun -= hours * 3.2 * (p.funDecay || 1) * asleep * (kennel ? 0.5 : 1);
      n.clean -= hours * (kennel ? 1.2 : s.litterBoxes[this.boxOf(c)] > 0.6 ? 3.2 : 1.6);
      n.affection -= hours * 2.8 * (p.affectionDecay || 1) * asleep;
      n.energy += hours * (sleeping ? 14 : -3.2 * (p.energyDecay || 1));
      NEED_KEYS.forEach((k) => (n[k] = THREE.MathUtils.clamp(n[k], MIN_NEED, 100)));
      this.wellbeing(c, hours);
      c.data.pos.x = c.pos.x; c.data.pos.z = c.pos.z;
    }
    this.game.world.catsHouse.setLitter(s.litterBoxes);
  }

  /**
   * Health: drifts up when a cat is fed, clean and loved, and down with neglect or while sick.
   * Cozy for now: it never falls below NEGLECT.floor. onDecline is the hook for future stakes.
   */
  wellbeing(c, hours) {
    const d = c.data, n = d.needs, cs = this.game.vet.activeCase(d.id);
    const neglected = n.hunger < 20 || n.clean < 20 || (n.affection < 15 && n.fun < 15);
    let target = 100;
    if (cs && cs.issue && cs.stage !== 'retry') target = 45 + Math.min(100, cs.heal || 0) * 0.5; // sick: health follows the healing bar
    else if (cs && cs.issue) target = 60;
    if (neglected) target = Math.min(target, 40);
    const rate = d.health > target ? (neglected ? 2.5 : 4) : 3;
    d.health += THREE.MathUtils.clamp(target - d.health, -rate * hours, rate * hours);
    if (d.health <= NEGLECT.floor) { d.health = NEGLECT.floor; if (neglected) this.onDecline(c, hours); }
    d.health = Math.min(100, d.health);
  }
  /** FUTURE: real consequences of long neglect (decline, and later passing away). Intentionally does nothing yet. */
  onDecline(c, hours) { if (!NEGLECT.enabled) return; void c; void hours; }

  /** Which litter box a cat uses (one box for every two slots). */
  boxOf(c) { const slot = Math.max(0, (c.data || c).slot ?? 0); return Math.min(this.game.world.catsHouse.litter.length - 1, Math.floor(slot / 2)); }
  bowl(c) { return this.game.world.catsHouse.bowls[c.data.slot]; }
  bed(c) { return this.game.world.catsHouse.beds[Math.max(0, c.data.slot)]; }
  /** Is this cat staying in a clinic kennel right now (admitted for treatment)? */
  inKennel(c) { const cs = this.game.vet.activeCase((c.data || c).id); return !!(cs && (cs.stage === 'kennel' || cs.stage === 'healed')); }
  inRecovery(c) { return this.inKennel(c); }

  /** Fill the bowls in the Cats' House from the pantry; the cats then trot over to eat.
   *  scheduled = the 8 AM / 6 PM meal (only hungry cats get a bowl). Returns how many bowls were filled. */
  serveMeals(scheduled = false, hour = 8) {
    const g = this.game, s = this.state, house = g.world.catsHouse;
    const want = this.joined().filter((c) => !s.bowls[c.data.id] && (!scheduled || c.data.needs.hunger < 90));
    if (!want.length) return 0;
    let filled = 0;
    for (const c of want) {
      if (g.api_food.consume(1) < 1) break;
      if (this.inKennel(c)) { // staying at the clinic: the meal is brought to the kennel
        const ill = g.vet.activeCase(c.data.id)?.issue === 'stomach';
        c.data.needs.hunger = Math.min(100, c.data.needs.hunger + (ill ? 25 : 45));
      } else { s.bowls[c.data.id] = true; house.setBowl(c.data.slot, true); }
      filled++;
    }
    const meal = hour < 12 ? 'Breakfast' : 'Supper';
    if (scheduled) {
      if (filled < want.length) g.host.say(`${meal} time, but we ran out of cat food. The kitties are a bit peckish. Let's order a bag at the Farmers Market, dearie!`, 7);
      else g.host.say(`${meal} is served in the Cats' House! ${filled} bowl${filled > 1 ? 's' : ''} filled from the pantry.`, 5);
    }
    if (filled) sound.play('pickup');
    g.save();
    return filled;
  }
  mealTime(hour) { this.serveMeals(true, hour); }

  /** When she sleeps: favorite (high-bond) cats pile onto her bed, the rest curl up in their own beds in the Cats' House. */
  pileForNight() {
    this.joined().forEach((c) => (c.data.needs.energy = 100)); // a good night's sleep for everyone
    const cats = this.joined().filter((c) => !this.inKennel(c) && !c.escort);
    // anything left in the bowls gets eaten before bed
    cats.forEach((c) => { if (this.state.bowls[c.data.id]) { this.state.bowls[c.data.id] = false; this.game.world.catsHouse.setBowl(c.data.slot, false); c.data.needs.hunger = Math.min(100, c.data.needs.hunger + 40); } });
    // the three closest friends (bond 3+) get her bed; everyone else has their own bed in the Cats' House
    const friends = cats.filter((c) => this.level(c) >= 3).sort((a, b) => b.data.bondXP - a.data.bondXP);
    const pile = friends.slice(0, BED_PILE.length), own = cats.filter((c) => !pile.includes(c));
    pile.forEach((c, i) => {
      const spot = BED_PILE[i % BED_PILE.length];
      c.pos.set(spot[0], spot[1], spot[2]); c.path = [];
      c.task = { type: 'sleepAt', spot: new THREE.Vector3(spot[0], spot[1], spot[2]), t: 25 + i * 6 };
      c.heading = i * 2.1;
    });
    own.forEach((c, i) => {
      const b = this.bed(c); c.pos.copy(b.spot); c.path = [];
      c.task = { type: 'sleepAt', spot: b.spot.clone(), t: 20 + i * 5 }; c.heading = 2.6 + i;
    });
    const names = (l) => l.length > 1 ? `${l.slice(0, -1).map((c) => c.data.name).join(', ')} and ${l[l.length - 1].data.name}` : l[0].data.name;
    if (pile.length) this.game.journal.log(`${names(pile)} piled onto your bed for a cozy night.`, pile.length === 1 ? pile[0].data.id : null);
    if (own.length) this.game.journal.log(`${names(own)} slept snug in ${own.length > 1 ? 'their own beds' : 'their own bed'} at the Cats' House.`, own.length === 1 ? own[0].data.id : null);
  }


  isNight() { const h = this.state.hour; return h >= 21 || h < 6; }

  /* ---------------- behavior ---------------- */
  brain(c, dt, t) {
    const g = this.game, d = c.data, lp = g.lady.group.position;
    const dist = Math.hypot(lp.x - c.pos.x, lp.z - c.pos.z);
    const lively = (0.6 + 0.4 * (d.joined ? this.happiness(c) / 100 : 0.8)) * (g.vet.activeCase(d.id) ? 0.7 : 1);
    const cs = g.vet.activeCase(d.id);
    let anim = 'stand', moveTo = null, speed = 0.85 * lively;
    c.timer -= dt;

    if (g.vet.examCat === c) {
      c.pos.lerp(EXAM_SPOT, Math.min(1, dt * 8)); c.heading = 0;
      anim = g.vet.catAnim || 'sit';
    } else if (c.escort) {
      if (dist > 12) { c.pos.set(lp.x - Math.sin(g.lady.group.rotation.y) * 1.2, lp.y, lp.z - Math.cos(g.lady.group.rotation.y) * 1.2); }
      if (dist > 1.1) { moveTo = this.routeTarget(c, lp); speed = dist > 3 ? 3.4 : 1.8; } else { anim = 'sit'; c.heading = Math.atan2(lp.x - c.pos.x, lp.z - c.pos.z); }
    } else if (d.mode === 'stray') {
      anim = dist < 4 ? 'hide' : 'sit';
      c.heading = Math.atan2(lp.x - c.pos.x, lp.z - c.pos.z) + (dist < 4 ? 0 : 1.2);
    } else if (d.mode === 'new') {
      anim = 'sit';
      if (dist < 5) c.heading = Math.atan2(lp.x - c.pos.x, lp.z - c.pos.z);
    } else if (this.inKennel(c)) {
      // admitted: walk to the kennel, hop in and rest there until healed
      const k = g.vet.kennelOf(cs);
      if (!c.caged) {
        moveTo = this.goTo(c, k.front, 0.7); speed = 1.3;
        if (!moveTo || c.pos.distanceTo(k.front) > 30 || c.stuck > 1.5) { c.caged = true; moveTo = null; this.hop(c); c.path = []; c.stuck = 0; }
      }
      if (c.caged) {
        moveTo = null;
        c.pos.lerp(k.spot, Math.min(1, dt * 6)); c.heading = -Math.PI / 2;
        c.kT = (c.kT || 0) - dt;
        if (c.kT <= 0) { c.kT = 6 + Math.random() * 8; c.kAnim = cs.stage === 'healed' ? (Math.random() < 0.5 ? 'stand' : 'sit') : ['sleep', 'sleep', 'sit', ISSUES[cs.issue]?.anim || 'sit'][Math.floor(Math.random() * 4)]; }
        anim = c.kAnim || 'sleep';
      }
    } else {
      if (c.caged) { c.caged = false; }
      // the porch swing ride ends as soon as she stands up (or something more important comes along)
      if (c.onSwing && (!c.task || c.task.type !== 'swing')) this.leaveSwing(c, true);
      // regular free-roaming cat: a full bowl in the Cats' House beats everything else
      if (this.state.bowls[d.id] && (!c.task || (c.task.type !== 'eat' && c.task.type !== 'interact' && c.task.type !== 'emote'))) c.task = { type: 'eat', t: 90 };
      if (!c.task || (c.task.t !== undefined && (c.task.t -= dt) <= 0)) c.task = this.decide(c, dist, cs);
      const task = c.task;
      switch (task.type) {
        case 'interact': anim = task.anim || 'sit'; break;
        case 'idle': anim = task.anim; break;
        case 'wander': moveTo = this.goTo(c, task.dest, 0.3); if (!moveTo) c.task = { type: 'idle', anim: ['sit', 'groom', 'stretch', 'stand'][Math.floor(Math.random() * 4)], t: 3 + Math.random() * 5 }; break;
        case 'sleepAt': moveTo = this.goTo(c, task.spot, 0.12); anim = moveTo ? 'walk' : 'sleep'; break;
        case 'eat': {
          const b = this.bowl(c);
          if (!b || !this.state.bowls[d.id]) { c.task = null; break; }
          moveTo = this.goTo(c, b.eatPos, 0.12); speed = Math.max(speed, 1.6);
          if (!moveTo) {
            anim = 'eat'; c.heading = Math.atan2(b.pos.x - c.pos.x, b.pos.z - c.pos.z);
            task.eatT = (task.eatT || 0) + dt;
            if (task.eatT > 3.5) this.finishMeal(c);
          }
          break;
        }
        case 'follow': {
          if (dist > 1.6) { moveTo = this.routeTarget(c, lp); speed = dist > 3.5 ? 2.6 : 1.3; } else { anim = 'sit'; c.heading = Math.atan2(lp.x - c.pos.x, lp.z - c.pos.z); }
          break;
        }
        case 'napNear': {
          if (dist > 4) { c.task = null; break; }
          if (dist > 1.0) { moveTo = this.routeTarget(c, lp); speed = 1.2; } else anim = 'sleep';
          break;
        }
        case 'gift': {
          if (dist > 1.2) { moveTo = this.routeTarget(c, lp); speed = 1.6; } else { this.giveGift(c); c.task = { type: 'idle', anim: 'sit', t: 4 }; }
          break;
        }
        case 'emote': { // reacting to Granny: run over, sit in a ring, dance, bat at yarn, swarm her...
          const tgt = task.spot || lp;
          const dd = Math.hypot(tgt.x - c.pos.x, tgt.z - c.pos.z);
          if (!task.arrived && dd > (task.near ?? 0.25)) {
            moveTo = task.spot ? this.goTo(c, task.spot, task.near ?? 0.2) : this.routeTarget(c, lp);
            speed = task.speed || 2.4;
            if (!moveTo || c.stuck > 1.5) task.arrived = true;
          } else task.arrived = true;
          if (task.arrived) {
            moveTo = null;
            if (task.spot && task.snap) c.pos.lerp(task.spot, Math.min(1, dt * 6));
            anim = task.anim || 'sit';
            const look = task.look || lp;
            c.heading = task.spin ? c.heading + dt * task.spin : Math.atan2(look.x - c.pos.x, look.z - c.pos.z);
            if (task.hop) { task.hopT = (task.hopT ?? Math.random() * task.hop) - dt; if (task.hopT <= 0) { task.hopT = task.hop * (0.7 + Math.random() * 0.6); c.model.pounce(); task.onHop?.(c); } }
            if (!task.greeted) { task.greeted = true; task.onArrive?.(c); }
            task.tick?.(c, dt);
          }
          break;
        }
        case 'symptom': anim = ISSUES[cs?.issue]?.anim || 'sit'; break;
        case 'swing': {   // joining her on a seat: the porch swing, the sofa beside her, or her lap
          if (!g.sitting || (c.seat && g.sitting.seat !== c.seat)) { c.task = null; break; }
          const seat = g.sitting.seat; c.seat = seat;
          if (!c.onSwing) {
            moveTo = this.goTo(c, seat.catFront, 0.3); speed = Math.max(speed, 1.5);
            if (!moveTo || c.stuck > 1.5) { c.onSwing = true; c.path = []; this.hop(c); this.swingJoined(c, seat); }
          }
          if (c.onSwing) {
            moveTo = null;
            if (seat.kind === 'swing') { const v = new THREE.Vector3(); seat.swing.catAnchor.getWorldPosition(v); c.pos.copy(v); }
            else c.pos.copy(seat.catPos);
            c.heading = seat.catHeading;
            task.st = (task.st || 0) + dt;
            anim = task.st > 14 ? 'sleep' : 'sit';
            if (Math.floor(task.st) % 5 === 0 && Math.floor(task.st - dt) % 5 !== 0) d.needs.affection = Math.min(100, d.needs.affection + 3);
          }
          break;
        }
        default: break;
      }
      // bond 1+: say hello when she comes close
      if (d.joined && this.level(c) >= 1 && dist < 2.2 && !c.saidHi) { c.saidHi = true; this.flashIcon(c, 'heart', 1.4); sound.play('meow'); }
      if (dist > 5) c.saidHi = false;
    }

    // movement
    if (moveTo) {
      const dx = moveTo.x - c.pos.x, dz = moveTo.z - c.pos.z, len = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      c.heading += Math.atan2(Math.sin(want - c.heading), Math.cos(want - c.heading)) * Math.min(1, dt * 8);
      // slow down while turning sharply, so cats never orbit a waypoint they keep overshooting
      const face = Math.max(0.15, Math.cos(Math.atan2(Math.sin(want - c.heading), Math.cos(want - c.heading))));
      const step = Math.min(len, speed * dt * face);
      c.pos.x += Math.sin(c.heading) * step; c.pos.z += Math.cos(c.heading) * step;
      c.speed = speed; anim = speed > 2 ? 'walk' : 'walk';
      // stuck? (pushed back by a fence or wall)
      c.stuck = len > c.lastD - step * 0.3 ? c.stuck + dt : 0;
      c.lastD = len;
      // no progress for ~2 s: hop to the next door waypoint (or the target) with a little sparkle
      if (c.stuck > 2) {
        c.stuck = 0; c.lastD = Infinity;
        if (c.path.length) { const w = c.path.shift(); c.pos.set(w.x, c.pos.y, w.z); this.hop(c); }
        else if (c.task && c.task.type === 'wander') c.task = null;
        else { c.pos.x = moveTo.x; c.pos.z = moveTo.z; this.hop(c); }
      }
    } else c.speed = 0;
    if (g.vet.examCat !== c && !c.caged && !c.onSwing) {
      const sp0 = c.task && c.task.spot, perched = sp0 && sp0.y > 0.45 && Math.hypot(sp0.x - c.pos.x, sp0.z - c.pos.z) < 0.35;
      if (!perched) this.game.world.resolve(c.pos, 0.2);
      // height: floors, and hopping up onto perches (bed, hay, cat bed) when standing on them
      const ground = this.game.world.groundHeight(c.pos.x, c.pos.z);
      const spot = c.task && c.task.spot;
      const perch = spot && Math.hypot(spot.x - c.pos.x, spot.z - c.pos.z) < 0.6 && !moveTo ? spot.y : 0;
      const target = Math.max(ground, perch);
      c.pos.y += (target - c.pos.y) * Math.min(1, dt * 10);
    }
    c.model.group.rotation.y = c.heading;
    c.model.setAnim(moveTo ? 'walk' : anim);
    c.model.update(dt, t, moveTo ? c.speed : 0);

    // floating marker
    let icon = null;
    if (c.iconT > 0) { c.iconT -= dt; icon = c.iconKind; }
    else if (!d.joined) icon = d.mode === 'stray' ? 'question' : 'new';
    else if (cs && cs.stage === 'noticed') icon = ISSUES[cs.issue].thought;
    else if (cs && cs.stage === 'healed') icon = 'sparkle';
    else if (cs && cs.stage === 'kennel' && g.vet.careDue(cs) && dist < 10) icon = 'heart';
    else if (c.model.anim === 'sleep' && dist < 9) icon = 'zzz';
    c.model.setIcon(g.vet.examCat === c ? null : icon);
    c.model.setBandage(!!(cs && cs.bandaged && cs.stage !== 'closed'));
    c.model.showTag(g.vet.examCat !== c && (!d.joined || dist < 6));
  }

  decide(c, dist, cs) {
    const d = c.data, lvl = this.level(c), lp = this.game.lady.group.position, def = this.def(c);
    // night: off to bed. Favorite (bond 3+) cats head for her bed in the cottage, the rest to their own bed in the Cats' House
    if (this.isNight()) {
      if (lvl >= 3) {
        const i = this.joined().filter((o) => this.level(o) >= 3 && !this.inKennel(o)).sort((a, b) => b.data.bondXP - a.data.bondXP).indexOf(c);
        if (i >= 0 && i < BED_PILE.length) { const spot = BED_PILE[i]; return { type: 'sleepAt', spot: new THREE.Vector3(spot[0], spot[1], spot[2]), t: 40 }; }
      }
      return { type: 'sleepAt', spot: this.bed(c).spot.clone(), t: 40 };
    }
    // a little unwell: show soft cues
    if (cs && cs.stage === 'noticed' && Math.random() < 0.6) return { type: 'symptom', t: 5 + Math.random() * 4 };
    // bond 4+: once a day bring a little gift
    if (lvl >= 4 && d.lastGiftDay < this.state.day && this.state.hour > 9 && this.state.hour < 18 && dist < 14 && Math.random() < 0.35) {
      d.lastGiftDay = this.state.day; return { type: 'gift', t: 30 };
    }
    // bond 3+: nap near her when she's resting
    if (lvl >= 3 && this.ladyStill > 5 && dist < 9 && Math.random() < 0.6) {
      if (!d.firsts.napNear) { d.firsts.napNear = true; this.game.journal.log(`${d.name} curled up for a nap right next to you.`, d.id); }
      return { type: 'napNear', t: 30 };
    }
    // bond 2+: follow her around sometimes
    if (lvl >= 2 && dist < 8 && Math.random() < (def.personality === 'affectionate' ? 0.45 : 0.25)) {
      if (!d.firsts.follow) { d.firsts.follow = true; this.game.journal.log(`${d.name} started following you around the sanctuary.`, d.id); }
      return { type: 'follow', t: 18 + Math.random() * 10 };
    }
    // nap at the favorite spot (more often when a bit mopey)
    const napChance = this.happiness(c) < 40 ? 0.45 : 0.25;
    if (Math.random() < napChance) {
      const sp = SPOTS[def.favSpot];
      if (!d.discovered.spot) { d.discovered.spot = true; this.game.journal.log(`${d.name} claimed ${sp.label} as a favorite spot.`, d.id); }
      return { type: 'sleepAt', spot: new THREE.Vector3(sp.x, sp.y, sp.z), t: 20 + Math.random() * 20 };
    }
    // otherwise wander somewhere near home, or idle
    if (Math.random() < 0.55) {
      const home = this.homeArea(c);
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * home.r;
      return { type: 'wander', dest: new THREE.Vector3(home.x + Math.cos(a) * r, 0, home.z + Math.sin(a) * r), t: 20 };
    }
    void lp;
    return { type: 'idle', anim: ['sit', 'groom', 'stretch', 'stand', 'sit'][Math.floor(Math.random() * 5)], t: 3 + Math.random() * 5 };
  }

  /** She sat down (swing, sofa, chair...): the friendliest free cat nearby may come and hop up beside her or into her lap. */
  /** Free-roaming family cats within r metres of Granny (not in the clinic, an exam, a seat or leaving). */
  freeCats(r = 10) {
    const g = this.game, lp = g.lady.group.position;
    return this.joined().filter((c) => !c.escort && !c.leaving && !c.caged && !c.onSwing && !this.inKennel(c) && g.vet.examCat !== c
      && Math.hypot(c.pos.x - lp.x, c.pos.z - lp.z) < r).sort((a, b) => Math.hypot(a.pos.x - lp.x, a.pos.z - lp.z) - Math.hypot(b.pos.x - lp.x, b.pos.z - lp.z));
  }
  /** Have a cat react to Granny (see the 'emote' task in brain()). */
  react(c, task) { c.task = { type: 'emote', t: 8, ...task }; c.path = []; c.stuck = 0; return c; }
  inviteToSwing() {
    const g = this.game, lp = g.lady.group.position;
    const ok = this.joined().filter((c) => !c.escort && !c.leaving && !c.caged && !this.inKennel(c) && g.vet.examCat !== c && !g.vet.activeCase(c.data.id)
      && !this.state.bowls[c.data.id] && this.level(c) >= 1 && Math.hypot(c.pos.x - lp.x, c.pos.z - lp.z) < 26 && !(c.task && (c.task.type === 'eat' || c.task.type === 'interact')));
    if (!ok.length) return null;
    ok.sort((a, b) => b.data.bondXP - a.data.bondXP);
    const c = ok[0];
    c.task = { type: 'swing', t: 9999 }; c.path = [];
    return c;
  }
  swingJoined(c, seat) {
    const g = this.game, d = c.data;
    sound.play('meow'); this.flashIcon(c, 'heart', 2);
    const kind = seat.kind === 'swing' ? 'swing' : seat.lap ? 'lap' : 'beside';
    g.floatAt(c.pos, kind === 'lap' ? `${d.name} curls up in your lap` : `${d.name} hops up beside you`, '#c95c74', 'heart');
    if (this.cooldownOk(c, 'swing', 12)) { this.addBond(c, 1); d.needs.affection = Math.min(100, d.needs.affection + 10); }
    if (!d.firsts[kind]) {
      d.firsts[kind] = true;
      g.journal.log(kind === 'swing' ? `${d.name} hopped up on the porch swing and swung along with you.`
        : kind === 'lap' ? `${d.name} curled up in Granny's lap on the ${seat.noun} and purred and purred.`
        : `${d.name} snuggled up next to Granny on the ${seat.noun}.`, d.id);
    }
  }
  /** Off the seat (she stood up): hop down beside it. */
  leaveSwing(c, quiet = false) {
    if (!c) return;
    const seat = c.seat;
    if (c.onSwing) { c.onSwing = false; if (seat) c.pos.set(seat.catFront.x, seat.catFront.y, seat.catFront.z); if (!quiet) this.hop(c); }
    c.seat = null;
    if (c.task && c.task.type === 'swing') c.task = { type: 'idle', anim: 'stretch', t: 2.5 };
  }

  finishMeal(c) {
    const g = this.game, d = c.data, n = d.needs, ill = g.vet.activeCase(d.id)?.issue === 'stomach';
    this.state.bowls[d.id] = false; g.world.catsHouse.setBowl(d.slot, false);
    n.hunger = Math.min(100, n.hunger + (ill ? 20 : 45));
    g.floatAt(c.pos, ill ? `${d.name} nibbles a little` : `${d.name} licks the bowl clean`, '#5b4256', 'food');
    if (this.cooldownOk(c, 'feed', 3)) this.addBond(c, 1);
    if (!d.discovered.treat) { d.discovered.treat = true; g.journal.log(`${d.name}'s favorite treat flavor is ${this.def(c).favTreat}.`, d.id); }
    if (!d.firsts.bowl) { d.firsts.bowl = true; g.journal.log(`${d.name} ate from ${pron('{his}', this.def(c))} very own bowl at the Cats' House for the first time.`, d.id); }
    sound.play('eat');
    c.task = { type: 'idle', anim: 'groom', t: 3 + Math.random() * 3 };
    g.save();
  }

  homeArea(c) {
    const def = this.def(c);
    if (def.personality === 'shy') return { x: 5, z: -1, r: 4 };
    if (def.personality === 'playful') return { x: -5, z: 2.5, r: 4 };
    return { x: -1, z: -1.5, r: 3.5 };
  }

  giveGift(c) {
    const g = this.game, d = c.data;
    const gifts = [
      { text: 'a pretty flower', give: () => {} },
      { text: 'a fluffy feather', give: () => {} },
      { text: 'a packet of chamomile seeds', give: () => (g.state.seeds.chamomile = (g.state.seeds.chamomile || 0) + 1) },
      { text: 'two carrot seeds', give: () => (g.state.seeds.carrot += 2) },
    ];
    const gift = gifts[Math.floor(Math.random() * gifts.length)];
    gift.give();
    g.floatAt(c.pos, `${d.name} brought you ${gift.text}!`, '#c95c74', 'heart');
    g.journal.log(`${d.name} brought you ${gift.text}.`, d.id);
    g.host.say(`Aww, ${d.name} brought you ${gift.text}! That's cat for "I love you".`, 5);
    sound.play('pickup');
  }

  /** Walk toward a destination through doors; returns the next point to walk to, or null when there. */
  goTo(c, dest, tol) {
    if (!c.path.length || c.pathDest !== dest) { c.path = this.route(c.pos, dest); c.pathDest = dest; c.routeKey = null; }
    while (c.path.length) {
      const w = c.path[0];
      if (Math.hypot(w.x - c.pos.x, w.z - c.pos.z) > (c.path.length === 1 ? tol : 0.35)) return w;
      c.path.shift();
    }
    return null;
  }
  /** Next point to walk to when heading for a moving target (her): through doors when she's in another room. */
  routeTarget(c, lp) {
    const a = this.region(c.pos.x, c.pos.z), b = this.region(lp.x, lp.z);
    if (a === b) { if (c.routeKey) { c.path = []; c.routeKey = null; } return lp; }
    const key = a + '>' + b;
    // keep the planned door waypoints and tick them off as she reaches them
    // (re-planning every frame kept aiming at the first door point and the cat circled it)
    if (c.routeKey !== key || !c.path.length) { c.path = this.route(c.pos, lp).slice(0, -1); c.routeKey = key; c.pathDest = null; }
    while (c.path.length && Math.hypot(c.path[0].x - c.pos.x, c.path[0].z - c.pos.z) < 0.35) c.path.shift();
    return c.path.length ? c.path[0] : lp;
  }
  hop(c) { c.model.pounce(); this.flashIcon(c, 'sparkle', 0.9); }
  region(x, z) {
    const W = this.game.world;
    if (W.cottage.isInside(x, z)) return W.cottage.roomOf(x, z);   // living | kitchen | bedroom | bath
    if (W.clinic.isInside(x, z)) return 'clinic';
    if (W.catsHouse.isInside(x, z)) return 'barn';
    if (x > -4.9 && x < 4.9 && z > -6.6 && z < -4.1) return 'porch';
    return 'out';
  }
  route(from, dest) {
    const a = this.region(from.x, from.z), b = this.region(dest.x, dest.z);
    const pts = [];
    const graph = {
      out: { porch: 'out-porch', clinic: 'out-clinic', barn: 'out-barn' }, porch: { out: 'out-porch', living: 'porch-living' },
      living: { porch: 'porch-living', kitchen: 'living-kitchen', bedroom: 'living-bedroom', bath: 'living-bath' },
      kitchen: { living: 'living-kitchen' }, bedroom: { living: 'living-bedroom' }, bath: { living: 'living-bath' },
      clinic: { out: 'out-clinic' }, barn: { out: 'out-barn' },
    };
    const links = { ...LINKS, ...this.game.world.cottage.links };
    // breadth-first search over the regions (yard, porch, the 4 cottage rooms, clinic, Cats' House)
    const prev = { [a]: null }, q = [a];
    while (q.length) { const r = q.shift(); if (r === b) break; for (const n in graph[r]) if (!(n in prev)) { prev[n] = r; q.push(n); } }
    const chain = []; let r = b; while (r && r !== a) { chain.unshift([prev[r], r]); r = prev[r]; }
    for (const [x, y] of chain) {
      const key = graph[x][y]; let link = links[key].map(([px, pz]) => new THREE.Vector3(px, 0, pz));
      if (key.split('-')[0] !== x) link = link.reverse();
      pts.push(...link);
    }
    pts.push(dest.clone ? dest.clone() : new THREE.Vector3(dest.x, 0, dest.z));
    return pts;
  }

  separate() {
    const lp = this.game.lady.group.position;
    for (const c of this.list) {
      if (this.game.vet.examCat === c || c.model.anim === 'sleep' || c.caged) continue;
      const dx = c.pos.x - lp.x, dz = c.pos.z - lp.z, d = Math.hypot(dx, dz);
      if (d < 0.55 && d > 0.001) { c.pos.x += (dx / d) * (0.55 - d); c.pos.z += (dz / d) * (0.55 - d); }
      for (const o of this.list) {
        if (o === c || o.model.anim === 'sleep' || o.caged || (c.model.anim === 'eat' && o.model.anim === 'eat')) continue;
        const ex = c.pos.x - o.pos.x, ez = c.pos.z - o.pos.z, e = Math.hypot(ex, ez);
        if (e < 0.45 && e > 0.001) { c.pos.x += (ex / e) * (0.45 - e) * 0.5; c.pos.z += (ez / e) * (0.45 - e) * 0.5; }
      }
    }
  }

  /** Nearest cat she can interact with (in front of her, close by). */
  nearest(range = 1.6) {
    const lp = this.game.lady.group.position, h = this.game.lady.group.rotation.y;
    let best = null, bestScore = Infinity;
    for (const c of this.list) {
      if (this.game.vet.examCat === c) continue;
      const dx = c.pos.x - lp.x, dz = c.pos.z - lp.z, d = Math.hypot(dx, dz);
      if (d > range) continue;
      const facing = (Math.sin(h) * dx + Math.cos(h) * dz) / Math.max(d, 0.01);
      const score = d - facing * 0.6;
      if (facing < -0.2 && d > 0.8) continue;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }
}
