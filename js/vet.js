// Whisker Wellness vet care: Welcome Vet Checks (where you name each new cat) and gentle
// cases: Notice -> Examine -> Diagnose -> Admit to a kennel -> daily care (shots, medicine,
// bandages, checks) -> healing bar fills -> Discharge. Nothing here can go wrong: a wrong guess
// just means a cozy rest day, and a missed dose only makes healing a little slower.
import * as THREE from 'three';
import { CHECKS, ISSUES, ISSUE_IDS, TREATMENTS, PERSONALITIES, RANDOM_NAMES, CARE, PLANS, SICK_ISSUES, normalResult, pron, vetLevel } from './catData.js';
import { EXAM_SPOT, RECOVERY_SPOT } from './cats.js';
import { mat, mesh } from './util.js';
import { icon } from './ui.js';
import { sound } from './sound.js';

export const EXAM_STAND = new THREE.Vector3(-13.6, 0, -9.35); // walk up to the exam table here
const EXAM_SIDE = { x: -12.42, z: -10.35, heading: -Math.PI / 2 }; // she steps to the end of the table during the exam
const CAM = { pos: new THREE.Vector3(-13.45, 1.68, -8.25), look: new THREE.Vector3(-13.35, 1.0, -10.4) };

function rng(seed) { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

export class Vet {
  constructor(game) {
    this.game = game;
    const s = game.state;
    s.cases ||= [];
    s.flags ||= {};
    this.examCat = null; this.catAnim = 'sit'; this.exam = null;
    this.buildProps(game.scene);
    // four clinic kennels (2 x 2) plus the recovery bed as an overflow spot
    this.kennels = [...game.world.clinic.kennels, { spot: RECOVERY_SPOT.clone().setY(0.16), front: new THREE.Vector3(RECOVERY_SPOT.x - 0.9, 0, RECOVERY_SPOT.z + 0.4), setName() {}, bed: true }];
    // older saves: the old "recovering / follow-up" stages become kennel stays
    for (const cs of s.cases) {
      if (cs.stage === 'recovering' || cs.stage === 'followup') {
        Object.assign(cs, { stage: cs.stage === 'followup' ? 'healed' : 'kennel', heal: cs.stage === 'followup' ? 100 : 50, today: {}, first: {}, diagnosis: cs.diagnosis || cs.issue });
        cs.kennel = this.freeKennel();
      }
    }
    this.refreshKennelCards();
    this.buildUI();
  }

  /* ---------------- world props: a cozy recovery bed in the clinic ---------------- */
  buildProps(scene) {
    const g = new THREE.Group(); g.position.set(RECOVERY_SPOT.x, 0, RECOVERY_SPOT.z); scene.add(g);
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.08, 18), mat('#ffffff'), { y: 0.04 }));
    g.add(mesh(new THREE.TorusGeometry(0.4, 0.13, 8, 20), mat('#a6e3b8', { flatShading: false }), { y: 0.13, rx: Math.PI / 2 }));
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 16), mat('#fff3c9'), { y: 0.1 }));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.4), mat('#f7c6d2'), { x: 0.12, y: 0.15, z: 0.1, ry: 0.4, rz: 0.08 })); // blanket
    // little sign on a stick
    const sign = new THREE.Group(); sign.position.set(0.55, 0, -0.45); g.add(sign);
    sign.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), mat('#c1906a'), { y: 0.3 }));
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    x.fillStyle = '#fff8ef'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#a6e3b8'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 86);
    x.fillStyle = '#5b4256'; x.font = '600 34px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Recovery bed', 128, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    sign.add(mesh(new THREE.BoxGeometry(0.5, 0.19, 0.02), [mat('#fff8ef'), mat('#fff8ef'), mat('#fff8ef'), mat('#fff8ef'), new THREE.MeshStandardMaterial({ map: t }), mat('#fff8ef')], { y: 0.62 }));
  }

  /* ---------------- state helpers ---------------- */
  get knowledge() { return vetLevel(this.game.state.journal.vetXP); }
  activeCase(catId) { return this.game.state.cases.find((c) => c.catId === catId && c.issue && c.stage !== 'closed'); }
  /** Cases currently using a kennel (admitted and not yet discharged). */
  kennelCases() { return this.game.state.cases.filter((c) => c.issue && (c.stage === 'kennel' || c.stage === 'healed') && c.kennel !== undefined && c.kennel >= 0); }
  freeKennel() { const used = new Set(this.kennelCases().map((c) => c.kennel)); for (let i = 0; i < this.kennels.length; i++) if (!used.has(i)) return i; return this.kennels.length - 1; }
  kennelOf(cs) { return this.kennels[Math.max(0, Math.min(this.kennels.length - 1, cs.kennel ?? 0))]; }
  refreshKennelCards() {
    const byK = new Map(this.kennelCases().map((cs) => [cs.kennel, cs]));
    this.kennels.forEach((k, i) => { const cs = byK.get(i); const cat = cs && this.game.state.cats.find((c) => c.id === cs.catId); k.setName(cat ? (cat.named ? cat.name : 'New friend') : ''); });
  }
  /** The care plan for a case, and what is still to do today. */
  plan(cs) { return PLANS[cs.diagnosis || cs.issue]; }
  dailyTasks(cs) { return [...this.plan(cs).daily, 'check']; }
  careDue(cs) { return cs.stage === 'kennel' && this.dailyTasks(cs).some((t) => !(cs.today || {})[t]); }
  perDay(cs) { return (100 / this.plan(cs).days) * (cs.herb ? 1.35 : 1); }
  addHeal(cs, amount) {
    cs.heal = Math.min(100, (cs.heal || 0) + amount);
    if (cs.heal >= 100 && cs.stage === 'kennel') {
      cs.stage = 'healed';
      const cat = this.game.cats.byId(cs.catId);
      if (cat) {
        cs.notes.push(`Day ${this.game.state.day}: healing bar full. Ready to go home to the Cats' House!`);
        setTimeout(() => this.game.host.say(`${cat.data.name} is all healed up! Pop over to the kennel and discharge ${pron('{him}', cat.def)}, dearie.`, 7), 900);
      }
    }
  }
  addVetXP(n) {
    const j = this.game.state.journal, before = vetLevel(j.vetXP);
    j.vetXP += n;
    const after = vetLevel(j.vetXP);
    if (after > before) {
      this.game.journal.log(`Vet Knowledge rose to level ${after}! Clearer clues${after >= 2 ? ' and more precise diagnosis options' : ''}.`, null);
      setTimeout(() => this.game.host.say(`My Vet Knowledge went up to level ${after}! Clues will be clearer now, dearie.`, 6), 2500);
    }
  }
  catName(c) { return c.data.named ? c.data.name : 'the new arrival'; }

  /* ---------------- the daily check-in (called at dawn) ---------------- */
  dawn() {
    const g = this.game, s = g.state;
    for (const cs of s.cases) {
      if (cs.stage === 'retry' && s.day >= cs.retryDay) cs.stage = 'noticed';
      if (cs.stage === 'kennel') {
        // overnight rest always helps a little; yesterday's missed doses only mean slower healing
        const missed = this.dailyTasks(cs).filter((t) => !(cs.today || {})[t]);
        if (missed.length && cs.admitDay < s.day) cs.notes.push(`Day ${s.day - 1}: ${missed.length === this.dailyTasks(cs).length ? 'no care given' : 'missed ' + missed.map((t) => CARE[t].label.toLowerCase()).join(', ')}. Healing a little slower, no harm done.`);
        cs.today = {};
        this.addHeal(cs, this.perDay(cs) * 0.25);
      }
    }
    // new illnesses / injuries: a gentle chance each morning (more likely when a cat is neglected)
    const kennelBusy = s.cases.filter((c) => c.issue && c.stage !== 'closed').length;
    const joined = g.cats.joined().filter((c) => c.data.joinedDay < s.day && !this.activeCase(c.data.id));
    if (!joined.length || kennelBusy >= 4) return;
    let cat = null, issue = null;
    if (!s.flags.firstCase) { if (s.day >= 2) { cat = joined[0]; issue = 'paw'; } }
    else if (s.day - (s.flags.lastCaseDay || 0) >= 1) {
      const newest = Math.max(...g.cats.joined().map((c) => c.data.joinedDay));
      const older = joined.filter((c) => c.data.joinedDay < newest);
      if (older.length && s.day - newest <= 1 && !s.flags['stress' + newest] && Math.random() < 0.3) { s.flags['stress' + newest] = true; cat = older[Math.floor(Math.random() * older.length)]; issue = 'stress'; }
      else {
        // each cat's chance: low when well cared for, higher when health is low
        const roll = joined.map((c) => ({ c, p: 0.05 + (c.data.health < 60 ? 0.12 : 0) + (c.data.needs.clean < 30 ? 0.05 : 0) })).find((x) => Math.random() < x.p);
        if (roll && (s.day - (s.flags.lastCaseDay || 0) >= 2 || roll.c.data.health < 60)) { cat = roll.c; const opts = SICK_ISSUES.filter((i) => i !== cat.data.lastIssue); issue = opts[Math.floor(Math.random() * opts.length)]; }
      }
    }
    if (cat) this.startCase(cat, issue);
  }

  startCase(cat, issue) {
    const g = this.game, s = g.state;
    s.flags.firstCase = true; s.flags.lastCaseDay = s.day;
    cat.data.lastIssue = issue;
    const cs = { id: Date.now() % 1e9, catId: cat.data.id, kind: 'case', issue, stage: 'noticed', day: s.day, checks: {}, tries: 0, notes: [], heal: 0, today: {}, first: {} };
    s.cases.push(cs);
    const cue = pron(ISSUES[issue].cue, cat.def);
    g.journal.log(`${cat.data.name} ${cue}.`, cat.data.id);
    const hurt = issue === 'injury' ? 'Oh dear, looks like a little accident!' : 'Hmm, ' + cat.data.name + ' seems a little off this morning...';
    setTimeout(() => g.host.say(`${hurt} ${issue === 'injury' ? cat.data.name : pron('{She}', cat.def)} ${cue}. Let's take ${pron('{him}', cat.def)} to the clinic for a gentle look.`, 9), 3500);
    g.save();
    return cs;
  }

  /* ---------------- the exam table ---------------- */
  /** What E does at the exam table (null when not there). */
  tableAction() {
    const g = this.game, p = g.lady.group.position;
    if (!g.world.clinic.isInside(p.x, p.z) || Math.hypot(p.x - EXAM_STAND.x, p.z - EXAM_STAND.z) > 1.7) return null;
    const cat = g.cats.list.find((c) => c.escort);
    if (!cat) return { ok: false, label: 'Exam table: walk a cat here for a check-up' };
    const cs = this.activeCase(cat.data.id);
    if (!cat.data.joined) return { ok: true, label: 'Start the Welcome Vet Check', run: () => this.open(cat, 'intake') };
    if (cs && cs.stage === 'noticed') return { ok: true, label: `Examine ${cat.data.name}`, run: () => this.open(cat, 'case', cs) };
    return { ok: false, label: `${cat.data.name} doesn't need a check right now` };
  }

  open(cat, kind, cs = null) {
    const g = this.game;
    if (kind === 'intake') {
      cs = g.state.cases.find((c) => c.catId === cat.data.id && c.kind === 'intake');
      if (!cs) { cs = { id: Date.now() % 1e9, catId: cat.data.id, kind: 'intake', issue: null, stage: 'exam', day: g.state.day, checks: {}, tries: 0, notes: [] }; g.state.cases.push(cs); }
    }
    this.exam = { cat, kind, cs, step: 'checks', settled: !this.needsSettling(cat) };
    this.examCat = cat; this.catAnim = 'sit';
    g.camView = CAM; g.locked = true;
    document.body.classList.add('exam-open');
    g.teleport?.(EXAM_SIDE.x, EXAM_SIDE.z, EXAM_SIDE.heading);
    g.catMenu.close();
    sound.play('click');
    this.render();
    this.panel.classList.remove('hidden');
    g.host.say(kind === 'intake' ? 'Up you hop, sweetie. Just a gentle little check, nothing to worry about.' : `There we go, ${cat.data.name}. Let's see what's bothering you.`, 5);
  }

  needsSettling(cat) {
    const p = PERSONALITIES[cat.def.personality];
    if (!p.settle) return false;
    if (cat.def.personality === 'shy') return (cat.data.bondXP || 0) < 15;
    return true;
  }

  close(finished = false) {
    const g = this.game, ex = this.exam;
    this.panel.classList.add('hidden');
    if (ex) {
      const c = ex.cat;
      c.pos.set(EXAM_STAND.x + 0.6, 0, EXAM_STAND.z + 0.1);
      if (finished || ex.kind === 'case') c.escort = false;
      c.task = null;
    }
    this.exam = null; this.examCat = null;
    g.camView = null; g.locked = false; g.save();
    document.body.classList.remove('exam-open');
  }

  examResult(id) {
    const ex = this.exam, cat = ex.cat, def = cat.def, lvl = this.knowledge;
    const issueId = ex.kind === 'intake' ? def.starterIssue : ex.cs.issue;
    const issue = issueId && ISSUES[issueId];
    let text = issue && issue.clues[id] ? pron(issue.clues[id][Math.min(lvl - 1, 1)], def) : normalResult(id, def);
    if (ex.kind === 'intake') {
      if (id === 'coat') text = `${def.coat} coat: looks like a ${def.breed}. ${text}`;
      if (id === 'teeth') text = def.ageClue;
    }
    const abnormal = !!(issue && issue.clues[id]);
    return { text, abnormal };
  }

  doCheck(id) {
    const ex = this.exam;
    if (!ex.settled || ex.cs.checks[id]) return;
    const r = this.examResult(id);
    ex.cs.checks[id] = r;
    this.catAnim = { scale: 'stand', coat: 'stand', paws: 'lick', teeth: 'sit', eyes: 'sit', heart: 'sit', thermo: 'sit' }[id] || 'sit';
    this.game.lady.act();
    this.game.particles.emit(EXAM_SPOT.clone().setY(1.25), { color: r.abnormal ? '#f58fa8' : '#a6e3b8', count: 6, speed: 0.3, up: 0.8, gravity: 0.4, size: 0.03, emissive: true });
    sound.play(r.abnormal ? 'hmm' : 'check');
    this.render();
  }

  settle() {
    const ex = this.exam; ex.settled = true;
    this.catAnim = ex.cat.def.personality === 'playful' ? 'pounce' : 'sit';
    if (ex.cat.def.personality === 'playful') ex.cat.model.pounce();
    sound.play('purr');
    this.render();
  }

  diagnosisOptions() {
    const ex = this.exam, correct = ex.kind === 'intake' ? ex.cat.def.starterIssue : ex.cs.issue;
    const n = this.knowledge >= 2 ? 4 : 3;
    const r = rng(ex.cs.id + ex.cs.tries * 7);
    const others = ISSUE_IDS.filter((i) => i !== correct).sort(() => r() - 0.5).slice(0, n - 1);
    return [correct, ...others].sort(() => r() - 0.5);
  }

  diagnose(choice) {
    const ex = this.exam, g = this.game, cat = ex.cat, correct = ex.kind === 'intake' ? cat.def.starterIssue : ex.cs.issue;
    if (choice !== correct) {
      ex.cs.tries++;
      if (ex.kind === 'intake') { // during intake: just a gentle nudge to think again
        ex.note = `Hmm, that doesn't quite fit what we found. Take another look at the clipboard, dearie.`;
        sound.play('hmm'); this.render(); return;
      }
      ex.cs.stage = 'retry'; ex.cs.retryDay = g.state.day + 1;
      ex.cs.notes.push(`Day ${g.state.day}: guessed "${ISSUES[choice].name}" (not quite). Rest day, another look tomorrow.`);
      g.journal.log(`${cat.data.name} had a cozy rest day while we think about ${pron('{his}', cat.def)} symptoms.`, cat.data.id);
      ex.step = 'result';
      ex.result = { title: 'Not quite, and that\'s okay', text: pron(`That doesn't quite match the clues. No harm done: ${cat.data.name} gets a cozy rest day, and we can take another look tomorrow. Try a different approach next time!`, cat.def), icon: 'bed' };
      sound.play('hmm');
      this.render(); return;
    }
    ex.cs.diagnosis = choice; ex.cs.correct = ex.cs.tries === 0; ex.lastCare = '';
    ex.step = 'treat'; sound.play('check');
    this.render();
  }

  /** One of the admission treatments on the exam table (a shot, a bandage wrap or the first dose). */
  firstCare(type) {
    const ex = this.exam, g = this.game, s = g.state, cs = ex.cs, cat = ex.cat, care = CARE[type];
    cs.first ||= {};
    if (cs.first[type]) return;
    if (care.supply && (s.supplies[care.supply] || 0) <= 0) { sound.play('nope'); g.host.say(`We're out of ${care.supply === 'shot' ? 'shots' : care.supply === 'bandage' ? 'bandages' : 'medicine'}. The Supply Shelf has more, or we can admit ${pron('{him}', cat.def)} anyway and heal a little slower.`, 7); return; }
    if (care.supply) s.supplies[care.supply]--;
    cs.first[type] = true;
    if (type === 'bandage') cs.bandaged = true;
    this.catAnim = type === 'shot' ? 'stand' : 'sit';
    g.lady.act();
    if (type === 'shot') this.showSyringe();
    g.particles.emit(EXAM_SPOT.clone().setY(1.2), { color: type === 'shot' ? '#9fe0b8' : type === 'bandage' ? '#ffffff' : '#f7a8c4', count: 10, speed: 0.5, up: 1.2, gravity: 0.5, size: 0.04, emissive: true });
    sound.play(type === 'shot' ? 'check' : 'heal');
    ex.lastCare = type === 'shot' ? pron('A quick little pinch and it\'s done! {She} barely noticed (a treat helped).', cat.def) : type === 'bandage' ? pron('A snug, soft wrap with pink stripes. {She} sniffs it, then decides it\'s fine.', cat.def) : pron('{She} took the first dose like a champ.', cat.def);
    cs.notes.push(`Day ${s.day}: ${care.done.toLowerCase()} at admission.`);
    this.render();
  }
  /** A tiny syringe that appears by the cat for a moment (for the shot). */
  showSyringe() {
    const g = this.game, grp = new THREE.Group();
    grp.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), mat('#e8f6ff', { transparent: true, opacity: 0.85 }), { cast: false }));
    grp.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 8), mat('#9fe0b8'), { y: -0.02, cast: false }));
    grp.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4), mat('#b9c4cc'), { y: -0.12, cast: false }));
    grp.add(mesh(new THREE.BoxGeometry(0.07, 0.012, 0.03), mat('#6b9fc4'), { y: 0.085, cast: false }));
    grp.scale.setScalar(1.7); grp.position.copy(EXAM_SPOT).add(new THREE.Vector3(0.3, 0.45, 0.15)); grp.rotation.z = -1.0;
    g.scene.add(grp); this.syringe = grp;
    clearTimeout(this._syr); this._syr = setTimeout(() => { g.scene.remove(grp); if (this.syringe === grp) this.syringe = null; }, 2600);
  }
  /** Admit the cat to a kennel: the healing bar starts, daily care happens at the kennel. */
  admit() {
    const ex = this.exam, g = this.game, s = g.state, cat = ex.cat, cs = ex.cs;
    const issueId = cs.diagnosis, issue = ISSUES[issueId], plan = PLANS[issueId];
    const herb = (s.crops.chamomile || 0) > 0;
    if (herb) s.crops.chamomile--;
    const firstDone = plan.first.filter((t) => cs.first?.[t]).length;
    Object.assign(cs, { issue: issueId, treatment: issue.treatment, herb, stage: 'kennel', kennel: this.freeKennel(), admitDay: s.day, today: cs.today || {}, heal: 0 });
    // admission day counts as care: the first treatments give the healing bar a head start
    this.addHeal(cs, this.perDay(cs) * (plan.first.length ? 0.15 + 0.25 * (firstDone / plan.first.length) : 0.4));
    cs.notes.push(`Day ${s.day}: admitted to ${this.kennelOf(cs).bed ? 'the recovery bed' : `kennel ${cs.kennel + 1}`}${herb ? ' (with farm chamomile)' : ''}. Plan: ${plan.text}`);
    this.refreshKennelCards();
    sound.play('heal');
    const nm = cat.data.named ? cat.data.name : pron('{She}', cat.def);
    let text = `${nm} is settled in ${this.kennelOf(cs).bed ? 'the cozy recovery bed' : `kennel ${cs.kennel + 1}`} with a soft blanket. ${plan.daily.length ? `Each day: ${plan.daily.map((t) => CARE[t].label.toLowerCase()).join(' and ')}, plus a gentle check.` : 'Each day: a gentle check and a cuddle.'} About ${plan.days} day${plan.days > 1 ? 's' : ''} of good care and ${pron('{he}', cat.def)}'ll be home.`;
    if (herb) text += ' The chamomile from your garden will speed things along.';
    else text += ' (Tip: grow chamomile. It makes remedies work faster.)';
    if (firstDone < plan.first.length) text += ' We skipped a treatment, so healing starts a little slower. That\'s okay!';
    ex.step = 'result';
    ex.result = { title: 'Admitted to the kennel', text, icon: 'kennel' };
    if (cat.data.named) g.journal.log(`${cat.data.name} was admitted to the clinic for ${issue.name.toLowerCase()}.`, cat.data.id);
    this.render();
  }

  /** Daily care at the kennel (from the stats card). */
  kennelCare(cat, type) {
    const g = this.game, s = g.state, cs = this.activeCase(cat.data.id), care = CARE[type];
    if (!cs || cs.stage !== 'kennel') return false;
    cs.today ||= {};
    if (cs.today[type] || !this.dailyTasks(cs).includes(type)) return false;
    if (care.supply && (s.supplies[care.supply] || 0) <= 0) { sound.play('nope'); g.host.say(`Out of ${care.supply === 'medicine' ? 'medicine' : care.supply + 's'}! The Supply Shelf has more. Skipping it just means slower healing.`, 6); return false; }
    if (care.supply) s.supplies[care.supply]--;
    cs.today[type] = true;
    g.lady.act();
    const pos = cat.pos.clone().setY(cat.pos.y + 0.4);
    g.particles.emit(pos, { color: type === 'check' ? '#f26d8f' : '#9fe0b8', count: 8, speed: 0.5, up: 1.1, gravity: 0.5, size: 0.04, emissive: true });
    if (type === 'check') { cat.data.needs.affection = Math.min(100, cat.data.needs.affection + 15); g.cats.addBond(cat, 0.5); }
    g.floatAt(cat.pos, type === 'check' ? `${cat.data.name} purrs at the gentle check` : `${care.done} to ${cat.data.name}`, '#3f9a6b', care.icon);
    sound.play(type === 'check' ? 'purr' : 'heal');
    this.addHeal(cs, (this.perDay(cs) * 0.75) / this.dailyTasks(cs).length);
    if (!this.careDue(cs) && cs.stage === 'kennel') cs.notes.push(`Day ${s.day}: all of today's care done.`);
    g.save();
    return true;
  }

  /** Discharge: the healed cat goes home to the Cats' House. Case closed, bond up, journal entry. */
  discharge(cat) {
    const g = this.game, cs = this.activeCase(cat.data.id);
    if (!cs || cs.stage !== 'healed') return;
    cs.stage = 'closed'; cs.closedDay = g.state.day; cs.bandaged = false;
    cs.notes.push(`Day ${g.state.day}: discharged. Fully recovered!`);
    const k = this.kennelOf(cs);
    cat.caged = false; cat.pos.set(k.front.x, 0, k.front.z); cat.path = []; cat.task = { type: 'idle', anim: 'stretch', t: 2.5 };
    this.refreshKennelCards();
    g.cats.addBond(cat, 3);
    this.addVetXP(cs.correct ? 3 : 2);
    cat.data.health = Math.max(cat.data.health, 90);
    g.particles.emit(cat.pos.clone().setY(cat.pos.y + 0.5), { color: '#ffe27a', count: 16, speed: 0.8, up: 1.8, gravity: 0.5, size: 0.045, emissive: true, life: 1.3 });
    g.particles.emit(cat.pos.clone().setY(cat.pos.y + 0.6), { color: '#f26d8f', count: 6, speed: 0.4, up: 1.2, gravity: 0.4, size: 0.05, emissive: true, life: 1.3 });
    g.cats.flashIcon(cat, 'heart', 2);
    g.floatAt(cat.pos, `${cat.data.name} is all better!`, '#3f9a6b', 'sparkle');
    g.journal.log(`${cat.data.name} fully recovered from ${ISSUES[cs.issue].name.toLowerCase()} and went home to the Cats' House. Bright eyes and a happy purr!`, cat.data.id);
    g.host.say(`Bright eyes, happy purr. ${cat.data.name} is all better and off home to the Cats' House! Good work, Doctor.`, 6);
    cat.data.needs.affection = Math.min(100, cat.data.needs.affection + 20);
    sound.play('heal');
    g.save();
  }
  followUp(cat) { this.discharge(cat); }

  /* ---------------- naming card ---------------- */
  openNaming() {
    const ex = this.exam, def = ex.cat.def;
    ex.step = 'naming';
    this.panel.classList.add('hidden');
    const sug = [...def.names];
    this.naming.querySelector('.nm-title').textContent = `What will you name ${def.sex === 'girl' ? 'her' : 'him'}?`;
    this.naming.querySelector('.nm-facts').innerHTML = [
      ['Breed', def.breed], ['Coat', def.coat], ['Age', def.age], ['Personality', PERSONALITIES[def.personality].label + ': ' + PERSONALITIES[def.personality].blurb],
      ['From', def.sourceLabel],
    ].map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('');
    const chips = this.naming.querySelector('.nm-chips');
    chips.innerHTML = sug.map((n) => `<button type="button" class="chip">${n}</button>`).join('');
    chips.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { this.input.value = b.textContent; this.syncName(); }));
    this.input.value = '';
    this.syncName();
    this.naming.classList.remove('hidden');
    setTimeout(() => this.input.focus(), 60);
  }
  syncName() { this.nameBtn.disabled = !this.input.value.trim(); }
  randomName() {
    const used = this.game.state.cats.map((c) => c.name);
    const pool = [...this.exam.cat.def.names, ...RANDOM_NAMES].filter((n) => !used.includes(n));
    this.input.value = pool[Math.floor(Math.random() * pool.length)];
    this.syncName(); sound.play('click');
  }
  confirmName() {
    const name = this.input.value.trim().replace(/\s+/g, ' ').slice(0, 16);
    if (!name) return;
    const g = this.game, ex = this.exam, cat = ex.cat, cs = ex.cs;
    this.naming.classList.add('hidden');
    this.input.blur();
    if (!cs.issue) { cs.stage = 'closed'; cs.closedDay = g.state.day; }
    cs.catName = name;
    cs.notes.push(`Day ${g.state.day}: Welcome Vet Check done. Named ${name}.`);
    g.cats.welcome(cat.data.id, name);
    if (cs.issue && cs.stage === 'kennel') { g.journal.log(`${name} was admitted to the clinic kennel for ${ISSUES[cs.issue].name.toLowerCase()} at the Welcome Vet Check.`, cat.data.id); this.refreshKennelCards(); }
    this.addVetXP(1);
    g.particles.emit(EXAM_SPOT.clone().setY(1.3), { color: '#f26d8f', count: 10, speed: 0.6, up: 1.4, gravity: 0.5, size: 0.05, emissive: true, life: 1.3 });
    sound.play('bond');
    this.close(true);
    if (cs.issue && cs.stage === 'kennel') g.host.say(`Welcome to the family, ${name}! ${pron('{She}', cat.def)}'ll stay in the clinic kennel until {he}'s healed. Visit each day for ${pron('{his}', cat.def)} care, then ${pron('{he}', cat.def)} moves into the Cats' House.`.replace('{he}', cat.def.sex === 'girl' ? 'she' : 'he'), 9);
    else g.host.say(`Welcome to the family, ${name}! ${g.cats.joined().length === 1 ? 'Our very first sanctuary cat!' : `That's ${g.cats.joined().length} cats now!`} Pet, play with and groom ${pron('{him}', cat.def)} to grow your bond, and fill ${pron('{his}', cat.def)} bowl at the Cats' House (the old barn).`, 8);
  }

  /* ---------------- DOM ---------------- */
  buildUI() {
    const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
    this.panel = el('div', 'gcard hidden'); this.panel.id = 'exam';
    document.body.appendChild(this.panel);
    this.panel.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      e.stopPropagation();
      const a = b.dataset;
      if (a.check) this.doCheck(a.check);
      else if (a.act === 'settle') this.settle();
      else if (a.act === 'leave') this.close(false);
      else if (a.act === 'diagnose') { this.exam.step = 'diagnose'; this.exam.note = ''; sound.play('click'); this.render(); }
      else if (a.act === 'back') { this.exam.step = 'checks'; this.render(); }
      else if (a.dx) this.diagnose(a.dx);
      else if (a.care) this.firstCare(a.care);
      else if (a.act === 'admit') this.admit();
      else if (a.act === 'continue') {
        if (this.exam.kind === 'intake') this.openNaming(); else this.close(true);
      } else if (a.act === 'intake-next') {
        if (this.exam.cat.def.starterIssue) { this.exam.step = 'found'; this.render(); } else this.openNaming();
      } else if (a.act === 'found-next') { this.exam.step = 'diagnose'; this.render(); }
    });
    this.naming = el('div', 'overlay-modal hidden', `
      <div class="gcard nm-card">
        <div class="nm-badge">${icon('heart', 26)}<span>Welcome Vet Check complete</span></div>
        <h2 class="nm-title">What will you name her?</h2>
        <div class="nm-facts"></div>
        <label class="nm-label" for="cat-name">Name</label>
        <div class="nm-row"><input id="cat-name" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Type a name..." />
          <button type="button" class="dice" title="Random name">${icon('dice', 22)}</button></div>
        <div class="nm-chips"></div>
        <button type="button" class="nm-go">Welcome home!</button>
      </div>`);
    this.naming.id = 'naming';
    document.body.appendChild(this.naming);
    this.input = this.naming.querySelector('input');
    this.nameBtn = this.naming.querySelector('.nm-go');
    this.input.addEventListener('input', () => this.syncName());
    this.input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.confirmName(); });
    this.input.addEventListener('keyup', (e) => e.stopPropagation());
    this.naming.querySelector('.dice').addEventListener('click', () => this.randomName());
    this.nameBtn.addEventListener('click', () => this.confirmName());
  }

  render() {
    const ex = this.exam; if (!ex) return;
    const cat = ex.cat, def = cat.def, cs = ex.cs;
    const name = cat.data.named ? cat.data.name : 'New arrival';
    const title = ex.kind === 'intake' ? 'Welcome Vet Check' : `Check-up: ${name}`;
    const sub = ex.kind === 'intake' ? `${name} · ${def.sourceLabel}` : `Vet Knowledge ${this.knowledge} · ${pron(ISSUES[cs.issue].cue, def)}`;
    let body = '';
    const done = Object.keys(cs.checks).length;
    if (ex.step === 'checks') {
      const pers = PERSONALITIES[def.personality];
      const showHint = ex.kind === 'intake' ? done >= 2 : true;
      body += `<div class="ex-mood">${icon('paw', 18)}<span>${showHint ? pron(pers.hint, def) : 'Sniffing the exam table curiously...'}</span></div>`;
      if (!ex.settled) body += `<div class="ex-settle"><span>${pron(def.personality === 'shy' ? '{He} is a bit nervous on the table.' : def.personality === 'playful' ? '{She} is too wiggly to examine!' : '{She} is distracted.', def)}</span><button type="button" data-act="settle">${pers.settle}</button></div>`;
      body += `<div class="ex-checks">${CHECKS.map((c) => `<button type="button" data-check="${c.id}" class="${cs.checks[c.id] ? (cs.checks[c.id].abnormal ? 'done odd' : 'done') : ''}" ${ex.settled ? '' : 'disabled'}>${icon(c.icon, 22)}<span>${c.label}</span></button>`).join('')}</div>`;
      body += `<div class="ex-clip"><div class="ex-clip-title">${icon('clipboard', 18)} Clipboard</div>${done ? CHECKS.filter((c) => cs.checks[c.id]).map((c) => `<div class="ex-note ${cs.checks[c.id].abnormal ? 'odd' : ''}"><b>${c.short}</b> ${cs.checks[c.id].text}</div>`).join('') : '<div class="ex-note muted">Pick a check to start. Take your time.</div>'}</div>`;
      if (ex.kind === 'intake') {
        const all = done >= CHECKS.length;
        body += `<div class="ex-foot"><button type="button" data-act="leave" class="ghost">Step away</button><button type="button" data-act="intake-next" ${all ? '' : 'disabled'}>${all ? 'Finish check' : `Finish check (${done}/${CHECKS.length})`}</button></div>`;
      } else {
        body += `<div class="ex-foot"><button type="button" data-act="leave" class="ghost">Step away</button><button type="button" data-act="diagnose" ${done >= 3 ? '' : 'disabled'}>${done >= 3 ? 'What do you think it is?' : `Do ${3 - done} more check${3 - done > 1 ? 's' : ''}`}</button></div>`;
      }
    } else if (ex.step === 'found') {
      body += `<div class="ex-result">${icon('coat', 40)}<h3>Something to treat</h3><p>${pron('The clipboard shows something that needs a little care. Let\'s work out what it is, then {he} can rest in a clinic kennel while {he} heals.', def)}</p></div>`;
      body += `<div class="ex-foot"><button type="button" data-act="found-next">Diagnose</button></div>`;
    } else if (ex.step === 'diagnose') {
      const opts = this.diagnosisOptions();
      body += `<p class="ex-ask">Looking at your clipboard, what fits best? There's no rush.</p>`;
      body += `<div class="ex-clip small">${CHECKS.filter((c) => cs.checks[c.id] && cs.checks[c.id].abnormal).map((c) => `<div class="ex-note odd"><b>${c.short}</b> ${cs.checks[c.id].text}</div>`).join('') || '<div class="ex-note muted">Nothing unusual on the clipboard yet.</div>'}</div>`;
      body += `<div class="ex-options">${opts.map((o) => `<button type="button" data-dx="${o}">${ISSUES[o].name}</button>`).join('')}</div>`;
      if (ex.note) body += `<p class="ex-gentle">${ex.note}</p>`;
      body += `<div class="ex-foot"><button type="button" data-act="back" class="ghost">Back to checks</button></div>`;
    } else if (ex.step === 'treat') {
      const st = this.game.state, herbs = st.crops.chamomile || 0, plan = PLANS[cs.diagnosis];
      body += `<p class="ex-ask"><b>${ISSUES[cs.diagnosis].name}</b>. Good thinking! The care plan: ${plan.text}</p>`;
      if (plan.first.length) {
        body += `<div class="ex-care">${plan.first.map((t) => { const c = CARE[t], have = c.supply ? st.supplies[c.supply] || 0 : 99, done = cs.first && cs.first[t];
          return `<button type="button" data-care="${t}" class="${done ? 'done' : ''}" ${done || have <= 0 ? 'disabled' : ''}>${icon(c.icon, 30)}<b>${done ? c.done + ' ✓' : c.label}</b><span>${done ? 'Done' : have > 0 ? `${have} in stock` : 'Out of stock: Supply Shelf'}</span></button>`; }).join('')}</div>`;
      }
      if (ex.lastCare) body += `<p class="ex-gentle">${ex.lastCare}</p>`;
      body += `<div class="ex-herb">${icon('chamomile', 20)} Chamomile: <b>${herbs}</b> ${herbs ? '(1 will be used: faster healing)' : '(grow some in the garden to heal faster)'}</div>`;
      const allDone = plan.first.every((t) => cs.first && cs.first[t]);
      body += `<div class="ex-foot"><span class="ex-daily">${icon('kennel', 18)} Then daily in the kennel: ${[...plan.daily.map((t) => CARE[t].label.toLowerCase()), 'a gentle check'].join(', ')}</span><button type="button" data-act="admit" class="${allDone ? '' : 'ghost'}">${allDone ? 'Admit to a kennel' : 'Admit (skip treatment)'}</button></div>`;
    } else if (ex.step === 'result') {
      const r = ex.result;
      body += `<div class="ex-result">${icon(r.icon, 40)}<h3>${r.title}</h3><p>${r.text}</p></div>`;
      body += `<div class="ex-foot"><button type="button" data-act="continue">${ex.kind === 'intake' ? 'Next: name this cat' : 'Done'}</button></div>`;
    }
    this.panel.innerHTML = `<div class="ex-head">${icon('clinic', 26)}<div><b>${title}</b><span>${sub}</span></div></div>${body}`;
  }
}
