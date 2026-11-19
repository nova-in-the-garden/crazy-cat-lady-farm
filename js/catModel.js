// A cute low-poly cat with simple procedural animations:
// stand, walk, sit, groom, sleep, stretch, eat, pounce, plus gentle "unwell" poses
// (licking a paw, hunching, scratching, hiding). Also floating name tags and icons.
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';

export const LOOKS = {
  orangeTabby: { base: '#f2a65a', stripe: '#d27a35', belly: '#fff1dc', muzzle: '#fff1dc', ear: '#f2a65a', socks: '#f2a65a', tail: '#f2a65a', tailTip: '#d27a35', legs: '#f2a65a', nose: '#f08aa0', pattern: 'tabby' },
  tuxedo: { base: '#34303a', stripe: null, belly: '#ffffff', muzzle: '#ffffff', ear: '#34303a', socks: '#ffffff', tail: '#34303a', tailTip: '#34303a', legs: '#34303a', nose: '#f29bb0', pattern: 'tuxedo' },
  greyTabby: { base: '#a9adb8', stripe: '#6f7380', belly: '#eef0f4', muzzle: '#eef0f4', ear: '#a9adb8', socks: '#eef0f4', tail: '#a9adb8', tailTip: '#6f7380', legs: '#a9adb8', nose: '#f29bb0', pattern: 'tabby' },
  brownTabby: { base: '#a8794f', stripe: '#5e4030', belly: '#f1e2c8', muzzle: '#f1e2c8', ear: '#a8794f', socks: '#a8794f', tail: '#a8794f', tailTip: '#5e4030', legs: '#a8794f', nose: '#d98a8a', pattern: 'tabby' },
  creamTabby: { base: '#f3d9a8', stripe: '#e0b676', belly: '#fff6e6', muzzle: '#fff6e6', ear: '#f3d9a8', socks: '#fff6e6', tail: '#f3d9a8', tailTip: '#e0b676', legs: '#f3d9a8', nose: '#f29bb0', pattern: 'tabby' },
  calico: { base: '#fbf5ec', stripe: null, patch1: '#f0a050', patch2: '#3d3540', belly: '#ffffff', muzzle: '#ffffff', ear: '#f0a050', socks: '#ffffff', tail: '#3d3540', tailTip: '#f0a050', legs: '#fbf5ec', nose: '#f29bb0', pattern: 'patches' },
  tortie: { base: '#4a3530', stripe: null, patch1: '#c8743a', patch2: '#e0a060', belly: '#5a4038', muzzle: '#5a4038', ear: '#c8743a', socks: '#4a3530', tail: '#4a3530', tailTip: '#c8743a', legs: '#4a3530', nose: '#a86a6a', pattern: 'patches' },
  black: { base: '#2c2830', stripe: null, belly: '#38333c', muzzle: '#38333c', ear: '#2c2830', socks: '#2c2830', tail: '#2c2830', tailTip: '#2c2830', legs: '#2c2830', nose: '#5b4256', pattern: 'solid' },
  white: { base: '#fbfaf7', stripe: null, belly: '#ffffff', muzzle: '#ffffff', ear: '#fbfaf7', socks: '#ffffff', tail: '#fbfaf7', tailTip: '#fbfaf7', legs: '#fbfaf7', nose: '#f7a8b8', pattern: 'solid' },
  russianBlue: { base: '#8a96a8', stripe: null, belly: '#97a3b4', muzzle: '#97a3b4', ear: '#8a96a8', socks: '#8a96a8', tail: '#8a96a8', tailTip: '#7a8698', legs: '#8a96a8', nose: '#7a6878', pattern: 'solid' },
  creamPoint: { base: '#f5ead6', stripe: null, belly: '#fff8ec', muzzle: '#7a5544', ear: '#6b4a3a', socks: '#6b4a3a', tail: '#a07a62', tailTip: '#6b4a3a', legs: '#c9a88e', nose: '#8a5d4c', pattern: 'point' },
};

function bodyTexture(look) {
  return canvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = look.base; ctx.fillRect(0, 0, w, h);
    // canvas x = u (around the body; x 0-64 is the belly side, 64-128 the back), y = front (top) to back (bottom)
    if (look.pattern === 'tabby') {
      ctx.fillStyle = look.stripe;
      for (let i = 0; i < 6; i++) {
        const y = 14 + i * 8;
        ctx.beginPath();
        ctx.moveTo(56, y); ctx.quadraticCurveTo(96, y - 4, 136, y); ctx.lineTo(136, y + 3.5); ctx.quadraticCurveTo(96, y - 0.5, 56, y + 3.5); ctx.fill();
      }
    }
    if (look.pattern === 'patches') { // calico / tortie: soft blotches
      [[80, 12, 22, look.patch1], [110, 34, 18, look.patch2], [70, 46, 16, look.patch2], [100, 56, 14, look.patch1], [22, 30, 10, look.patch1], [120, 8, 12, look.patch1]].forEach(([x, y, r, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, 0.4, 0, 7); ctx.fill(); });
    }
    if (look.pattern === 'point') { // darker toward the tail end
      const g = ctx.createLinearGradient(0, 30, 0, 64); g.addColorStop(0, 'rgba(160,122,98,0)'); g.addColorStop(1, 'rgba(160,122,98,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    // soft belly
    const g2 = ctx.createLinearGradient(0, 0, 64, 0);
    g2.addColorStop(0, look.base); g2.addColorStop(0.2, look.belly); g2.addColorStop(0.8, look.belly); g2.addColorStop(1, look.base);
    ctx.fillStyle = g2; ctx.globalAlpha = look.pattern === 'tuxedo' ? 1 : 0.9;
    ctx.fillRect(look.pattern === 'tuxedo' ? 4 : 10, 0, look.pattern === 'tuxedo' ? 56 : 44, h);
    ctx.globalAlpha = 1;
  });
}

const iconCache = new Map();
function iconTexture(kind) {
  if (iconCache.has(kind)) return iconCache.get(kind);
  const tex = canvasTexture(128, 128, (ctx) => {
    const bubble = (fill = '#ffffff') => {
      ctx.fillStyle = fill; ctx.strokeStyle = '#e8798f'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(64, 54, 44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(40, 108, 9, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(26, 122, 5, 0, 7); ctx.fill(); ctx.stroke();
    };
    if (kind === 'new') {
      ctx.fillStyle = '#ffd35c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(64, 64, 52, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5b4256'; ctx.font = 'bold 84px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 64, 70);
    } else if (kind === 'heart') {
      ctx.fillStyle = '#f26d8f'; ctx.beginPath(); ctx.moveTo(64, 108); ctx.bezierCurveTo(-10, 60, 30, 0, 64, 38); ctx.bezierCurveTo(98, 0, 138, 60, 64, 108); ctx.fill();
    } else if (kind === 'sparkle') {
      ctx.fillStyle = '#ffe27a';
      const star = (x, y, r) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill(); };
      star(64, 64, 50); star(24, 26, 16); star(104, 100, 14);
    } else if (kind === 'zzz') {
      ctx.fillStyle = '#c8c6ff'; ctx.strokeStyle = '#5b4a8a'; ctx.lineWidth = 3; ctx.font = 'bold 56px Fredoka, sans-serif'; ctx.textAlign = 'center';
      ctx.strokeText('z', 40, 100); ctx.fillText('z', 40, 100); ctx.font = 'bold 40px Fredoka, sans-serif'; ctx.strokeText('z', 84, 58); ctx.fillText('z', 84, 58);
    } else {
      bubble(); // thought bubbles with a little symptom picture
      if (kind === 'paw') drawPaw(ctx, 64, 56, 54, '#e8798f');
      if (kind === 'tummy') { ctx.strokeStyle = '#c38bd8'; ctx.lineWidth = 7; ctx.beginPath(); for (let a = 0; a < 14; a += 0.2) { const r = 4 + a * 2.4; ctx.lineTo(64 + Math.cos(a) * r, 54 + Math.sin(a) * r); } ctx.stroke(); }
      if (kind === 'itch') { ctx.fillStyle = '#5b4256'; [[44, 40], [70, 34], [86, 58], [56, 66], [76, 76], [40, 62]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }); ctx.strokeStyle = '#e8798f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, 84); ctx.lineTo(50, 80); ctx.moveTo(78, 88); ctx.lineTo(98, 82); ctx.stroke(); }
      if (kind === 'cloud') { ctx.fillStyle = '#9fb0d6'; [[48, 58, 18], [70, 50, 22], [88, 62, 15], [60, 66, 16]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }); ctx.strokeStyle = '#6cc4ef'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(52, 84); ctx.lineTo(48, 94); ctx.moveTo(72, 84); ctx.lineTo(68, 94); ctx.stroke(); }
      if (kind === 'sneeze') { ctx.fillStyle = '#6b9fc4'; ctx.font = 'bold 34px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Achoo!', 64, 50); ctx.fillStyle = '#9fd0ef'; [[40, 74], [62, 80], [86, 72]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); }); }
      if (kind === 'limp') { ctx.save(); ctx.translate(64, 54); ctx.rotate(-0.6); ctx.fillStyle = '#fff6ec'; ctx.strokeStyle = '#e8798f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-40, -15, 80, 30, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f7c6d2'; ctx.fillRect(-12, -15, 24, 30); ctx.restore(); }
      if (kind === 'ear') { ctx.fillStyle = '#f4a3b5'; ctx.beginPath(); ctx.moveTo(40, 82); ctx.lineTo(64, 18); ctx.lineTo(90, 82); ctx.fill(); ctx.fillStyle = '#ef6f86'; ctx.beginPath(); ctx.moveTo(52, 76); ctx.lineTo(64, 38); ctx.lineTo(78, 76); ctx.fill(); }
      if (kind === 'question') { ctx.fillStyle = '#e8798f'; ctx.font = 'bold 72px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 64, 58); }
    }
  });
  iconCache.set(kind, tex);
  return tex;
}

function tagTexture(text, style) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.font = '600 44px Fredoka, sans-serif';
  const w = Math.min(500, ctx.measureText(text).width + 70);
  ctx.fillStyle = style === 'new' ? 'rgba(255, 211, 92, 0.95)' : 'rgba(255, 248, 239, 0.93)';
  ctx.strokeStyle = style === 'new' ? '#ffffff' : '#f2b8c6'; ctx.lineWidth = 5;
  const x = 256 - w / 2;
  ctx.beginPath(); ctx.roundRect(x, 12, w, 72, 36); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5b4256'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const POSES = {
  stand: { hipY: 0.2, pitch: 0, head: 0, fl: 0, bl: 0, tail: 0.9, ear: 0, lift: 0, low: 0 },
  walk: { hipY: 0.2, pitch: 0, head: 0.05, fl: 0, bl: 0, tail: 0.75, ear: 0, lift: 0, low: 0 },
  sit: { hipY: 0.1, pitch: -0.62, head: 0.1, fl: 0, bl: -0.9, tail: -0.2, ear: 0, lift: 0, low: 0 },
  groom: { hipY: 0.1, pitch: -0.62, head: 0.75, fl: 0, bl: -0.9, tail: -0.2, ear: 0, lift: 1, low: 0 },
  lick: { hipY: 0.1, pitch: -0.62, head: 0.8, fl: 0, bl: -0.9, tail: -0.3, ear: 0.3, lift: 1, low: 0 },
  scratch: { hipY: 0.1, pitch: -0.62, head: 0.3, fl: 0, bl: -0.9, tail: -0.2, ear: 0.4, lift: 0, low: 0, kick: 1 },
  hunch: { hipY: 0.12, pitch: 0.02, head: 0.35, fl: 1.25, bl: -1.25, tail: -0.5, ear: 0.5, lift: 0, low: 1 },
  hide: { hipY: 0.1, pitch: 0.05, head: 0.15, fl: 1.35, bl: -1.35, tail: -0.6, ear: 1, lift: 0, low: 1 },
  sleep: { hipY: 0.075, pitch: 0.05, head: 0.55, fl: 1.45, bl: -1.45, tail: -0.6, ear: 0.2, lift: 0, low: 1, curl: 1 },
  stretch: { hipY: 0.2, pitch: 0.38, head: -0.25, fl: -0.95, bl: 0, tail: 1.3, ear: 0, lift: 0, low: 0 },
  eat: { hipY: 0.18, pitch: 0.18, head: 0.75, fl: 0, bl: 0, tail: 0.5, ear: 0, lift: 0, low: 0 },
  pounce: { hipY: 0.16, pitch: 0.12, head: -0.1, fl: 0.2, bl: -0.4, tail: 1.2, ear: 0, lift: 0, low: 0 },
};

/** Chunky knit stripes with little V stitches. */
const knitCache = {};
function knitTexture(a, b) {
  const k = a + b; if (knitCache[k]) return knitCache[k];
  const tex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = a; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = b; for (let y = 0; y < h; y += 32) ctx.fillRect(0, y + 20, w, 10);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 6); ctx.lineTo(x + 8, y); ctx.stroke(); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2);
  return (knitCache[k] = tex);
}

export function createCat(lookName, scale = 1) {
  const look = LOOKS[lookName] || LOOKS.orangeTabby;
  const group = new THREE.Group();
  const rig = new THREE.Group(); rig.scale.setScalar(scale); group.add(rig);
  const base = mat(look.base, { flatShading: false });
  const legsM = mat(look.legs, { flatShading: false }), socks = mat(look.socks, { flatShading: false });
  const tagged = (m) => { m.userData.isCat = true; return m; };

  // torso pivots at the hips so the cat can sit
  const hip = new THREE.Group(); hip.position.set(0, 0.2, -0.2); rig.add(hip);
  const bodyGeo = new THREE.SphereGeometry(1, 18, 12); bodyGeo.rotateX(Math.PI / 2);
  const body = tagged(mesh(bodyGeo, new THREE.MeshStandardMaterial({ map: bodyTexture(look), roughness: 0.9 }), { y: 0.06, z: 0.2 }));
  body.scale.set(0.2, 0.18, 0.33); hip.add(body);
  hip.add(tagged(mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(look.pattern === 'tuxedo' ? '#ffffff' : look.base, { flatShading: false }), { y: 0.05, z: 0.4, sy: 1.05 }))); // chest

  // head
  const head = new THREE.Group(); head.position.set(0, 0.17, 0.46); hip.add(head);
  const headMat = look.pattern === 'point' ? mat('#efdcc4', { flatShading: false }) : base;
  head.add(tagged(mesh(new THREE.SphereGeometry(0.16, 16, 12), headMat, { y: 0.06, z: 0.05, sx: 1.12, sy: 0.95 })));
  const muzzleM = mat(look.muzzle, { flatShading: false });
  [-1, 1].forEach((s) => head.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), muzzleM, { x: s * 0.04, y: 0.0, z: 0.18, sy: 0.8 })));
  head.add(mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(look.nose, { flatShading: false }), { y: 0.035, z: 0.215, sy: 0.7 }));
  if (look.pattern === 'tabby') [-0.05, 0, 0.05].forEach((x) => head.add(mesh(new THREE.BoxGeometry(0.018, 0.06, 0.01), mat(look.stripe), { x, y: 0.17, z: 0.17, rx: -0.5, cast: false })));
  if (look.pattern === 'tuxedo') head.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#ffffff', { flatShading: false }), { y: 0.08, z: 0.165, sx: 0.6, sy: 1.1 }));
  const eyes = [];
  const eyeM = mat('#2b2230', { flatShading: false, roughness: 0.3 }), glintM = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5 });
  [-1, 1].forEach((s) => {
    const e = new THREE.Group(); e.position.set(s * 0.075, 0.085, 0.17); head.add(e);
    e.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), eyeM, { sy: 1.25, sz: 0.6, cast: false }));
    e.add(mesh(new THREE.SphereGeometry(0.009, 6, 4), glintM, { x: 0.01, y: 0.014, z: 0.017, cast: false }));
    eyes.push(e);
  });
  // whiskers
  const wm = mat('#ffffff');
  [-1, 1].forEach((s) => [-0.02, 0.01].forEach((dy, i) => head.add(mesh(new THREE.BoxGeometry(0.13, 0.004, 0.004), wm, { x: s * 0.12, y: 0.01 + dy, z: 0.17, rz: s * (i ? -0.12 : 0.12), ry: s * 0.25, cast: false }))));
  // ears
  const ears = [];
  [-1, 1].forEach((s) => {
    const e = new THREE.Group(); e.position.set(s * 0.085, 0.17, 0.02); e.rotation.z = -s * 0.25; head.add(e);
    e.add(tagged(mesh(new THREE.ConeGeometry(0.06, 0.12, 4), mat(look.ear), { y: 0.05, ry: Math.PI / 4, sz: 0.55 })));
    e.add(mesh(new THREE.ConeGeometry(0.035, 0.08, 4), mat('#f7b6c6'), { y: 0.04, z: 0.018, ry: Math.PI / 4, sz: 0.4, cast: false }));
    ears.push({ g: e, s });
  });

  // legs: front ones hang from the shoulders (on the torso), back ones from the hips
  const legGeo = new THREE.CylinderGeometry(0.038, 0.034, 0.18, 8); legGeo.translate(0, -0.09, 0);
  const pawGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const makeLeg = (parent, x, y, z) => {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const l = tagged(mesh(legGeo, legsM)); g.add(l);
    const p = mesh(pawGeo, socks, { y: -0.18, z: 0.012, sy: 0.6 }); l.add(p);
    return g;
  };
  const front = [makeLeg(hip, -0.085, -0.02, 0.38), makeLeg(hip, 0.085, -0.02, 0.38)];
  const back = [makeLeg(rig, -0.09, 0.2, -0.17), makeLeg(rig, 0.09, 0.2, -0.17)];
  // a soft white bandage wrap with pink stripes (shown while a hurt cat heals)
  const bandage = new THREE.Group(); bandage.visible = false; front[0].children[0].add(bandage);
  bandage.add(mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.13, 10), mat('#ffffff', { flatShading: false }), { y: -0.1, cast: false }));
  [-0.06, -0.1, -0.14].forEach((y) => bandage.add(mesh(new THREE.TorusGeometry(0.047, 0.008, 4, 12), mat('#f7a8c4'), { y, rx: Math.PI / 2, cast: false })));
  [...back].forEach((g) => g.add(mesh(new THREE.SphereGeometry(0.075, 10, 8), base, { y: -0.02, z: 0.02, sy: 1.1 }))); // haunches

  // tail: a chain of segments so it can sway and curl
  const tail = [];
  let parent = hip;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.position.set(0, i === 0 ? 0.1 : 0.075, i === 0 ? -0.1 : 0); parent.add(seg);
    const col = i >= 4 ? look.tailTip : look.tail;
    seg.add(mesh(new THREE.CylinderGeometry(0.03 - i * 0.002, 0.034 - i * 0.002, 0.085, 6), mat(col, { flatShading: false }), { y: 0.037 }));
    seg.add(mesh(new THREE.SphereGeometry(0.031 - i * 0.002, 6, 5), mat(col, { flatShading: false }), { y: 0.075 }));
    tail.push(seg); parent = seg;
  }

  // floating tag + icon (sprites always face the camera)
  const over = new THREE.Group(); over.position.y = 0.95; group.add(over);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
  tag.scale.set(1.25, 0.235, 1); tag.renderOrder = 10; tag.visible = false; over.add(tag);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
  icon.scale.set(0.38, 0.38, 1); icon.position.y = 0.33; icon.renderOrder = 11; icon.visible = false; over.add(icon);
  let tagText = '', iconKind = null;

  /* ---------------- animation ---------------- */
  const P = { ...POSES.stand, kick: 0, curl: 0 };
  let anim = 'stand', phase = 0, blinkT = 2 + Math.random() * 3, t0 = Math.random() * 10, hop = 0;

  function setAnim(a) { if (POSES[a]) anim = a; }
  function pounce() { hop = 0.6; }

  function update(dt, t, speed = 0) {
    t += t0;
    const target = POSES[anim];
    const k = Math.min(1, dt * 7);
    for (const key in P) P[key] += ((target[key] ?? 0) - P[key]) * k;
    const walking = speed > 0.05;
    phase += dt * (4 + speed * 7);
    const swing = walking ? Math.min(1, speed / 1.2) * 0.6 : 0;

    hip.position.y = P.hipY + (walking ? Math.abs(Math.sin(phase)) * 0.015 : 0);
    hip.rotation.x = P.pitch;
    hop = Math.max(0, hop - dt);
    rig.position.y = hop > 0 ? Math.sin((hop / 0.6) * Math.PI) * 0.25 : 0;
    // breathing
    const breathe = 1 + Math.sin(t * (anim === 'sleep' ? 1.6 : 3)) * (anim === 'sleep' ? 0.035 : 0.015);
    body.scale.set(0.2 * breathe, 0.18 * breathe, 0.33);

    // head: keep looking forward when sitting, nod while grooming/eating
    let nod = 0;
    if (anim === 'groom' || anim === 'lick') nod = Math.sin(t * 7) * 0.12;
    if (anim === 'eat') nod = Math.abs(Math.sin(t * 6)) * 0.15;
    head.rotation.x = -P.pitch * 0.85 + P.head + nod;
    head.rotation.y = (anim === 'groom' || anim === 'lick') ? 0.35 : (anim === 'stand' || anim === 'sit') ? Math.sin(t * 0.5) * 0.35 : 0;
    head.rotation.z = P.curl * 0.5;
    head.position.y = 0.17 - P.low * 0.06;

    // legs
    const shoulderY = hip.position.y - 0.02 * Math.cos(P.pitch) - 0.38 * Math.sin(P.pitch);
    const reach = THREE.MathUtils.clamp(shoulderY / 0.2, 0.45, 2.6);
    front.forEach((g, i) => {
      const s = i ? 1 : -1;
      const fold = THREE.MathUtils.clamp(Math.abs(P.fl) / 1.4, 0, 1);
      g.rotation.x = -P.pitch + P.fl + Math.sin(phase + (i ? Math.PI : 0)) * swing;
      g.scale.y = THREE.MathUtils.lerp(reach, 1, fold);
      if (i === 1 && P.lift > 0.05) { g.rotation.x -= P.lift * 1.3; g.scale.y *= 1 - P.lift * 0.3; }
      g.rotation.z = s * 0.02;
    });
    const backReach = THREE.MathUtils.clamp(P.hipY / 0.2, 0.4, 1.3);
    back.forEach((g, i) => {
      g.position.y = P.hipY;
      const fold = THREE.MathUtils.clamp(Math.abs(P.bl) / 1.3, 0, 1);
      g.rotation.x = P.bl + Math.sin(phase + (i ? 0 : Math.PI)) * swing;
      g.scale.y = THREE.MathUtils.lerp(backReach, 1, fold);
      if (i === 1 && P.kick > 0.1) g.rotation.x = -1.6 + Math.sin(t * 26) * 0.4 * P.kick;
    });
    // tail
    tail.forEach((seg, i) => {
      const sway = Math.sin(t * (walking ? 5 : 1.8) - i * 0.6) * (0.12 + i * 0.04);
      seg.rotation.x = i === 0 ? -0.6 - P.tail * 0.6 + P.curl * -0.5 : (P.tail > 0.5 ? 0.1 + (i > 3 ? 0.35 : 0) : 0.35 + P.curl * 0.25);
      seg.rotation.z = sway + P.curl * (i ? 0.45 : 0.2);
    });
    // ears
    ears.forEach(({ g, s }) => { g.rotation.z = -s * (0.25 + P.ear * 0.75); g.rotation.x = -P.ear * 0.4; });
    // blink (eyes closed while asleep)
    blinkT -= dt;
    let open = 1;
    if (blinkT < 0.12) open = 0.15;
    if (blinkT < 0) blinkT = 2.5 + Math.random() * 4;
    if (anim === 'sleep') open = 0.12;
    eyes.forEach((e) => (e.scale.y = open));

    // floaty icon bob
    if (icon.visible) icon.position.y = 0.33 + Math.sin(t * 2.6) * 0.05;
    over.position.y = (anim === 'sleep' || P.low > 0.5 ? 0.7 : 0.95) * scale + 0.05;
  }

  function setTag(text, style = 'name') {
    const key = text ? text + '|' + style : '';
    if (key === tagText) return;
    tagText = key;
    if (tag.material.map) tag.material.map.dispose();
    tag.material.map = text ? tagTexture(text, style) : null; tag.material.needsUpdate = true;
    tag.visible = !!text;
  }
  function setIcon(kind) {
    if (kind === iconKind) return;
    iconKind = kind;
    icon.visible = !!kind;
    if (kind) { icon.material.map = iconTexture(kind); icon.material.needsUpdate = true; }
  }
  function showTag(v) { tag.visible = v && !!tagText; }

  function setBandage(v) { bandage.visible = !!v; }

  // knitted costumes (Granny's handiwork): a striped sweater with a turtleneck, and a bobble hat
  const sweater = new THREE.Group(); sweater.visible = false; hip.add(sweater);
  const hat = new THREE.Group(); hat.visible = false; head.add(hat);
  let costumeKey = '';
  function setCostume(c = {}, colors = ['#e56f95', '#fff6ec']) {
    const key = `${!!c.sweater}${!!c.hat}${colors.join()}`;
    if (key === costumeKey) return; costumeKey = key;
    sweater.clear(); hat.clear();
    front.forEach((leg) => leg.children.filter((o) => o.userData.costume).forEach((o) => leg.remove(o)));
    const knit = new THREE.MeshStandardMaterial({ map: knitTexture(colors[0], colors[1]), roughness: 1 });
    const solid = mat(colors[0], { flatShading: false, roughness: 1 }), trim = mat(colors[1], { flatShading: false, roughness: 1 });
    if (c.sweater) {
      const g = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62); g.rotateX(Math.PI / 2);
      sweater.add(tagged(mesh(g, knit, { y: 0.065, z: 0.2, sx: 0.218, sy: 0.198, sz: 0.345, cast: false })));
      sweater.add(tagged(mesh(new THREE.TorusGeometry(0.105, 0.035, 8, 16), trim, { y: 0.14, z: 0.44, rx: 0.5, cast: false })));       // turtleneck
      sweater.add(mesh(new THREE.TorusGeometry(0.2, 0.022, 6, 18), trim, { y: 0.06, z: 0.05, sy: 0.92, cast: false }));                    // ribbed hem
      front.forEach((leg) => { const sl = mesh(new THREE.CylinderGeometry(0.047, 0.045, 0.08, 8), solid, { y: -0.04, cast: false }); sl.userData.costume = true; leg.add(sl); });
    }
    if (c.hat) {
      hat.add(tagged(mesh(new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), knit, { y: 0.17, z: 0.03, sx: 1.05, sy: 0.9, cast: false })));
      hat.add(mesh(new THREE.TorusGeometry(0.112, 0.025, 6, 18), trim, { y: 0.175, z: 0.03, rx: Math.PI / 2, sx: 1.05, cast: false }));
      hat.add(tagged(mesh(new THREE.SphereGeometry(0.05, 10, 8), trim, { y: 0.295, z: 0.03, cast: false })));                            // bobble
    }
    sweater.visible = !!c.sweater; hat.visible = !!c.hat;
    [sweater, hat].forEach((o) => o.traverse((m) => { if (m.isMesh && m.userData.isCat && group.userData.catId) m.userData.catId = group.userData.catId; }));
  }
  return { group, rig, head, update, setAnim, get anim() { return anim; }, pounce, setTag, setIcon, showTag, setBandage, setCostume, scale };
}
