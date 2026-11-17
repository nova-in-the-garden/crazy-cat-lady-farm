// The cat stats card: tap/click a cat (or choose "Stats card" in the care menu) to see
// everything about them: portrait, personality, favorites, bond hearts, five wellbeing bars,
// and their current condition. Cats in a clinic kennel get their daily care buttons here too.
import { LOOKS } from './catModel.js';
import { PERSONALITIES, SPOTS, TOYS, BOND_LEVELS, ISSUES, CARE, PLANS, bondLevel, pron } from './catData.js';
import { icon } from './ui.js';
import { hearts } from './journal.js';
import { sound } from './sound.js';

/** A cute little SVG cat face in the cat's coat colors (used on the stats card and adoption photos). */
export function catPortrait(look, size = 96, mood = 'happy') {
  const L = LOOKS[look] || LOOKS.orangeTabby;
  const face = L.pattern === 'point' ? '#efdcc4' : L.base;
  const stripes = L.pattern === 'tabby' ? `<path d="M41 22 q4 6 0 11 M50 19 v12 M59 22 q-4 6 0 11" stroke="${L.stripe}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` : '';
  const patches = L.pattern === 'patches' ? `<ellipse cx="36" cy="34" rx="11" ry="9" fill="${L.patch1}"/><ellipse cx="65" cy="30" rx="9" ry="8" fill="${L.patch2}"/>` : '';
  const tux = L.pattern === 'tuxedo' ? `<path d="M50 44 q-14 4 -14 22 q14 10 28 0 q0 -18 -14 -22 Z" fill="#fff"/>` : '';
  const mask = L.pattern === 'point' ? `<ellipse cx="50" cy="56" rx="15" ry="12" fill="${L.muzzle}" opacity=".85"/>` : `<ellipse cx="50" cy="58" rx="13" ry="9" fill="${L.muzzle}"/>`;
  const eyes = mood === 'sleepy' ? '<path d="M35 47 q5 4 10 0 M55 47 q5 4 10 0" stroke="#2b2230" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<ellipse cx="40" cy="46" rx="4.6" ry="5.6" fill="#2b2230"/><ellipse cx="60" cy="46" rx="4.6" ry="5.6" fill="#2b2230"/><circle cx="41.5" cy="44" r="1.6" fill="#fff"/><circle cx="61.5" cy="44" r="1.6" fill="#fff"/>';
  return `<svg class="portrait" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="#fff4f7"/>
    <path d="M22 40 L24 8 L44 26 Z" fill="${L.ear}"/><path d="M78 40 L76 8 L56 26 Z" fill="${L.ear}"/>
    <path d="M27 32 L28 16 L38 26 Z" fill="#f7b6c6"/><path d="M73 32 L72 16 L62 26 Z" fill="#f7b6c6"/>
    <ellipse cx="50" cy="50" rx="31" ry="27" fill="${face}"/>${patches}${stripes}${tux}${mask}${eyes}
    <path d="M47 55 h6 l-3 3.5 Z" fill="${L.nose}"/><path d="M50 58.5 q-3 4 -6 2 M50 58.5 q3 4 6 2" stroke="#5b4256" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M30 56 h-12 M30 60 l-11 3 M70 56 h12 M70 60 l11 3" stroke="#d6c7d6" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`;
}

export class StatsCard {
  constructor(game) {
    this.game = game; this.cat = null;
    const el = document.createElement('div');
    el.id = 'stats-card'; el.className = 'gcard hidden';
    document.body.appendChild(el);
    this.el = el;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const a = b.dataset;
      if (a.close) this.close();
      else if (a.kcare) { this.game.vet.kennelCare(this.cat, a.kcare); this.render(); }
      else if (a.act === 'discharge') { const c = this.cat; this.close(); this.game.vet.discharge(c); }
      else if (a.act === 'care') { const c = this.cat; this.close(); this.game.catMenu.open(c); }
    });
  }
  get isOpen() { return !!this.cat; }
  open(cat) { this.cat = cat; this.el.classList.remove('hidden'); this.sig = ''; this.render(); sound.play('page'); }
  close() { this.cat = null; this.el.classList.add('hidden'); }
  near() { const lp = this.game.lady.group.position, c = this.cat; return c && Math.hypot(lp.x - c.pos.x, lp.z - c.pos.z) < 2.6; }

  condition() {
    const g = this.game, c = this.cat, d = c.data, def = c.def, cs = g.vet.activeCase(d.id);
    if (!d.joined) return { label: d.mode === 'stray' ? 'Shy stray: needs to learn to trust you' : 'Waiting for a Welcome Vet Check', cls: 'warn' };
    if (!cs) return { label: d.health >= 85 ? 'Healthy' : d.health >= 60 ? 'Healthy, could use extra care' : 'A bit run-down: needs food, a clean litter box and love', cls: d.health >= 60 ? 'ok' : 'warn' };
    const issue = ISSUES[cs.issue];
    if (cs.stage === 'noticed') return { label: `Seems a little off: ${pron(issue.cue, def)}. Bring ${pron('{him}', def)} to the clinic.`, cls: 'warn' };
    if (cs.stage === 'retry') return { label: 'Resting today. Another look at the clinic tomorrow.', cls: 'warn' };
    if (cs.stage === 'healed') return { label: `Healed from ${issue.name.toLowerCase()}! Ready to be discharged from the kennel.`, cls: 'ok' };
    return { label: `In ${g.vet.kennelOf(cs).bed ? 'the clinic recovery bed' : `clinic kennel ${cs.kennel + 1}`}: ${issue.name}${cs.bandaged ? ' (bandaged)' : ''}`, cls: 'sick' };
  }

  render() {
    const c = this.cat; if (!c) return;
    const g = this.game, cats = g.cats, d = c.data, def = c.def, p = PERSONALITIES[def.personality];
    const lvl = bondLevel(d.bondXP), cs = g.vet.activeCase(d.id), cond = this.condition();
    const n = d.needs;
    const bar = (label, v, cls, ic) => `<div class="sc-bar ${v < 35 ? 'low' : ''}">${icon(ic, 18)}<span>${label}</span><i><b class="${cls}" style="width:${Math.round(v)}%"></b></i><em>${Math.round(v)}</em></div>`;
    const fav = (known, val, how) => (known ? val : `<i class="unk">??? ${how}</i>`);
    let treat = '';
    if (cs && (cs.stage === 'kennel' || cs.stage === 'healed')) {
      const plan = PLANS[cs.diagnosis || cs.issue], tasks = g.vet.dailyTasks(cs), near = this.near(), st = g.state;
      treat = `<div class="sc-treat"><div class="sc-heal">${icon('sparkle', 18)}<span>Healing</span><i><b style="width:${Math.round(cs.heal || 0)}%"></b></i><em>${Math.round(cs.heal || 0)}%</em></div>
        <div class="sc-plan">${plan.text}${cs.herb ? ' Chamomile is speeding things up.' : ''}</div>`;
      if (cs.stage === 'kennel') {
        treat += `<div class="sc-today"><b>Today's care</b>${tasks.map((t) => { const care = CARE[t], done = cs.today && cs.today[t], have = care.supply ? st.supplies[care.supply] || 0 : null;
          return `<button type="button" data-kcare="${t}" class="${done ? 'done' : ''}" ${done || !near || have === 0 ? 'disabled' : ''}>${icon(care.icon, 20)}<span>${done ? care.done + ' ✓' : care.label}${have !== null && !done ? ` <small>(${have} left)</small>` : ''}</span></button>`; }).join('')}</div>`;
        if (!near) treat += `<p class="sc-hint">Walk up to the kennel to give today's care. Missed doses just slow healing.</p>`;
      } else treat += `<button type="button" class="sc-discharge" data-act="discharge" ${this.near() ? '' : 'disabled'}>${icon('door', 20)}<span>Discharge ${d.name}: all better!</span></button>`;
      treat += '</div>';
    }
    const adopt = d.joined ? cats.adoptable(c) : null;
    this.el.innerHTML = `<button type="button" data-close="1" class="cm-x" title="Close (Esc)">&times;</button>
      <div class="sc-top">${catPortrait(def.look, 92, c.model.anim === 'sleep' ? 'sleepy' : 'happy')}
        <div class="sc-id"><h3>${d.joined ? d.name : cats.displayName(c)}</h3>
          <div class="sc-sub">${def.sex === 'girl' ? '♀ Girl' : '♂ Boy'} · ${def.age}</div>
          <div class="sc-sub">${def.breed} · ${def.coat}</div>
          <div class="sc-bond">${hearts(lvl, 17)}<span>${BOND_LEVELS[lvl].label}</span></div></div></div>
      <div class="sc-pers"><b>${p.label}</b> ${p.blurb}</div>
      <div class="sc-favs"><span>${icon(def.favToy, 16)}${fav(d.discovered.toy, TOYS[def.favToy], '(try toys)')}</span><span>${icon('bed', 16)}${fav(d.discovered.spot, SPOTS[def.favSpot].label.replace(/^the /, ''), '(watch naps)')}</span><span>${icon('food', 16)}${fav(d.discovered.treat, def.favTreat, '(feed)')}</span></div>
      <div class="sc-bars">
        ${bar('Health', d.health ?? 90, 'hp', 'heart')}
        ${bar('Happiness', d.joined ? cats.happiness(c) : 50, 'hap', 'sparkle')}
        ${bar('Hunger (full)', n.hunger, 'hun', 'food')}
        ${bar('Cleanliness', n.clean, 'cln', 'brush')}
        ${bar('Energy', n.energy ?? 80, 'nrg', 'bolt')}
      </div>
      <div class="sc-cond ${cond.cls}">${icon(cs ? 'clinic' : 'heart', 18)}<span>${cond.label}</span></div>
      ${treat}
      ${adopt ? `<div class="sc-adopt ${adopt.ok ? 'ok' : ''}">${icon('door', 16)}<span>Adoption: ${adopt.why}</span></div>` : ''}
      ${d.joined && !(cs && (cs.stage === 'kennel' || cs.stage === 'healed')) && this.near() ? `<button type="button" class="sc-care" data-act="care">${icon('paw', 18)}<span>Care for ${d.name}</span></button>` : ''}
      <div class="sc-from">${def.sourceLabel}${d.joinedDay ? ` · joined day ${d.joinedDay}` : ''}</div>`;
  }
  update() {
    const c = this.cat; if (!c) return;
    if (!this.game.cats.list.includes(c)) { this.close(); return; }
    const d = c.data, cs = this.game.vet.activeCase(d.id);
    const sig = [Math.round(d.health), ...Object.values(d.needs).map((v) => Math.round(v / 3)), d.bondXP, cs && cs.stage, cs && Math.round(cs.heal || 0), cs && JSON.stringify(cs.today), this.near(), c.model.anim === 'sleep', JSON.stringify(this.game.state.supplies)].join('|');
    if (sig !== this.sig) { this.sig = sig; this.render(); }
  }
}
