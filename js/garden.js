// The garden plot: a grid of tiles you Plow, Sow, Water and Harvest.
// Crops only grow while their soil is watered (soil dries every dawn), and once ripe
// they stay ripe forever until you pick them. Nothing ever wilts.
import * as THREE from 'three';
import { mat, mesh } from './util.js';
import { CROPS } from './state.js';

export const GRID = { x0: -14, z0: 0, cols: 6, rows: 4, size: 1 }; // inside the garden fence

export function tileCenter(i) {
  const c = i % GRID.cols, r = Math.floor(i / GRID.cols);
  return new THREE.Vector3(GRID.x0 + (c + 0.5) * GRID.size, 0, GRID.z0 + (r + 0.5) * GRID.size);
}
export function tileAt(x, z) {
  const c = Math.floor((x - GRID.x0) / GRID.size), r = Math.floor((z - GRID.z0) / GRID.size);
  if (c < 0 || r < 0 || c >= GRID.cols || r >= GRID.rows) return -1;
  return r * GRID.cols + c;
}
/** Growth stage: 0 seed, 1 sprout, 2 growing, 3 ripe */
export function stageOf(tile) { if (tile.state !== 'planted') return -1; const g = tile.growth; return g >= 1 ? 3 : g >= 0.55 ? 2 : g >= 0.2 ? 1 : 0; }

const leaf = () => mat('#6fbf5c'), leafLight = () => mat('#8fd36f');

/** Build the little 3D crop for a given crop + stage. */
function cropModel(crop, stage, growth) {
  const g = new THREE.Group();
  if (stage === 0) { // seeds in a mound
    g.add(mesh(new THREE.SphereGeometry(0.16, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat('#8a5a3c'), { y: 0.07, sy: 0.5 }));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.025, 5, 4), mat('#f3e2b3'), { x: (i - 1) * 0.06, y: 0.12, z: (i % 2) * 0.04, cast: false }));
    return g;
  }
  if (stage === 1) { // sprout
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.16, 4), leaf(), { y: 0.15 }));
    [-1, 1].forEach((s) => g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), leafLight(), { x: s * 0.06, y: 0.23, sy: 0.35, sz: 0.6, rz: s * 0.4 })));
    return g;
  }
  const k = stage === 3 ? 1 : 0.55 + 0.45 * ((growth - 0.55) / 0.45); // grows bigger during stage 2
  if (crop === 'carrot') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(mesh(new THREE.ConeGeometry(0.035, 0.34 * k, 4), i % 2 ? leaf() : leafLight(), { x: Math.cos(a) * 0.04, y: 0.1 + 0.17 * k, z: Math.sin(a) * 0.04, rx: Math.sin(a) * 0.35, rz: -Math.cos(a) * 0.35 }));
    }
    if (stage === 3) g.add(mesh(new THREE.ConeGeometry(0.08, 0.18, 7), mat('#f59a4f'), { y: 0.1, rx: Math.PI })); // carrot top peeking out
  } else if (crop === 'cabbage') {
    const r = 0.1 + 0.12 * k;
    g.add(mesh(new THREE.IcosahedronGeometry(r, 1), mat(stage === 3 ? '#a6e38a' : '#8fd36f'), { y: 0.08 + r * 0.7, sy: 0.8 }));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(mesh(new THREE.SphereGeometry(r * 0.75, 6, 4), leaf(), { x: Math.cos(a) * r * 0.9, y: 0.1, z: Math.sin(a) * r * 0.9, sy: 0.3, rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 }));
    }
    if (stage === 3) g.add(mesh(new THREE.IcosahedronGeometry(r * 0.6, 1), mat('#c9f0a6'), { y: 0.1 + r * 1.15 }));
  } else { // pumpkin
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      g.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), leaf(), { x: Math.cos(a) * 0.22, y: 0.08, z: Math.sin(a) * 0.22, sy: 0.25 }));
    }
    const r = stage === 3 ? 0.26 : 0.08 + 0.1 * k;
    g.add(mesh(new THREE.SphereGeometry(r, 10, 8), mat(stage === 3 ? '#f5a35c' : '#a8cf6a'), { y: 0.06 + r * 0.7, sy: 0.75 }));
    if (stage === 3) for (let i = 0; i < 4; i++) g.add(mesh(new THREE.TorusGeometry(r * 0.98, 0.01, 4, 16), mat('#e48d43'), { y: 0.06 + r * 0.7, ry: (i / 4) * Math.PI, sy: 0.75, cast: false }));
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 5), mat('#7a8a45'), { y: 0.06 + r * 1.35 }));
  }
  return g;
}

export class Garden {
  constructor(scene, state) {
    this.state = state;
    this.tiles = [];
    const grassM = new THREE.MeshStandardMaterial({ color: '#bfe2a0', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const dropM = mat('#6cc4ef', { emissive: '#6cc4ef', emissiveIntensity: 0.6, flatShading: false });
    const starM = mat('#ffe27a', { emissive: '#ffd34d', emissiveIntensity: 0.9 });
    for (let i = 0; i < state.tiles.length; i++) {
      const c = tileCenter(i);
      const g = new THREE.Group(); g.position.copy(c); scene.add(g);
      const grass = mesh(new THREE.PlaneGeometry(0.92, 0.92), grassM, { y: 0.012, rx: -Math.PI / 2, cast: false });
      const soilMat = new THREE.MeshStandardMaterial({ color: '#a87650', roughness: 1, flatShading: true });
      const soil = new THREE.Group();
      soil.add(mesh(new THREE.BoxGeometry(0.92, 0.08, 0.92), soilMat, { y: 0.04, cast: false }));
      for (let f = -1; f <= 1; f++) soil.add(mesh(new THREE.BoxGeometry(0.86, 0.03, 0.08), soilMat, { y: 0.09, z: f * 0.28, cast: false })); // furrows
      // little floating hints: a water drop when thirsty, a sparkle when ripe
      const drop = new THREE.Group();
      drop.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), dropM, { y: 0, cast: false }));
      drop.add(mesh(new THREE.ConeGeometry(0.05, 0.09, 10), dropM, { y: 0.06, cast: false }));
      const star = mesh(new THREE.OctahedronGeometry(0.08, 0), starM, { cast: false });
      g.add(grass, soil, drop, star);
      this.tiles.push({ g, grass, soil, soilMat, drop, star, crop: null, key: '' });
      this.refresh(i);
    }
    // highlight square for the targeted tile
    const hl = new THREE.Group();
    const hm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
    [[0, 0.47, 0.98, 0.05], [0, -0.47, 0.98, 0.05], [0.47, 0, 0.05, 0.98], [-0.47, 0, 0.05, 0.98]].forEach(([x, z, w, d]) => hl.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), hm)));
    hl.visible = false; scene.add(hl);
    this.highlight = hl; this.hlMat = hm;
  }

  /** Rebuild a tile's visuals from its state (only swaps the crop mesh when the stage changes). */
  refresh(i) {
    const t = this.state.tiles[i], v = this.tiles[i];
    v.grass.visible = t.state === 'grass';
    v.soil.visible = t.state !== 'grass';
    v.soilMat.color.set(t.wet ? '#6e4a33' : '#a87650');
    const stage = stageOf(t);
    const key = t.state === 'planted' ? `${t.crop}:${stage}:${stage === 2 ? Math.round(t.growth * 10) : ''}` : '';
    if (key !== v.key) {
      if (v.crop) { v.g.remove(v.crop); v.crop.traverse((o) => o.geometry && o.geometry.dispose()); v.crop = null; }
      if (t.state === 'planted') { v.crop = cropModel(t.crop, stage, t.growth); v.crop.position.y = 0.08; v.crop.rotation.y = i * 1.3; v.g.add(v.crop); }
      v.key = key;
    }
    v.drop.visible = t.state === 'planted' && stage < 3 && !t.wet;
    v.star.visible = stage === 3;
  }
  refreshAll() { for (let i = 0; i < this.tiles.length; i++) this.refresh(i); }

  /** Advance watered crops by some in-game hours. Returns the indices that just became ripe. */
  grow(hours) {
    const ripened = [];
    this.state.tiles.forEach((t, i) => {
      if (t.state !== 'planted' || !t.wet || t.growth >= 1) return;
      const before = stageOf(t);
      t.growth = Math.min(1, t.growth + hours / CROPS[t.crop].hours);
      if (t.growth >= 1) ripened.push(i);
      if (stageOf(t) !== before || before === 2) this.refresh(i);
    });
    return ripened;
  }
  /** Every dawn the soil dries out (crops just pause until watered again). */
  dryAll() { this.state.tiles.forEach((t, i) => { if (t.wet) { t.wet = false; this.refresh(i); } }); }

  count(fn) { return this.state.tiles.filter(fn).length; }
  get ripeCount() { return this.count((t) => t.state === 'planted' && t.growth >= 1); }
  get thirstyCount() { return this.count((t) => t.state === 'planted' && t.growth < 1 && !t.wet); }

  showHighlight(i, ok) {
    if (i < 0) { this.highlight.visible = false; return; }
    this.highlight.visible = true;
    this.highlight.position.copy(tileCenter(i)); this.highlight.position.y = 0.11;
    this.hlMat.color.set(ok ? '#ffffff' : '#ffc2cf');
  }

  animate(t) {
    this.tiles.forEach((v, i) => {
      if (v.drop.visible) v.drop.position.y = 0.55 + Math.sin(t * 3 + i) * 0.05;
      if (v.star.visible) { v.star.position.y = 0.75 + Math.sin(t * 2.5 + i) * 0.06; v.star.rotation.y = t * 2 + i; }
    });
    this.highlight.children.forEach((c) => (c.material.opacity = 0.6 + Math.sin(t * 5) * 0.25));
  }
}
