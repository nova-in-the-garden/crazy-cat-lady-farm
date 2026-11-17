// Inside the Crazy Cat Lady's cottage: the Cat Food Kitchen (where crops become cat food)
// and her cozy bedroom corner (where she sleeps until morning).
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';
import { addBox, addCircle } from './collision.js';

export function buildCottageInterior(house, { HX, HZ, W, D, H, T, FLOOR }) {
  const g = new THREE.Group(); g.position.y = FLOOR; house.add(g);
  const Y = 0; // floor level inside g
  const wood = mat('#c1906a'), woodDark = mat('#8f6446'), white = mat('#ffffff'), mint = mat('#9fd6bf');

  /* Wooden plank floor */
  const floorTex = canvasTexture(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#e2b98d' : '#d9ad7f'; ctx.fillRect(0, i * 32, w, 32);
      ctx.fillStyle = 'rgba(120,70,40,0.25)'; ctx.fillRect(0, i * 32, w, 2);
      ctx.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 2, D / 2);
  g.add(mesh(new THREE.PlaneGeometry(W - 2 * T, D - 2 * T), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }), { y: 0.005, rx: -Math.PI / 2, cast: false }));
  // round pink rug in the middle
  g.add(mesh(new THREE.CircleGeometry(1.0, 24), new THREE.MeshStandardMaterial({ color: '#f6c2d0', roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }), { x: 0.6, y: 0.01, z: 0.2, rx: -Math.PI / 2, cast: false }));
  g.add(mesh(new THREE.RingGeometry(0.8, 0.88, 24), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, polygonOffset: true, polygonOffsetFactor: -5 }), { x: 0.6, y: 0.012, z: 0.2, rx: -Math.PI / 2, cast: false }));

  /* ---------- Kitchen counter run along the back-left wall ---------- */
  const backZ = -D / 2 + T + 0.32;
  const counter = (x, w) => {
    g.add(mesh(new THREE.BoxGeometry(w, 0.85, 0.6), mint, { x, y: 0.425, z: backZ }));
    g.add(mesh(new THREE.BoxGeometry(w + 0.04, 0.06, 0.66), white, { x, y: 0.88, z: backZ + 0.02 }));
    for (let i = 0; i < Math.round(w / 0.6); i++) { // cupboard doors + knobs
      const dx = x - w / 2 + 0.3 + i * 0.6;
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.62, 0.02), mat('#b7e3d1'), { x: dx, y: 0.42, z: backZ + 0.31, cast: false }));
      g.add(mesh(new THREE.SphereGeometry(0.025, 6, 5), mat('#f2c75c'), { x: dx + 0.17, y: 0.55, z: backZ + 0.33, cast: false }));
    }
  };
  counter(-1.25, 1.3);   // sink counter
  counter(-3.0, 0.3); // little filler next to the stove
  // sink + faucet
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.36), mat('#cfe1ea', { metalness: 0.4, roughness: 0.3 }), { x: -1.0, y: 0.9, z: backZ, cast: false }));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), mat('#cfd6dc', { metalness: 0.6, roughness: 0.3 }), { x: -1.0, y: 1.05, z: backZ - 0.22 }));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), mat('#cfd6dc', { metalness: 0.6, roughness: 0.3 }), { x: -1.0, y: 1.19, z: backZ - 0.14, rx: Math.PI / 2 }));
  // cutting board with carrots, stack of cat bowls
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.03, 0.28), wood, { x: -1.6, y: 0.93, z: backZ + 0.05, ry: 0.15 }));
  for (let i = 0; i < 2; i++) g.add(mesh(new THREE.ConeGeometry(0.035, 0.18, 6), mat('#f59a4f'), { x: -1.65 + i * 0.1, y: 0.97, z: backZ + 0.05, rz: Math.PI / 2 }));
  ['#f4a3b5', '#9fd0ef', '#c8aaf2', '#ffd76e'].forEach((c, i) => g.add(mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.07, 12), mat(c, { flatShading: false }), { x: -0.75, y: 0.95 + i * 0.065, z: backZ + 0.12 })));
  addBox(HX - 1.25, HZ + backZ, 1.3, 0.65);

  /* ---------- The stove: where crops become cat food ---------- */
  const stove = new THREE.Group(); stove.position.set(-2.4, Y, backZ); g.add(stove);
  stove.add(mesh(new THREE.BoxGeometry(0.85, 0.88, 0.62), mat('#fff6ea'), { y: 0.44 }));
  stove.add(mesh(new THREE.BoxGeometry(0.87, 0.05, 0.64), mat('#5b4256'), { y: 0.9 }));
  const ovenGlow = mat('#ffcf8a', { emissive: '#ff9a3c', emissiveIntensity: 0.2 });
  stove.add(mesh(new THREE.BoxGeometry(0.6, 0.35, 0.02), ovenGlow, { y: 0.42, z: 0.32, cast: false }));
  stove.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), mat('#cfd6dc', { metalness: 0.6 }), { y: 0.66, z: 0.34, cast: false }));
  for (let i = 0; i < 4; i++) stove.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), mat('#f4a3b5'), { x: -0.3 + i * 0.2, y: 0.8, z: 0.33, rx: Math.PI / 2, cast: false }));
  const burnerMat = mat('#3d2b3a', { emissive: '#ff6a3c', emissiveIntensity: 0 });
  [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.15], [0.2, 0.15]].forEach(([x, z]) => stove.add(mesh(new THREE.TorusGeometry(0.1, 0.02, 4, 12), burnerMat, { x, y: 0.93, z, rx: Math.PI / 2, cast: false })));
  // big pink cooking pot with a lid
  const pot = new THREE.Group(); pot.position.set(-0.2, 0.93, -0.12); stove.add(pot);
  pot.add(mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.28, 14), mat('#f58fa8', { flatShading: false, roughness: 0.4 }), { y: 0.14 }));
  const lid = new THREE.Group(); lid.position.y = 0.29; pot.add(lid);
  lid.add(mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 14), mat('#e8798f', { flatShading: false }), {}));
  lid.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), white, { y: 0.03 }));
  [-1, 1].forEach((s) => pot.add(mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), mat('#e8798f'), { x: s * 0.21, y: 0.22, ry: Math.PI / 2 })));
  // small saucepan
  stove.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), mat('#9fd0ef', { flatShading: false }), { x: 0.2, y: 0.99, z: 0.15 }));
  stove.add(mesh(new THREE.BoxGeometry(0.25, 0.025, 0.04), mat('#5b4256'), { x: 0.42, y: 1.02, z: 0.2, ry: -0.4 }));
  // range hood
  stove.add(mesh(new THREE.BoxGeometry(0.9, 0.18, 0.5), mat('#ffffff'), { y: 1.95, z: -0.05 }));
  stove.add(mesh(new THREE.CylinderGeometry(0.15, 0.3, 0.3, 4, 1), mat('#ffffff'), { y: 1.75, z: -0.05, ry: Math.PI / 4, sz: 0.9 }));
  addBox(HX - 2.4, HZ + backZ, 0.9, 0.65);
  addBox(HX - 3.0, HZ + backZ, 0.3, 0.65);
  // "Cat Food Kitchen" plaque above the stove
  const plaqueTex = canvasTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fff6e8'; ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 40); ctx.fill();
    ctx.strokeStyle = '#e8798f'; ctx.lineWidth = 8; ctx.stroke();
    drawPaw(ctx, 70, h / 2 + 4, 60, '#e8798f', -0.3);
    ctx.fillStyle = '#5b4256'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 52px Fredoka, sans-serif'; ctx.fillText('Cat Food', 300, h * 0.36);
    ctx.fillStyle = '#d0607c'; ctx.font = '700 46px Fredoka, sans-serif'; ctx.fillText('Kitchen', 300, h * 0.7);
  });
  g.add(mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.8, transparent: true }), { x: -1.5, y: 2.35, z: -D / 2 + T + 0.02, cast: false }));

  /* ---------- Pantry shelf (front-left corner): cans of cat food fill it up ---------- */
  const pantry = new THREE.Group(); pantry.position.set(-W / 2 + T + 0.25, Y, 1.35); pantry.rotation.y = Math.PI / 2; g.add(pantry);
  pantry.add(mesh(new THREE.BoxGeometry(1.3, 2.0, 0.05), mat('#f3e3cf'), { y: 1.0, z: -0.22 }));
  [-1, 1].forEach((s) => pantry.add(mesh(new THREE.BoxGeometry(0.06, 2.0, 0.48), wood, { x: s * 0.63, y: 1.0 })));
  pantry.add(mesh(new THREE.BoxGeometry(1.3, 0.06, 0.48), wood, { y: 2.0 }));
  const cans = [];
  const canCols = ['#f4a3b5', '#9fd0ef', '#ffd76e', '#c8aaf2', '#a6e3b8', '#ff9f85'];
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = 0.1 + shelf * 0.48;
    pantry.add(mesh(new THREE.BoxGeometry(1.24, 0.04, 0.44), wood, { y, cast: false }));
    if (shelf === 3) { // top shelf: jars of crops
      ['#f59a4f', '#9edb7f', '#f5a35c'].forEach((c, i) => {
        pantry.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 10), mat('#e8f6ff', { transparent: true, opacity: 0.55 }), { x: -0.38 + i * 0.38, y: y + 0.15, cast: false }));
        pantry.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 10), mat(c), { x: -0.38 + i * 0.38, y: y + 0.1, cast: false }));
        pantry.add(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 10), mat('#e8798f'), { x: -0.38 + i * 0.38, y: y + 0.3, cast: false }));
      });
      continue;
    }
    for (let i = 0; i < 6; i++) {
      const can = new THREE.Group(); can.position.set(-0.47 + i * 0.19, y + 0.02, 0.02);
      can.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 10), mat('#d7dde3', { metalness: 0.5, roughness: 0.35 }), { y: 0.06, cast: false }));
      can.add(mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.07, 10), mat(canCols[(i + shelf) % canCols.length]), { y: 0.06, cast: false }));
      pantry.add(can); cans.push(can); can.visible = false;
    }
  }
  addBox(HX - W / 2 + T + 0.25, HZ + 1.35, 0.5, 1.3);

  /* ---------- Bedroom corner (right side): bed for sleeping ---------- */
  const bed = new THREE.Group(); bed.position.set(W / 2 - T - 0.7, Y, -D / 2 + T + 1.05); g.add(bed);
  bed.add(mesh(new THREE.BoxGeometry(1.25, 0.35, 2.0), woodDark, { y: 0.2 }));
  bed.add(mesh(new THREE.BoxGeometry(1.25, 0.95, 0.1), woodDark, { y: 0.48, z: -1.0 }));          // headboard
  bed.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 16, 1, false, -Math.PI / 2, Math.PI), woodDark, { y: 0.95, z: -1.0, rx: Math.PI / 2 }));
  bed.add(mesh(new THREE.BoxGeometry(1.15, 0.16, 1.9), white, { y: 0.45 }));
  const quiltTex = canvasTexture(128, 128, (ctx) => {
    const cs = ['#f7a8c4', '#fff3c9', '#c8aaf2', '#a6e3b8'];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = cs[(x + y * 2) % 4]; ctx.fillRect(x * 32, y * 32, 32, 32); }
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 3 === 0) drawPaw(ctx, x * 32 + 16, y * 32 + 17, 14, '#ffffff');
  });
  bed.add(mesh(new THREE.BoxGeometry(1.22, 0.06, 1.3), new THREE.MeshStandardMaterial({ map: quiltTex, roughness: 1 }), { y: 0.55, z: 0.3 }));
  bed.add(mesh(new THREE.BoxGeometry(0.75, 0.14, 0.35), mat('#ffffff', { flatShading: false }), { y: 0.6, z: -0.72 }));
  // cat-shaped pillow
  bed.add(mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('#f5b16b'), { x: 0.32, y: 0.66, z: -0.5, sy: 0.75 }));
  [-1, 1].forEach((s) => bed.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 4), mat('#f5b16b'), { x: 0.32 + s * 0.08, y: 0.8, z: -0.5 })));
  addBox(HX + W / 2 - T - 0.7, HZ - D / 2 + T + 1.05, 1.3, 2.05);
  // nightstand + lamp
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.55, 0.45), wood, { x: W / 2 - T - 1.65, y: 0.28, z: -D / 2 + T + 0.3 }));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 6), white, { x: W / 2 - T - 1.65, y: 0.7, z: -D / 2 + T + 0.3 }));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 10, 1, true), mat('#ffd6e0', { emissive: '#ffcf9a', emissiveIntensity: 0.6, side: THREE.DoubleSide }), { x: W / 2 - T - 1.65, y: 0.9, z: -D / 2 + T + 0.3 }));
  addBox(HX + W / 2 - T - 1.65, HZ - D / 2 + T + 0.3, 0.5, 0.45);

  /* ---------- Little round table with two chairs and a teapot (front-right) ---------- */
  const table = new THREE.Group(); table.position.set(2.2, Y, 1.35); g.add(table);
  table.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16), wood, { y: 0.72 }));
  table.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 6), woodDark, { y: 0.36 }));
  table.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), mat('#9fd0ef', { flatShading: false }), { y: 0.82, sy: 0.85 }));
  table.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 5), mat('#9fd0ef'), { x: 0.11, y: 0.84, rz: -0.8 }));
  table.add(mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.06, 8), white, { x: -0.2, y: 0.78, z: 0.1 }));
  [-1, 1].forEach((s) => {
    const c = new THREE.Group(); c.position.set(s * 0.7, 0, 0); c.rotation.y = s * Math.PI / 2; table.add(c);
    c.add(mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), wood, { y: 0.45 }));
    c.add(mesh(new THREE.BoxGeometry(0.4, 0.45, 0.05), wood, { y: 0.7, z: 0.18 }));
    c.add(mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), mat('#f7c6d2'), { y: 0.5 }));
    [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([x, z]) => c.add(mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), woodDark, { x, y: 0.22, z })));
  });
  addCircle(HX + 2.2, HZ + 1.35, 0.5); addCircle(HX + 1.5, HZ + 1.35, 0.25); addCircle(HX + 2.9, HZ + 1.35, 0.25);

  /* ---------- A cat bed by the stove (ready for the first cat!) ---------- */
  g.add(mesh(new THREE.TorusGeometry(0.28, 0.11, 8, 16), mat('#c8aaf2', { flatShading: false }), { x: -0.2, y: 0.11, z: -1.25, rx: Math.PI / 2 }));
  g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 14), mat('#fff3c9'), { x: -0.2, y: 0.05, z: -1.25 }));

  /* ---------- Litter box (front, between the pantry and the door) ---------- */
  const litter = new THREE.Group(); litter.position.set(-1.65, Y, D / 2 - T - 0.45); g.add(litter);
  litter.add(mesh(new THREE.BoxGeometry(0.75, 0.16, 0.5), mat('#9fd0ef'), { y: 0.08 }));
  litter.add(mesh(new THREE.BoxGeometry(0.66, 0.02, 0.42), mat('#efe3c8'), { y: 0.15, cast: false }));
  litter.add(mesh(new THREE.BoxGeometry(0.08, 0.02, 0.3), mat('#f7a8c4'), { x: 0.48, y: 0.01, z: 0.05, ry: 0.4, cast: false })); // little scoop
  const clumps = [];
  for (let i = 0; i < 4; i++) {
    const m = mesh(new THREE.DodecahedronGeometry(0.035, 0), mat('#a88b64'), { x: -0.22 + i * 0.14, y: 0.17, z: (i % 2 ? 0.08 : -0.07), cast: false });
    m.visible = false; litter.add(m); clumps.push(m);
  }
  addBox(HX - 1.65, HZ + D / 2 - T - 0.45, 0.75, 0.5);

  /* ---------- Warm ceiling lamp ---------- */
  const lampY = H - 0.45;
  // (just the light: a hanging lamp would float in mid-air while the roof is faded out)
  const light = new THREE.PointLight('#ffe0b8', 5, 8, 1.6); light.position.set(0, lampY - 0.2, 0); g.add(light);

  /* ---------- Steam puffs for cooking ---------- */
  const steam = [];
  const steamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0, roughness: 1, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const p = mesh(new THREE.IcosahedronGeometry(0.08, 1), steamMat.clone(), { cast: false, receive: false });
    p.userData.phase = i / 6; stove.add(p); steam.push(p);
  }
  let cooking = 0;

  const toWorld = (x, z) => new THREE.Vector3(HX + x, FLOOR, HZ + z);
  return {
    stovePos: toWorld(-2.0, backZ + 0.75),     // stand here to cook
    bedPos: toWorld(W / 2 - T - 0.7, -D / 2 + T + 2.4),
    pantryPos: toWorld(-W / 2 + T + 0.9, 1.35),
    litterPos: toWorld(-1.65, D / 2 - T - 1.05),
    /** litter 0 (fresh) .. 1 (needs scooping) */
    setLitter(v) { clumps.forEach((c, i) => (c.visible = v > 0.2 + i * 0.18)); },
    /** show up to 18 cans on the pantry shelves */
    setFood(n) { cans.forEach((c, i) => (c.visible = i < Math.min(n, cans.length))); },
    cook(seconds = 3) { cooking = seconds; },
    animate(dt, t) {
      cooking = Math.max(0, cooking - dt);
      const on = cooking > 0 ? Math.min(1, cooking) : 0;
      burnerMat.emissiveIntensity = on * 1.2;
      ovenGlow.emissiveIntensity = 0.2 + on * 0.6;
      lid.position.y = 0.29 + (on ? Math.abs(Math.sin(t * 18)) * 0.03 : 0);
      for (const p of steam) {
        const k = (t * 0.6 + p.userData.phase) % 1;
        p.position.set(-0.2 + Math.sin(k * 7 + p.userData.phase * 9) * 0.06, 1.25 + k * 0.7, -0.12);
        p.scale.setScalar(0.6 + k * 1.4);
        p.material.opacity = 0.65 * (1 - k) * on;
      }
    },
  };
}
