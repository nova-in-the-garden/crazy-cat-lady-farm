// The Farmers Market: a roadside stand at the end of the drive (across from the mailbox).
// Buy cat food, clinic supplies and seeds with coins; orders are delivered to the porch by a courier (delivery.js).
// Coins come from adoption fees and the little donation jar that fills a bit every morning.
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';
import { addBox } from './collision.js';
import { SHOP, SUPPLY_LABELS, CROPS } from './state.js';
import { icon } from './ui.js';
import { sound } from './sound.js';

export const STALL = { x: -3.9, z: 19.0, ry: Math.PI / 2 };   // faces the drive (+x)

function signTex() {
  return canvasTexture(768, 192, (ctx, w, h) => {
    ctx.fillStyle = '#fff6ec'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 50); ctx.fill();
    ctx.strokeStyle = '#3f9a8b'; ctx.lineWidth = 10; ctx.stroke();
    drawPaw(ctx, 90, h / 2, 80, '#9fd6bf', -0.3); drawPaw(ctx, w - 90, h / 2, 80, '#9fd6bf', 0.3);
    ctx.fillStyle = '#2f6f66'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 62px Fredoka, "Trebuchet MS", sans-serif'; ctx.fillText('Farmers Market', w / 2, h / 2 - 22);
    ctx.font = '600 36px Fredoka, "Trebuchet MS", sans-serif'; ctx.fillStyle = '#c95c74'; ctx.fillText('fresh · local · we deliver!', w / 2, h / 2 + 38);
  });
}

/** The Farmers Market stand by the road. */
export function buildSupplyStall(scene) {
  const g = new THREE.Group(); g.position.set(STALL.x, 0, STALL.z); g.rotation.y = STALL.ry; scene.add(g);
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
  // farmers-market touches: crates of veggies out front and a chalkboard
  const crate = (x, z, cols) => {
    const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c);
    c.add(mesh(new THREE.BoxGeometry(0.55, 0.32, 0.4), wood, { y: 0.16 }));
    for (let i = 0; i < 6; i++) c.add(mesh(new THREE.SphereGeometry(0.075, 8, 6), mat(cols[i % cols.length]), { x: -0.17 + (i % 3) * 0.17, y: 0.36, z: i < 3 ? -0.08 : 0.08 }));
  };
  crate(-1.55, 0.55, ['#f59a4f', '#f7b267']);   // carrots
  crate(1.55, 0.55, ['#9edb7f', '#7fc463']);    // cabbages
  crate(1.55, 1.0, ['#f5a35c', '#e98d3f']);     // pumpkins
  const cb = new THREE.Group(); cb.position.set(-1.45, 0, 1.25); cb.rotation.y = 0.35; g.add(cb);
  const chalk = canvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#3d4a44'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#c1906a'; ctx.lineWidth = 16; ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = '#fff6ec'; ctx.textAlign = 'center'; ctx.font = '700 40px Fredoka, sans-serif'; ctx.fillText('Today', w / 2, 62);
    ctx.font = '500 28px Fredoka, sans-serif'; ['cat food', 'seeds', 'medicine', 'bandages'].forEach((t, i) => ctx.fillText(t, w / 2, 118 + i * 40));
    ctx.fillStyle = '#ffd76e'; ctx.font = '600 26px Fredoka, sans-serif'; ctx.fillText('free delivery!', w / 2, 290);
  });
  [-0.22, 0.22].forEach((x) => cb.add(mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), wood, { x, y: 0.47, rx: -0.15, z: 0.07 })));
  cb.add(mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ map: chalk, roughness: 0.9 }), { y: 0.62, z: 0.1, rx: -0.15, cast: false }));
  // (the stand is turned to face the drive, so its footprint is rotated too)
  addBox(STALL.x - 0.1, STALL.z, 1.4, 2.5);
  addBox(STALL.x + 0.55, STALL.z, 0.45, 3.6);   // veggie crates out front
  return { pos: new THREE.Vector3(STALL.x + 1.35, 0, STALL.z), group: g };
}

/** The shop card (opened with E at the stall). */
export class Shop {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.id = 'shop'; el.className = 'overlay-modal hidden';
    el.innerHTML = `<div class="gcard shop-card"><div class="jr-head">${icon('shop', 28)}<h2>Farmers Market</h2><span class="coins-pill"></span><button type="button" class="jr-close" title="Close (Esc)">&times;</button></div>
      <p class="shop-sub">Fresh, local and delivered! Everything you buy is brought up the drive to Granny's porch. Coins come from adoptions and the donation jar.</p>
      <div class="shop-list"></div><div class="shop-order"></div><div class="shop-stock"></div></div>`;
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
    if (v) { this.render(); if (!this.game.state.flags.shopHello) { this.game.state.flags.shopHello = true; this.game.host.say("The Farmers Market! Cat food bags, medicine, shots, bandages and seeds. Whatever we buy, the delivery fellow brings it up to the porch.", 8); } }
  }
  buy(id) {
    const g = this.game, s = g.state, item = SHOP.find((i) => i.id === id);
    if (!item || s.coins < item.price) { sound.play('nope'); return; }
    s.coins -= item.price;
    g.delivery.order(item.give);          // delivered to the porch, not straight into her apron
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
    const d = this.game.delivery;
    this.el.querySelector('.shop-order').innerHTML = d && d.hasPending() ? `📦 <b>Ordered:</b> ${d.describe(s.market.pending)}. <span>${d.statusText()}</span>` : '';
    this.el.querySelector('.shop-stock').innerHTML = `<b>You have:</b> ${s.food} cat food · ${Object.entries(SUPPLY_LABELS).map(([k, l]) => `${s.supplies[k] || 0} ${l.toLowerCase()}`).join(' · ')} · seeds: ${seeds}`;
  }
}
