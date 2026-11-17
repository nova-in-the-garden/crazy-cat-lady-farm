// The little care menu that pops up when you press E next to one of your cats.
import { bondLevel, BOND_LEVELS } from './catData.js';
import { icon } from './ui.js';
import { hearts, needBars } from './journal.js';

export class CatMenu {
  constructor(game) {
    this.game = game; this.cat = null;
    const el = document.createElement('div');
    el.id = 'cat-menu'; el.className = 'gcard hidden';
    document.body.appendChild(el);
    this.el = el;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.close) this.close(); else this.choose(b.dataset.id);
    });
  }
  get isOpen() { return !!this.cat; }
  open(cat) { this.cat = cat; this.el.classList.remove('hidden'); this.render(); }
  close() { this.cat = null; this.el.classList.add('hidden'); }
  choose(id) {
    const c = this.cat, item = this.items.find((i) => i.id === id);
    if (!c || !item || !item.ok) return;
    this.game.cats.doCare(c, id);
    if (id === 'clinic' || id === 'followup') this.close(); else this.render();
    this.game.save();
  }
  key(n) { const it = this.items && this.items[n - 1]; if (it) this.choose(it.id); }
  render() {
    const c = this.cat; if (!c) return;
    const cats = this.game.cats, d = c.data, lvl = bondLevel(d.bondXP);
    this.items = cats.menuFor(c);
    this.el.innerHTML = `<div class="cm-head"><div><b>${d.name}</b><span>${cats.mood(c)} · ${BOND_LEVELS[lvl].label}</span></div>${hearts(lvl, 15)}<button type="button" data-close="1" class="cm-x" title="Close (Esc)">&times;</button></div>
      ${needBars(d.needs)}
      <div class="cm-actions">${this.items.map((it, i) => `<button type="button" data-id="${it.id}" class="${it.highlight ? 'hl' : ''}" ${it.ok ? '' : 'disabled'}><span class="k">${i + 1}</span>${icon(it.icon, 22)}<span>${it.label}</span></button>`).join('')}</div>`;
  }
  update() {
    if (!this.cat) return;
    const lp = this.game.lady.group.position;
    if (Math.hypot(lp.x - this.cat.pos.x, lp.z - this.cat.pos.z) > 3 || this.game.locked) { this.close(); return; }
    const d = this.cat.data, sig = this.game.cats.menuFor(this.cat).map((i) => i.label + i.ok).join('|') + Object.values(d.needs).map((v) => Math.round(v / 4)).join(',') + d.bondXP;
    if (sig !== this.sig) { this.sig = sig; this.render(); }
  }
}
