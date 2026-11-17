// The cats of the sanctuary: arrivals, soft needs, bond levels, behaviors and care.
// Nothing here is ever punishing: neglect only makes a cat a little less happy and lively.
import * as THREE from 'three';
import { createCat } from './catModel.js';
import { STARTER_CATS, PERSONALITIES, SPOTS, TOYS, BOND_LEVELS, bondLevel, ISSUES, pron } from './catData.js';
import { sound } from './sound.js';

const NEED_KEYS = ['hunger', 'fun', 'clean', 'affection'];
export const NEED_LABELS = { hunger: 'Full tummy', fun: 'Fun', clean: 'Clean & tidy', affection: 'Affection' };
const MIN_NEED = 8; // needs never hit zero: cats just get a bit mopey

// Doors and the porch steps: cats walk through these to get in and out of buildings.
const LINKS = {
  'out-porch': [[0, -3.4], [0, -4.7]],
  'porch-cottage': [[0, -5.9], [0, -7.4]],
  'out-clinic': [[-12, -4.9], [-12, -6.9]],
};
const BED_PILE = [[2.35, 0.9, -10.15], [2.85, 0.9, -9.85], [2.45, 0.9, -9.5]];
const NIGHT_SPOTS = [[-0.2, 0.37, -10.25], [0.6, 0.33, -8.8], [-1.5, 0.33, -8.5]];
export const EXAM_SPOT = new THREE.Vector3(-13.6, 0.95, -10.4);
export const RECOVERY_SPOT = new THREE.Vector3(-9.6, 0.1, -9.0);

export function defaultCatState(def) {
  return {
    id: def.id, arrived: false, named: false, name: '', joined: false, joinedDay: 0, trust: 0,
    pos: { x: def.spawn.x, z: def.spawn.z },
    needs: { hunger: 70, fun: 60, clean: 60, affection: 50 },
    bondXP: 0, discovered: { toy: false, spot: false, treat: false },
    firsts: {}, cd: {}, lastGiftDay: 0, mode: 'new',
  };
}

export class CatManager {
  constructor(game) {
    this.game = game;
    const s = game.state;
    this.defs = Object.fromEntries(STARTER_CATS.map((d) => [d.id, d]));
    // make sure every starter cat has a save entry (old saves get them added)
    s.cats = STARTER_CATS.map((d) => ({ ...defaultCatState(d), ...(s.cats || []).find((c) => c.id === d.id) }));
    s.cats.forEach((c) => { c.needs = { ...defaultCatState(this.defs[c.id]).needs, ...c.needs }; c.discovered ||= {}; c.firsts ||= {}; c.cd ||= {}; });
    this.list = [];
    s.cats.forEach((c) => c.arrived && this.spawn(c));
    this.arrivalTimer = 0;
    this.prevHour = s.hour;
    this.heartT = 0;
    this.ladyStill = 0;
    this.lastLadyPos = new THREE.Vector3();
  }

  get state() { return this.game.state; }
  absHours() { return this.state.day * 24 + this.state.hour; }
  def(c) { return this.defs[c.data ? c.data.id : c.id]; }
  joined() { return this.list.filter((c) => c.data.joined); }
  displayName(c) { const d = c.data || c; return d.named ? d.name : d.mode === 'stray' ? 'Shy stray' : 'New arrival'; }
  byId(id) { return this.list.find((c) => c.data.id === id); }
  level(c) { return bondLevel((c.data || c).bondXP); }
  personality(c) { return PERSONALITIES[this.def(c).personality]; }
  happiness(c) {
    const n = (c.data || c).needs;
    let h = 0.3 * n.hunger + 0.25 * n.fun + 0.2 * n.clean + 0.25 * n.affection;
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
    model.group.position.set(data.pos.x, 0, data.pos.z);
    this.game.scene.add(model.group);
    const c = { data, def, model, pos: model.group.position, heading: Math.random() * 6, task: null, timer: 1 + Math.random() * 2, speed: 0, path: [], stuck: 0, lastD: 0, perch: 0, iconT: 0, iconKind: null };
    this.list.push(c);
    this.refreshTag(c);
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
    if (!waiting) return;
    const def = this.defs[waiting.id];
    const prevAll = s.cats.slice(0, s.cats.indexOf(waiting)).every((c) => c.joined);
    if (!prevAll || s.day < def.arriveDay || s.hour < 7 || s.hour > 19) { this.arrivalTimer = 0; return; }
    this.arrivalTimer += dt;
    if (this.arrivalTimer < (def.arriveDay === 1 ? 10 : 4)) return;
    this.arrive(waiting);
  }

  arrive(data) {
    const def = this.defs[data.id];
    data.arrived = true; data.mode = def.arrival === 'stray' ? 'stray' : 'new';
    data.pos = { ...def.spawn };
    const c = this.spawn(data);
    c.task = { type: data.mode === 'stray' ? 'hide' : 'wait' };
    const g = this.game;
    sound.play('meow');
    if (data.mode === 'stray') {
      g.host.say(`Oh! There's a shy little stray hiding by the garden. Go slowly, dearie. Sit with ${def.sex === 'girl' ? 'her' : 'him'} quietly so ${def.sex === 'girl' ? 'she' : 'he'} learns to trust you.`, 9);
    } else {
      g.host.say(`A new arrival at the gate! ${def.sourceLabel}. Every new kitty gets a Welcome Vet Check first, so let's walk ${def.sex === 'girl' ? 'her' : 'him'} to the clinic.`, 9);
    }
    g.journal.log(`A new cat arrived: ${def.sourceLabel.toLowerCase()}.`, data.id);
    g.save();
  }

  /** Called by the vet when the Welcome Vet Check is done and the cat has a name. */
  welcome(id, name) {
    const c = this.byId(id), d = c.data;
    d.name = name; d.named = true; d.joined = true; d.joinedDay = this.state.day; d.mode = 'free';
    d.needs.affection = Math.max(d.needs.affection, 60);
    this.addBond(c, 2, true);
    this.refreshTag(c);
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
      this.game.host.say(`${d.name} and you are ${BOND_LEVELS[after].label.toLowerCase()}s now! ${pron(`{She} ${unlock}.`, this.def(c))}`, 6);
      this.game.journal.log(`${d.name} reached bond level ${after} (${BOND_LEVELS[after].label}): ${unlock}.`, d.id);
      sound.play('bond');
    }
  }
  cooldownOk(c, key, hours) {
    const now = this.absHours(), last = c.data.cd[key] ?? -99;
    if (now - last < hours) return false;
    c.data.cd[key] = now; return true;
  }

  /* ---------------- care actions (from the cat menu) ---------------- */
  menuFor(c) {
    const s = this.state, d = c.data, vet = this.game.vet, cs = vet.activeCase(d.id);
    const fav = this.def(c).favToy;
    const items = [
      { id: 'feed', label: s.food > 0 ? `Feed (${s.food} in pantry)` : 'Feed (pantry empty)', icon: 'food', ok: s.food > 0 },
      { id: 'pet', label: 'Pet', icon: 'heart', ok: true },
      { id: 'wand', label: `Play: ${TOYS.wand}`, icon: 'wand', ok: true },
      { id: 'yarn', label: `Play: ${TOYS.yarn}`, icon: 'yarn', ok: true },
      { id: 'groom', label: 'Brush & groom', icon: 'brush', ok: true },
    ];
    if (cs) {
      if (cs.stage === 'noticed') items.push({ id: 'clinic', label: 'Take to the clinic', icon: 'clinic', ok: true, highlight: true });
      if (cs.stage === 'followup') items.push({ id: 'followup', label: 'Follow-up check', icon: 'sparkle', ok: true, highlight: true });
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
      case 'clinic': this.escort(c); break;
      case 'followup': g.vet.followUp(c); break;
      default: break;
    }
    void p; void s;
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
    // meals at 8 AM and 6 PM from the porch bowls (eats from the pantry)
    const h = s.hour;
    [8, 18].forEach((m) => { if (this.prevHour < m && h >= m) this.mealTime(m); });
    this.prevHour = h;

    const lp = g.lady.group.position;
    this.ladyStill = lp.distanceTo(this.lastLadyPos) < 0.01 ? this.ladyStill + dt : 0;
    this.lastLadyPos.copy(lp);
    for (const c of this.list) this.brain(c, dt, t);
    this.separate();
  }

  simulate(hours) {
    if (hours <= 0) return;
    const s = this.state;
    const joined = this.joined();
    s.litter = Math.min(1, (s.litter || 0) + hours * 0.025 * joined.length);
    for (const c of joined) {
      const n = c.data.needs, p = this.personality(c), asleep = c.model.anim === 'sleep' ? 0.5 : 1;
      n.hunger -= hours * 4 * (p.hungerDecay || 1) * asleep;
      n.fun -= hours * 3.2 * (p.funDecay || 1) * asleep;
      n.clean -= hours * (s.litter > 0.6 ? 3.2 : 1.6);
      n.affection -= hours * 2.8 * (p.affectionDecay || 1) * asleep;
      NEED_KEYS.forEach((k) => (n[k] = THREE.MathUtils.clamp(n[k], MIN_NEED, 100)));
      c.data.pos.x = c.pos.x; c.data.pos.z = c.pos.z;
    }
    this.game.world.cottage.setLitter?.(s.litter);
  }

  mealTime(hour) {
    const g = this.game, hungry = this.joined().filter((c) => c.data.needs.hunger < 90);
    if (!hungry.length) return;
    let fed = 0;
    for (const c of hungry) {
      if (g.api_food.consume(1) < 1) break;
      const ill = g.vet.activeCase(c.data.id)?.issue === 'stomach';
      c.data.needs.hunger = Math.min(100, c.data.needs.hunger + (ill ? 20 : 45)); fed++;
    }
    if (fed < hungry.length) g.host.say(`${hour < 12 ? 'Breakfast' : 'Supper'} time, but the pantry ran out. The kitties are a bit peckish. Let's cook more cat food, dearie!`, 7);
    else if (fed) g.host.say(`${hour < 12 ? 'Breakfast' : 'Supper'} is served! ${fed} portion${fed > 1 ? 's' : ''} of cat food from the pantry.`, 5);
    g.save();
  }

  /** Puts every joined cat into the cottage for the night (called when you sleep). */
  pileForNight() {
    const cats = this.joined().filter((c) => !this.inRecovery(c) && !c.escort);
    cats.forEach((c, i) => {
      const spot = BED_PILE[i % BED_PILE.length];
      c.pos.set(spot[0], spot[1], spot[2]); c.path = [];
      c.task = { type: 'sleepAt', spot: new THREE.Vector3(spot[0], spot[1], spot[2]), t: 25 + i * 6 };
      c.heading = i * 2.1;
    });
    if (cats.length >= 2) {
      const names = cats.map((c) => c.data.name);
      this.game.journal.log(`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} piled onto the bed for a cozy night.`, null);
    } else if (cats.length === 1) {
      this.game.journal.log(`${cats[0].data.name} curled up at the foot of the bed for the night.`, cats[0].data.id);
    }
  }

  inRecovery(c) { const cs = this.game.vet.activeCase(c.data.id); return cs && cs.treatment === 'rest' && cs.stage === 'recovering'; }

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
    } else if (this.inRecovery(c)) {
      moveTo = this.goTo(c, RECOVERY_SPOT, 0.1); anim = moveTo ? 'walk' : 'sleep';
      if (!moveTo && c.pos.distanceTo(RECOVERY_SPOT) > 2) c.pos.copy(RECOVERY_SPOT);
    } else {
      // regular free-roaming cat
      if (!c.task || (c.task.t !== undefined && (c.task.t -= dt) <= 0)) c.task = this.decide(c, dist, cs);
      const task = c.task;
      switch (task.type) {
        case 'interact': anim = task.anim || 'sit'; break;
        case 'idle': anim = task.anim; break;
        case 'wander': moveTo = this.goTo(c, task.dest, 0.3); if (!moveTo) c.task = { type: 'idle', anim: ['sit', 'groom', 'stretch', 'stand'][Math.floor(Math.random() * 4)], t: 3 + Math.random() * 5 }; break;
        case 'sleepAt': moveTo = this.goTo(c, task.spot, 0.12); anim = moveTo ? 'walk' : 'sleep'; break;
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
        case 'symptom': anim = ISSUES[cs?.issue]?.anim || 'sit'; break;
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
      const step = Math.min(len, speed * dt);
      c.pos.x += Math.sin(c.heading) * step; c.pos.z += Math.cos(c.heading) * step;
      c.speed = speed; anim = speed > 2 ? 'walk' : 'walk';
      // stuck? (pushed back by a fence or wall)
      c.stuck = len > c.lastD - step * 0.3 ? c.stuck + dt : 0;
      c.lastD = len;
      if (c.stuck > 3) { c.stuck = 0; if (c.path.length) { const w = c.path.shift(); c.pos.set(w.x, c.pos.y, w.z); } else if (c.task && c.task.type === 'wander') c.task = null; else { c.pos.x = moveTo.x; c.pos.z = moveTo.z; } }
    } else c.speed = 0;
    if (g.vet.examCat !== c) {
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
    else if (cs && cs.stage === 'followup') icon = 'sparkle';
    else if (c.model.anim === 'sleep' && dist < 9) icon = 'zzz';
    c.model.setIcon(g.vet.examCat === c ? null : icon);
    c.model.showTag(g.vet.examCat !== c && (!d.joined || dist < 6));
  }

  decide(c, dist, cs) {
    const d = c.data, lvl = this.level(c), lp = this.game.lady.group.position, def = this.def(c);
    // night: head into the cottage to sleep
    if (this.isNight()) {
      const i = this.joined().indexOf(c);
      const spot = lvl >= 3 ? BED_PILE[i % 3] : NIGHT_SPOTS[i % 3];
      return { type: 'sleepAt', spot: new THREE.Vector3(spot[0], spot[1], spot[2]), t: 40 };
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
    if (!c.path.length || c.pathDest !== dest) { c.path = this.route(c.pos, dest); c.pathDest = dest; }
    while (c.path.length) {
      const w = c.path[0];
      if (Math.hypot(w.x - c.pos.x, w.z - c.pos.z) > (c.path.length === 1 ? tol : 0.35)) return w;
      c.path.shift();
    }
    return null;
  }
  routeTarget(c, lp) {
    const a = this.region(c.pos.x, c.pos.z), b = this.region(lp.x, lp.z);
    if (a === b) { c.path = []; return lp; }
    const p = this.route(c.pos, lp);
    return p.length > 1 ? p[0] : lp;
  }
  region(x, z) {
    const W = this.game.world;
    if (W.cottage.isInside(x, z)) return 'cottage';
    if (W.clinic.isInside(x, z)) return 'clinic';
    if (x > -3.9 && x < 3.9 && z > -6.6 && z < -4.1) return 'porch';
    return 'out';
  }
  route(from, dest) {
    const a = this.region(from.x, from.z), b = this.region(dest.x, dest.z);
    const pts = [];
    const graph = { out: { porch: 'out-porch', clinic: 'out-clinic' }, porch: { out: 'out-porch', cottage: 'porch-cottage' }, cottage: { porch: 'porch-cottage' }, clinic: { out: 'out-clinic' } };
    // breadth-first search over the 4 regions
    const prev = { [a]: null }, q = [a];
    while (q.length) { const r = q.shift(); if (r === b) break; for (const n in graph[r]) if (!(n in prev)) { prev[n] = r; q.push(n); } }
    const chain = []; let r = b; while (r && r !== a) { chain.unshift([prev[r], r]); r = prev[r]; }
    for (const [x, y] of chain) {
      const key = graph[x][y]; let link = LINKS[key].map(([px, pz]) => new THREE.Vector3(px, 0, pz));
      if (key.split('-')[0] !== x) link = link.reverse();
      pts.push(...link);
    }
    pts.push(dest.clone ? dest.clone() : new THREE.Vector3(dest.x, 0, dest.z));
    return pts;
  }

  separate() {
    const lp = this.game.lady.group.position;
    for (const c of this.list) {
      if (this.game.vet.examCat === c || c.model.anim === 'sleep') continue;
      const dx = c.pos.x - lp.x, dz = c.pos.z - lp.z, d = Math.hypot(dx, dz);
      if (d < 0.55 && d > 0.001) { c.pos.x += (dx / d) * (0.55 - d); c.pos.z += (dz / d) * (0.55 - d); }
      for (const o of this.list) {
        if (o === c || o.model.anim === 'sleep') continue;
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
