// On-screen game UI: clock + pantry panel, tool hotbar, action prompt, floating text, sleep fade.
import { CROPS, CROP_IDS } from './state.js';

export const ICONS = {
  hoe: '<path d="M5 20 L17 6" stroke="#b98a5e" stroke-width="2.6" stroke-linecap="round"/><path d="M14 3.5 L20.5 7 L18.5 9.5 L13 6.2 Z" fill="#b9c4cc"/>',
  seeds: '<rect x="5" y="4" width="14" height="17" rx="2.5" fill="#f7a8c4"/><rect x="7.5" y="7" width="9" height="6" rx="1.5" fill="#fff"/><circle cx="9" cy="16.5" r="1.2" fill="#8a5a3c"/><circle cx="12" cy="17.5" r="1.2" fill="#8a5a3c"/><circle cx="15" cy="16.2" r="1.2" fill="#8a5a3c"/>',
  can: '<path d="M6 9 h9 v9 a2 2 0 0 1 -2 2 h-5 a2 2 0 0 1 -2 -2 Z" fill="#7fcfb4"/><path d="M15 12 L21 7" stroke="#7fcfb4" stroke-width="2.4" stroke-linecap="round"/><path d="M7.5 9 a3.5 3.5 0 0 1 6 0" stroke="#5fb89b" stroke-width="1.8" fill="none"/>',
  hands: '<path d="M4 11 h16 l-2 8 a2 2 0 0 1 -2 1.5 h-8 a2 2 0 0 1 -2 -1.5 Z" fill="#e2b98d"/><path d="M7 11 a5 5 0 0 1 10 0" stroke="#b98a5e" stroke-width="1.8" fill="none"/><circle cx="9" cy="10" r="2" fill="#f59a4f"/><circle cx="13.5" cy="9.5" r="2.3" fill="#9edb7f"/>',
  carrot: '<path d="M5 19.5 L14.5 9 L17 11.5 L6.5 21 Z" fill="#f59a4f"/><path d="M15 9.5 L19 4 M16 10.5 L21.5 7.5 M14 8.5 L15 3" stroke="#6fbf5c" stroke-width="2.2" stroke-linecap="round"/>',
  cabbage: '<circle cx="12" cy="13" r="7.5" fill="#8fd36f"/><circle cx="12" cy="12" r="4.5" fill="#c9f0a6"/><path d="M12 6 v13" stroke="#6fbf5c" stroke-width="1.3"/>',
  pumpkin: '<ellipse cx="12" cy="14" rx="8.5" ry="6.5" fill="#f5a35c"/><path d="M12 8 v12 M8 9 q-2 5 0 10 M16 9 q2 5 0 10" stroke="#e48d43" stroke-width="1.3" fill="none"/><path d="M12 8 q0 -3 3 -4" stroke="#7a8a45" stroke-width="2" fill="none" stroke-linecap="round"/>',
  food: '<path d="M3 12 h18 l-2 6 a2 2 0 0 1 -2 1.5 h-10 a2 2 0 0 1 -2 -1.5 Z" fill="#f4a3b5"/><circle cx="8" cy="11" r="1.8" fill="#b9784a"/><circle cx="11.5" cy="10" r="1.8" fill="#b9784a"/><circle cx="15" cy="11" r="1.8" fill="#b9784a"/><circle cx="13" cy="12" r="1.6" fill="#a0653c"/>',
  drop: '<path d="M12 3 C12 3 5 11 5 15 a7 7 0 0 0 14 0 C19 11 12 3 12 3 Z" fill="#6cc4ef"/>',
  sun: '<circle cx="12" cy="12" r="5" fill="#ffd35c"/><g stroke="#ffd35c" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g>',
  chamomile: '<g fill="#fff"><ellipse cx="12" cy="6" rx="2.4" ry="4"/><ellipse cx="12" cy="18" rx="2.4" ry="4"/><ellipse cx="6" cy="12" rx="4" ry="2.4"/><ellipse cx="18" cy="12" rx="4" ry="2.4"/><ellipse cx="7.8" cy="7.8" rx="2.3" ry="3.6" transform="rotate(-45 7.8 7.8)"/><ellipse cx="16.2" cy="16.2" rx="2.3" ry="3.6" transform="rotate(-45 16.2 16.2)"/><ellipse cx="16.2" cy="7.8" rx="2.3" ry="3.6" transform="rotate(45 16.2 7.8)"/><ellipse cx="7.8" cy="16.2" rx="2.3" ry="3.6" transform="rotate(45 7.8 16.2)"/></g><circle cx="12" cy="12" r="3.6" fill="#ffc93c"/><path d="M5 9 Q12 10 19 9" stroke="none"/>',
  heart: '<path d="M12 20.5 C4 15 2.5 10.5 4.5 7.5 C6.5 4.5 10.5 5 12 8 C13.5 5 17.5 4.5 19.5 7.5 C21.5 10.5 20 15 12 20.5 Z" fill="#f26d8f"/>',
  paw: '<ellipse cx="12" cy="15.5" rx="4.6" ry="3.8" fill="#e8798f"/><circle cx="6.5" cy="10.5" r="2" fill="#e8798f"/><circle cx="10" cy="7" r="2.1" fill="#e8798f"/><circle cx="14" cy="7" r="2.1" fill="#e8798f"/><circle cx="17.5" cy="10.5" r="2" fill="#e8798f"/>',
  wand: '<path d="M4 21 L15 8" stroke="#b98a5e" stroke-width="2" stroke-linecap="round"/><path d="M15 8 q4 -6 6 -5 q-1 4 -6 5 Z" fill="#c8aaf2"/><path d="M15 8 q5 -1 6 2 q-4 1 -6 -2 Z" fill="#f7a8c4"/>',
  yarn: '<circle cx="11" cy="12" r="7.5" fill="#f58fa8"/><path d="M5 9 q6 3 12 -3 M4.5 13 q7 3 13 -4 M7 18 q6 -1 10 -9" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/><path d="M17 17 q3 2 4 4" stroke="#f58fa8" stroke-width="1.6" fill="none"/>',
  brush: '<rect x="3" y="11" width="13" height="6" rx="3" fill="#c1906a"/><path d="M5 11 v-4 M7.5 11 v-4.5 M10 11 v-4.5 M12.5 11 v-4.5 M15 11 v-4" stroke="#8d7388" stroke-width="1.4" stroke-linecap="round"/><path d="M16 14 L22 14" stroke="#c1906a" stroke-width="2.6" stroke-linecap="round"/>',
  clinic: '<path d="M3 11 L12 4 L21 11 V20 H3 Z" fill="#fff" stroke="#e8798f" stroke-width="1.6"/><path d="M12 9.5 v7 M8.5 13 h7" stroke="#ef7f95" stroke-width="2.6" stroke-linecap="round"/>',
  sparkle: '<path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="#ffd35c"/>',
  scale: '<rect x="3" y="15" width="18" height="5" rx="2" fill="#f7c6d2"/><circle cx="12" cy="9" r="5.5" fill="#fff" stroke="#e8798f" stroke-width="1.6"/><path d="M12 9 L14.5 6.5" stroke="#5b4256" stroke-width="1.6" stroke-linecap="round"/>',
  thermo: '<rect x="10" y="3" width="4" height="13" rx="2" fill="#fff" stroke="#9fb0c4" stroke-width="1.2"/><circle cx="12" cy="18" r="3.5" fill="#f26d8f"/><rect x="11.2" y="8" width="1.6" height="9" fill="#f26d8f"/>',
  steth: '<path d="M6 3 v6 a6 6 0 0 0 12 0 V3" stroke="#6b9fc4" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 15 v2 a3.5 3.5 0 0 0 7 0 v-2" stroke="#6b9fc4" stroke-width="2" fill="none"/><circle cx="19" cy="13.5" r="2.4" fill="#9fd0ef"/>',
  coat: '<path d="M4 16 q2 -10 8 -10 q6 0 8 10 q-8 4 -16 0 Z" fill="#f2a65a"/><path d="M8 9 l1.5 4 M12 7.5 v4.5 M16 9 l-1.5 4" stroke="#d27a35" stroke-width="1.6" stroke-linecap="round"/>',
  eye: '<path d="M2.5 12 Q12 3 21.5 12 Q12 21 2.5 12 Z" fill="#fff" stroke="#8d7388" stroke-width="1.4"/><circle cx="12" cy="12" r="3.8" fill="#6fbf5c"/><circle cx="12" cy="12" r="1.8" fill="#2b2230"/>',
  tooth: '<path d="M6 5 q6 -3 12 0 q2 4 -1 9 l-1.5 6 q-1 1.5 -2 0 L12 15 l-1.5 5 q-1 1.5 -2 0 L7 14 q-3 -5 -1 -9 Z" fill="#fff" stroke="#9fb0c4" stroke-width="1.3"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2" fill="#e2b98d"/><rect x="7" y="7" width="10" height="12" rx="1" fill="#fff"/><rect x="9" y="2.5" width="6" height="3" rx="1.2" fill="#8d7388"/><path d="M9 11 h6 M9 14 h6 M9 17 h4" stroke="#c9b6ee" stroke-width="1.4"/>',
  salve: '<rect x="5" y="10" width="14" height="9" rx="2" fill="#a6e3b8"/><rect x="6" y="7" width="12" height="4" rx="1.5" fill="#fff" stroke="#8fcfa5"/><circle cx="12" cy="14.5" r="2.2" fill="#fff"/>',
  bowl: '<path d="M3 12 h18 l-2 6 a2 2 0 0 1 -2 1.5 h-10 a2 2 0 0 1 -2 -1.5 Z" fill="#9fd0ef"/><ellipse cx="12" cy="11.5" rx="8" ry="2.2" fill="#fff7e0"/><circle cx="10" cy="11" r="1.2" fill="#f59a4f"/>',
  comb: '<rect x="3" y="7" width="18" height="4" rx="1.5" fill="#c8aaf2"/><path d="M5 11 v7 M8 11 v7 M11 11 v7 M14 11 v7 M17 11 v7 M20 11 v6" stroke="#c8aaf2" stroke-width="1.6" stroke-linecap="round"/>',
  bed: '<ellipse cx="12" cy="15" rx="9.5" ry="5" fill="#a6e3b8"/><ellipse cx="12" cy="14" rx="7" ry="3" fill="#fff3c9"/><path d="M8 13 q4 -3 8 0" stroke="#f7c6d2" stroke-width="2.5" fill="none"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff" stroke="#e8798f" stroke-width="1.8"/><circle cx="8.5" cy="8.5" r="1.6" fill="#5b4256"/><circle cx="15.5" cy="15.5" r="1.6" fill="#5b4256"/><circle cx="12" cy="12" r="1.6" fill="#5b4256"/><circle cx="15.5" cy="8.5" r="1.6" fill="#5b4256"/><circle cx="8.5" cy="15.5" r="1.6" fill="#5b4256"/>',
  book: '<path d="M3 5 q4.5 -2 9 1 q4.5 -3 9 -1 v14 q-4.5 -2 -9 1 q-4.5 -3 -9 -1 Z" fill="#f7a8c4"/><path d="M12 6 v14" stroke="#fff" stroke-width="1.4"/><path d="M5.5 9 q2.5 -1 4.5 0.4 M5.5 12 q2.5 -1 4.5 0.4 M14 9.4 q2 -1.4 4.5 -0.4" stroke="#fff" stroke-width="1.1" fill="none"/>',
  moon: '<path d="M15 3 a9 9 0 1 0 6 13 a7 7 0 0 1 -6 -13 Z" fill="#c8c6ff"/>',
};
export const icon = (name, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${ICONS[name]}</svg>`;

export const TOOLS = [
  { id: 'hoe', name: 'Hoe', icon: 'hoe' },
  { id: 'seeds', name: 'Seeds', icon: 'seeds' },
  { id: 'can', name: 'Watering Can', icon: 'can' },
  { id: 'hands', name: 'Hands', icon: 'hands' },
];

export class GameUI {
  constructor({ onSelectTool, onUse, onToggleMute, onReset, onJournal }) {
    const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
    // status panel (top-left)
    this.status = el('div', 'gpanel hidden'); this.status.id = 'status';
    this.status.innerHTML = `
      <div class="row clock"><span class="clock-icon"></span><b class="day"></b><span class="time"></span></div>
      <div class="row pantry">${icon('food', 22)}<b>Cat food</b><span class="food-count">0</span></div>
      <div class="pantry-note"></div>
      <div class="row cats-row">${icon('paw', 20)}<b>Cats</b><span class="cats-count">0</span></div>
      <div class="cats-note"></div>
      <div class="row crops">${CROP_IDS.map((c) => `<span class="crop" title="${CROPS[c].plural} (cook them in the kitchen)">${icon(c, 20)}<span data-crop="${c}">0</span></span>`).join('')}</div>`;
    document.body.appendChild(this.status);
    this.journalBtn = el('button', 'hidden', `${icon('book', 22)}<span>Journal</span><kbd>J</kbd>`); this.journalBtn.id = 'journal-btn'; this.journalBtn.type = 'button';
    this.journalBtn.addEventListener('click', (e) => { e.stopPropagation(); onJournal && onJournal(); });
    document.body.appendChild(this.journalBtn);
    this.toastEl = el('div', 'hidden'); this.toastEl.id = 'toast'; document.body.appendChild(this.toastEl);
    // hotbar (bottom-center)
    this.hotbar = el('div', 'hidden'); this.hotbar.id = 'hotbar';
    TOOLS.forEach((t, i) => {
      const b = el('button', 'slot', `<span class="key">${i + 1}</span><span class="ico">${icon(t.icon, 34)}</span><span class="name">${t.name}</span><span class="extra"></span>`);
      b.type = 'button'; b.dataset.tool = i;
      b.addEventListener('click', (e) => { e.stopPropagation(); onSelectTool(i, true); });
      this.hotbar.appendChild(b);
    });
    document.body.appendChild(this.hotbar);
    this.slots = [...this.hotbar.querySelectorAll('.slot')];
    // prompt
    this.prompt = el('div', 'hidden'); this.prompt.id = 'prompt'; document.body.appendChild(this.prompt);
    // mobile action button
    this.actBtn = el('button', 'hidden', 'Use'); this.actBtn.id = 'act-btn'; this.actBtn.type = 'button';
    this.actBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onUse(); });
    document.body.appendChild(this.actBtn);
    // floating text layer + sleep fade
    this.floatLayer = el('div'); this.floatLayer.id = 'floaters'; document.body.appendChild(this.floatLayer);
    this.fade = el('div', '', '<div class="zzz">Z z z . . .</div>'); this.fade.id = 'sleep-fade'; document.body.appendChild(this.fade);
    // extra HUD buttons
    const hud = document.getElementById('hud-body');
    if (hud) {
      const row = el('div', 'hud-buttons');
      this.muteBtn = el('button', '', 'Sound: on'); this.muteBtn.type = 'button';
      this.muteBtn.addEventListener('click', () => onToggleMute());
      const reset = el('button', 'danger', 'Reset garden'); reset.type = 'button';
      reset.addEventListener('click', () => onReset());
      row.append(this.muteBtn, reset); hud.appendChild(row);
    }
  }

  show(touch) {
    this.status.classList.remove('hidden'); this.hotbar.classList.remove('hidden'); this.journalBtn.classList.remove('hidden');
    if (touch) this.actBtn.classList.remove('hidden');
  }

  setMuted(m) { if (this.muteBtn) this.muteBtn.textContent = m ? 'Sound: off' : 'Sound: on'; }

  /** A gentle little notification for journal moments. */
  toast(text) {
    this.toastEl.innerHTML = `${icon('book', 18)}<span>${text}</span>`;
    this.toastEl.classList.remove('hidden');
    this.toastEl.style.animation = 'none'; void this.toastEl.offsetWidth; this.toastEl.style.animation = '';
    clearTimeout(this._toastT); this._toastT = setTimeout(() => this.toastEl.classList.add('hidden'), 4200);
  }

  setCats(text, note) {
    const q = (s) => this.status.querySelector(s);
    if (q('.cats-count').textContent !== text) q('.cats-count').textContent = text;
    if (q('.cats-note').textContent !== note) q('.cats-note').textContent = note;
  }

  update(state, dayCycle) {
    const jb = this.status.offsetTop + this.status.offsetHeight + 8;
    if (jb !== this._jb) { this._jb = jb; document.documentElement.style.setProperty('--jb-top', `${jb}px`); }
    const night = dayCycle.isNight;
    const q = (s) => this.status.querySelector(s);
    const iconName = night ? 'moon' : 'sun';
    if (this._icon !== iconName) { q('.clock-icon').innerHTML = icon(iconName, 22); this._icon = iconName; }
    q('.day').textContent = `Day ${state.day}`;
    q('.time').textContent = dayCycle.label();
    q('.food-count').textContent = state.food;
    q('.pantry-note').textContent = state.food === 0 && state.cats && state.cats.some((c) => c.joined) ? 'Pantry empty. The cats are peckish!' : state.food === 0 ? 'Pantry empty. Grow crops and cook them!' : state.food < 10 ? 'A little food stocked for the cats' : 'Pantry well stocked for the cats!';
    CROP_IDS.forEach((c) => (q(`[data-crop="${c}"]`).textContent = state.crops[c]));
    this.slots.forEach((s, i) => {
      s.classList.toggle('active', i === state.tool);
      const extra = s.querySelector('.extra');
      if (i === 1) {
        const n = state.seeds[state.seedType];
        const html = `${icon(state.seedType, 16)}<span>${n}</span>`;
        if (extra.dataset.v !== html) { extra.innerHTML = html; extra.dataset.v = html; }
        s.querySelector('.name').textContent = `${CROPS[state.seedType].name} seeds`;
        s.classList.toggle('empty', n === 0);
      } else if (i === 2) {
        const html = `<span class="bar"><span style="width:${(state.water / state.waterMax) * 100}%"></span></span>`;
        if (extra.dataset.v !== html) { extra.innerHTML = html; extra.dataset.v = html; }
        s.classList.toggle('empty', state.water === 0);
      }
    });
  }

  setPrompt(action, touch) {
    if (!action) { this.prompt.classList.add('hidden'); this.actBtn.classList.add('dim'); return; }
    const key = action.ok ? `<kbd>${touch ? 'Use' : 'E'}</kbd>` : '';
    const html = `${key}<span>${action.label}</span>`;
    if (this._prompt !== html) { this.prompt.innerHTML = html; this._prompt = html; }
    this.prompt.classList.toggle('info', !action.ok);
    this.prompt.classList.remove('hidden');
    this.actBtn.classList.toggle('dim', !action.ok);
  }

  /** Floating "+1 Carrot" style text at a screen position. */
  float(text, x, y, color = '#5b4256', iconName = null) {
    const f = document.createElement('div');
    f.className = 'floater'; f.style.left = `${x}px`; f.style.top = `${y}px`; f.style.color = color;
    f.innerHTML = (iconName ? icon(iconName, 18) : '') + `<span>${text}</span>`;
    this.floatLayer.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }

  sleepFade(midpoint) {
    this.fade.classList.add('on');
    setTimeout(() => { midpoint(); setTimeout(() => this.fade.classList.remove('on'), 700); }, 1100);
  }
}
