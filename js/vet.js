// Whisker Wellness vet care: Welcome Vet Checks (where you name each new cat) and gentle
// Tier 1 cases: Notice -> Examine -> Diagnose -> Treat -> Follow up. Nothing here can go wrong:
// a wrong guess just means a cozy rest day and another look tomorrow.
import * as THREE from 'three';
import { CHECKS, ISSUES, ISSUE_IDS, TREATMENTS, PERSONALITIES, RANDOM_NAMES, normalResult, pron, vetLevel } from './catData.js';
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
      if (cs.stage === 'recovering' && s.day >= cs.readyDay) {
        cs.stage = 'followup';
        const cat = g.cats.byId(cs.catId);
        setTimeout(() => g.host.say(`${cat.data.name} is looking so much better this morning! Give ${pron('{him}', cat.def)} a follow-up check, dearie.`, 7), 1800);
      }
    }
    const open = s.cases.some((c) => c.issue && c.stage !== 'closed');
    const joined = g.cats.joined().filter((c) => c.data.joinedDay < s.day);
    if (open || !joined.length) return;
    let cat = null, issue = null;
    if (!s.flags.firstCase) { cat = joined[0]; issue = 'paw'; }
    else if (s.day - (s.flags.lastCaseDay || 0) >= 2 && Math.random() < 0.4) {
      const newest = Math.max(...g.cats.joined().map((c) => c.data.joinedDay));
      const older = joined.filter((c) => c.data.joinedDay < newest);
      if (older.length && s.day - newest <= 2 && Math.random() < 0.5) { cat = older[Math.floor(Math.random() * older.length)]; issue = 'stress'; }
      else { cat = joined[Math.floor(Math.random() * joined.length)]; issue = ISSUE_IDS.filter((i) => i !== cat.data.lastIssue)[Math.floor(Math.random() * 3)]; }
    }
    if (cat) this.startCase(cat, issue);
  }

  startCase(cat, issue) {
    const g = this.game, s = g.state;
    s.flags.firstCase = true; s.flags.lastCaseDay = s.day;
    cat.data.lastIssue = issue;
    const cs = { id: Date.now() % 1e9, catId: cat.data.id, kind: 'case', issue, stage: 'noticed', day: s.day, checks: {}, tries: 0, notes: [] };
    s.cases.push(cs);
    const cue = pron(ISSUES[issue].cue, cat.def);
    g.journal.log(`${cat.data.name} ${cue}.`, cat.data.id);
    setTimeout(() => g.host.say(`Hmm, ${cat.data.name} seems a little off this morning... ${pron('{she}', cat.def)} ${cue}. Let's take ${pron('{him}', cat.def)} to the clinic for a gentle look.`, 9), 3500);
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
    ex.cs.diagnosis = choice; ex.cs.correct = ex.cs.tries === 0;
    ex.step = 'treat'; sound.play('check');
    this.render();
  }

  treat(tid) {
    const ex = this.exam, g = this.game, s = g.state, cat = ex.cat, cs = ex.cs;
    const issueId = cs.diagnosis, issue = ISSUES[issueId];
    const right = issue.treatment === tid;
    const herb = (s.crops.chamomile || 0) > 0;
    if (herb) s.crops.chamomile--;
    let days = herb ? 1 : 2; if (!right) days += 1;
    Object.assign(cs, { issue: issueId, treatment: tid, herb, rightTreatment: right, stage: 'recovering', readyDay: s.day + days });
    cs.notes.push(`Day ${s.day}: ${TREATMENTS[tid].label.toLowerCase()}${herb ? ' (with farm chamomile)' : ''}.`);
    this.catAnim = tid === 'rest' ? 'sleep' : 'sit';
    g.lady.act();
    g.particles.emit(EXAM_SPOT.clone().setY(1.2), { color: '#ffe27a', count: 12, speed: 0.6, up: 1.4, gravity: 0.6, size: 0.04, emissive: true });
    sound.play('heal');
    const when = days === 1 ? 'by tomorrow morning' : `in about ${days} days`;
    let text = pron(TREATMENTS[tid].desc, cat.def) + ' ';
    text += right ? `Perfect choice. ${cat.data.named ? cat.data.name : pron('{She}', cat.def)} should be feeling better ${when}.` : pron(`That'll make {him} comfy, but it isn't quite what {he} needs, so recovery takes a little longer (${when}). Try a different approach next time!`, cat.def);
    if (herb) text += ' The chamomile from your garden will speed things along.';
    else text += ' (Tip: grow chamomile in the garden. It makes remedies work faster.)';
    if (tid === 'rest') text += pron(' {She}\'ll rest in the recovery bed here at the clinic.', cat.def);
    ex.step = 'result';
    ex.result = { title: right ? 'Treatment done!' : 'Treatment done (slowly but surely)', text, icon: TREATMENTS[tid].icon };
    if (cat.data.named) g.journal.log(`${cat.data.name} was treated for ${issue.name.toLowerCase()}: ${TREATMENTS[tid].label.toLowerCase()}.`, cat.data.id);
    this.render();
  }

  /** Follow-up check once the cat is better: case closed, bond up, journal entry. */
  followUp(cat) {
    const g = this.game, cs = this.activeCase(cat.data.id);
    if (!cs || cs.stage !== 'followup') return;
    cs.stage = 'closed'; cs.closedDay = g.state.day;
    cs.notes.push(`Day ${g.state.day}: follow-up check. Fully recovered!`);
    g.cats.addBond(cat, 3);
    this.addVetXP(cs.correct && cs.rightTreatment ? 3 : 2);
    g.particles.emit(cat.pos.clone().setY(cat.pos.y + 0.5), { color: '#ffe27a', count: 16, speed: 0.8, up: 1.8, gravity: 0.5, size: 0.045, emissive: true, life: 1.3 });
    g.particles.emit(cat.pos.clone().setY(cat.pos.y + 0.6), { color: '#f26d8f', count: 6, speed: 0.4, up: 1.2, gravity: 0.4, size: 0.05, emissive: true, life: 1.3 });
    g.cats.flashIcon(cat, 'heart', 2);
    g.floatAt(cat.pos, `${cat.data.name} is all better!`, '#3f9a6b', 'sparkle');
    g.journal.log(`${cat.data.name} fully recovered from ${ISSUES[cs.issue].name.toLowerCase()}. Bright eyes and a happy purr!`, cat.data.id);
    g.host.say(`Bright eyes, shiny coat, happy purr. ${cat.data.name} is all better! Good work, Doctor.`, 6);
    cat.data.needs.affection = Math.min(100, cat.data.needs.affection + 20);
    sound.play('heal');
    g.save();
  }

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
    if (cs.issue && cs.treatment) g.journal.log(`${name} was treated for ${ISSUES[cs.issue].name.toLowerCase()} at the Welcome Vet Check.`, cat.data.id);
    this.addVetXP(1);
    g.particles.emit(EXAM_SPOT.clone().setY(1.3), { color: '#f26d8f', count: 10, speed: 0.6, up: 1.4, gravity: 0.5, size: 0.05, emissive: true, life: 1.3 });
    sound.play('bond');
    this.close(true);
    g.host.say(`Welcome to the family, ${name}! ${g.cats.joined().length === 1 ? 'Our very first sanctuary cat!' : 'The sanctuary grows!'} Pet, play with and groom ${pron('{him}', cat.def)} to grow your bond, and fill ${pron('{his}', cat.def)} bowl at the Cats' House (the old barn).`, 8);
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
      else if (a.tx) this.treat(a.tx);
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
      body += `<div class="ex-result">${icon('coat', 40)}<h3>Something to treat</h3><p>${pron('A healthy {he} overall, but the clipboard shows something itchy going on. Let\'s sort it out before {he} joins the family.', def)}</p></div>`;
      body += `<div class="ex-foot"><button type="button" data-act="found-next">Diagnose</button></div>`;
    } else if (ex.step === 'diagnose') {
      const opts = this.diagnosisOptions();
      body += `<p class="ex-ask">Looking at your clipboard, what fits best? There's no rush.</p>`;
      body += `<div class="ex-clip small">${CHECKS.filter((c) => cs.checks[c.id] && cs.checks[c.id].abnormal).map((c) => `<div class="ex-note odd"><b>${c.short}</b> ${cs.checks[c.id].text}</div>`).join('') || '<div class="ex-note muted">Nothing unusual on the clipboard yet.</div>'}</div>`;
      body += `<div class="ex-options">${opts.map((o) => `<button type="button" data-dx="${o}">${ISSUES[o].name}</button>`).join('')}</div>`;
      if (ex.note) body += `<p class="ex-gentle">${ex.note}</p>`;
      body += `<div class="ex-foot"><button type="button" data-act="back" class="ghost">Back to checks</button></div>`;
    } else if (ex.step === 'treat') {
      const herbs = this.game.state.crops.chamomile || 0;
      body += `<p class="ex-ask">${ISSUES[cs.diagnosis].name}. Good thinking! How would you like to help?</p>`;
      body += `<div class="ex-herb">${icon('chamomile', 20)} Chamomile: <b>${herbs}</b> ${herbs ? '(1 will be used: faster healing)' : '(grow some in the garden to heal faster)'}</div>`;
      body += `<div class="ex-treats">${Object.entries(TREATMENTS).map(([id, t]) => `<button type="button" data-tx="${id}">${icon(t.icon, 28)}<b>${t.label}</b><span>${t.desc}</span></button>`).join('')}</div>`;
    } else if (ex.step === 'result') {
      const r = ex.result;
      body += `<div class="ex-result">${icon(r.icon, 40)}<h3>${r.title}</h3><p>${r.text}</p></div>`;
      body += `<div class="ex-foot"><button type="button" data-act="continue">${ex.kind === 'intake' ? 'Next: name this cat' : 'Done'}</button></div>`;
    }
    this.panel.innerHTML = `<div class="ex-head">${icon('clinic', 26)}<div><b>${title}</b><span>${sub}</span></div></div>${body}`;
  }
}
