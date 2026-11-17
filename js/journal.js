// The Cat Journal: cat profiles, vet case history and little auto-logged moments.
import { PERSONALITIES, SPOTS, TOYS, BOND_LEVELS, ISSUES, TREATMENTS, VET_LEVELS, vetLevel, bondLevel, pron } from './catData.js';
import { catPortrait } from './statsCard.js';
import { NEED_LABELS } from './cats.js';
import { icon } from './ui.js';
import { sound } from './sound.js';

export function hearts(level, size = 16) {
  let h = '';
  for (let i = 1; i <= 5; i++) h += `<span class="hrt ${i <= level ? 'on' : ''}">${icon('heart', size)}</span>`;
  return `<span class="hearts" title="Bond level ${level} of 5">${h}</span>`;
}
export function needBars(needs) {
  return `<div class="needs">${Object.entries(NEED_LABELS).map(([k, label]) => `<div class="need"><span>${label}</span><i><b style="width:${Math.round(needs[k])}%" class="${needs[k] < 35 ? 'low' : ''}"></b></i></div>`).join('')}</div>`;
}

export class Journal {
  constructor(game) {
    this.game = game;
    const s = game.state;
    s.journal = { moments: [], vetXP: 0, ...(s.journal || {}) };
    this.tab = 'cats';
    this.build();
  }

  log(text, catId = null, extra = null) {
    const s = this.game.state;
    s.journal.moments.push({ day: s.day, time: this.game.day.label(), text, cat: catId, ...(extra || {}) });
    if (s.journal.moments.length > 150) s.journal.moments.shift();
    this.game.ui.toast?.(text);
    if (this.isOpen) this.render();
  }

  build() {
    const el = document.createElement('div');
    el.id = 'journal'; el.className = 'overlay-modal hidden';
    el.innerHTML = `<div class="gcard jr-card">
      <div class="jr-head">${icon('book', 28)}<h2>Cat Journal</h2><button type="button" class="jr-close" title="Close (J)">&times;</button></div>
      <div class="jr-tabs"><button type="button" data-tab="cats">Cats</button><button type="button" data-tab="cases">Vet cases</button><button type="button" data-tab="moments">Moments</button></div>
      <div class="jr-body"></div></div>`;
    document.body.appendChild(el);
    this.el = el; this.body = el.querySelector('.jr-body');
    el.querySelector('.jr-close').addEventListener('click', () => this.toggle(false));
    el.addEventListener('click', (e) => { if (e.target === el) this.toggle(false); });
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab; sound.play('click'); this.render(); }));
  }

  get isOpen() { return !this.el.classList.contains('hidden'); }
  toggle(v = !this.isOpen) {
    if (v === this.isOpen) return;
    this.el.classList.toggle('hidden', !v);
    this.game.journalOpen = v;
    sound.play('page');
    if (v) this.render();
  }

  render() {
    const s = this.game.state, cats = this.game.cats, vet = this.game.vet;
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === this.tab));
    let html = '';
    if (this.tab === 'cats') {
      const list = cats.list;
      if (!list.length) html = `<p class="jr-empty">No cats yet... but one is on the way! Keep the pantry stocked, dearie.</p>`;
      for (const c of list) {
        const d = c.data, def = c.def, p = PERSONALITIES[def.personality];
        if (!d.joined) {
          html += `<div class="jr-cat pending"><div class="jr-cat-head"><b>${cats.displayName(c)}</b><span class="tag">Waiting for a Welcome Vet Check</span></div>
            <p>${def.sourceLabel}. ${d.mode === 'stray' ? 'Sit quietly with this shy stray to earn some trust first.' : 'Walk this kitty to the Whisker Wellness clinic for a Welcome Vet Check, where you get to choose a name.'}</p></div>`;
          continue;
        }
        const lvl = bondLevel(d.bondXP), next = BOND_LEVELS[lvl + 1];
        const cs = vet.activeCase(d.id);
        const health = cs ? (cs.stage === 'healed' ? 'Healed: ready to be discharged from the kennel' : cs.stage === 'kennel' ? `In a clinic kennel (${ISSUES[cs.issue].short}), healing ${Math.round(cs.heal || 0)}%` : `A little off: ${pron(ISSUES[cs.issue].cue, def)}`) : `Healthy (${Math.round(d.health ?? 90)}%)`;
        const fav = (known, val, how) => (known ? val : `<i class="unk">??? (${how})</i>`);
        html += `<div class="jr-cat">
          <div class="jr-cat-head">${catPortrait(def.look, 40)}<b>${d.name}</b>${hearts(lvl)}<span class="tag">${BOND_LEVELS[lvl].label}</span></div>
          <div class="jr-grid">
            <div><b>Breed</b>${def.breed}</div><div><b>Coat</b>${def.coat}</div>
            <div><b>Age</b>${def.age}</div><div><b>From</b>${def.source === 'stray' ? 'Befriended stray' : def.source === 'shelter' ? 'Shelter' : def.source === 'foster' ? 'Neighbor foster' : 'Rescue'}</div>
            <div><b>Personality</b>${p.label}: ${p.blurb}</div><div><b>Mood</b>${cats.mood(c)} (${Math.round(cats.happiness(c))}%)</div>
            <div><b>Favorite toy</b>${fav(d.discovered.toy, TOYS[def.favToy], 'try different toys')}</div>
            <div><b>Favorite spot</b>${fav(d.discovered.spot, SPOTS[def.favSpot].label, 'watch where they nap')}</div>
            <div><b>Favorite treat</b>${fav(d.discovered.treat, def.favTreat, 'hand-feed them')}</div>
            <div><b>Health</b>${health}</div>
          </div>
          ${needBars(d.needs)}
          <p class="jr-next">${next ? `Next bond level: <b>${next.label}</b>, ${pron(`{she} ${next.unlock}`, def)}.` : 'Maximum bond! You two are soulmates.'}</p>
        </div>`;
      }
      if (s.adopted && s.adopted.length) {
        html += `<h3 class="jr-sec">${icon('door', 20)} Adopted into forever homes (${s.adopted.length})</h3><div class="jr-photos">${s.adopted.map((a) => `<div class="polaroid">${catPortrait(a.look, 70)}<b>${a.name}</b><span>with ${a.family}</span><small>Day ${a.day} · ${a.fee} coins</small></div>`).join('')}</div>`;
      }
    } else if (this.tab === 'cases') {
      const xp = s.journal.vetXP, lvl = vetLevel(xp), nextXP = VET_LEVELS[lvl] ?? null;
      html += `<div class="jr-know">${icon('steth', 24)}<div><b>Vet Knowledge: level ${lvl}</b><i><b style="width:${nextXP ? Math.min(100, ((xp - VET_LEVELS[lvl - 1]) / (nextXP - VET_LEVELS[lvl - 1])) * 100) : 100}%"></b></i>
        <span>${nextXP ? `${Math.max(0, nextXP - xp)} more to level ${lvl + 1}` : 'Top level!'} · Higher levels give clearer clues and more precise diagnosis options.</span></div></div>`;
      const list = [...s.cases].reverse();
      if (!list.length) html += `<p class="jr-empty">No cases yet. Every new cat gets a Welcome Vet Check at the clinic.</p>`;
      for (const cs of list) {
        const c = cats.byId(cs.catId), name = c && c.data.named ? c.data.name : cs.catName || 'New arrival';
        const title = cs.kind === 'intake' ? `Welcome Vet Check: ${name}` : `${ISSUES[cs.issue].name}: ${name}`;
        const status = cs.stage === 'closed' ? '<span class="tag ok">Closed</span>' : cs.stage === 'healed' ? '<span class="tag">Ready to discharge</span>' : cs.stage === 'kennel' ? `<span class="tag">In kennel · ${Math.round(cs.heal || 0)}%</span>` : cs.stage === 'retry' ? '<span class="tag">Rest day</span>' : '<span class="tag warn">Open</span>';
        const tr = cs.treatment && TREATMENTS[cs.treatment];
        const extra = cs.issue && cs.kind === 'intake' ? `<div class="jr-sub">Found at intake: ${ISSUES[cs.issue].name}${tr ? `, ${tr.label.toLowerCase()}` : ''}</div>` : tr ? `<div class="jr-sub">Treatment: ${tr.label}${cs.herb ? ' + chamomile' : ''}</div>` : '';
        html += `<div class="jr-case"><div class="jr-case-head"><b>${title}</b>${status}</div><div class="jr-sub">Day ${cs.day}${cs.closedDay ? ` to day ${cs.closedDay}` : ''}</div>${extra}<ul>${cs.notes.map((n) => `<li>${n}</li>`).join('')}</ul></div>`;
      }
    } else {
      const list = [...s.journal.moments].reverse();
      if (!list.length) html = `<p class="jr-empty">Little moments with your cats will be written here automatically.</p>`;
      html += `<ul class="jr-moments">${list.map((m) => `<li class="${m.photo ? 'has-photo' : ''}"><span>Day ${m.day}, ${m.time}</span>${m.photo ? `<div class="polaroid small">${catPortrait(m.photo.look, 64)}<b>${m.photo.name}</b><small>with ${m.photo.family}</small></div>` : ''}${m.text}</li>`).join('')}</ul>`;
    }
    this.body.innerHTML = html;
  }
}
