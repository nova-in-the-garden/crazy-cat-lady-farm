// The sanctuary sim: grow veggies for Granny's own meals (and catnip treats),
// buy cat food and clinic supplies with coins from adoptions, and care for up to 10 cats.
// Ties together the garden, clock, kitchen, UI, sounds and Granny's comments.
import * as THREE from 'three';
import { CROPS, CROP_IDS, FOOD_CROPS, MAIL_SEEDS, MAIL_MAX, MAIL_WEIGHTS, SUPPLY_LABELS, COFFEE_SECONDS, COFFEE_PERK, COFFEE_SPEED, DISHES_MAX, defaultState, restoreState } from './state.js';
import { writeSlot } from './saves.js';
import { Garden, GRID, tileAt, stageOf, tileCenter } from './garden.js';
import { DayCycle } from './time.js';
import { GameUI, TOOLS } from './ui.js';
import { Particles } from './particles.js';
import { sound } from './sound.js';
import { CatManager } from './cats.js';
import { Vet } from './vet.js';
import { Journal } from './journal.js';
import { CatMenu } from './catMenu.js';
import { ISSUES, MAX_CATS } from './catData.js';
import { Shop } from './shop.js';
import { StatsCard } from './statsCard.js';
import { Adoption } from './adoption.js';
import { Delivery } from './delivery.js';
import { Emotes, scrubPose } from './emotes.js';
import { Faint } from './faint.js';
import { Hairballs } from './hairballs.js';
import { Fishing } from './fishing.js';
import { Bingo } from './bingo.js';
import { DUSK, DAWN } from './time.js';

const TILE_COUNT = GRID.cols * GRID.rows;

export class Game {
  constructor({ scene, world, lady, host, camera, lights, slot = 1, savedState = null }) {
    Object.assign(this, { scene, world, lady, host, camera });
    this.slot = slot;           // which browser save slot (1-3) this sanctuary lives in
    this.state = savedState ? restoreState(savedState, TILE_COUNT) : defaultState(TILE_COUNT);
    this.isNewGame = !savedState;
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
      onSave: () => this.save({ toast: 'Game saved 🐾' }),
      onMenu: () => this.mainMenu(),
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
    this.statsCard = new StatsCard(this);
    this.shop = new Shop(this);
    this.adoption = new Adoption(this);
    this.delivery = new Delivery(this);
    this.emotes = new Emotes(this);
    this.faint = new Faint(this);
    this.hairballs = new Hairballs(this);
    this.fishing = new Fishing(this);
    this.bingo = new Bingo(this);
    this.fainted = false;
    this.shopOpen = false; this.adoptOpen = false;
    this.needNag = 60;

    this.day.onDawn = () => this.dawn();
    this.day.onBedtime = () => this.bedtime();
    world.cottage.setFood(this.state.food);
    world.cottage.setDishes(this.state.dishes);
    this.updateMailbox();
    lady.setTool(TOOLS[this.state.tool].id === 'hands' ? 'basket' : TOOLS[this.state.tool].id);

    addEventListener('keydown', (e) => {
      if (!this.playing || e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!this.vet.naming.classList.contains('hidden')) return;
      if (e.code === 'KeyJ') { this.catMenu.close(); this.statsCard.close(); this.journal.toggle(); return; }
      if (this.fishing.active) {
        if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); this.fishing.press(); }
        else if (e.code === 'Escape') this.fishing.stop();
        return;
      }
      if (this.bingo.active) return;
      if (this.emotes.wheelOpen) {
        if (/^Digit[1-8]$/.test(e.code)) { this.emotes.key(Number(e.code.slice(5))); return; }
        if (e.code === 'Escape' || e.code === 'KeyT') { this.emotes.toggleWheel(false); return; }
      }
      if (e.code === 'KeyT' && !this.blocked) { this.emotes.toggleWheel(); return; }
      if (e.code === 'Escape') {
        if (this.journalOpen) this.journal.toggle(false); else if (this.shopOpen) this.shop.toggle(false); else if (this.adoptOpen) this.adoption.close();
        else if (this.statsCard.isOpen) this.statsCard.close(); else if (this.catMenu.isOpen) this.catMenu.close(); else if (this.vet.exam && this.vet.exam.step === 'checks') this.vet.close(false);
        return;
      }
      if (this.blocked) { if (e.code === 'Space') e.preventDefault(); return; }
      if (this.catMenu.isOpen) {
        if (/^Digit[1-9]$/.test(e.code)) { this.catMenu.key(Number(e.code.slice(5))); return; }
        if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); this.catMenu.close(); return; }
      }
      if (/^Digit[1-4]$/.test(e.code)) this.selectTool(Number(e.code.slice(5)) - 1);
      else if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); this.use(); }
      else if (e.code === 'KeyQ') this.cycleSeed();
      else if (e.code === 'KeyM') this.ui.setMuted(sound.toggle());
    });
    // leaving the page (closing the tab, switching apps on a phone): save quietly
    const quiet = () => { if (this.started) this.save(); };
    addEventListener('pagehide', quiet);
    addEventListener('beforeunload', quiet);
    document.addEventListener('visibilitychange', () => document.hidden && quiet());
  }

  /** True while a full-screen card is open (she stands still). */
  get blocked() { return this.locked || this.journalOpen || this.shopOpen || this.adoptOpen || this.fainted || !!(this.fishing && this.fishing.active) || !!(this.bingo && this.bingo.active); }

  start() {
    this.playing = true; this.started = true;
    // put her back where she was when the game was saved
    const lp = this.state.ladyPos;
    if (lp) {
      const v = new THREE.Vector3(lp.x, 0, lp.z);
      this.world.resolve(v, 0.35);
      this.lady.group.position.set(v.x, this.world.groundHeight(v.x, v.z), v.z);
      this.lady.group.rotation.y = Number.isFinite(lp.heading) ? lp.heading : 0;
    }
    // the seed club's mail (first morning of a new game too); waiting mail is announced on every load
    this.deliverMail(false);
    setTimeout(() => {
      if (!this.playing || !this.mailCount()) return;
      this.announceMail();
      if (!this.state.flags.mailHint) { this.state.flags.mailHint = true; setTimeout(() => this.host.say('Ooh, the mailbox flag is up! Seed packets come every morning. The mailbox is at the end of the drive, by the road.', 8), 5000); }
    }, 2500);
    this.save();
    sound.unlock();
    this.ui.show(this.touch);
    this.emotes.show();
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
    if (this.sitting) {
      const k = this.sitting.seat.kind;
      if (k === 'toilet') return { ok: true, label: 'Flush the toilet 🚽', run: () => this.flushToilet() };
      if (k === 'tub') return { ok: true, label: 'Hop out of the bath', run: () => this.standUp() };
      return { ok: true, label: 'Stand up', run: () => this.standUp() };
    }
    if (this.emotes.busy && this.emotes.active.chore) return { ok: false, label: this.emotes.active.label || 'Busy...' };
    const table = this.vet.tableAction();
    if (table && table.ok) return table;
    const parcel = this.delivery.action(p);
    if (parcel) return parcel;
    // sinks, tub and toilet win over a nearby chair when she's standing right at them
    const plumb = W.cottage.isInside(p.x, p.z) ? this.plumbingAction(p) : null;
    if (plumb) return plumb;
    const hb = this.hairballs.action(p);
    if (hb) return hb;
    const bus = this.bingo.action(p);
    if (bus) return bus;
    const seat = this.nearestSeat();
    if (seat) return { ok: true, label: seat.label, run: () => this.sitDown(seat) };
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
    const visitor = this.adoption.action(p);
    if (visitor) return visitor;
    if (W.cottage.isInside(p.x, p.z)) {
      const dCof = Math.hypot(p.x - W.cottage.coffeePos.x, p.z - W.cottage.coffeePos.z), dStove = Math.hypot(p.x - W.cottage.stovePos.x, p.z - W.cottage.stovePos.z);
      if (dCof < 0.8 && dCof <= dStove) return this.coffeeAction();
      if (near(W.cottage.stovePos, 1.3)) {
        if (crops > 0 && s.dishes >= DISHES_MAX) return { ok: false, label: `No clean pots! Do the dishes at the sink first (${s.dishes} dirty)` };
        if (crops > 0) return { ok: true, label: `Cook ${crops} veggie${crops > 1 ? 's' : ''} into home-cooked meals`, run: () => this.cook() };
        if (s.meals > 0) return this.eatAction();
        return { ok: false, label: 'Kitchen stove: harvest veggies from the garden, then cook your meals here' };
      }
      if (near(W.cottage.bedPos, 1.2)) return this.bedAction();
      if (near(W.cottage.pantryPos, 1.0)) return s.meals > 0 ? this.eatAction() : { ok: false, label: `Pantry: ${s.food} cat food, no meals cooked. Cook veggies at the stove` };
      return null;
    }
    if (W.catsHouse.isInside(p.x, p.z)) return this.catsHouseAction(p);
    if (W.clinic.isInside(p.x, p.z)) { const k = this.kennelAction(p); if (k) return k; }
    if (near(W.supplyStall.pos, 1.5)) return { ok: true, label: `Browse the Farmers Market (${s.coins} coins)`, run: () => this.shop.toggle(true) };
    if (near(W.mailbox.pos, 1.3)) {
      const n = this.mailCount();
      return n ? { ok: true, label: `Check the mail (${n} seed packet${n > 1 ? 's' : ''})`, run: () => this.checkMail() }
        : { ok: false, label: 'The mailbox is empty. The seed club sends 3 packets every morning' };
    }
    if (s.tool === 2 && near(W.pond, 4.4)) {
      return s.water < s.waterMax ? { ok: true, label: 'Fill the watering can', run: () => this.fillCan() } : { ok: false, label: 'Watering can is full' };
    }
    const fish = this.fishing.action(p);
    if (fish) return fish;
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
          : { ...base, ok: false, label: `No ${name} seeds. Press Q to switch, or check the mailbox` };
      }
      if (tool === 'can') return this.waterAction(i, 'soil');
      const idle = this.garden.idleDays(i);
      if (idle >= 2 && !t.wet) return { ...base, ok: false, label: 'Weeds are creeping in! Plant or water it today, or it goes back to grass at dawn' };
      return { ...base, ok: false, label: `Plowed soil${t.wet ? ' (watered)' : ''}. Plant seeds [2]${idle === 1 ? '. Unused plots grow weeds' : ''}` };
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

  /** In the clinic: the kennels (daily care and discharge happen on the cat's stats card). */
  kennelAction(p) {
    const ks = this.vet.kennels;
    let best = -1, bd = 1.4;
    ks.forEach((k, i) => { const d = Math.hypot(p.x - k.front.x, p.z - k.front.z); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return null;
    const cs = this.vet.kennelCases().find((c) => c.kennel === best);
    const label = ks[best].bed ? 'Recovery bed' : `Kennel ${best + 1}`;
    if (!cs) return { ok: false, label: `${label}: empty and freshly made up` };
    const cat = this.cats.byId(cs.catId); if (!cat) return null;
    if (cs.stage === 'healed') return { ok: true, label: `Discharge ${cat.data.name}: all better!`, run: () => this.statsCard.open(cat) };
    const todo = this.vet.dailyTasks(cs).filter((t) => !cs.today?.[t]).length;
    return { ok: true, label: todo ? `Care for ${cat.data.name} in ${label.toLowerCase()} (${todo} to do today)` : `${cat.data.name}: all of today's care done (healing ${Math.round(cs.heal)}%)`, run: () => this.statsCard.open(cat) };
  }
  /* ---------------- running water: sinks, the clawfoot tub and the pull-chain toilet ---------------- */
  plumbingAction(p) {
    const C = this.world.cottage, s = this.state;
    const d = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const opts = [
      { at: C.sinks.kitchen.stand, r: 0.8, a: () => s.dishes > 0 ? { ok: true, label: `Do the dishes (${s.dishes} dirty) 🧽`, run: () => this.doDishes() } : { ok: true, label: 'Wash your hands at the kitchen sink 🧼', run: () => this.washHands('kitchen') } },
      { at: C.sinks.bath.stand, r: 0.75, a: () => ({ ok: true, label: 'Wash your hands 🧼', run: () => this.washHands('bath') }) },
      { at: C.tubSeat.front, r: 0.7, a: () => this.day.bedtime ? { ok: false, label: 'Too late for a bath, dearie. Off to bed!' } : { ok: true, label: 'Take a bubble bath 🛁 (+energy)', run: () => this.sitDown(C.tubSeat) } },
      { at: C.toiletSeat.front, r: 0.7, a: () => C.flushing() ? { ok: false, label: 'Whoosh! Flushing...' } : { ok: true, label: 'Use the toilet 🚽', run: () => this.sitDown(C.toiletSeat) } },
    ].filter((o) => d(o.at) < o.r).sort((a, b) => d(a.at) - d(b.at));
    return opts.length ? opts[0].a() : null;
  }
  addDishes(n) { this.state.dishes = Math.min(DISHES_MAX, (this.state.dishes || 0) + n); this.world.cottage.setDishes(this.state.dishes); }
  /** Face a sink and stand right at it. */
  stepUpTo(sink) {
    if (window.ccl) window.ccl.teleport(sink.stand.x, sink.stand.z, sink.heading);
  }
  doDishes() {
    const C = this.world.cottage, sink = C.sinks.kitchen, s = this.state;
    const n = s.dishes; if (!n) return;
    this.stepUpTo(sink);
    C.setWater('kitchen', true); sound.play('tap');
    this.host.say(['Scrub-a-dub-dub, three cats in a tub... no wait, that\'s plates.', 'Who used ALL these plates? Oh. Me.', 'Dishes, dishes, dishes...'][Math.floor(Math.random() * 3)], 4);
    this.emotes.start({
      id: 'dishes', chore: true, label: 'Doing the dishes...', dur: 1.2 + n * 0.7,
      pose: scrubPose,
      tick: (dt, a) => {
        a.bt = (a.bt || 0) - dt;
        if (a.bt <= 0) { a.bt = 0.25; this.particles.emit(sink.basin, { color: '#ffffff', count: 2, speed: 0.3, up: 0.9, gravity: -0.2, size: 0.035, emissive: true, life: 1.2, spread: 0.4 }); }
        const left = Math.max(0, n - Math.floor((a.t - 0.6) / 0.7));
        if (a.t > 0.6 && left < s.dishes) { s.dishes = left; C.setDishes(left); sound.play('dish'); }
      },
      end: (a, cancelled) => {
        C.setWater('kitchen', false);
        if (cancelled) return;
        s.dishes = 0; C.setDishes(0);
        s.stats.dishes = (s.stats.dishes || 0) + n;
        this.floatAtLady('Sparkling clean dishes! ✨', '#3f8fb5', 'sparkle');
        if (!s.flags.dishes) { s.flags.dishes = true; this.journal.log('Granny did a whole sink of dishes, humming the whole time. A cat "helped" by sitting on the drying towel.'); }
        this.save();
      },
    });
  }
  washHands(which) {
    const C = this.world.cottage, sink = C.sinks[which], s = this.state;
    this.stepUpTo(sink);
    C.setWater(which, true); sound.play('tap');
    this.emotes.start({
      id: 'wash', chore: true, label: 'Washing hands...', dur: 3.2,
      pose: scrubPose,
      tick: (dt, a) => { a.bt = (a.bt || 0) - dt; if (a.bt <= 0) { a.bt = 0.2; this.particles.emit(sink.basin.clone().setY(sink.basin.y + 0.08), { color: '#ffffff', count: 2, speed: 0.25, up: 1.1, gravity: -0.3, size: 0.03, emissive: true, life: 1.2, spread: 0.3 }); } },
      end: (a, cancelled) => {
        C.setWater(which, false);
        if (cancelled) return;
        this.floatAtLady('Squeaky clean hands! 🧼', '#3f8fb5', 'sparkle');
        if (this.needsWash) { this.needsWash = false; this.host.say('Good girl, Granny. Always wash your hands!', 4); }
        if (!s.flags.washed) { s.flags.washed = true; this.journal.log('Granny washed her hands with the rose soap. The whole cottage smells like a garden now.'); }
      },
    });
  }
  flushToilet() {
    const C = this.world.cottage;
    this.flushedThis = true;
    C.flush(); sound.play('flush');
    this.standUp();
    this.particles.emit(C.toiletPos, { color: '#8fd3ee', count: 10, speed: 0.6, up: 0.8, gravity: 2, size: 0.03, emissive: true, life: 0.8, spread: 0.2 });
    this.needsWash = true;
    this.host.say('Whoosh! Now wash those hands, dearie.', 4);
    this.state.stats.flushes = (this.state.stats.flushes || 0) + 1;
    if (!this.state.flags.flushed) { this.state.flags.flushed = true; this.journal.log('The new pull-chain toilet works! Granny flushed it three times just to hear the whoosh.'); }
    // the classic: a cat comes to drink out of the toilet
    const cat = Math.random() < 0.5 ? this.cats.freeCats(12)[0] : null;
    if (cat) {
      const tp = C.toiletPos, front = C.toiletSeat.front;
      this.cats.react(cat, { spot: new THREE.Vector3((tp.x + front.x) / 2, 0, tp.z - 0.4), near: 0.25, anim: 'eat', t: 6, speed: 2.4, look: tp,
        onArrive: (c) => { this.floatAt(c.pos, '*slurp slurp* 🚽', '#3f8fb5'); this.host.say(`${c.data.name}! Not from the TOILET! Ew!`, 4); } });
    }
  }
  startBath() {
    const C = this.world.cottage;
    C.setTub(1); sound.play('tap');
    this.lady.setPose((P, t) => { // arms resting on the rim, a happy little wiggle
      P.arms[0].rotation.set(-0.2, 0, -1.25); P.arms[1].rotation.set(-0.2, 0, 1.25);
      P.head.rotation.z = Math.sin(t * 1.3) * 0.1;
    });
    this.bathT = 0;
  }
  endBath() {
    const C = this.world.cottage, s = this.state;
    C.setTub(0); this.lady.setPose(null); sound.play('splash');
    this.particles.emit(C.tubPos, { color: '#9fd8ef', count: 14, speed: 1.2, up: 2, gravity: 6, size: 0.04, life: 0.8, spread: 0.6 });
    if ((this.bathT || 0) > 3) {
      this.floatAtLady('Fresh as a daisy! 🛁', '#3f8fb5', 'sparkle');
      if (!s.flags.bath) { s.flags.bath = true; this.journal.log('Granny had a lavender bubble bath in the new clawfoot tub. The rubber duck was there. The cats watched from a safe, dry distance.'); }
    }
    this.bathT = 0;
  }
  updateBath(dt) {
    if (!(this.sitting && this.sitting.seat.kind === 'tub')) return;
    this.bathT = (this.bathT || 0) + dt;
    this.bubbleT = (this.bubbleT || 0) - dt;
    if (this.bubbleT <= 0) { this.bubbleT = 0.4; const p = this.world.cottage.tubPos; this.particles.emit(new THREE.Vector3(p.x, p.y + 0.1, p.z), { color: '#ffffff', count: 2, speed: 0.35, up: 0.8, gravity: -0.15, size: 0.04, emissive: true, life: 1.8, spread: 0.6 }); }
  }

  /* ---------------- coffee: a cup from the percolator = a burst of speed ---------------- */
  coffeeAction() {
    const L = this.state.lady;
    if (this.day.bedtime) return { ok: false, label: 'Coffee at bedtime? Not tonight, dearie. Off to bed!' };
    if (L.perk > 0) return { ok: false, label: `The percolator is perking a fresh pot... ready in ${Math.ceil(L.perk)}s` };
    return { ok: true, label: 'Pour a cup of coffee ☕', run: () => this.drinkCoffee() };
  }
  drinkCoffee() {
    const L = this.state.lady, s = this.state;
    L.coffee = COFFEE_SECONDS; L.perk = COFFEE_PERK;
    this.coffeeWarned = false;
    this.lady.drink();
    sound.play('click');
    const pot = this.world.cottage.coffeePot;
    this.particles.emit(pot, { color: '#fff6e8', count: 10, speed: 0.3, up: 1.2, gravity: -0.4, size: 0.04, emissive: true, life: 1.4 });
    this.ui.saveToast("Granny's had her coffee ☕ Zoom zoom!", { plain: true });
    const lines = ["Ahh, fresh from the percolator! Watch out, cats, Granny's got places to be!", 'Mmm, strong enough to stand a spoon in. Zoom zoom!', "One cup and I'm faster than a cat who heard the can opener!"];
    this.host.say(lines[Math.floor(Math.random() * lines.length)], 5);
    if (!s.flags.coffee) { s.flags.coffee = true; this.journal.log("Granny poured her first cup from the old percolator and zoomed around the sanctuary like a kitten."); }
    this.save();
  }
  /** Coffee timers + the zoomy look while it lasts (speed lines, dust puffs, a little steam trail). */
  updateCoffee(dt) {
    const L = this.state.lady;
    const was = L.coffee > 0;
    if (this.playing) { L.coffee = Math.max(0, L.coffee - dt); L.perk = Math.max(0, L.perk - dt); }
    this.world.cottage.setCoffeeReady(L.perk <= 0);
    this.ui.setBuff(L.coffee);
    if (was && L.coffee <= 0 && this.playing) this.host.say("Whew, the coffee's wearing off. Back to Granny pace!", 4);
    // zoom lines behind her
    if (!this.zoom) {
      this.zoom = new THREE.Group(); this.lady.group.add(this.zoom);
      this.zoomLines = [];
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.9), new THREE.MeshBasicMaterial({ color: i % 3 ? '#ffffff' : '#ffe2b8', transparent: true, opacity: 0.0, depthWrite: false }));
        m.userData = { x: (i / 8 - 0.5) * 1.0 + (Math.random() - 0.5) * 0.12, y: 0.2 + Math.random() * 1.5, ph: Math.random() };
        this.zoom.add(m); this.zoomLines.push(m);
      }
    }
    const spd = (window.ccl && window.ccl.state.speed) || 0;
    const zooming = L.coffee > 0 && spd > 1.5 && !this.sitting;
    this.zoomT = (this.zoomT || 0) + dt;
    for (const m of this.zoomLines) {
      const k = (this.zoomT * 2.2 + m.userData.ph) % 1;
      m.position.set(m.userData.x, m.userData.y, -0.5 - k * 1.1);
      m.material.opacity = zooming ? 0.95 * Math.sin(k * Math.PI) : 0;
      m.visible = zooming;
    }
    if (zooming) {
      this.puffT = (this.puffT || 0) - dt;
      if (this.puffT <= 0) {
        this.puffT = 0.09;
        const p = this.lady.group.position, h = this.lady.group.rotation.y;
        this.particles.emit(new THREE.Vector3(p.x - Math.sin(h) * 0.35, p.y + 0.06, p.z - Math.cos(h) * 0.35), { color: '#efe2c8', count: 2, speed: 0.5, up: 0.7, gravity: 0.6, size: 0.07, life: 0.55, spread: 0.3 });
        if (Math.random() < 0.35) this.particles.emit(new THREE.Vector3(p.x, p.y + 1.95, p.z), { color: '#fff6e8', count: 1, speed: 0.1, up: 0.8, gravity: -0.2, size: 0.04, emissive: true, life: 0.9, spread: 0.2 });
      }
    }
  }

  eatAction() {
    const L = this.state.lady;
    if (L.hunger > 92) return { ok: false, label: `Not hungry right now (${this.state.meals} home-cooked meal${this.state.meals === 1 ? '' : 's'} ready)` };
    return { ok: true, label: `Eat a home-cooked meal (${this.state.meals} ready)`, run: () => this.eatMeal() };
  }
  eatMeal() {
    const s = this.state;
    if (s.meals <= 0) return;
    s.meals--; s.lady.hunger = Math.min(100, s.lady.hunger + 45); s.lady.energy = Math.min(100, s.lady.energy + 15);
    this.addDishes(1);
    this.lady.act(); sound.play('eat');
    this.floatAtLady('Mmm, a warm home-cooked meal! (+hunger, +energy)', '#c95c74', 'meal');
    if (!s.flags.ateMeal) { s.flags.ateMeal = true; this.host.say('Ahh, much better. A cat lady needs her veggies too! The garden feeds me now, and cat food comes in bags from the Farmers Market.', 7); }
  }

  catAction(c) {
    const d = c.data, name = this.cats.displayName(c);
    if (c.escort) return { ok: false, label: `${d.named ? d.name : 'The new arrival'} is walking with you. Head to the clinic exam table` };
    if (d.mode === 'stray') return { ok: true, label: this.state.food > 0 ? 'Sit quietly with the stray (offer a little food)' : 'Sit quietly with the shy stray', run: () => this.cats.befriend(c) };
    if (!d.joined) return { ok: true, label: 'Walk the new arrival to the clinic for a Welcome Vet Check', run: () => this.cats.escort(c) };
    const cs = this.vet.activeCase(d.id);
    if (cs && (cs.stage === 'kennel' || cs.stage === 'healed')) return { ok: true, label: cs.stage === 'healed' ? `Discharge ${name}: all better!` : `Care for ${name} in the kennel`, run: () => this.statsCard.open(c) };
    const extra = cs && cs.stage === 'noticed' ? ' (seems a little off)' : '';
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
      if (s.food <= 0) return { ok: false, label: 'Out of cat food. Order a bag at the Farmers Market (down by the road)' };
      const n = Math.min(empty.length, s.food);
      return { ok: true, label: `Fill ${n} food bowl${n > 1 ? 's' : ''} (${s.food} cat food left)`, run: () => this.feedCats() };
    }
    let bi = -1, bd = 0.95;
    H.litter.forEach((b, i) => { const d = Math.hypot(p.x - b.pos.x, p.z - b.pos.z); if (d < bd) { bd = d; bi = i; } });
    if (bi >= 0) {
      const users = cats.joined().filter((c) => cats.boxOf(c) === bi).map((c) => c.data.name);
      const whose = users.length ? ` (${users.join(' & ')})` : '';
      return (s.litterBoxes[bi] || 0) > 0.12 ? { ok: true, label: `Scoop litter box ${bi + 1}${whose}`, run: () => this.cleanLitter(bi) } : { ok: false, label: `Litter box ${bi + 1}${whose}: fresh and clean` };
    }
    const bed = H.beds.filter((b) => near(b.pos, 0.95)).sort((a, b) => Math.hypot(p.x - a.pos.x, p.z - a.pos.z) - Math.hypot(p.x - b.pos.x, p.z - b.pos.z))[0];
    if (bed) return { ok: false, label: bed.name ? `${bed.name}'s cozy bed` : 'A cozy bed, ready for the next cat' };
    return null;
  }
  feedCats() {
    const n = this.cats.serveMeals(false);
    this.lady.act();
    const p = this.world.catsHouse.bowls[4].pos;
    this.particles.emit(new THREE.Vector3(p.x - 0.2, 0.4, p.z + 0.6), { color: '#f4a3b5', count: 10, speed: 0.6, up: 1.4, gravity: 0.5, size: 0.045, emissive: true, life: 1.2 });
    this.floatAtLady(`Filled ${n} bowl${n > 1 ? 's' : ''}. Dinner time, kitties!`, '#c95c74', 'food');
    if (!this.state.flags.fedHouse) { this.state.flags.fedHouse = true; this.host.say("Shake the scoop and they come running! Each cat has their own bowl. Cat food comes in bags from the Farmers Market now.", 7); }
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
    if (!this.playing || this.blocked) return false;
    this.catMenu.close();
    this.statsCard.open(c);
    return true;
  }

  /** Floating text over a point in the world. */
  floatAt(pos, text, color, iconName) {
    const v = new THREE.Vector3(pos.x, pos.y + 0.9, pos.z).project(this.camera);
    this.ui.float(text, (v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, color, iconName);
  }

  use() {
    if (!this.playing || this.blocked) return;
    if (this.catMenu.isOpen) { this.catMenu.close(); return; }
    if (this.statsCard.isOpen) { this.statsCard.close(); return; }
    const a = this.findAction(); // always fresh (the tool may have changed since the last frame)
    if (a && a.ok && a.run) { a.run(); this.save(); }
    else { sound.play('nope'); if (a) this.floatAtLady(a.label.split('.')[0], '#8d7388'); }
  }

  /* ---------------- actions ---------------- */
  plow(i) {
    const t = this.state.tiles[i];
    if (t.state !== 'grass') return;
    t.state = 'plowed'; this.state.stats.plowed++;
    this.garden.touch(i); this.lady.act(); sound.play('plow');
    this.particles.emit(tileCenter(i).setY(0.1), { color: '#9c6b4b', count: 12, speed: 1.4, up: 2.2, size: 0.05 });
    this.firstTime('plow', "That's it, dearie! Now pick the seeds [2] and plant something.");
  }
  plant(i) {
    const s = this.state, t = s.tiles[i];
    if (t.state !== 'plowed' || s.seeds[s.seedType] <= 0) return;
    t.state = 'planted'; t.crop = s.seedType; t.growth = 0;
    s.seeds[s.seedType]--; s.stats.planted++;
    this.garden.touch(i); this.lady.act(); sound.play('seed');
    this.particles.emit(tileCenter(i).setY(0.2), { color: '#f3e2b3', count: 6, speed: 0.6, up: 1.2, size: 0.03 });
    this.firstTime('plant', 'A seed! Give it some water [3] so it can grow. Seeds only grow on days you water them.');
  }
  water(i) {
    const s = this.state, t = s.tiles[i];
    if (t.wet || s.water <= 0 || t.state === 'grass') return;
    t.wet = true; s.water--; s.stats.watered++;
    this.garden.touch(i); this.lady.act(); sound.play('water');
    this.particles.emit(tileCenter(i).setY(0.7), { color: '#6cc4ef', count: 14, speed: 0.5, up: 0.3, gravity: 6, size: 0.04, spread: 0.6, life: 0.7 });
    if (s.water === 0) this.host.say('Out of water! Fill the can at the pond, dearie.', 4.5);
    else this.firstTime('water', "Lovely. Watered crops grow until the soil dries at dawn. They never wilt, so don't fret.");
  }
  harvest(i) {
    const s = this.state, t = s.tiles[i], c = t.crop;
    if (t.state !== 'planted' || t.growth < 1) return;
    s.crops[c]++; s.stats.harvested++;
    t.state = 'plowed'; t.crop = null; t.growth = 0;
    this.garden.touch(i); this.lady.act(); sound.play('harvest');
    this.particles.emit(tileCenter(i).setY(0.4), { color: CROPS[c].color, count: 10, speed: 1, up: 2.5, size: 0.06 });
    this.particles.emit(tileCenter(i).setY(0.6), { color: '#ffe27a', count: 8, speed: 0.8, up: 1.5, gravity: 1, size: 0.04, emissive: true });
    this.floatAtLady(`+1 ${CROPS[c].name}`, '#5b4256', c);
    if (c === 'catnip') this.firstTime('harvest', 'Catnip! Offer it to a cat from the care menu for a happy, bond-boosting treat.');
    else if (c === 'chamomile') this.firstTime('harvest', 'Chamomile! The clinic uses it to make remedies work faster.');
    else this.firstTime('harvest', 'A harvest! Cook it at the stove in my cottage. That\'s my dinner sorted!');
  }
  /** Veggies from the garden become home-cooked meals for Granny herself. */
  cook() {
    const s = this.state;
    let made = 0;
    FOOD_CROPS.forEach((c) => { made += s.crops[c] * CROPS[c].food; s.crops[c] = 0; });
    s.meals = (s.meals || 0) + made; s.stats.cooked += made;
    this.world.cottage.cook(3);
    this.addDishes(2);
    this.lady.act(); sound.play('cook');
    this.floatAtLady(`+${made} home-cooked meal${made > 1 ? 's' : ''}`, '#c95c74', 'meal');
    this.host.say(`Mmm, veggie stew! ${made} meal${made > 1 ? 's' : ''} for me. Press E at the stove or pantry when I'm peckish.`, 6);
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
      this.overnight();
      this.playing = true;
      this.save({ toast: `Game saved 🐾 Good morning, Day ${this.state.day}!` });
    });
  }
  /** Skip the night: crops grow, cats sleep, a new day dawns. */
  overnight() {
    const hours = this.day.hoursUntilDawn();
    const ripe = this.garden.grow(hours);
    this.cats.simulate(hours * 0.6); // cats sleep through the night too
    this.cats.pileForNight();
    this.state.lady.energy = 100; this.state.lady.hunger = Math.max(8, this.state.lady.hunger - 12);
    this.day.sleep(); // triggers dawn()
    this.cats.prevHour = this.state.hour;
    if (ripe.length) this.notifyRipe(ripe);
  }
  /* ---------------- the mailbox: the seed club sends 3 random packets every morning ---------------- */
  mailCount() { return Object.values(this.state.mail.seeds).reduce((a, b) => a + b, 0); }
  /** Morning mail (once per day; the box holds up to MAIL_MAX packets so a few missed days still wait for her). */
  deliverMail(announce = true) {
    const s = this.state, m = s.mail;
    if (m.day >= s.day) return false;
    m.day = s.day;
    const room = Math.max(0, MAIL_MAX - this.mailCount());
    const total = Object.values(MAIL_WEIGHTS).reduce((a, b) => a + b, 0);
    for (let i = 0; i < Math.min(MAIL_SEEDS, room); i++) {
      let r = Math.random() * total, pick = 'carrot';
      for (const [k, w] of Object.entries(MAIL_WEIGHTS)) { if ((r -= w) <= 0) { pick = k; break; } }
      m.seeds[pick] = (m.seeds[pick] || 0) + 1;
    }
    this.updateMailbox();
    if (announce) this.announceMail();
    return true;
  }
  announceMail() {
    if (!this.mailCount()) return;
    this.ui.banner('You Got Mail! 📬', 'mail');
    sound.play('mail');
  }
  checkMail() {
    const s = this.state, got = s.mail.seeds;
    const list = Object.entries(got).map(([k, n]) => `${n} ${CROPS[k].name.toLowerCase()}`);
    Object.entries(got).forEach(([k, n]) => (s.seeds[k] = (s.seeds[k] || 0) + n));
    s.mail.seeds = {};
    this.updateMailbox();
    sound.play('pickup'); this.lady.act();
    this.floatAtLady(`+ ${list.join(', ')} seeds`, '#5b4256', 'seeds');
    this.host.say(`Mail from the seed club! ${list.join(', ')} seed${list.length > 1 || /^[2-9]/.test(list[0]) ? 's' : ''}. Let's get them in the ground, dearie.`, 6);
    if (!s.flags.firstMail) { s.flags.firstMail = true; this.journal.log('Granny checked the mailbox and found seed packets from the seed club. Fresh ones come every morning!'); }
    this.save();
  }
  updateMailbox() { this.world.mailbox.setFlag(this.mailCount() > 0); }
  fillCan() {
    this.state.water = this.state.waterMax; sound.play('fill'); this.lady.act();
    const p = this.lady.group.position;
    this.particles.emit(new THREE.Vector3(p.x, 0.4, p.z), { color: '#8fd5ea', count: 10, speed: 1, up: 2, size: 0.04 });
    this.floatAtLady('Watering can full', '#3f8fb5', 'drop');
  }

  /* ---------------- daily rhythm ---------------- */
  dawn() {
    this.garden.dryAll();
    const wild = this.garden.ageAll();
    if (wild.length) setTimeout(() => this.host.say(`The weeds won! ${wild.length} empty plot${wild.length > 1 ? 's' : ''} went back to grass. Plow ${wild.length > 1 ? 'them' : 'it'} again with the Hoe.`, 6), 9000);
    this.deliverMail(false);
    setTimeout(() => this.announceMail(), 1800);
    const ripe = this.garden.ripeCount, planted = this.garden.count((t) => t.state === 'planted' && t.growth < 1);
    let line = 'Good morning, dearie! The seed club sent fresh packets: check the mailbox by the road.';
    if (planted) line = 'Good morning! The soil dried overnight, so give the crops some water.';
    if (ripe) line += ` ${ripe} crop${ripe > 1 ? 's are' : ' is'} ripe and waiting. No rush, they never wilt!`;
    if (this.cats.joined().length) line = `Good morning! Let's check on the cats: a pet, a play and breakfast at 8. ${line.replace(/^Good morning[!,]\s*(dearie!\s*)?/, '')}`;
    // the donation jar by the gate: kind neighbors drop a few coins in overnight
    const gift = 6 + Math.min(6, this.cats.joined().length);
    this.state.coins += gift;
    this.journal.log(`The donation jar had ${gift} coins in it this morning. Thank you, neighbors!`);
    this.vet.dawn();
    this.adoption.dawn();
    this.bingo.dawn();
    if (this.state.hairballs.length >= 3) setTimeout(() => this.host.say(`There are ${this.state.hairballs.length} hairballs lying around. Someone (me) should scoop those up...`, 6), 15000);
    setTimeout(() => this.host.say(line, 7), 300);
    this.save();
  }
  notifyRipe(list) {
    if (this.chatCooldown > 0) return;
    const c = CROPS[this.state.tiles[list[0]].crop];
    this.host.say(list.length > 1 ? `${list.length} crops just ripened! They'll stay ripe until you pick them.` : `Ooh, a ${c.name.toLowerCase()} is ripe! It'll wait for you, no rush.`, 5);
    this.chatCooldown = 25;
  }
  firstTime(key, line) { if (this.firsts[key] || this.state.stats[key + 'ed'] > 1) return; this.firsts[key] = true; this.host.say(line, 6); }

  /* ---------------- helpers ---------------- */
  floatAtLady(text, color, iconName) {
    const v = new THREE.Vector3(); this.lady.headAnchor.getWorldPosition(v); v.y -= 0.6; v.project(this.camera);
    this.ui.float(text, (v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, color, iconName);
  }
  /** Save into this game's slot. opts.toast = text for the little "saved" note (autosaves use a tiny one). */
  save(opts = {}) {
    if (!this.started) return false;
    const p = this.sitting ? this.sitting.seat.front : this.lady.group.position;
    this.state.ladyPos = { x: +p.x.toFixed(2), z: +p.z.toFixed(2), heading: +(this.sitting ? this.sitting.seat.heading : this.lady.group.rotation.y).toFixed(3) };
    const ok = writeSlot(this.slot, this.state);
    if (opts.toast) this.ui.saveToast(ok ? opts.toast : 'Couldn\'t save: this browser is blocking storage (private mode?)', { mini: !!opts.mini, error: !ok });
    if (opts.toast && ok && !opts.mini) sound.play('click');
    return ok;
  }
  /** Save and go back to the start screen (slots, Continue / New Game). */
  mainMenu() {
    this.save();
    this.started = false; // nothing more to save; the page reloads to the title
    location.reload();
  }

  /* ---------------- sitting: porch swing, chairs, sofa, armchair, rocker, bench ---------------- */
  /** The seat she's close enough to sit on (closest wins), or null. */
  nearestSeat() {
    const p = this.lady.group.position;
    let best = null, bd = Infinity;
    for (const st of this.world.seats) {
      if (Math.abs(p.y - st.front.y) > 0.35) continue;
      const dFront = Math.hypot(p.x - st.front.x, p.z - st.front.z);
      const c = st.sitPos || st.front;
      const dSeat = Math.hypot(p.x - c.x, p.z - c.z);
      const d = Math.min(dFront, dSeat);
      if (d < (st.kind === 'swing' ? 1.15 : 0.85) && d < bd) { bd = d; best = st; }
    }
    return best;
  }
  sitDown(seat = this.world.seats.find((x) => x.kind === 'swing')) {
    if (!seat || this.sitting) return;
    this.sitting = { seat, t: 0, catT: 3 + Math.random() * 3, cat: null };
    this.lady.setSitting(true);
    this.catMenu.close?.();
    sound.play('click');
    if (seat.kind !== 'swing') { this.lady.group.position.copy(seat.sitPos); this.lady.group.rotation.set(0, seat.heading, 0); }
    const LINES = {
      swing: ['Ahh, nothing like a gentle swing on the porch.', 'Swing, swing... I can see the whole garden from here.', 'Just a little rest, dearie. Walk off whenever you like.'],
      chair: ['A sit-down at the kitchen table. Smells like cinnamon in here!', 'Just resting my feet a minute, dearie.', 'Best seat in the house for a cup of something warm.'],
      sofa: ['Oof, this old sofa is the comfiest spot in the house.', 'Room for a cat or two beside me, I should think.'],
      armchair: ['My knitting chair! Warm toes by the woodstove.', 'Ahh, my favorite armchair. Any lap cats about?'],
      rocker: ['Rock-a-bye, Granny... this old rocker never gets old.', 'Rocking on the porch, watching the garden grow.'],
      bench: ['A little bench break outside the clinic.', 'Just catching my breath before the next patient.'],
      tub: ['Ahh, a bubble bath! Don\'t mind me, kitties.', 'Rubber ducky, you\'re the one...', 'Lavender bubbles. Pure bliss, dearie.'],
      toilet: ['Don\'t look at me, cats. A lady needs her privacy!', 'Ahem. Nobody come in!', 'Why do the cats ALWAYS follow me in here?'],
    };
    if (seat.kind === 'tub') this.startBath();
    if (seat.kind === 'toilet') { this.flushedThis = false; this.sitting.catT = 2.5; }
    const lines = LINES[seat.kind] || LINES.chair;
    this.host.say(lines[Math.floor(Math.random() * lines.length)], 5);
  }
  standUp() {
    if (!this.sitting) return;
    const seat = this.sitting.seat;
    if (seat.kind === 'tub') this.endBath();
    if (seat.kind === 'toilet' && !this.flushedThis) setTimeout(() => this.host.say('Granny! You forgot to flush! 😱', 4), 300);
    if (this.sitting.cat) this.cats.leaveSwing(this.sitting.cat);
    this.sitting = null;
    this.lady.setSitting(false);
    this.lady.group.rotation.set(0, seat.heading, 0);
    if (seat.obj && seat.rock) seat.obj.rotation.x = 0;
    this.lady.group.position.set(seat.front.x, seat.front.y, seat.front.z);
    if (window.ccl) { window.ccl.state.heading = seat.heading; window.ccl.state.speed = 0; }
  }
  updateSwing(dt, t) {
    const sw = this.world.cottage.swing;
    if (!sw) return;
    const S = this.sitting, onSwing = S && S.seat.kind === 'swing';
    // swing amplitude eases up while she sits and settles to a gentle idle sway otherwise
    const want = onSwing ? 0.2 : 0.025;
    this.swingAmp = (this.swingAmp ?? 0.025) + (want - (this.swingAmp ?? 0.025)) * Math.min(1, dt * (onSwing ? 0.8 : 0.5));
    this.swingPhase = (this.swingPhase || 0) + dt * 1.9;     // ~3.3 s per swing: a natural pendulum for 2 m ropes
    sw.pivot.rotation.x = Math.sin(this.swingPhase) * this.swingAmp;
    if (!S) return;
    S.t += dt;
    if (onSwing) {
      sw.pivot.updateMatrixWorld(true);
      const v = new THREE.Vector3(); sw.seatAnchor.getWorldPosition(v);
      this.lady.group.position.copy(v);
      this.lady.group.rotation.set(sw.pivot.rotation.x, 0, 0);
    } else {
      const seat = S.seat;
      this.lady.group.position.copy(seat.sitPos);
      const rock = seat.rock ? Math.sin(S.t * 1.7) * 0.07 * Math.min(1, S.t) : 0;
      if (seat.rock) seat.obj.rotation.x = rock;
      this.lady.group.rotation.set(rock, seat.heading, 0, 'YXZ');
    }
    // a little rest: her energy comes back slowly (very slowly at bedtime, the bed is for sleeping)
    const L = this.state.lady;
    L.energy = Math.min(100, L.energy + dt * (this.day.bedtime ? 0.05 : S.seat.kind === 'tub' ? 1.4 : 0.35));
    // after a few seconds a friendly cat may hop up beside her (or into her lap)
    if (!S.cat) {
      S.catT -= dt;
      if (S.catT <= 0) { S.catT = 8; S.cat = this.cats.inviteToSwing(); }
    }
  }

  /* ---------------- per frame ---------------- */
  update(dt, t) {
    // clock runs all the time (also on the title screen), crops grow while watered
    // (it stops at 10 PM until she sleeps, so hours is 0 at bedtime)
    const hours = this.bingo.active ? 0 : this.day.update(dt);   // the clock waits while she's at bingo
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
    this.statsCard.update();
    this.adoption.update(dt, t);
    this.updateLady(dt, hours);
    this.updateSwing(dt, t);
    this.updateCoffee(dt);
    this.delivery.update(dt, t);
    this.emotes.update(dt);
    // walking off ends an emote or chore (after a short grace so the key press itself doesn't cancel it)
    if (this.emotes.busy && this.emotes.active.t > 0.35 && window.ccl && window.ccl.state.speed > 0.4) this.emotes.stop(true);
    this.faint.update(dt);
    this.updateBath(dt);
    this.hairballs.update(dt, t);
    this.fishing.update(dt, t);
    this.bingo.update(dt);
    this.updateOutfit();
    this.lady.hideTool(!!this.sitting || this.emotes.busy);
    const joined = this.cats.joined();
    const waiting = this.cats.list.find((c) => !c.data.joined);
    if (joined.length) {
      const avg = joined.reduce((n, c) => n + this.cats.happiness(c), 0) / joined.length;
      const off = joined.find((c) => this.vet.activeCase(c.data.id)?.stage === 'noticed');
      const fu = joined.find((c) => this.vet.activeCase(c.data.id)?.stage === 'healed');
      const kennel = this.vet.kennelCases().find((cs) => this.vet.careDue(cs));
      const vis = this.adoption.npc && this.state.visitor;
      this.ui.setCats(`${joined.length} / ${MAX_CATS}`, off ? `${off.data.name} seems a little off` : fu ? `${fu.data.name} is healed: discharge at the kennel` : kennel ? `${this.cats.byId(kennel.catId)?.data.name || 'A cat'} needs kennel care today` : waiting ? 'A new cat is waiting for you!' : vis ? 'An adoption visitor is here!' : avg >= 70 ? 'Happy, purring cats' : avg >= 45 ? 'Cats are content' : 'Cats would love some attention');
    } else this.ui.setCats('0', waiting ? (waiting.data.mode === 'stray' ? 'A shy stray is by the garden' : 'A new arrival is at the gate!') : 'The first cat arrives soon...');
    if (this.playing && (this.blocked || this.catMenu.isOpen)) {
      this.action = null; this.garden.showHighlight(-1); this.ui.setPrompt(null, this.touch);
    } else if (this.playing) {
      this.action = this.findAction();
      this.garden.showHighlight(this.action && this.action.tile !== undefined ? this.action.tile : -1, this.action && this.action.ok);
      this.ui.setPrompt(this.action, this.touch);
      // autosave: quietly every 15 s, with a tiny "Autosaved" note once a minute
      this.saveTimer += dt;
      if (this.saveTimer > 15) {
        this.saveTimer = 0; this.autosaves = (this.autosaves || 0) + 1;
        this.save(this.autosaves % 4 === 0 ? { toast: 'Autosaved 🐾', mini: true } : {});
      }
    } else {
      this.garden.showHighlight(-1);
    }
    this.ui.update(this.state, this.day);
  }

  /** Sundown: robe, slippers and curlers. 6 AM: back to her cardigan and apron. */
  updateOutfit() {
    const h = this.state.hour, want = h >= DUSK || h < DAWN ? 'night' : 'day';
    if (this.lady.outfit === want) return;
    this.lady.setOutfit(want);
    if (!this.playing || !this.outfitSeen) { this.outfitSeen = this.playing; return; }
    const p = this.lady.group.position;
    this.particles.emit(new THREE.Vector3(p.x, p.y + 1.1, p.z), { color: want === 'night' ? '#f2b8c6' : '#ffd76e', count: 18, speed: 1, up: 1.2, gravity: 0.4, size: 0.05, emissive: true, life: 1.2, spread: 0.5 });
    sound.play('pop');
    const lines = want === 'night' ? ['Sun\'s down! Into my robe and curlers. Nobody look!', 'Ahh, robe o\'clock. These curlers won\'t set themselves.', 'Fuzzy slippers on. Granny is OFF DUTY. (Mostly.)'] : ['Rise and shine! Curlers out, cardigan on.', 'Good morning! Back into my day clothes. The cats prefer the robe, I think.'];
    this.host.say(lines[Math.floor(Math.random() * lines.length)], 5);
    if (want === 'night' && !this.state.flags.robe) { this.state.flags.robe = true; this.journal.log('At sundown Granny changed into her fuzzy pink robe, slippers and hair curlers. The cats were deeply confused.'); }
  }

  /** Her own soft needs: hunger and energy. Low values only slow her down a little (never a fail state). */
  updateLady(dt, hours) {
    const L = this.state.lady;
    if (hours > 0) {
      L.hunger = Math.max(0, L.hunger - hours * 4.5);
      L.energy = Math.max(5, L.energy - hours * 3.4);
    }
    this.ladySpeed = ((L.hunger < 20 || L.energy < 15) ? 0.8 : 1) * (L.coffee > 0 ? COFFEE_SPEED : 1);
    if (!this.playing || this.blocked) return;
    this.needNag -= dt;
    if (this.needNag <= 0) {
      this.needNag = 75;
      if (L.hunger < 25) this.host.say(this.state.meals > 0 ? "My tummy's rumbling, dearie. Let's eat a home-cooked meal in the cottage kitchen." : "My tummy's rumbling! Let's harvest some veggies and cook a meal in the cottage.", 6);
      else if (L.energy < 20 && !this.day.bedtime) this.host.say("Yawn... I'm running low on energy. A meal perks me up, and a good night's sleep fixes everything.", 6);
    }
  }

  /** Public API for future features (cats!) and testing. */
  api() {
    const g = this, s = this.state;
    return {
      state: s, garden: this.garden, day: this.day,
      food: this.api_food,
      cats: {
        list: () => g.cats.list.map((c) => ({ id: c.data.id, slot: c.data.slot, health: Math.round(c.data.health), caged: !!c.caged, look: c.def.look, personality: c.def.personality, name: c.data.name, named: c.data.named, joined: c.data.joined, mode: c.data.mode, escort: !!c.escort, bond: g.cats.level(c), bondXP: c.data.bondXP, happiness: Math.round(g.cats.happiness(c)), needs: { ...c.data.needs }, x: +c.pos.x.toFixed(2), y: +c.pos.y.toFixed(2), z: +c.pos.z.toFixed(2), anim: c.model.anim, task: c.task && c.task.type })),
      },
      vet: { get knowledge() { return g.vet.knowledge; }, cases: () => s.cases, get exam() { return g.vet.exam && { step: g.vet.exam.step, kind: g.vet.exam.kind, settled: g.vet.exam.settled }; } },
      journal: { moments: () => s.journal.moments, open: (v) => g.journal.toggle(v) },
      debug: {
        skipHours(h) { const r = g.garden.grow(h); g.cats.simulate(h); g.day.advance(h); return r; },
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
        newArrival: () => { const d = g.cats.newArrival(); return d && d.id; },
        coins(n) { s.coins = n; },
        supplies(o) { Object.assign(s.supplies, o); },
        visitor(hour = s.hour) { const v = g.adoption.schedule(undefined, hour); return v; },
        stats: (id) => g.statsCard.open(g.cats.byId(id)),
        kennelCare: (id, t) => g.vet.kennelCare(g.cats.byId(id), t),
        heal(id, v) { const cs = g.vet.activeCase(id); if (cs) { cs.heal = 0; g.vet.addHeal(cs, v); } },
        lady(o) { Object.assign(s.lady, o); },
        use: () => g.use(),
        save: (toast) => g.save(toast ? { toast: 'Game saved 🐾' } : {}),
        get slot() { return g.slot; },
        mail: () => ({ ...g.state.mail.seeds }), mailDay: () => g.state.mail.day, checkMail: () => g.checkMail(),
        market: () => JSON.parse(JSON.stringify(g.state.market)), deliveryPhase: () => g.delivery.phase,
        deliveryStep: (sec) => g.delivery.step(sec), courier: () => g.delivery.courier && g.delivery.courier.group.visible && g.delivery.courier.group.position.toArray().map((v) => +v.toFixed(2)),
        buy: (id) => g.shop.buy(id),
        sit: (i) => g.sitDown(i === undefined ? undefined : g.world.seats[i]), stand: () => g.standUp(), get sitting() { return !!g.sitting; },
        seats: () => g.world.seats.map((x) => ({ id: x.id, kind: x.kind, label: x.label, front: [+x.front.x.toFixed(2), +x.front.y.toFixed(2), +x.front.z.toFixed(2)], heading: +x.heading.toFixed(2) })),
        seat: () => g.sitting && g.sitting.seat.id,
        coffee: () => ({ boost: +g.state.lady.coffee.toFixed(1), perk: +g.state.lady.perk.toFixed(1), speed: g.ladySpeed }),
        swingCat: () => g.sitting && g.sitting.cat && g.sitting.cat.data.id,
        inviteCat() { if (g.sitting && !g.sitting.cat) g.sitting.cat = g.cats.inviteToSwing(); return g.sitting && g.sitting.cat && g.sitting.cat.data.id; },
      },
    };
  }
}
