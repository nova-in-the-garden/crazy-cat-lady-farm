// The Whisker Supply Co. stall (the Supply Shelf): buy cat food, clinic supplies and seeds with coins.
// Coins come from adoption fees and the little donation jar that fills a bit every morning.
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';
import { addBox } from './collision.js';
import { SHOP, SUPPLY_LABELS, CROPS } from './state.js';
import { icon } from './ui.js';
import { sound } from './sound.js';

export const STALL = { x: 6.6, z: -4.7 };

function signTex() {
  return canvasTexture(768, 192, (ctx, w, h) => {
    ctx.fillStyle = '#fff6ec'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 50); ctx.fill();
    ctx.strokeStyle = '#3f9a8b'; ctx.lineWidth = 10; ctx.stroke();
    drawPaw(ctx, 90, h / 2, 80, '#9fd6bf', -0.3); drawPaw(ctx, w - 90, h / 2, 80, '#9fd6bf', 0.3);
    ctx.fillStyle = '#2f6f66'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 62px Fredoka, "Trebuchet MS", sans-serif'; ctx.fillText('Supply Shelf', w / 2, h / 2 - 22);
    ctx.font = '600 36px Fredoka, "Trebuchet MS", sans-serif'; ctx.fillStyle = '#c95c74'; ctx.fillText('Whisker Supply Co.', w / 2, h / 2 + 38);
  });
}

/** The market stall between the cottage and the Cats' House. */
export function buildSupplyStall(scene) {
  const g = new THREE.Group(); g.position.set(STALL.x, 0, STALL.z); scene.add(g);
  const wood = mat('#c1906a'), dark = mat('#9a6a48'), mint = mat('#9fd6bf');
  // counter
  g.add(mesh(new THREE.BoxGeometry(2.3, 0.85, 0.7), mint, { y: 0.43, z: 0.3 }));
  g.add(mesh(new THREE.BoxGeometry(2.4, 0.08, 0.8), wood, { y: 0.89, z: 0.3 }));
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(0.04, 0.7, 0.02), mat('#7fbfa6'), { x: -0.9 + i * 0.45, y: 0.43, z: 0.66, cast: false }));
  // back shelves full of goodies
  g.add(mesh(new THREE.BoxGeometry(2.3, 1.9, 0.08), wood, { y: 0.95, z: -0.45 }));
  [0.35, 0.95, 1.55].forEach((y) => g.add(mesh(new THREE.BoxGeometry(2.3, 0.06, 0.45), dark, { y, z: -0.22 })));
  const bagCols = ['#f4a3b5', '#ffd76e', '#9fd0ef', '#c8aaf2'];
  for (let i = 0; i < 6; i++) { // cat food bags (bottom shelf)
    const b = mesh(new THREE.BoxGeometry(0.28, 0.42, 0.18), mat(bagCols[i % 4]), { x: -0.95 + i * 0.38, y: 0.59, z: -0.22, ry: (i % 2 ? 0.1 : -0.1) });
    g.add(b); g.add(mesh(new THREE.CircleGeometry(0.07, 10), mat('#fff6ec'), { x: -0.95 + i * 0.38, y: 0.62, z: -0.125, cast: false }));
  }
  for (let i = 0; i < 9; i++) { // medicine bottles + syringes in a jar (middle shelf)
    const c = ['#ffffff', '#ef7f95', '#9fe0b8'][i % 3];
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.17, 8), mat(c), { x: -1.0 + i * 0.24, y: 1.07, z: -0.2 }));
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), mat('#5b4256'), { x: -1.0 + i * 0.24, y: 1.17, z: -0.2, cast: false }));
  }
  for (let i = 0; i < 5; i++) { // bandage rolls + seed packets (top shelf)
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10), mat('#fff6ec'), { x: -0.95 + i * 0.22, y: 1.66, z: -0.2, rz: Math.PI / 2 }));
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.22, 0.03), mat(['#8fd36f', '#f59a4f', '#fff6d6', '#f5a35c', '#8fd36f'][i]), { x: 0.2 + i * 0.22, y: 1.7, z: -0.2, rx: -0.15 }));
  }
  // posts + striped awning
  [-1.15, 1.15].forEach((x) => { g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), wood, { x, y: 1.25, z: 0.65 })); g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), wood, { x, y: 1.25, z: -0.5 })); });
  for (let i = 0; i < 8; i++) {
    g.add(mesh(new THREE.BoxGeometry(0.33, 0.05, 1.6), mat(i % 2 ? '#fff6ec' : '#ef7f95'), { x: -1.16 + i * 0.33, y: 2.55, z: 0.15, rx: -0.22 }));
    g.add(mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 10, 1, false, 0, Math.PI), mat(i % 2 ? '#fff6ec' : '#ef7f95'), { x: -1.16 + i * 0.33, y: 2.36, z: 0.94, rx: Math.PI / 2, rz: Math.PI / 2, cast: false }));
  }
  const sign = mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.8 }), { y: 2.12, z: 0.75, cast: false });
  g.add(sign);
  // a coin jar and a little bell on the counter
  g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 10), mat('#e8f6ff', { transparent: true, opacity: 0.6 }), { x: 0.75, y: 1.04, z: 0.35 }));
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 10), mat('#ffd35c', { emissive: '#c99a2a', emissiveIntensity: 0.25 }), { x: 0.75 + (i % 2) * 0.03, y: 0.96 + i * 0.02, z: 0.35, cast: false }));
  g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ffd35c'), { x: -0.7, y: 0.93, z: 0.4 }));
  // a sleepy shop cat statue on the counter
  g.add(mesh(new THREE.SphereGeometry(0.12, 10, 8), mat('#a9adb8'), { x: -0.25, y: 1.0, z: 0.35, sy: 0.75 }));
  g.add(mesh(new THREE.SphereGeometry(0.075, 10, 8), mat('#a9adb8'), { x: -0.13, y: 1.06, z: 0.42 }));
  addBox(STALL.x, STALL.z + 0.1, 2.5, 1.4);
  return { pos: new THREE.Vector3(STALL.x, 0, STALL.z + 1.3), group: g };
}

/** The shop card (opened with E at the stall). */
export class Shop {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.id = 'shop'; el.className = 'overlay-modal hidden';
    el.innerHTML = `<div class="gcard shop-card"><div class="jr-head">${icon('shop', 28)}<h2>Supply Shelf</h2><span class="coins-pill"></span><button type="button" class="jr-close" title="Close (Esc)">&times;</button></div>
      <p class="shop-sub">Whisker Supply Co. · cat food is the cats' main meal now. Coins come from adoptions and the donation jar.</p>
      <div class="shop-list"></div><div class="shop-stock"></div></div>`;
    document.body.appendChild(el);
    this.el = el; this.list = el.querySelector('.shop-list');
    el.querySelector('.jr-close').addEventListener('click', () => this.toggle(false));
    el.addEventListener('click', (e) => {
      if (e.target === el) { this.toggle(false); return; }
      const b = e.target.closest('button[data-buy]'); if (b && !b.disabled) this.buy(b.dataset.buy);
    });
  }
  get isOpen() { return !this.el.classList.contains('hidden'); }
  toggle(v = !this.isOpen) {
    if (v === this.isOpen) return;
    this.el.classList.toggle('hidden', !v);
    this.game.shopOpen = v;
    sound.play(v ? 'page' : 'click');
    if (v) { this.render(); if (!this.game.state.flags.shopHello) { this.game.state.flags.shopHello = true; this.game.host.say('The Supply Shelf! Cat food bags for the bowls, medicine, shots and bandages for the clinic, and seeds. Adoption fees keep it all going.', 8); } }
  }
  buy(id) {
    const g = this.game, s = g.state, item = SHOP.find((i) => i.id === id);
    if (!item || s.coins < item.price) { sound.play('nope'); return; }
    s.coins -= item.price;
    const gv = item.give;
    if (gv.food) g.api_food.add(gv.food);
    if (gv.supplies) Object.entries(gv.supplies).forEach(([k, v]) => (s.supplies[k] = (s.supplies[k] || 0) + v));
    if (gv.seeds) Object.entries(gv.seeds).forEach(([k, v]) => (s.seeds[k] = (s.seeds[k] || 0) + v));
    sound.play('pickup'); g.lady.act();
    s.stats.bought = (s.stats.bought || 0) + 1;
    this.render(); g.save();
  }
  render() {
    const s = this.game.state;
    this.el.querySelector('.coins-pill').innerHTML = `${icon('coin', 20)}<b>${s.coins}</b>`;
    this.list.innerHTML = SHOP.map((it) => `<div class="shop-item">${icon(it.icon, 30)}<div><b>${it.name}</b><span>${it.desc}</span></div>
      <button type="button" data-buy="${it.id}" ${s.coins >= it.price ? '' : 'disabled'}>${icon('coin', 16)}${it.price}</button></div>`).join('');
    const seeds = Object.entries(s.seeds).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${CROPS[k].name.toLowerCase()}`).join(', ') || 'none';
    this.el.querySelector('.shop-stock').innerHTML = `<b>You have:</b> ${s.food} cat food · ${Object.entries(SUPPLY_LABELS).map(([k, l]) => `${s.supplies[k] || 0} ${l.toLowerCase()}`).join(' · ')} · seeds: ${seeds}`;
  }
}
