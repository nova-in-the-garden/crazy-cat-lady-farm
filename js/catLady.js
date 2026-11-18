// The Crazy Cat Lady herself, built from simple shapes.
// She faces +z in her own space; the game turns her with group.rotation.y.
// createCatLady() returns { group, headAnchor, update(dt, moveAmount, running), wave() }.
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';

const C = {
  skin: '#f9d6bf', cheek: '#f4a0a6', hair: '#dcd8e4', hairShade: '#c3bdd1',
  cardigan: '#86c7b8', cardiganDark: '#6aae9f', skirt: '#b9a0dc', apron: '#fff4e4',
  stocking: '#efe2ea', slipper: '#f6a6ba', glasses: '#d0607c', ear: '#9a6fb0', earInner: '#f6a6ba',
  pearl: '#fffaf2', ink: '#3d2b3a',
};

/** Cream fabric with little pink paw prints, for the apron. */
function apronTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = C.apron; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      drawPaw(ctx, x * 52 + (y % 2) * 26 + 14, y * 52 + 26, 18, (x + y) % 3 === 0 ? '#f0a5b8' : '#c7b2ea', (x - y) * 0.4);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createCatLady() {
  const group = new THREE.Group();     // positioned/rotated by the game
  const body = new THREE.Group();      // bobs up and down while walking
  group.add(body);
  const apronMat = new THREE.MeshStandardMaterial({ map: apronTexture(), roughness: 0.9 });

  /* --- Legs + cat slippers (pivot at the hip so they can swing) --- */
  const legs = [];
  [-1, 1].forEach((s) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.1, 0.5, 0);
    hip.add(mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.44, 8), mat(C.stocking), { y: -0.22 }));
    const slip = new THREE.Group(); slip.position.set(0, -0.46, 0.04);
    slip.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(C.slipper, { flatShading: false }), { sx: 0.95, sy: 0.6, sz: 1.5 }));
    slip.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat('#ffffff', { flatShading: false }), { y: 0.04, z: 0.12 }));   // pompom nose
    [-1, 1].forEach((e) => slip.add(mesh(new THREE.ConeGeometry(0.03, 0.06, 4), mat(C.slipper), { x: e * 0.045, y: 0.07, z: 0.06 }))); // slipper cat ears
    hip.add(slip);
    body.add(hip); legs.push(hip);
  });

  /* --- Skirt + paw-print apron --- */
  body.add(mesh(new THREE.CylinderGeometry(0.22, 0.4, 0.58, 16), mat(C.skirt, { flatShading: false }), { y: 0.5 }));
  body.add(mesh(new THREE.TorusGeometry(0.39, 0.025, 6, 20), mat('#ffffff', { flatShading: false }), { y: 0.215, rx: Math.PI / 2 })); // lace hem
  body.add(mesh(new THREE.CylinderGeometry(0.225, 0.405, 0.5, 16, 1, true, -0.85, 1.7), apronMat, { y: 0.53, cast: false }));

  /* --- Torso: cardigan with apron bib, buttons and a pearl necklace --- */
  body.add(mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.46, 14), mat(C.cardigan, { flatShading: false }), { y: 1.0 }));
  body.add(mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(C.cardigan, { flatShading: false }), { y: 1.2, sy: 0.55 }));
  body.add(mesh(new THREE.CylinderGeometry(0.196, 0.232, 0.36, 14, 1, true, -0.5, 1.0), apronMat, { y: 0.97, cast: false }));
  [-1, 1].forEach((s) => {
    body.add(mesh(new THREE.BoxGeometry(0.035, 0.46, 0.04), mat(C.cardiganDark), { x: s * 0.1, y: 1.0, z: 0.205, rz: s * 0.08, cast: false }));
    for (let i = 0; i < 3; i++) body.add(mesh(new THREE.SphereGeometry(0.018, 6, 5), mat('#ffd76e'), { x: s * 0.125, y: 1.12 - i * 0.12, z: 0.215 - i * 0.004, cast: false }));
  });
  for (let i = 0; i < 11; i++) { // pearls
    const a = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    body.add(mesh(new THREE.SphereGeometry(0.02, 6, 5), mat(C.pearl, { flatShading: false, roughness: 0.3 }), { x: Math.sin(a) * 0.11, y: 1.27 - Math.cos(a) * 0.02 - (Math.abs(a) < 0.6 ? 0.03 : 0), z: Math.cos(a) * 0.1 + 0.02, cast: false }));
  }

  /* --- Arms (pivot at the shoulder) --- */
  const arms = [];
  let handAnchor = null;
  [-1, 1].forEach((s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.24, 1.2, 0);
    const inner = new THREE.Group(); inner.rotation.z = s * 0.14; sh.add(inner);
    inner.add(mesh(new THREE.CapsuleGeometry(0.065, 0.3, 4, 10), mat(C.cardigan, { flatShading: false }), { y: -0.2 }));
    inner.add(mesh(new THREE.TorusGeometry(0.06, 0.022, 6, 12), mat(C.cardiganDark), { y: -0.38, rx: Math.PI / 2 }));
    inner.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(C.skin, { flatShading: false }), { y: -0.44 }));
    if (s > 0) { const hand = new THREE.Group(); hand.position.y = -0.46; inner.add(hand); handAnchor = hand; }
    body.add(sh); arms.push(sh);
  });

  /* --- Head --- */
  const head = new THREE.Group(); head.position.set(0, 1.55, 0); body.add(head);
  head.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), mat(C.skin), { y: -0.27 })); // neck
  head.add(mesh(new THREE.SphereGeometry(0.27, 24, 18), mat(C.skin, { flatShading: false })));
  // eyes (with a twinkle) - they blink
  const eyes = [];
  [-1, 1].forEach((s) => {
    const e = new THREE.Group(); e.position.set(s * 0.09, 0.0, 0.245);
    e.add(mesh(new THREE.SphereGeometry(0.036, 10, 8), mat(C.ink, { flatShading: false, roughness: 0.4 }), { sz: 0.6, cast: false }));
    e.add(mesh(new THREE.SphereGeometry(0.012, 6, 5), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), { x: 0.012, y: 0.014, z: 0.02, cast: false }));
    head.add(e); eyes.push(e);
  });
  // round glasses
  const gm = mat(C.glasses, { flatShading: false, roughness: 0.4 });
  [-1, 1].forEach((s) => {
    head.add(mesh(new THREE.TorusGeometry(0.068, 0.012, 6, 20), gm, { x: s * 0.093, y: 0.0, z: 0.262, ry: s * -0.12, cast: false }));
    head.add(mesh(new THREE.CircleGeometry(0.062, 16), new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.22, roughness: 0.1 }), { x: s * 0.093, z: 0.264, ry: s * -0.12, cast: false }));
    head.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.22), gm, { x: s * 0.2, y: 0.01, z: 0.15, ry: s * 0.25, cast: false })); // arms of the glasses
  });
  head.add(mesh(new THREE.TorusGeometry(0.03, 0.01, 4, 8, Math.PI), gm, { y: 0.005, z: 0.275, cast: false }));
  // brows, cheeks, nose, smile
  [-1, 1].forEach((s) => {
    head.add(mesh(new THREE.CapsuleGeometry(0.008, 0.04, 2, 4), mat(C.hairShade), { x: s * 0.095, y: 0.1, z: 0.25, rz: Math.PI / 2 + s * 0.2, cast: false }));
    head.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: C.cheek, transparent: true, opacity: 0.75, roughness: 1 }), { x: s * 0.155, y: -0.075, z: 0.215, sz: 0.4, cast: false }));
  });
  head.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#f3bfa3', { flatShading: false }), { y: -0.04, z: 0.27, cast: false }));
  head.add(mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 12, Math.PI), mat('#c45d6f'), { y: -0.095, z: 0.252, rz: Math.PI, rx: -0.2, cast: false }));

  // Hair: soft gray cap, a ring of curls, and a big messy bun with knitting needles
  const hairM = mat(C.hair, { flatShading: false, roughness: 1 });
  const hairM2 = mat(C.hairShade, { flatShading: false, roughness: 1 });
  head.add(mesh(new THREE.SphereGeometry(0.285, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, { y: 0.01, rx: -0.38 }));
  head.add(mesh(new THREE.SphereGeometry(0.28, 20, 14, Math.PI * 1.05, Math.PI * 0.9, 0.2, Math.PI * 0.62), hairM, { z: -0.01, s: 1.03 }));
  for (let i = 0; i < 22; i++) {
    const a = Math.PI * 0.32 + (i / 21) * Math.PI * 1.36; // around the sides and back
    const y = -0.02 + Math.sin(i * 2.1) * 0.06 + (i % 2) * 0.06;
    head.add(mesh(new THREE.SphereGeometry(0.075 + (i % 3) * 0.012, 10, 8), i % 4 === 0 ? hairM2 : hairM, { x: Math.sin(a) * 0.25, y, z: Math.cos(a) * 0.25 }));
  }
  for (let i = 0; i < 6; i++) { // bangs / fringe curls
    const a = -0.85 + (i / 5) * 1.7;
    head.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), hairM, { x: Math.sin(a) * 0.22, y: 0.2 - Math.abs(a) * 0.05, z: Math.cos(a) * 0.17 }));
  }
  const bun = new THREE.Group(); bun.position.set(0, 0.3, -0.06); head.add(bun);
  bun.add(mesh(new THREE.SphereGeometry(0.14, 14, 12), hairM));
  [[0.1, 0.05, 0.03], [-0.09, 0.07, -0.02], [0.02, 0.12, -0.07], [-0.03, 0.02, 0.11]].forEach(([x, y, z]) => bun.add(mesh(new THREE.SphereGeometry(0.065, 8, 6), hairM2, { x, y, z })));
  [-1, 1].forEach((s) => { // knitting needles poking out of the bun
    bun.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 5), mat('#d9b07a'), { rz: s * 0.9, rx: 0.3 }));
    bun.add(mesh(new THREE.SphereGeometry(0.025, 6, 5), mat(s > 0 ? '#f58fa8' : '#9fd0ef'), { x: -s * 0.17, y: 0.12, z: 0.06 }));
  });
  // Cat-ear headband
  head.add(mesh(new THREE.TorusGeometry(0.3, 0.022, 6, 24, Math.PI), mat(C.ear), { y: 0.02, z: 0.04, rx: -0.15 }));
  [-1, 1].forEach((s) => {
    const ear = new THREE.Group(); ear.position.set(s * 0.165, 0.3, 0.04); ear.rotation.z = -s * 0.38;
    ear.add(mesh(new THREE.ConeGeometry(0.11, 0.22, 4), mat(C.ear), { ry: Math.PI / 4, sz: 0.45 }));
    ear.add(mesh(new THREE.ConeGeometry(0.065, 0.14, 4), mat(C.earInner), { y: -0.02, z: 0.03, ry: Math.PI / 4, sz: 0.3, cast: false }));
    head.add(ear);
  });

  // Point above her head where the nameplate and speech bubble attach
  const headAnchor = new THREE.Object3D(); headAnchor.position.set(0, 2.15, 0); group.add(headAnchor);

  // soft round shadow blob under her feet (reads nicely even when real shadows are faint)
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: '#4a3a3a', transparent: true, opacity: 0.18, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.025; group.add(blob);

  /* --- Garden tools she can hold (shown in her right hand) --- */
  const tools = {};
  const wood = mat('#b98a5e');
  tools.hoe = new THREE.Group();
  tools.hoe.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), wood, { y: -0.05, rx: 0 }));
  tools.hoe.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.12), mat('#cfd6dc', { metalness: 0.5, roughness: 0.4 }), { y: -0.55, z: 0.05 }));
  tools.hoe.rotation.x = 0.5;
  tools.seeds = new THREE.Group();
  tools.seeds.add(mesh(new THREE.BoxGeometry(0.14, 0.18, 0.04), mat('#f7a8c4'), { y: -0.08, z: 0.05 }));
  tools.seeds.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 0.045), mat('#ffffff'), { y: -0.06, z: 0.05, cast: false }));
  tools.can = new THREE.Group();
  tools.can.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 10), mat('#9fd6bf', { metalness: 0.3, roughness: 0.5, flatShading: false }), { y: -0.14, z: 0.06 }));
  tools.can.add(mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.26, 6), mat('#9fd6bf'), { y: -0.1, z: 0.24, rx: 1.0 }));
  tools.can.add(mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 10, Math.PI), mat('#9fd6bf'), { y: -0.03, z: 0.06, ry: Math.PI / 2 }));
  tools.basket = new THREE.Group();
  tools.basket.add(mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.12, 10), mat('#d9ad7f'), { y: -0.16, z: 0.04 }));
  tools.basket.add(mesh(new THREE.TorusGeometry(0.11, 0.012, 4, 12, Math.PI), mat('#b98a5e'), { y: -0.1, z: 0.04, ry: Math.PI / 2 }));
  Object.values(tools).forEach((t) => { t.visible = false; t.traverse((o) => { if (o.isMesh) o.userData.isLady = true; }); handAnchor.add(t); });
  function setTool(name) { for (const k in tools) tools[k].visible = k === name; }

  /* --- Animation --- */
  let phase = 0, t = 0, blinkTimer = 2, waveTime = 0, actTime = 0, sitting = false;
  function update(dt, move, running) {
    t += dt;
    const stride = running ? 13 : 9;
    phase += dt * stride * move;
    const swing = Math.sin(phase) * (running ? 0.75 : 0.5) * move;
    legs[0].rotation.x = swing; legs[1].rotation.x = -swing;
    arms[0].rotation.x = -swing * 0.9; arms[1].rotation.x = swing * 0.9;
    // walk bob + idle breathing
    const idle = 1 - move;
    body.position.y = Math.abs(Math.sin(phase)) * 0.06 * move + Math.sin(t * 2) * 0.012 * idle;
    body.rotation.z = Math.sin(phase) * 0.04 * move;
    body.rotation.x = (running ? 0.12 : 0.04) * move;
    head.rotation.z = Math.sin(t * 0.9) * 0.06 * idle;
    head.rotation.y = Math.sin(t * 0.45) * 0.25 * idle;
    arms[0].rotation.z = -0.05 * idle; arms[1].rotation.z = 0.05 * idle;
    // sitting (porch swing): legs out in front, hands resting in her lap, a happy little sway
    if (sitting) {
      legs[0].rotation.x = legs[1].rotation.x = -1.45 + Math.sin(t * 1.6) * 0.12;
      arms[0].rotation.x = arms[1].rotation.x = -0.55;
      arms[0].rotation.z = 0.12; arms[1].rotation.z = -0.12;
      body.position.y = 0; body.rotation.x = -0.06; body.rotation.z = 0;
    }
    // waving hello (right arm)
    if (waveTime > 0) {
      waveTime -= dt;
      const k = Math.min(1, waveTime * 3, (2.2 - waveTime) * 4);
      arms[1].rotation.x = -0.2 * k; arms[1].rotation.z = (2.6 + Math.sin(t * 12) * 0.35) * k + 0.05 * (1 - k);
    }
    // using a tool (quick arm swing / tip forward)
    if (actTime > 0) {
      actTime -= dt;
      const k = Math.sin((1 - actTime / 0.5) * Math.PI);
      arms[1].rotation.x = -1.1 * k; body.rotation.x = 0.15 * k;
    }
    // blink
    blinkTimer -= dt;
    const closed = blinkTimer < 0.12;
    eyes.forEach((e) => (e.scale.y = closed ? 0.12 : 1));
    if (blinkTimer < 0) blinkTimer = 2 + Math.random() * 3;
  }
  function wave() { waveTime = 2.2; }
  function act() { actTime = 0.5; }
  function setSitting(v) { sitting = !!v; }

  group.traverse((o) => { if (o.isMesh) o.userData.isLady = true; });
  return { group, headAnchor, update, wave, act, setTool, setSitting, get sitting() { return sitting; } };
}
