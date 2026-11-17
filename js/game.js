// The sanctuary sim: Plow, Sow, Water, Harvest, then cook crops into cat food.
// Ties together the garden, clock, kitchen, UI, sounds and the Crazy Cat Lady's comments.
import * as THREE from 'three';
import { CROPS, CROP_IDS, FOOD_CROPS, DAILY_SEEDS, loadState, saveState, clearState } from './state.js';
import { Garden, GRID, tileAt, stageOf, tileCenter } from './garden.js';
import { DayCycle, DAY_SECONDS } from './time.js';
import { GameUI, TOOLS } from './ui.js';
import { Particles } from './particles.js';
import { sound } from './sound.js';
import { CatManager } from './cats.js';
import { Vet } from './vet.js';
import { Journal } from './journal.js';
import { CatMenu } from './catMenu.js';
import { ISSUES } from './catData.js';

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
      onSleep: () => this.sleep(),
      onToggleMute: () => this.ui.setMuted(sound.toggle()),
      onReset: () => this.reset(),
      onJournal: () => this.journal.toggle(),
    });
    this.ui.setMuted(sound.muted);

    // the cats, the vet and the journal
    const s0 = this.state;
    const g0 = this;
    this.api_food = {
      get count() { return s0.food; },
      add(n) { s0.food += n; g0.world.cottage.setFood(s0.food); g0.save(); return s0.food; },
      /** Cats eat: returns how many portions were actually available. */
      consume(n) { const eaten = Math.min(n, s0.food); s0.food -= eaten; g0.world.cottage.setFood(s0.food); g0.save(); return eaten; },
    };
    this.camView = null;      // close-up camera during vet exams
    this.locked = false;      // true while an exam is open (she stands still)
    this.journalOpen = false;
    this.journal = new Journal(this);
    this.cats = new CatManager(this);
    this.vet = new Vet(this);
    this.catMenu = new CatMenu(this);

    this.day.onDawn = () => this.dawn();
    this.day.onBedtime = () => this.bedtime();
    world.cottage.setFood(this.state.food);
    this.updateSeedBox();
    lady.setTool(TOOLS[this.state.tool].id === 'hands' ? 'basket' : TOOLS[this.state.tool].id);

    addEventListener('keydown', (e) => {
      if (!this.playing || e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!this.vet.naming.classList.contains('hidden')) return;
      if (e.code === 'KeyJ') { this.catMenu.close(); this.journal.toggle(); return; }
      if (e.code === 'Escape') { if (this.journalOpen) this.journal.toggle(false); else if (this.catMenu.isOpen) this.catMenu.close(); else if (this.vet.exam && this.vet.exam.step === 'checks') this.vet.close(false); return; }
      if (this.journalOpen || this.locked) { if (e.code === 'Space') e.preventDefault(); return; }
      if (this.catMenu.isOpen) {
        if (/^Digit[1-9]$/.test(e.code)) { this.catMenu.key(Number(e.code.slice(5))); return; }
        if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); this.catMenu.close(); return; }
      }
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
    const crops = FOOD_CROPS.reduce((n, c) => n + s.crops[c], 0);
    const table = this.vet.tableAction();
    if (table && table.ok) return table;
    // at the cottage bed, Sleep wins (even with cats piled on the bed)
    if (W.cottage.isInside(p.x, p.z) && near(W.cottage.bedPos, 1.2)) return this.bedAction();
    // a cat right in front of her (farming tools still win on a tile they can work)
    const cat = this.cats.nearest(1.6);
    if (cat && !cat.escort) {
      const tile = this.targetTile();
      const tileA = tile >= 0 && TOOLS[s.tool].id !== 'hands' ? this.tileAction(tile) : null;
      if (!(tileA && tileA.ok)) return this.catAction(cat);
    }
    if (table) return table;
    if (cat) return this.catAction(cat);
    if (W.cottage.isInside(p.x, p.z)) {
      if (near(W.cottage.stovePos, 1.3)) {
        return crops > 0
          ? { ok: true, label: `Cook ${crops} crop${crops > 1 ? 's' : ''} into cat food`, run: () => this.cook() }
          : { ok: false, label: 'Cat Food Kitchen: harvest crops, then cook them here' };
      }
      if (near(W.cottage.bedPos, 1.2)) return this.bedAction();
      if (near(W.cottage.pantryPos, 1.0)) return { ok: false, label: `Pantry: ${s.food} portion${s.food === 1 ? '' : 's'} of cat food` };
      return null;
    }
    if (W.catsHouse.isInside(p.x, p.z)) return this.catsHouseAction(p);
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

  catAction(c) {
    const d = c.data, name = this.cats.displayName(c);
    if (c.escort) return { ok: false, label: `${d.named ? d.name : 'The new arrival'} is walking with you. Head to the clinic exam table` };
    if (d.mode === 'stray') return { ok: true, label: this.state.food > 0 ? 'Sit quietly with the stray (offer a little food)' : 'Sit quietly with the shy stray', run: () => this.cats.befriend(c) };
    if (!d.joined) return { ok: true, label: 'Walk the new arrival to the clinic for a Welcome Vet Check', run: () => this.cats.escort(c) };
    const cs = this.vet.activeCase(d.id);
    const extra = cs && cs.stage === 'noticed' ? ' (seems a little off)' : cs && cs.stage === 'followup' ? ' (follow-up due)' : '';
    return { ok: true, label: `Care for ${name}${extra}`, run: () => this.catMenu.open(c) };
  }

  /** What E does inside the Cats' House: feeding station, litter boxes, the cats' beds. */
  catsHouseAction(p) {
    const s = this.state, H = this.world.catsHouse, cats = this.cats;
    const near = (q, r) => Math.hypot(p.x - q.x, p.z - q.z) < r;
    if (near(H.feedPos, 1.25)) {
      const joined = cats.joined();
      if (!joined.length) return { ok: false, label: 'Feeding station: no cats live here yet' };
      const empty = joined.filter((c) => !s.bowls[c.data.id]);
      if (!empty.length) return { ok: false, label: 'All the bowls are full. The cats are on their way!' };
      if (s.food <= 0) return { ok: false, label: 'Pantry is empty. Cook cat food in the cottage kitchen' };
      const n = Math.min(empty.length, s.food);
      return { ok: true, label: `Fill ${n} food bowl${n > 1 ? 's' : ''} (${s.food} in the pantry)`, run: () => this.feedCats() };
    }
    const bi = H.litter.findIndex((b) => near(b.pos, 0.95));
    if (bi >= 0) {
      const users = cats.joined().filter((c) => cats.boxOf(c) === bi).map((c) => c.data.name);
      const whose = users.length ? ` (${users.join(' & ')})` : '';
      return (s.litterBoxes[bi] || 0) > 0.12 ? { ok: true, label: `Scoop litter box ${bi + 1}${whose}`, run: () => this.cleanLitter(bi) } : { ok: false, label: `Litter box ${bi + 1}${whose}: fresh and clean` };
    }
    const bed = H.beds.find((b) => near(b.pos, 0.95));
    if (bed) return { ok: false, label: bed.name ? `${bed.name}'s cozy bed` : 'A cozy bed, ready for the next cat' };
    return null;
  }
  feedCats() {
    const n = this.cats.serveMeals(false);
    this.lady.act();
    const p = this.world.catsHouse.bowls[0].pos;
    this.particles.emit(new THREE.Vector3(p.x - 0.2, 0.4, p.z + 0.6), { color: '#f4a3b5', count: 10, speed: 0.6, up: 1.4, gravity: 0.5, size: 0.045, emissive: true, life: 1.2 });
    this.floatAtLady(`Filled ${n} bowl${n > 1 ? 's' : ''}. Dinner time, kitties!`, '#c95c74', 'food');
    if (!this.state.flags.fedHouse) { this.state.flags.fedHouse = true; this.host.say("Shake the scoop and they come running! Each cat has their own bowl. The food comes from the pantry we cook in the kitchen.", 7); }
    else this.host.say('Here kitty kitty! Dinner is served.', 4);
  }
  cleanLitter(i) {
    const s = this.state;
    s.litterBoxes[i] = 0; this.world.catsHouse.setLitter(s.litterBoxes);
    this.cats.joined().filter((c) => this.cats.boxOf(c) === i).forEach((c) => (c.data.needs.clean = Math.min(100, c.data.needs.clean + 25)));
    this.lady.act(); sound.play('scoop');
    const b = this.world.catsHouse.litter[i].pos;
    this.particles.emit(new THREE.Vector3(b.x, 0.4, b.z + 0.7), { color: '#ffe27a', count: 8, speed: 0.5, up: 1, gravity: 0.6, size: 0.035, emissive: true });
    this.floatAtLady('Litter box all fresh', '#3f8fb5', 'sparkle');
    if (!s.flags.scooped) { s.flags.scooped = true; this.host.say('Thank you, dearie! A clean litter box makes for happy kitties.', 5); }
  }

  /** Tapping/clicking a cat in the world (handy on phones). */
  tapCat(c) {
    if (!this.playing || this.locked || this.journalOpen) return false;
    const p = this.lady.group.position;
    if (Math.hypot(p.x - c.pos.x, p.z - c.pos.z) > 3) { this.floatAt(c.pos, `${this.cats.displayName(c)}: come a little closer`, '#8d7388'); return true; }
    const a = this.catAction(c);
    if (a && a.ok && a.run) { a.run(); this.save(); } else if (a) this.floatAt(c.pos, a.label, '#8d7388');
    return true;
  }

  /** Floating text over a point in the world. */
  floatAt(pos, text, color, iconName) {
    const v = new THREE.Vector3(pos.x, pos.y + 0.9, pos.z).project(this.camera);
    this.ui.float(text, (v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, color, iconName);
  }

  use() {
    if (!this.playing || this.locked || this.journalOpen) return;
    if (this.catMenu.isOpen) { this.catMenu.close(); return; }
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
    FOOD_CROPS.forEach((c) => { made += s.crops[c] * CROPS[c].food; s.crops[c] = 0; });
    s.food += made; s.stats.cooked += made;
    this.world.cottage.cook(3); this.world.cottage.setFood(s.food);
    this.lady.act(); sound.play('cook');
    this.floatAtLady(`+${made} cat food`, '#c95c74', 'food');
    this.host.say(`Mmm, smells purr-fect! ${made} portion${made > 1 ? 's' : ''} of cat food for the pantry.`, 5);
  }
  /** The cottage bed: Sleep from 6 PM on (at 10 PM you have to). */
  bedAction() {
    if (this.state.hour < 18) return { ok: false, label: 'Your cozy bed. You can turn in from 6 PM (bedtime is 10 PM)' };
    return { ok: true, sleep: true, label: this.day.bedtime ? 'Sleep (wake up at 6 AM)' : 'Go to bed early (wake up at 6 AM)', run: () => this.sleep() };
  }
  /** 10 PM: the clock stops until she goes to bed. */
  bedtime() {
    if (!this.playing) return;
    sound.play('page');
    this.host.say("It's bedtime, dearie! The clock waits for us. Head to the bed in the cottage and press Sleep.", 9);
    this.ui.toast('Bedtime: time stops until you sleep in the cottage bed');
  }
  sleep() {
    if (!this.playing || this.state.hour < 18) return;
    this.catMenu.close?.();
    this.ui.sleepBtn.classList.add('hidden');
    this.playing = false; sound.play('sleep');
    this.host.say('Nighty night...', 2);
    this.ui.sleepFade(() => {
      const hours = this.day.hoursUntilDawn();
      const ripe = this.garden.grow(hours);
      this.cats.simulate(hours * 0.6); // cats sleep through the night too
      this.cats.pileForNight();
      this.day.sleep(); // triggers dawn()
      this.cats.prevHour = this.state.hour;
      if (ripe.length) this.notifyRipe(ripe);
      this.playing = true; this.save();
    });
  }
  collectSeeds() {
    const s = this.state;
    CROP_IDS.forEach((c) => (s.seeds[c] += DAILY_SEEDS[c]));
    s.seedBoxDay = s.day; this.updateSeedBox();
    sound.play('pickup'); this.lady.act();
    this.floatAtLady(`+${DAILY_SEEDS.carrot} carrot, +${DAILY_SEEDS.cabbage} cabbage, +${DAILY_SEEDS.pumpkin} pumpkin, +${DAILY_SEEDS.chamomile} chamomile seeds`, '#5b4256', 'seeds');
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
    if (this.cats.joined().length) line = `Good morning! Let's check on the cats: a pet, a play and breakfast at 8. ${line.replace(/^Good morning[!,]\s*(dearie!\s*)?/, '')}`;
    this.vet.dawn();
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
    if (!confirm('Start the sanctuary over? Your garden, cat food, cats and journal will all be reset.')) return;
    clearState(); location.reload();
  }

  /* ---------------- per frame ---------------- */
  update(dt, t) {
    // clock runs all the time (also on the title screen), crops grow while watered
    // (it stops at 10 PM until she sleeps, so hours is 0 at bedtime)
    const hours = this.day.update(dt);
    const ripe = hours > 0 ? this.garden.grow(hours) : [];
    if (ripe.length && this.playing) this.notifyRipe(ripe);
    this.chatCooldown -= dt;
    // gentle bedtime reminders while the clock waits
    if (this.playing && this.day.bedtime && !this.locked) {
      this.bedNag = (this.bedNag ?? 40) - dt;
      if (this.bedNag <= 0) { this.bedNag = 45; if (!(this.action && this.action.sleep)) this.host.say("Yawn... it's bedtime, dearie. Head to bed in the cottage whenever you're ready.", 6); }
    } else this.bedNag = 40;
    this.garden.animate(t);
    this.particles.update(dt);
    this.cats.update(dt, hours, t);
    this.catMenu.update();
    const joined = this.cats.joined();
    const waiting = this.cats.list.find((c) => !c.data.joined);
    if (joined.length) {
      const avg = joined.reduce((n, c) => n + this.cats.happiness(c), 0) / joined.length;
      const off = joined.find((c) => this.vet.activeCase(c.data.id)?.stage === 'noticed');
      const fu = joined.find((c) => this.vet.activeCase(c.data.id)?.stage === 'followup');
      this.ui.setCats(`${joined.length}`, off ? `${off.data.name} seems a little off` : fu ? `${fu.data.name}: follow-up due` : waiting ? 'A new cat is waiting for you!' : avg >= 70 ? 'Happy, purring cats' : avg >= 45 ? 'Cats are content' : 'Cats would love some attention');
    } else this.ui.setCats('0', waiting ? (waiting.data.mode === 'stray' ? 'A shy stray is by the garden' : 'A new arrival is at the gate!') : 'The first cat arrives soon...');
    if (this.playing && (this.locked || this.journalOpen || this.catMenu.isOpen)) {
      this.action = null; this.garden.showHighlight(-1); this.ui.setPrompt(null, this.touch);
    } else if (this.playing) {
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
      food: this.api_food,
      cats: {
        list: () => g.cats.list.map((c) => ({ id: c.data.id, name: c.data.name, named: c.data.named, joined: c.data.joined, mode: c.data.mode, escort: !!c.escort, bond: g.cats.level(c), bondXP: c.data.bondXP, happiness: Math.round(g.cats.happiness(c)), needs: { ...c.data.needs }, x: +c.pos.x.toFixed(2), y: +c.pos.y.toFixed(2), z: +c.pos.z.toFixed(2), anim: c.model.anim, task: c.task && c.task.type })),
      },
      vet: { get knowledge() { return g.vet.knowledge; }, cases: () => s.cases, get exam() { return g.vet.exam && { step: g.vet.exam.step, kind: g.vet.exam.kind, settled: g.vet.exam.settled }; } },
      journal: { moments: () => s.journal.moments, open: (v) => g.journal.toggle(v) },
      debug: {
        skipHours(h) { const r = g.garden.grow(h); g.cats.simulate(h); let left = h; while (left > 0) { const step = Math.min(left, 1); g.day.update((step * DAY_SECONDS) / 24); left -= step; } return r; },
        setTile(i, crop, growth = 0, wet = false) { const t = s.tiles[i]; if (crop) Object.assign(t, { state: 'planted', crop, growth, wet }); else Object.assign(t, { state: growth ? 'plowed' : 'grass', crop: null, growth: 0, wet }); g.garden.refresh(i); },
        setHour(h) { s.hour = h; g.day.apply(); },
        give(obj) { Object.entries(obj).forEach(([k, v]) => { if (k in s.crops) s.crops[k] += v; else if (k === 'food') s.food += v; }); g.world.cottage.setFood(s.food); },
        action: () => g.findAction(),
        arriveNext() { const w = s.cats.find((c) => !c.arrived); if (w) g.cats.arrive(w); return w && w.id; },
        /** Skip a cat straight into the family (for testing / screenshots). */
        welcome(id, name) { const c = g.cats.byId(id) || g.cats.spawn(Object.assign(s.cats.find((x) => x.id === id), { arrived: true })); s.cats.find((x) => x.id === id).arrived = true; g.cats.welcome(id, name); return c.data; },
        startCase(id, issue) { return g.vet.startCase(g.cats.byId(id), issue); },
        dawn: () => g.dawn(),
        bond(id, xp) { const c = g.cats.byId(id); c.data.bondXP = xp; },
        placeCat(id, x, z, y = 0) { const c = g.cats.byId(id); c.pos.set(x, y, z); c.path = []; c.task = { type: 'idle', anim: 'sit', t: 20 }; },
        pile: () => g.cats.pileForNight(),
        use: () => g.use(),
      },
    };
  }
}
