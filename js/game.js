// The sanctuary sim: Plow, Sow, Water, Harvest, then cook crops into cat food.
// Ties together the garden, clock, kitchen, UI, sounds and the Crazy Cat Lady's comments.
import * as THREE from 'three';
import { CROPS, CROP_IDS, DAILY_SEEDS, loadState, saveState, clearState } from './state.js';
import { Garden, GRID, tileAt, stageOf, tileCenter } from './garden.js';
import { DayCycle, DAY_SECONDS } from './time.js';
import { GameUI, TOOLS } from './ui.js';
import { Particles } from './particles.js';
import { sound } from './sound.js';

const TILE_COUNT = GRID.cols * GRID.rows;

export class Game {
  constructor({ scene, world, lady, host, camera, lights }) {
    Object.assign(this, { scene, world, lady, host, camera });
    this.state = loadState(TILE_COUNT);
    this.garden = new Garden(scene, this.state);
    this.day = new DayCycle(this.state, { ...lights, sky: world.sky, scene });
    this.particles = new Particles(scene);
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.playing = false;
    this.chatCooldown = 0;
    this.saveTimer = 0;
    this.action = null;
    this.firsts = {};

    this.ui = new GameUI({
      onSelectTool: (i, fromClick) => this.selectTool(i, fromClick),
      onUse: () => this.use(),
      onToggleMute: () => this.ui.setMuted(sound.toggle()),
      onReset: () => this.reset(),
    });
    this.ui.setMuted(sound.muted);

    this.day.onDawn = () => this.dawn();
    world.cottage.setFood(this.state.food);
    this.updateSeedBox();
    lady.setTool(TOOLS[this.state.tool].id === 'hands' ? 'basket' : TOOLS[this.state.tool].id);

    addEventListener('keydown', (e) => {
      if (!this.playing || e.repeat) return;
      if (/^Digit[1-4]$/.test(e.code)) this.selectTool(Number(e.code.slice(5)) - 1);
      else if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); this.use(); }
      else if (e.code === 'KeyQ') this.cycleSeed();
      else if (e.code === 'KeyM') this.ui.setMuted(sound.toggle());
    });
    addEventListener('pagehide', () => saveState(this.state));
    document.addEventListener('visibilitychange', () => document.hidden && saveState(this.state));
  }

  start() {
    this.playing = true;
    sound.unlock();
    this.ui.show(this.touch);
  }

  /* ---------------- tools ---------------- */
  selectTool(i, fromClick = false) {
    if (i === 1 && this.state.tool === 1 && fromClick) this.cycleSeed();
    this.state.tool = i;
    const id = TOOLS[i].id;
    this.lady.setTool(id === 'hands' ? 'basket' : id);
    sound.play('click');
  }
  cycleSeed() {
    const i = CROP_IDS.indexOf(this.state.seedType);
    this.state.seedType = CROP_IDS[(i + 1) % CROP_IDS.length];
    if (this.state.tool !== 1) this.selectTool(1);
    sound.play('click');
  }

  /* ---------------- what will E do right now? ---------------- */
  targetTile() {
    const p = this.lady.group.position, h = this.lady.group.rotation.y;
    const ahead = tileAt(p.x + Math.sin(h) * 0.7, p.z + Math.cos(h) * 0.7);
    return ahead >= 0 ? ahead : tileAt(p.x, p.z);
  }

  findAction() {
    const s = this.state, p = this.lady.group.position, W = this.world;
    const near = (q, r) => Math.hypot(p.x - q.x, p.z - q.z) < r;
    const crops = CROP_IDS.reduce((n, c) => n + s.crops[c], 0);
    if (W.cottage.isInside(p.x, p.z)) {
      if (near(W.cottage.stovePos, 1.3)) {
        return crops > 0
          ? { ok: true, label: `Cook ${crops} crop${crops > 1 ? 's' : ''} into cat food`, run: () => this.cook() }
          : { ok: false, label: 'Cat Food Kitchen: harvest crops, then cook them here' };
      }
      if (near(W.cottage.bedPos, 1.2)) return { ok: true, label: 'Sleep until morning', run: () => this.sleep() };
      if (near(W.cottage.pantryPos, 1.0)) return { ok: false, label: `Pantry: ${s.food} portion${s.food === 1 ? '' : 's'} of cat food` };
      return null;
    }
    if (near(W.seedBox.position, 1.6)) {
      return s.seedBoxDay < s.day
        ? { ok: true, label: "Collect today's free seeds", run: () => this.collectSeeds() }
        : { ok: false, label: 'Seed box is empty. It refills every morning' };
    }
    if (s.tool === 2 && near(W.pond, 4.4)) {
      return s.water < s.waterMax ? { ok: true, label: 'Fill the watering can', run: () => this.fillCan() } : { ok: false, label: 'Watering can is full' };
    }
    const i = this.targetTile();
    if (i >= 0) return this.tileAction(i);
    return null;
  }

  tileAction(i) {
    const s = this.state, t = s.tiles[i], tool = TOOLS[s.tool].id;
    const crop = t.crop && CROPS[t.crop];
    const base = { tile: i };
    if (t.state === 'grass') {
      return tool === 'hoe' ? { ...base, ok: true, label: 'Plow the soil', run: () => this.plow(i) } : { ...base, ok: false, label: 'Untilled soil. Plow it with the Hoe [1]' };
    }
    if (t.state === 'plowed') {
      if (tool === 'seeds') {
        const n = s.seeds[s.seedType], name = CROPS[s.seedType].name;
        return n > 0 ? { ...base, ok: true, label: `Plant ${name} (${n} left)`, run: () => this.plant(i) }
          : { ...base, ok: false, label: `No ${name} seeds. Press Q to switch, or visit the seed box` };
      }
      if (tool === 'can') return this.waterAction(i, 'soil');
      return { ...base, ok: false, label: `Plowed soil${t.wet ? ' (watered)' : ''}. Plant seeds [2]` };
    }
    // planted
    if (t.growth >= 1) {
      return tool === 'hands' ? { ...base, ok: true, label: `Harvest ${crop.name}`, run: () => this.harvest(i) }
        : { ...base, ok: false, label: `${crop.name} is ripe! Harvest with Hands [4]` };
    }
    if (tool === 'can' && !t.wet) return this.waterAction(i, crop.name);
    const pct = Math.floor(t.growth * 100);
    return { ...base, ok: false, label: t.wet ? `${crop.name} growing ${pct}% (watered today)` : `${crop.name} ${pct}%. Thirsty! Water it [3]` };
  }

  waterAction(i, what) {
    const s = this.state, t = s.tiles[i];
    if (t.wet) return { tile: i, ok: false, label: 'Already watered today' };
    if (s.water <= 0) return { tile: i, ok: false, label: 'Watering can is empty. Refill it at the pond' };
    return { tile: i, ok: true, label: `Water the ${what}`, run: () => this.water(i) };
  }

  use() {
    if (!this.playing) return;
    const a = this.findAction(); // always fresh (the tool may have changed since the last frame)
    if (a && a.ok && a.run) { a.run(); this.save(); }
    else { sound.play('nope'); if (a) this.floatAtLady(a.label.split('.')[0], '#8d7388'); }
  }

  /* ---------------- actions ---------------- */
  plow(i) {
    const t = this.state.tiles[i];
    if (t.state !== 'grass') return;
    t.state = 'plowed'; this.state.stats.plowed++;
    this.garden.refresh(i); this.lady.act(); sound.play('plow');
    this.particles.emit(tileCenter(i).setY(0.1), { color: '#9c6b4b', count: 12, speed: 1.4, up: 2.2, size: 0.05 });
    this.firstTime('plow', "That's it, dearie! Now pick the seeds [2] and plant something.");
  }
  plant(i) {
    const s = this.state, t = s.tiles[i];
    if (t.state !== 'plowed' || s.seeds[s.seedType] <= 0) return;
    t.state = 'planted'; t.crop = s.seedType; t.growth = 0;
    s.seeds[s.seedType]--; s.stats.planted++;
    this.garden.refresh(i); this.lady.act(); sound.play('seed');
    this.particles.emit(tileCenter(i).setY(0.2), { color: '#f3e2b3', count: 6, speed: 0.6, up: 1.2, size: 0.03 });
    this.firstTime('plant', 'A seed! Give it some water [3] so it can grow. Seeds only grow on days you water them.');
  }
  water(i) {
    const s = this.state, t = s.tiles[i];
    if (t.wet || s.water <= 0 || t.state === 'grass') return;
    t.wet = true; s.water--; s.stats.watered++;
    this.garden.refresh(i); this.lady.act(); sound.play('water');
    this.particles.emit(tileCenter(i).setY(0.7), { color: '#6cc4ef', count: 14, speed: 0.5, up: 0.3, gravity: 6, size: 0.04, spread: 0.6, life: 0.7 });
    if (s.water === 0) this.host.say('Out of water! Fill the can at the pond, dearie.', 4.5);
    else this.firstTime('water', "Lovely. Watered crops grow until the soil dries at dawn. They never wilt, so don't fret.");
  }
  harvest(i) {
    const s = this.state, t = s.tiles[i], c = t.crop;
    if (t.state !== 'planted' || t.growth < 1) return;
    s.crops[c]++; s.stats.harvested++;
    t.state = 'plowed'; t.crop = null; t.growth = 0;
    this.garden.refresh(i); this.lady.act(); sound.play('harvest');
    this.particles.emit(tileCenter(i).setY(0.4), { color: CROPS[c].color, count: 10, speed: 1, up: 2.5, size: 0.06 });
    this.particles.emit(tileCenter(i).setY(0.6), { color: '#ffe27a', count: 8, speed: 0.8, up: 1.5, gravity: 1, size: 0.04, emissive: true });
    this.floatAtLady(`+1 ${CROPS[c].name}`, '#5b4256', c);
    this.firstTime('harvest', 'A harvest! Take it to the Cat Food Kitchen in my cottage and cook it at the stove.');
  }
  cook() {
    const s = this.state;
    let made = 0;
    CROP_IDS.forEach((c) => { made += s.crops[c] * CROPS[c].food; s.crops[c] = 0; });
    s.food += made; s.stats.cooked += made;
    this.world.cottage.cook(3); this.world.cottage.setFood(s.food);
    this.lady.act(); sound.play('cook');
    this.floatAtLady(`+${made} cat food`, '#c95c74', 'food');
    this.host.say(`Mmm, smells purr-fect! ${made} portion${made > 1 ? 's' : ''} of cat food for the pantry.`, 5);
  }
  sleep() {
    this.playing = false; sound.play('sleep');
    this.host.say('Nighty night...', 2);
    this.ui.sleepFade(() => {
      const hours = this.day.hoursUntilDawn();
      const ripe = this.garden.grow(hours);
      this.day.sleep(); // triggers dawn()
      if (ripe.length) this.notifyRipe(ripe);
      this.playing = true; this.save();
    });
  }
  collectSeeds() {
    const s = this.state;
    CROP_IDS.forEach((c) => (s.seeds[c] += DAILY_SEEDS[c]));
    s.seedBoxDay = s.day; this.updateSeedBox();
    sound.play('pickup'); this.lady.act();
    this.floatAtLady(`+${DAILY_SEEDS.carrot} carrot, +${DAILY_SEEDS.cabbage} cabbage, +${DAILY_SEEDS.pumpkin} pumpkin seeds`, '#5b4256', 'seeds');
  }
  fillCan() {
    this.state.water = this.state.waterMax; sound.play('fill'); this.lady.act();
    const p = this.lady.group.position;
    this.particles.emit(new THREE.Vector3(p.x, 0.4, p.z), { color: '#8fd5ea', count: 10, speed: 1, up: 2, size: 0.04 });
    this.floatAtLady('Watering can full', '#3f8fb5', 'drop');
  }

  /* ---------------- daily rhythm ---------------- */
  dawn() {
    this.garden.dryAll();
    this.updateSeedBox();
    const ripe = this.garden.ripeCount, planted = this.garden.count((t) => t.state === 'planted' && t.growth < 1);
    let line = 'Good morning, dearie! Fresh seeds are in the seed box.';
    if (planted) line = 'Good morning! The soil dried overnight, so give the crops some water.';
    if (ripe) line += ` ${ripe} crop${ripe > 1 ? 's are' : ' is'} ripe and waiting. No rush, they never wilt!`;
    setTimeout(() => this.host.say(line, 7), 300);
    this.save();
  }
  notifyRipe(list) {
    if (this.chatCooldown > 0) return;
    const c = CROPS[this.state.tiles[list[0]].crop];
    this.host.say(list.length > 1 ? `${list.length} crops just ripened! They'll stay ripe until you pick them.` : `Ooh, a ${c.name.toLowerCase()} is ripe! It'll wait for you, no rush.`, 5);
    this.chatCooldown = 25;
  }
  updateSeedBox() { this.world.seedBox.packets.visible = this.state.seedBoxDay < this.state.day; }
  firstTime(key, line) { if (this.firsts[key] || this.state.stats[key + 'ed'] > 1) return; this.firsts[key] = true; this.host.say(line, 6); }

  /* ---------------- helpers ---------------- */
  floatAtLady(text, color, iconName) {
    const v = new THREE.Vector3(); this.lady.headAnchor.getWorldPosition(v); v.y -= 0.6; v.project(this.camera);
    this.ui.float(text, (v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, color, iconName);
  }
  save() { saveState(this.state); }
  reset() {
    if (!confirm('Start the garden over? Your crops, seeds and cat food will be reset.')) return;
    clearState(); location.reload();
  }

  /* ---------------- per frame ---------------- */
  update(dt, t) {
    // clock runs all the time (also on the title screen), crops grow while watered
    const hours = (24 / DAY_SECONDS) * dt;
    const ripe = this.garden.grow(hours);
    if (ripe.length && this.playing) this.notifyRipe(ripe);
    this.day.update(dt);
    this.chatCooldown -= dt;
    this.garden.animate(t);
    this.particles.update(dt);
    if (this.playing) {
      this.action = this.findAction();
      this.garden.showHighlight(this.action && this.action.tile !== undefined ? this.action.tile : -1, this.action && this.action.ok);
      this.ui.setPrompt(this.action, this.touch);
      this.saveTimer += dt;
      if (this.saveTimer > 5) { this.saveTimer = 0; this.save(); }
    } else {
      this.garden.showHighlight(-1);
    }
    this.ui.update(this.state, this.day);
  }

  /** Public API for future features (cats!) and testing. */
  api() {
    const g = this, s = this.state;
    return {
      state: s, garden: this.garden, day: this.day,
      food: {
        get count() { return s.food; },
        add(n) { s.food += n; g.world.cottage.setFood(s.food); g.save(); return s.food; },
        /** Cats eat: returns how many portions were actually available. */
        consume(n) { const eaten = Math.min(n, s.food); s.food -= eaten; g.world.cottage.setFood(s.food); g.save(); return eaten; },
      },
      debug: {
        skipHours(h) { const r = g.garden.grow(h); let left = h; while (left > 0) { const step = Math.min(left, 1); g.day.update((step * DAY_SECONDS) / 24); left -= step; } return r; },
        setTile(i, crop, growth = 0, wet = false) { const t = s.tiles[i]; if (crop) Object.assign(t, { state: 'planted', crop, growth, wet }); else Object.assign(t, { state: growth ? 'plowed' : 'grass', crop: null, growth: 0, wet }); g.garden.refresh(i); },
        setHour(h) { s.hour = h; g.day.apply(); },
        give(obj) { Object.entries(obj).forEach(([k, v]) => { if (k in s.crops) s.crops[k] += v; else if (k === 'food') s.food += v; }); g.world.cottage.setFood(s.food); },
        action: () => g.findAction(),
        use: () => g.use(),
      },
    };
  }
}
