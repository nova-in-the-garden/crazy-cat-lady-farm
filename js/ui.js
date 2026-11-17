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
  constructor({ onSelectTool, onUse, onToggleMute, onReset }) {
    const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
    // status panel (top-left)
    this.status = el('div', 'gpanel hidden'); this.status.id = 'status';
    this.status.innerHTML = `
      <div class="row clock"><span class="clock-icon"></span><b class="day"></b><span class="time"></span></div>
      <div class="row pantry">${icon('food', 22)}<b>Cat food</b><span class="food-count">0</span></div>
      <div class="pantry-note"></div>
      <div class="row crops">${CROP_IDS.map((c) => `<span class="crop" title="${CROPS[c].plural} (cook them in the kitchen)">${icon(c, 20)}<span data-crop="${c}">0</span></span>`).join('')}</div>`;
    document.body.appendChild(this.status);
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
    this.status.classList.remove('hidden'); this.hotbar.classList.remove('hidden');
    if (touch) this.actBtn.classList.remove('hidden');
  }

  setMuted(m) { if (this.muteBtn) this.muteBtn.textContent = m ? 'Sound: off' : 'Sound: on'; }

  update(state, dayCycle) {
    const night = dayCycle.isNight;
    const q = (s) => this.status.querySelector(s);
    const iconName = night ? 'moon' : 'sun';
    if (this._icon !== iconName) { q('.clock-icon').innerHTML = icon(iconName, 22); this._icon = iconName; }
    q('.day').textContent = `Day ${state.day}`;
    q('.time').textContent = dayCycle.label();
    q('.food-count').textContent = state.food;
    q('.pantry-note').textContent = state.food === 0 ? 'Pantry empty. Grow crops and cook them!' : state.food < 10 ? 'A little food stocked for the cats' : 'Pantry well stocked for the cats!';
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
