// The Crazy Cat Lady's farm: everything built from Three.js primitives.
// buildWorld(scene) returns helpers the rest of the game uses:
//   colliders / resolve(pos, radius)  -> keep the cat lady out of walls, trees and fences
//   groundHeight(x, z)                -> how high the floor is (porch deck is raised)
//   zones                             -> named places she can comment on
//   update(time, dt)                  -> little ambient animations (smoke, clouds, water)
import * as THREE from 'three';
import { mulberry32, mat, mesh, canvasTexture, drawPaw, signTexture } from './util.js';

export const PALETTE = {
  grass: '#a9d98b', grassDark: '#8fca78', grassLight: '#c2e5a0',
  path: '#ecd2a8', soil: '#9c6b4b', soilDark: '#7d5238',
  wood: '#c1906a', woodDark: '#8f6446', fence: '#f4ead8',
  wall: '#fdeed6', roof: '#ea8a85', roofDark: '#cf6f6d', trim: '#ffffff',
  door: '#86bcd6', shutter: '#9fd6bf', glass: '#fff3c4',
  barn: '#e0726a', barnRoof: '#8c5f62',
  stone: '#cfc8c0', stoneDark: '#aaa197', brick: '#d08670',
  water: '#8fd5ea', leaf: ['#7fc67c', '#93d38a', '#6db571', '#a3d98a'], blossom: '#f8bcd0',
  flowers: ['#f7a8c4', '#ffd76e', '#c8aaf2', '#ffffff', '#ff9f85', '#8fd0f0'],
};

const PLAY_RADIUS = 26;   // how far from the center she may walk
const HILL_START = 31;    // where the rolling hills begin

/* ------------------------------------------------------------------ */
/* Collision                                                           */
/* ------------------------------------------------------------------ */
const circles = [];   // { x, z, r }
const boxes = [];     // { minX, maxX, minZ, maxZ }
const raised = [];    // { minX, maxX, minZ, maxZ, h } walkable raised floors (porch)

function addCircle(x, z, r) { circles.push({ x, z, r }); }
function addBox(cx, cz, w, d) { boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }); }

/** Push a position (Vector3) out of every obstacle. */
function resolve(pos, r) {
  for (const c of circles) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const d = Math.hypot(dx, dz), min = c.r + r;
    if (d < min && d > 1e-5) { pos.x = c.x + (dx / d) * min; pos.z = c.z + (dz / d) * min; }
  }
  for (const b of boxes) {
    const nx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const nz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d = Math.hypot(dx, dz);
    if (d < r) {
      if (d > 1e-5) { pos.x = nx + (dx / d) * r; pos.z = nz + (dz / d) * r; }
      else { // center is inside the box: push out the shortest way
        const opts = [[b.minX - r - pos.x, 0], [b.maxX + r - pos.x, 0], [0, b.minZ - r - pos.z], [0, b.maxZ + r - pos.z]];
        opts.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
        pos.x += opts[0][0]; pos.z += opts[0][1];
      }
    }
  }
  const d = Math.hypot(pos.x, pos.z);
  if (d > PLAY_RADIUS) { pos.x *= PLAY_RADIUS / d; pos.z *= PLAY_RADIUS / d; }
  return pos;
}

function groundHeight(x, z) {
  for (const f of raised) if (x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ) return f.h;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Terrain + sky                                                       */
/* ------------------------------------------------------------------ */
function noise2(x, z) {
  return Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.13 - 0.7) + 0.5 * Math.sin(x * 0.27 + z * 0.19) + 0.25 * Math.cos(x * 0.53 - z * 0.47);
}
function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  const t = THREE.MathUtils.smoothstep(r, HILL_START, HILL_START + 30);
  return t * (7 + noise2(x, z) * 3.5) + (r > HILL_START ? 0 : 0);
}

function buildGround(scene) {
  const size = 200, seg = 100;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const rand = mulberry32(7);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    let y = terrainHeight(x, z);
    if (r < HILL_START - 1) y = 0; else y += (rand() - 0.5) * 0.3 * THREE.MathUtils.smoothstep(r, HILL_START, HILL_START + 8);
    pos.setY(i, y);
  }
  const g = geo.toNonIndexed(); // non-indexed so every triangle can get its own color (low-poly look)
  const p = g.attributes.position;
  const colors = [];
  const cA = new THREE.Color(PALETTE.grass), cB = new THREE.Color(PALETTE.grassDark), cC = new THREE.Color(PALETTE.grassLight);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const n = noise2(cx * 1.7, cz * 1.7) * 0.5 + 0.5;
    c.copy(cA).lerp(n > 0.5 ? cC : cB, Math.abs(n - 0.5) * 1.2 + rand() * 0.12);
    if (cy > 6) c.lerp(new THREE.Color('#bfe3a0'), 0.3);
    for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true;
  scene.add(ground);
}

function buildSky(scene) {
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#7ec3ee') },
      mid: { value: new THREE.Color('#bfe3f5') },
      horizon: { value: new THREE.Color('#ffe2cf') },
    },
    vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vPos;
      void main(){ float h = vPos.y;
        vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.18, h));
        col = mix(col, top, smoothstep(0.18, 0.7, h));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geo, material);
  sky.renderOrder = -1;
  scene.add(sky);
  return sky;
}

function buildClouds(scene) {
  const group = new THREE.Group();
  const rand = mulberry32(99);
  const white = mat('#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25 });
  const geo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 11; i++) {
    const cloud = new THREE.Group();
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const s = 2 + rand() * 2.2;
      cloud.add(mesh(geo, white, { x: (k - n / 2) * 2.4 + rand(), y: rand() * 1.2, z: rand() * 1.5, s, cast: false, receive: false }));
    }
    const a = rand() * Math.PI * 2, r = 50 + rand() * 70;
    cloud.position.set(Math.cos(a) * r, 34 + rand() * 18, Math.sin(a) * r);
    cloud.userData.speed = 0.4 + rand() * 0.6;
    group.add(cloud);
  }
  scene.add(group);
  return group;
}

/* ------------------------------------------------------------------ */
/* Little building blocks                                              */
/* ------------------------------------------------------------------ */
function makeTree(rand, { blossom = false, scale = 1 } = {}) {
  const t = new THREE.Group();
  const h = 1.4 + rand() * 0.8;
  t.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 6), mat(PALETTE.woodDark), { y: h / 2 }));
  const leaf = mat(blossom ? PALETTE.blossom : PALETTE.leaf[Math.floor(rand() * PALETTE.leaf.length)]);
  const blobs = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < blobs; i++) {
    const r = 0.9 + rand() * 0.6;
    const a = (i / blobs) * Math.PI * 2 + rand();
    const off = i === 0 ? 0 : 0.65;
    t.add(mesh(new THREE.IcosahedronGeometry(r, 1), leaf, { x: Math.cos(a) * off, y: h + 0.6 + rand() * 0.7 + (i === 0 ? 0.5 : 0), z: Math.sin(a) * off }));
  }
  if (!blossom && rand() < 0.35) { // a few apples
    const apple = mat('#f2767a');
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2;
      t.add(mesh(new THREE.SphereGeometry(0.11, 6, 5), apple, { x: Math.cos(a) * 1.05, y: h + 0.6 + rand() * 0.9, z: Math.sin(a) * 1.05 }));
    }
  }
  t.scale.setScalar(scale);
  t.rotation.y = rand() * Math.PI * 2;
  return t;
}

function makePine(rand, scale = 1) {
  const t = new THREE.Group();
  t.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 1, 6), mat(PALETTE.woodDark), { y: 0.5 }));
  const leaf = mat(rand() < 0.5 ? '#6fb48a' : '#7cc29a');
  for (let i = 0; i < 3; i++) t.add(mesh(new THREE.ConeGeometry(1.3 - i * 0.3, 1.5, 7), leaf, { y: 1.3 + i * 0.85 }));
  t.scale.setScalar(scale);
  return t;
}

function makeBush(rand, s = 1) {
  const b = new THREE.Group();
  const leaf = mat(PALETTE.leaf[Math.floor(rand() * PALETTE.leaf.length)]);
  for (let i = 0; i < 3; i++) {
    b.add(mesh(new THREE.IcosahedronGeometry(0.45 + rand() * 0.2, 1), leaf, { x: (i - 1) * 0.45, y: 0.35 + rand() * 0.1, z: rand() * 0.2 }));
  }
  if (rand() < 0.6) { // flowering bush
    const fm = mat(PALETTE.flowers[Math.floor(rand() * PALETTE.flowers.length)]);
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      b.add(mesh(new THREE.SphereGeometry(0.07, 5, 4), fm, { x: Math.cos(a) * 0.6, y: 0.4 + rand() * 0.35, z: Math.sin(a) * 0.45, cast: false }));
    }
  }
  b.scale.setScalar(s);
  b.rotation.y = rand() * Math.PI;
  return b;
}

function makeRock(rand, s = 1) {
  const r = mesh(new THREE.DodecahedronGeometry(0.4, 0), mat(rand() < 0.5 ? PALETTE.stone : PALETTE.stoneDark), {
    y: 0.12 * s, sx: s * (1 + rand() * 0.5), sy: s * (0.6 + rand() * 0.3), sz: s, ry: rand() * 3,
  });
  return r;
}

function makeFlower(rand) {
  const f = new THREE.Group();
  const h = 0.25 + rand() * 0.2;
  f.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, h, 4), mat('#6fae63'), { y: h / 2, cast: false }));
  const petal = mat(PALETTE.flowers[Math.floor(rand() * PALETTE.flowers.length)]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    f.add(mesh(new THREE.SphereGeometry(0.05, 5, 4), petal, { x: Math.cos(a) * 0.06, y: h, z: Math.sin(a) * 0.06, sy: 0.5, cast: false }));
  }
  f.add(mesh(new THREE.SphereGeometry(0.04, 5, 4), mat('#ffd35c'), { y: h + 0.01, cast: false }));
  return f;
}

/** Picket fence from (x1,z1) to (x2,z2), with collision. */
function fenceLine(parent, x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const g = new THREE.Group();
  g.position.set(x1, 0, z1);
  g.rotation.y = Math.atan2(-(z2 - z1), x2 - x1);
  const white = mat(PALETTE.fence);
  const n = Math.max(1, Math.round(len / 0.32));
  const pick = new THREE.BoxGeometry(0.14, 0.75, 0.05);
  const tip = new THREE.ConeGeometry(0.1, 0.14, 4);
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * len;
    g.add(mesh(pick, white, { x, y: 0.375 }));
    g.add(mesh(tip, white, { x, y: 0.82, ry: Math.PI / 4 }));
  }
  [0.22, 0.55].forEach((y) => g.add(mesh(new THREE.BoxGeometry(len, 0.07, 0.04), white, { x: len / 2, y, z: -0.045 })));
  parent.add(g);
  const steps = Math.ceil(len / 0.4);
  for (let i = 0; i <= steps; i++) addCircle(x1 + ((x2 - x1) * i) / steps, z1 + ((z2 - z1) * i) / steps, 0.12);
}

/** Flat ribbon (for the dirt path) following a smooth curve. */
function pathRibbon(points, width, material, y = 0.02) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const N = Math.ceil(curve.getLength() * 3);
  const verts = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t), tan = curve.getTangent(t);
    const nx = -tan.z, nz = tan.x;
    const w = width * (0.9 + 0.1 * Math.sin(i * 1.7));
    verts.push(p.x + nx * w / 2, y, p.z + nz * w / 2, p.x - nx * w / 2, y, p.z - nz * w / 2);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material); m.receiveShadow = true;
  return { mesh: m, curve };
}

/* ------------------------------------------------------------------ */
/* The cottage (her house) with porch and cat things                   */
/* ------------------------------------------------------------------ */
function buildCottage(scene, smokePuffs) {
  const house = new THREE.Group();
  const HX = 0, HZ = -9, W = 7, D = 5, H = 2.8, F = 0.3; // F = foundation height
  house.position.set(HX, 0, HZ);
  scene.add(house);

  house.add(mesh(new THREE.BoxGeometry(W + 0.3, F, D + 0.3), mat(PALETTE.stone), { y: F / 2 }));
  house.add(mesh(new THREE.BoxGeometry(W, H, D), mat(PALETTE.wall), { y: F + H / 2 }));
  // corner trim
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
    house.add(mesh(new THREE.BoxGeometry(0.18, H, 0.18), mat(PALETTE.trim), { x: sx * W / 2, y: F + H / 2, z: sz * D / 2 })));

  // Gable roof (ridge runs along x)
  const top = F + H, rise = 1.9, over = 0.45;
  const half = D / 2 + over;
  const slope = Math.hypot(half, rise);
  const ang = Math.atan2(rise, half);
  [-1, 1].forEach((s) => {
    house.add(mesh(new THREE.BoxGeometry(W + 0.9, 0.16, slope), mat(PALETTE.roof), {
      y: top + rise / 2 + 0.05, z: (s * half) / 2, rx: s * ang,
    }));
    // scalloped shingle rows for charm
    for (let r = 1; r < 4; r++) {
      const t = r / 4;
      house.add(mesh(new THREE.BoxGeometry(W + 0.92, 0.05, 0.08), mat(PALETTE.roofDark), {
        y: top + rise * (1 - t) + 0.16, z: s * half * t, rx: s * ang, cast: false,
      }));
    }
  });
  house.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, W + 1, 8), mat(PALETTE.roofDark), { y: top + rise + 0.12, rz: Math.PI / 2 }));
  // gable triangles
  const tri = new THREE.Shape();
  tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, rise); tri.closePath();
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.05, bevelEnabled: false });
  [-1, 1].forEach((s) => {
    const g = mesh(triGeo, mat(PALETTE.wall), { x: s * (W / 2) - (s > 0 ? 0 : 0.05), y: top, ry: Math.PI / 2 });
    house.add(g);
    // round attic window
    const win = mesh(new THREE.CircleGeometry(0.32, 16), mat(PALETTE.glass, { emissive: '#ffd98a', emissiveIntensity: 0.35, flatShading: false }), {
      x: s * (W / 2 + 0.06), y: top + 0.7, ry: s * Math.PI / 2, cast: false,
    });
    house.add(win);
    house.add(mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 16), mat(PALETTE.trim), { x: s * (W / 2 + 0.06), y: top + 0.7, ry: Math.PI / 2 }));
  });

  // Chimney with smoke
  house.add(mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), mat(PALETTE.brick), { x: 2.2, y: top + 1.5, z: -1.1 }));
  house.add(mesh(new THREE.BoxGeometry(0.85, 0.18, 0.85), mat('#b46d5a'), { x: 2.2, y: top + 2.65, z: -1.1 }));
  const smokeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, roughness: 1, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const puff = mesh(new THREE.IcosahedronGeometry(0.25, 1), smokeMat.clone(), { cast: false, receive: false });
    puff.userData = { phase: i / 6, base: new THREE.Vector3(HX + 2.2, top + 2.8, HZ - 1.1) };
    scene.add(puff); smokePuffs.push(puff);
  }

  // Front face details (front = +z)
  const fz = D / 2 + 0.03;
  // door
  house.add(mesh(new THREE.BoxGeometry(1.25, 2.15, 0.12), mat(PALETTE.trim), { y: F + 1.07, z: fz }));
  house.add(mesh(new THREE.BoxGeometry(1.05, 2.0, 0.14), mat(PALETTE.door), { y: F + 1.0, z: fz + 0.01 }));
  house.add(mesh(new THREE.CircleGeometry(0.2, 14), mat(PALETTE.glass, { emissive: '#ffd98a', emissiveIntensity: 0.3 }), { y: F + 1.5, z: fz + 0.09, cast: false }));
  house.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#f2c75c', { metalness: 0.4, roughness: 0.4 }), { x: 0.35, y: F + 0.95, z: fz + 0.1 }));
  // cat flap on the door!
  house.add(mesh(new THREE.BoxGeometry(0.42, 0.36, 0.03), mat('#6aa3bf'), { y: F + 0.25, z: fz + 0.08 }));
  // heart wreath
  house.add(mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 14), mat('#7fc67c'), { y: F + 1.85, z: fz + 0.12 }));

  const windowAt = (x, y, z, ry) => {
    const w = new THREE.Group();
    w.position.set(x, y, z); w.rotation.y = ry;
    w.add(mesh(new THREE.BoxGeometry(1.15, 1.05, 0.1), mat(PALETTE.trim)));
    w.add(mesh(new THREE.BoxGeometry(0.95, 0.85, 0.12), mat(PALETTE.glass, { emissive: '#ffcf7a', emissiveIntensity: 0.35 }), { cast: false }));
    w.add(mesh(new THREE.BoxGeometry(0.06, 0.85, 0.15), mat(PALETTE.trim), { cast: false }));
    w.add(mesh(new THREE.BoxGeometry(0.95, 0.06, 0.15), mat(PALETTE.trim), { cast: false }));
    [-1, 1].forEach((s) => w.add(mesh(new THREE.BoxGeometry(0.36, 1.05, 0.06), mat(PALETTE.shutter), { x: s * 0.78, z: 0.02 })));
    // flower box
    w.add(mesh(new THREE.BoxGeometry(1.15, 0.22, 0.28), mat(PALETTE.wood), { y: -0.62, z: 0.14 }));
    const r = mulberry32(Math.floor(x * 10 + z * 3 + 50));
    for (let i = 0; i < 6; i++) {
      w.add(mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(PALETTE.flowers[i % PALETTE.flowers.length]), { x: -0.45 + i * 0.18, y: -0.46 + r() * 0.05, z: 0.15, cast: false }));
    }
    house.add(w);
  };
  windowAt(-2.15, F + 1.45, fz + 0.02, 0);
  windowAt(2.15, F + 1.45, fz + 0.02, 0);
  windowAt(-W / 2 - 0.02, F + 1.45, 0, -Math.PI / 2);
  windowAt(W / 2 + 0.02, F + 1.45, 0.6, Math.PI / 2);
  windowAt(-1.6, F + 1.45, -D / 2 - 0.02, Math.PI);
  windowAt(1.6, F + 1.45, -D / 2 - 0.02, Math.PI);

  // Porch (walkable deck)
  const PD = 2.4, deckH = 0.32;
  const pz = D / 2 + PD / 2;
  house.add(mesh(new THREE.BoxGeometry(W + 0.6, deckH, PD), mat(PALETTE.wood), { y: deckH / 2, z: pz }));
  for (let i = 0; i < 9; i++) { // plank lines
    house.add(mesh(new THREE.BoxGeometry(W + 0.62, 0.012, 0.03), mat(PALETTE.woodDark), { y: deckH + 0.002, z: D / 2 + 0.27 * (i + 0.5), cast: false }));
  }
  // steps
  house.add(mesh(new THREE.BoxGeometry(1.8, 0.16, 0.4), mat(PALETTE.wood), { y: 0.08, z: D / 2 + PD + 0.2 }));
  raised.push({ minX: HX - W / 2 - 0.3, maxX: HX + W / 2 + 0.3, minZ: HZ + D / 2, maxZ: HZ + D / 2 + PD, h: deckH });
  raised.push({ minX: HX - 0.9, maxX: HX + 0.9, minZ: HZ + D / 2 + PD, maxZ: HZ + D / 2 + PD + 0.4, h: 0.16 });
  // posts + porch roof
  const postX = [-W / 2, -1.1, 1.1, W / 2];
  postX.forEach((x) => {
    house.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.3, 8), mat(PALETTE.trim), { x, y: deckH + 1.15, z: D / 2 + PD - 0.15 }));
    addCircle(HX + x, HZ + D / 2 + PD - 0.15, 0.16);
  });
  house.add(mesh(new THREE.BoxGeometry(W + 0.8, 0.12, PD + 0.4), mat(PALETTE.roof), { y: deckH + 2.45, z: pz + 0.1, rx: 0.16 }));
  house.add(mesh(new THREE.BoxGeometry(W + 0.2, 0.15, 0.15), mat(PALETTE.trim), { y: deckH + 2.28, z: D / 2 + PD - 0.15 }));
  // railings (gap between the middle posts)
  const rail = (x1, x2) => {
    const len = x2 - x1, cx = (x1 + x2) / 2, z = D / 2 + PD - 0.15;
    house.add(mesh(new THREE.BoxGeometry(len, 0.08, 0.1), mat(PALETTE.trim), { x: cx, y: deckH + 0.75, z }));
    for (let i = 1; i < len / 0.28; i++) house.add(mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), mat(PALETTE.trim), { x: x1 + i * 0.28, y: deckH + 0.38, z }));
    addBox(HX + cx, HZ + z, len, 0.2);
  };
  rail(-W / 2, -1.1); rail(1.1, W / 2);

  // Welcome mat
  const matTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e9b86f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c98c45'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#9b5d33'; ctx.font = '700 46px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MEOW', w / 2, h / 2 + 2);
  });
  house.add(mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }), {
    y: deckH + 0.01, z: D / 2 + 0.55, rx: -Math.PI / 2, cast: false,
  }));

  // Cat tree on the porch (left side)
  const ct = new THREE.Group();
  ct.position.set(-2.6, deckH, D / 2 + 1.1);
  const carpet = mat('#c9b0e6'), rope = mat('#ead6aa');
  ct.add(mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), carpet, { y: 0.06 }));
  ct.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.7, 8), rope, { y: 0.9 }));
  ct.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8), rope, { x: 0.28, y: 0.55, z: 0.2 }));
  ct.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 12), carpet, { x: 0.18, y: 1.05, z: 0.15 }));
  ct.add(mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 12), carpet, { y: 1.75 }));
  ct.add(mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 14), mat('#f3c2d3'), { y: 1.85, rx: Math.PI / 2 })); // comfy bed
  ct.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.4, 3), mat('#888888'), { x: 0.42, y: 0.85, z: 0.15, cast: false }));
  ct.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat('#f58fa8'), { x: 0.42, y: 0.63, z: 0.15 })); // dangling toy
  house.add(ct);
  addCircle(HX - 2.6, HZ + D / 2 + 1.1, 0.5);

  // Food & water bowls, yarn basket, rocking chair (right side)
  const bowl = (x, z, color, fill) => {
    const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.17, 0), new THREE.Vector2(0.22, 0.1), new THREE.Vector2(0.2, 0.11), new THREE.Vector2(0.15, 0.03), new THREE.Vector2(0, 0.03)];
    house.add(mesh(new THREE.LatheGeometry(pts, 14), mat(color, { flatShading: false }), { x, y: deckH, z }));
    house.add(mesh(new THREE.CircleGeometry(0.16, 12), mat(fill, { flatShading: false }), { x, y: deckH + 0.07, z, rx: -Math.PI / 2, cast: false }));
  };
  bowl(1.5, D / 2 + 0.5, '#f4a3b5', '#b9784a');
  bowl(1.95, D / 2 + 0.5, '#9fd0ef', '#cdeefe');
  bowl(2.4, D / 2 + 0.5, '#c8aaf2', '#b9784a');
  const chair = new THREE.Group();
  chair.position.set(2.7, deckH, D / 2 + 1.3); chair.rotation.y = -0.5;
  const cw = mat(PALETTE.woodDark);
  chair.add(mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), cw, { y: 0.45 }));
  chair.add(mesh(new THREE.BoxGeometry(0.6, 0.75, 0.08), cw, { y: 0.85, z: -0.28, rx: -0.12 }));
  [-1, 1].forEach((s) => chair.add(mesh(new THREE.TorusGeometry(0.5, 0.03, 4, 12, Math.PI * 0.6), cw, { x: s * 0.28, y: 0.5, ry: Math.PI / 2, rz: Math.PI * 1.2 })));
  chair.add(mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat('#f6b7c9'), { y: 0.52 }));
  house.add(chair);
  addCircle(HX + 2.7, HZ + D / 2 + 1.3, 0.45);
  const basket = mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.22, 10), mat(PALETTE.wood), { x: 2.0, y: deckH + 0.11, z: D / 2 + 1.75 });
  house.add(basket);
  ['#f58fa8', '#9fd0ef', '#ffd76e'].forEach((c, i) => house.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(c), { x: 1.92 + i * 0.09, y: deckH + 0.27, z: D / 2 + 1.72 + (i % 2) * 0.06 })));

  // Bushes along the front
  const rand = mulberry32(31);
  [-3.9, 3.9].forEach((x) => { const b = makeBush(rand, 0.9); b.position.set(HX + x, 0, HZ + D / 2 + 0.5); scene.add(b); addCircle(HX + x, HZ + D / 2 + 0.5, 0.5); });

  addBox(HX, HZ, W + 0.3, D + 0.3);
}

/* ------------------------------------------------------------------ */
/* The barn                                                            */
/* ------------------------------------------------------------------ */
function buildBarn(scene) {
  const BX = 13, BZ = -7, W = 6, D = 6.5, H = 3.2;
  const barn = new THREE.Group();
  barn.position.set(BX, 0, BZ); barn.rotation.y = -Math.PI / 2; // doors face the path (-x side)
  scene.add(barn);
  const red = mat(PALETTE.barn), white = mat(PALETTE.trim);
  barn.add(mesh(new THREE.BoxGeometry(W, H, D), red, { y: H / 2 }));
  // vertical board lines
  for (let i = -5; i <= 5; i++) barn.add(mesh(new THREE.BoxGeometry(0.04, H, D + 0.02), mat('#c9625b'), { x: i * 0.5, y: H / 2, cast: false }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => barn.add(mesh(new THREE.BoxGeometry(0.2, H, 0.2), white, { x: sx * W / 2, y: H / 2, z: sz * D / 2 })));
  // Gambrel roof: two steep lower panels + two shallow upper panels
  const roofM = mat(PALETTE.barnRoof);
  const lowA = 1.1, lowW = 1.35, upW = 1.9;
  [-1, 1].forEach((s) => {
    barn.add(mesh(new THREE.BoxGeometry(lowW + 0.1, 0.15, D + 0.6), roofM, { x: s * (W / 2 - lowW * Math.cos(lowA) / 2 + 0.2), y: H + Math.sin(lowA) * lowW / 2, rz: -s * lowA }));
    const ux = W / 2 - lowW * Math.cos(lowA) + 0.2;
    barn.add(mesh(new THREE.BoxGeometry(upW, 0.15, D + 0.6), roofM, { x: s * ux / 2, y: H + Math.sin(lowA) * lowW + 0.35, rz: -s * 0.36 }));
  });
  // gable infill (front + back)
  const gs = new THREE.Shape();
  const ux = W / 2 - lowW * Math.cos(lowA) + 0.2;
  gs.moveTo(-W / 2, 0); gs.lineTo(W / 2, 0); gs.lineTo(ux, Math.sin(lowA) * lowW); gs.lineTo(0, Math.sin(lowA) * lowW + 0.7);
  gs.lineTo(-ux, Math.sin(lowA) * lowW); gs.closePath();
  const gGeo = new THREE.ShapeGeometry(gs);
  [-1, 1].forEach((s) => barn.add(mesh(gGeo, red, { y: H, z: s * (D / 2 + 0.01), ry: s > 0 ? 0 : Math.PI })));
  // Big doors with white X
  const fz = D / 2 + 0.05;
  barn.add(mesh(new THREE.BoxGeometry(2.6, 2.4, 0.1), mat('#d0645d'), { y: 1.2, z: fz }));
  barn.add(mesh(new THREE.BoxGeometry(2.8, 0.16, 0.14), white, { y: 2.45, z: fz }));
  [-1, 1].forEach((s) => {
    barn.add(mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), white, { x: s * 1.33, y: 1.2, z: fz }));
    barn.add(mesh(new THREE.BoxGeometry(0.1, 2.4, 0.14), white, { x: s * 0.0, y: 1.2, z: fz }));
    [-1, 1].forEach((d) => barn.add(mesh(new THREE.BoxGeometry(0.1, 1.75, 0.13), white, { x: s * 0.65, y: 1.2, z: fz + 0.01, rz: d * 0.5 })));
  });
  // hayloft window with hay peeking out
  barn.add(mesh(new THREE.BoxGeometry(1.0, 0.8, 0.1), white, { y: H + 0.55, z: fz }));
  barn.add(mesh(new THREE.BoxGeometry(0.8, 0.6, 0.12), mat('#5b3c3a'), { y: H + 0.55, z: fz }));
  barn.add(mesh(new THREE.BoxGeometry(0.7, 0.2, 0.2), mat('#f2d27a'), { y: H + 0.3, z: fz }));
  // cat silhouette weathervane on the roof
  const vane = new THREE.Group();
  vane.position.set(0, H + Math.sin(lowA) * lowW + 0.75, 0);
  const iron = mat('#5b4256');
  vane.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), iron, { y: 0.45 }));
  vane.add(mesh(new THREE.BoxGeometry(0.5, 0.18, 0.03), iron, { y: 0.85 }));
  vane.add(mesh(new THREE.SphereGeometry(0.11, 6, 5), iron, { x: 0.28, y: 0.95, sz: 0.3 }));
  [-1, 1].forEach((s) => vane.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 3), iron, { x: 0.28 + s * 0.06, y: 1.08, sz: 0.3 })));
  vane.add(mesh(new THREE.TorusGeometry(0.15, 0.025, 4, 8, Math.PI), iron, { x: -0.3, y: 1.0, rz: Math.PI / 2 }));
  barn.add(vane);

  addBox(BX, BZ, D + 0.2, W + 0.2); // rotated 90 degrees, so width/depth swap

  // hay bales by the barn
  const hay = mat('#f0cf73'), hayLine = mat('#d9b158');
  [[9.3, -3.4, 0], [9.3, -2.2, 0.1], [9.35, -2.8, 0.05, 0.75]].forEach(([x, z, r, y = 0.35]) => {
    const b = new THREE.Group(); b.position.set(x, y, z); b.rotation.y = r;
    b.add(mesh(new THREE.BoxGeometry(1.0, 0.7, 0.7), hay));
    [-0.25, 0.25].forEach((dx) => b.add(mesh(new THREE.BoxGeometry(0.05, 0.72, 0.72), hayLine, { x: dx, cast: false })));
    scene.add(b);
  });
  addBox(9.3, -2.8, 1.1, 2.0);

  // tall scratching post next to the barn
  const sp = new THREE.Group(); sp.position.set(9.4, 0, -10.2);
  sp.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 10), mat('#9fd6bf'), { y: 0.06 }));
  sp.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8), mat('#ead6aa'), { y: 0.66 }));
  sp.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10), mat('#9fd6bf'), { y: 1.28 }));
  scene.add(sp); addCircle(9.4, -10.2, 0.5);
}

/* ------------------------------------------------------------------ */
/* Garden plot                                                         */
/* ------------------------------------------------------------------ */
function buildGarden(scene) {
  const GX = -11, GZ = 2, W = 7, D = 6;
  const rand = mulberry32(5);
  const g = new THREE.Group(); g.position.set(GX, 0, GZ); scene.add(g);
  // soil patch
  g.add(mesh(new THREE.BoxGeometry(W - 0.4, 0.06, D - 0.4), mat('#b7865f'), { y: 0.03, cast: false }));
  // three raised beds with crops
  const crops = ['carrot', 'cabbage', 'pumpkin'];
  for (let i = 0; i < 3; i++) {
    const z = -1.8 + i * 1.8;
    g.add(mesh(new THREE.BoxGeometry(5, 0.28, 1.0), mat(PALETTE.wood), { y: 0.14, z }));
    g.add(mesh(new THREE.BoxGeometry(4.8, 0.06, 0.82), mat(PALETTE.soilDark), { y: 0.29, z, cast: false }));
    addBox(GX, GZ + z, 5, 1.0);
    for (let k = 0; k < 7; k++) {
      const x = -2.1 + k * 0.7 + (rand() - 0.5) * 0.1;
      const c = crops[i];
      if (c === 'carrot') {
        g.add(mesh(new THREE.ConeGeometry(0.07, 0.18, 6), mat('#f59a4f'), { x, y: 0.36, z, rx: Math.PI }));
        for (let l = 0; l < 3; l++) g.add(mesh(new THREE.ConeGeometry(0.04, 0.3, 4), mat('#6fbf5c'), { x: x + (l - 1) * 0.04, y: 0.55, z, rz: (l - 1) * 0.35 }));
      } else if (c === 'cabbage') {
        g.add(mesh(new THREE.IcosahedronGeometry(0.2, 1), mat('#9edb7f'), { x, y: 0.45, z, sy: 0.8 }));
        g.add(mesh(new THREE.IcosahedronGeometry(0.14, 1), mat('#c4ec9f'), { x, y: 0.52, z }));
      } else if (k % 2 === 0) {
        const p = new THREE.SphereGeometry(0.24, 10, 8);
        g.add(mesh(p, mat('#f5a35c'), { x, y: 0.5, z, sy: 0.75 }));
        g.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 5), mat('#7a8a45'), { x, y: 0.7, z }));
      } else {
        g.add(mesh(new THREE.IcosahedronGeometry(0.16, 0), mat('#7fc67c'), { x, y: 0.42, z, sy: 0.5 }));
      }
    }
  }
  // fence around it, with an opening on the +x side facing the path
  const x0 = GX - W / 2, x1 = GX + W / 2, z0 = GZ - D / 2, z1 = GZ + D / 2;
  fenceLine(scene, x0, z0, x1, z0);
  fenceLine(scene, x0, z1, x0, z0);
  fenceLine(scene, x1, z1, x0, z1);
  fenceLine(scene, x1, z0, x1, GZ - 0.8);
  fenceLine(scene, x1, GZ + 0.8, x1, z1);
  // Scarecrow wearing cat ears
  const s = new THREE.Group(); s.position.set(GX - 2.9, 0, GZ - 2.4); s.rotation.y = 0.7;
  s.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5), mat(PALETTE.woodDark), { y: 0.9 }));
  s.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5), mat(PALETTE.woodDark), { y: 1.35, rz: Math.PI / 2 }));
  s.add(mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 7), mat('#9fd0ef'), { y: 1.25 }));
  s.add(mesh(new THREE.SphereGeometry(0.22, 8, 6), mat('#f0d9a8'), { y: 1.75 }));
  [-1, 1].forEach((d) => s.add(mesh(new THREE.ConeGeometry(0.08, 0.16, 4), mat('#f4a3b5'), { x: d * 0.12, y: 1.98, rz: -d * 0.3 })));
  s.add(mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 10), mat('#5b4256'), { x: -0.07, y: 1.78, z: 0.2 }));
  s.add(mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 10), mat('#5b4256'), { x: 0.07, y: 1.78, z: 0.2 }));
  scene.add(s);
  // watering can by the gate
  const can = new THREE.Group(); can.position.set(x1 + 0.6, 0, GZ + 1.3);
  can.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.3, 10), mat('#9fd6bf', { metalness: 0.3, roughness: 0.5 }), { y: 0.15 }));
  can.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.35, 5), mat('#9fd6bf'), { x: 0.2, y: 0.25, rz: -0.9 }));
  can.add(mesh(new THREE.TorusGeometry(0.1, 0.02, 4, 10, Math.PI), mat('#9fd6bf'), { y: 0.3 }));
  scene.add(can);
}

/* ------------------------------------------------------------------ */
/* Pond                                                                */
/* ------------------------------------------------------------------ */
function buildPond(scene, lilies) {
  const PX = 9, PZ = 7.5, RX = 3.4, RZ = 2.5;
  const rand = mulberry32(11);
  const sand = mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshStandardMaterial({ color: '#efdcb4', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), {
    x: PX, y: 0.012, z: PZ, rx: -Math.PI / 2, cast: false,
  });
  sand.scale.set(RX + 0.6, RZ + 0.6, 1);
  scene.add(sand);
  const water = mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshStandardMaterial({
    color: PALETTE.water, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -3,
  }), { x: PX, y: 0.03, z: PZ, rx: -Math.PI / 2, cast: false });
  water.scale.set(RX, RZ, 1);
  scene.add(water);
  // a lighter ring for a soft shoreline sparkle
  const ring = mesh(new THREE.RingGeometry(0.86, 0.94, 24), new THREE.MeshBasicMaterial({ color: '#d8f3fb', transparent: true, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -4 }), {
    x: PX, y: 0.035, z: PZ, rx: -Math.PI / 2, cast: false, receive: false,
  });
  ring.scale.set(RX, RZ, 1);
  scene.add(ring);
  // rocks around the edge
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.2;
    if (a > 2.2 && a < 2.9) continue; // a gap so it looks natural
    const r = makeRock(rand, 0.55 + rand() * 0.4);
    r.position.x = PX + Math.cos(a) * (RX + 0.35); r.position.z = PZ + Math.sin(a) * (RZ + 0.35);
    scene.add(r);
  }
  // lily pads with a flower
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2, d = rand() * 0.65;
    const pad = new THREE.Group();
    pad.position.set(PX + Math.cos(a) * RX * d, 0.05, PZ + Math.sin(a) * RZ * d);
    pad.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 10, 1, false, 0.4, Math.PI * 1.8), mat('#7cc47a'), { cast: false }));
    if (i % 2 === 0) pad.add(mesh(new THREE.ConeGeometry(0.1, 0.14, 6), mat('#f8bcd0'), { y: 0.07, cast: false }));
    pad.userData.phase = rand() * 6;
    scene.add(pad); lilies.push(pad);
  }
  // cattails
  for (let i = 0; i < 7; i++) {
    const a = -0.6 + i * 0.15;
    const x = PX + Math.cos(a) * (RX + 0.1), z = PZ + Math.sin(a) * (RZ + 0.1) - 0.2;
    scene.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), mat('#7fae5f'), { x, y: 0.6, z, rz: (rand() - 0.5) * 0.2 }));
    scene.add(mesh(new THREE.CapsuleGeometry(0.05, 0.2, 3, 6), mat('#9c6b4b'), { x, y: 1.15, z }));
  }
  // collision: a few overlapping circles approximate the oval
  addCircle(PX, PZ, RZ + 0.2); addCircle(PX - 1.4, PZ, RZ - 0.2); addCircle(PX + 1.4, PZ, RZ - 0.2);
  return { x: PX, z: PZ };
}

/* ------------------------------------------------------------------ */
/* Entrance: gate sign + mailbox                                       */
/* ------------------------------------------------------------------ */
function buildEntrance(scene) {
  const Z = 17;
  // front fence with a gap for the path
  fenceLine(scene, -20, Z, -1.6, Z);
  fenceLine(scene, 1.6, Z, 20, Z);
  // arch sign
  const wood = mat(PALETTE.woodDark);
  [-1.7, 1.7].forEach((x) => { scene.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 3.1, 7), wood, { x, y: 1.55, z: Z })); addCircle(x, Z, 0.2); });
  const tex = signTexture(["Crazy Cat Lady's Farm", 'all cats welcome'], { w: 1024, h: 300, font: 92 });
  const sign = mesh(new THREE.BoxGeometry(3.8, 1.0, 0.12), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })], { y: 3.0, z: Z });
  scene.add(sign);
  // (box UVs read correctly from both the front and back faces)
  // hanging little flower pots
  [-1.2, 1.2].forEach((x) => scene.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), mat('#f7a8c4'), { x, y: 2.35, z: Z + 0.05 })));

  // Mailbox with a paw-print flag
  const mb = new THREE.Group(); mb.position.set(2.8, 0, Z - 0.9); mb.rotation.y = -Math.PI / 2;
  mb.add(mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), wood, { y: 0.55 }));
  const body = new THREE.Shape(); body.moveTo(-0.22, 0); body.lineTo(0.22, 0); body.lineTo(0.22, 0.25); body.absarc(0, 0.25, 0.22, 0, Math.PI, false); body.closePath();
  mb.add(mesh(new THREE.ExtrudeGeometry(body, { depth: 0.65, bevelEnabled: false, curveSegments: 10 }), mat('#9fd0ef'), { y: 1.1, z: -0.32 }));
  mb.add(mesh(new THREE.BoxGeometry(0.03, 0.4, 0.04), mat('#e8798f'), { x: 0.24, y: 1.45, z: 0 }));
  const pawTex = canvasTexture(128, 128, (ctx) => { ctx.fillStyle = '#fff6e8'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill(); drawPaw(ctx, 64, 70, 70, '#e8798f'); });
  mb.add(mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshStandardMaterial({ map: pawTex, roughness: 0.8 }), { x: 0.24, y: 1.7, z: 0, ry: Math.PI / 2, cast: false }));
  mb.add(mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshStandardMaterial({ map: pawTex, roughness: 0.8 }), { x: 0.255, y: 1.7, z: 0, ry: -Math.PI / 2, cast: false }));
  scene.add(mb); addCircle(2.8, Z - 0.9, 0.3);
}

/* ------------------------------------------------------------------ */
/* Scatter trees, bushes, flowers, rocks                               */
/* ------------------------------------------------------------------ */
function scatter(scene, keepOut) {
  const rand = mulberry32(2024);
  const blocked = (x, z, pad) => keepOut.some((k) => Math.abs(x - k.x) < k.w / 2 + pad && Math.abs(z - k.z) < k.d / 2 + pad);

  // Hand-placed yard trees
  [[-6.5, -14, 1, false], [7, -15, 1.1, false], [-15, -9, 1.0, true], [19, 3, 1.1, false], [-18, 11, 1.0, false],
   [15, 13, 0.9, true], [-5, 12, 0.85, true], [5.5, -3.5, 0.75, true], [-19, -2, 1.05, false], [20, -13, 1.0, false]].forEach(([x, z, s, b]) => {
    const t = makeTree(rand, { blossom: b, scale: s }); t.position.set(x, 0, z); scene.add(t); addCircle(x, z, 0.45 * s);
  });
  // Forest ring around the edge (outside the walkable area plus a few just inside)
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2, r = 25 + rand() * 30;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z, 1.5)) continue;
    const y = terrainHeight(x, z) * (r > HILL_START ? 1 : 0);
    const t = rand() < 0.35 ? makePine(rand, 1 + rand() * 0.6) : makeTree(rand, { scale: 1 + rand() * 0.5, blossom: rand() < 0.12 });
    t.position.set(x, y - 0.1, z); scene.add(t);
    if (r < PLAY_RADIUS + 1) addCircle(x, z, 0.5);
  }
  // Bushes and rocks
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, r = 6 + rand() * 20;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z, 1.2)) continue;
    if (rand() < 0.6) { const b = makeBush(rand, 0.7 + rand() * 0.5); b.position.set(x, 0, z); scene.add(b); addCircle(x, z, 0.45); }
    else { const k = makeRock(rand, 0.6 + rand() * 0.8); k.position.x = x; k.position.z = z; scene.add(k); addCircle(x, z, 0.3); }
  }
  // Flowers in little clumps
  for (let c = 0; c < 34; c++) {
    const a = rand() * Math.PI * 2, r = 4 + rand() * 22;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    if (blocked(cx, cz, 0.6)) continue;
    for (let i = 0; i < 6; i++) {
      const f = makeFlower(rand); f.position.set(cx + (rand() - 0.5) * 1.4, 0, cz + (rand() - 0.5) * 1.4); scene.add(f);
    }
  }
  // Grass tufts (one instanced mesh, cheap to draw)
  const tuftGeo = new THREE.ConeGeometry(0.05, 0.28, 3); tuftGeo.translate(0, 0.14, 0);
  const tufts = new THREE.InstancedMesh(tuftGeo, mat('#86c46f'), 1400);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let n = 0;
  while (n < 1400) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 29;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z, 0.2)) continue;
    e.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5); q.setFromEuler(e);
    s.setScalar(0.7 + rand() * 0.8); p.set(x, 0, z);
    m.compose(p, q, s); tufts.setMatrixAt(n++, m);
  }
  tufts.receiveShadow = true;
  scene.add(tufts);
}

/* ------------------------------------------------------------------ */
/* Butterflies (tiny bit of life until the cats arrive)                */
/* ------------------------------------------------------------------ */
function buildButterflies(scene) {
  const list = [];
  const rand = mulberry32(77);
  const wingGeo = new THREE.CircleGeometry(0.12, 8); wingGeo.translate(0.12, 0, 0);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    const wm = new THREE.MeshStandardMaterial({ color: PALETTE.flowers[i % PALETTE.flowers.length], side: THREE.DoubleSide, roughness: 0.8 });
    const L = new THREE.Mesh(wingGeo, wm), R = new THREE.Mesh(wingGeo, wm);
    L.rotation.x = R.rotation.x = -Math.PI / 2; R.scale.x = -1;
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.add(L); wr.add(R);
    b.add(wl, wr);
    b.userData = { wl, wr, cx: (rand() - 0.5) * 30, cz: (rand() - 0.5) * 30, r: 1.5 + rand() * 3, sp: 0.3 + rand() * 0.4, ph: rand() * 10 };
    scene.add(b); list.push(b);
  }
  return list;
}

/* ------------------------------------------------------------------ */
/* Build it all                                                        */
/* ------------------------------------------------------------------ */
export function buildWorld(scene) {
  scene.fog = new THREE.Fog('#ffe6d6', 45, 140);
  buildSky(scene);
  buildGround(scene);
  const clouds = buildClouds(scene);

  const smokePuffs = [], lilies = [];
  const pathMat = new THREE.MeshStandardMaterial({ color: PALETTE.path, roughness: 1, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // main path: gate -> porch steps; branch to the barn; branch to the garden gate
  scene.add(pathRibbon([[0, 18], [0.4, 13], [-0.6, 8], [0.3, 2], [0, -3.3]], 1.7, pathMat).mesh);
  scene.add(pathRibbon([[0.2, 4], [4, 2.6], [7.5, -1.5], [9.6, -5.5]], 1.3, pathMat).mesh);
  scene.add(pathRibbon([[-0.3, 6], [-3.5, 3.5], [-7.3, 2]], 1.2, pathMat).mesh);
  // stepping stones toward the pond
  const rand = mulberry32(3);
  [[2.2, 9.2], [3.4, 9.7], [4.6, 9.5], [5.6, 9.0]].forEach(([x, z]) => scene.add(mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 7), mat(PALETTE.stone), { x, y: 0.03, z, ry: rand() * 3 })));

  buildCottage(scene, smokePuffs);
  buildBarn(scene);
  buildGarden(scene);
  const pond = buildPond(scene, lilies);
  buildEntrance(scene);

  // areas where scattered things shouldn't spawn (x, z, width, depth)
  const keepOut = [
    { x: 0, z: -7.5, w: 10, d: 10 }, { x: 12, z: -6, w: 10, d: 10 }, { x: -11, z: 2, w: 9, d: 8 },
    { x: 9, z: 7.5, w: 9, d: 7 }, { x: 0, z: 6, w: 3.2, d: 26 }, { x: 5, z: 0, w: 8, d: 3 }, { x: -4, z: 4, w: 7, d: 3 },
    { x: 0, z: 17, w: 44, d: 1.5 }, { x: 3, z: 16, w: 2, d: 2 }, { x: 0, z: 2, w: 6, d: 6 },
  ];
  scatter(scene, keepOut);
  const butterflies = buildButterflies(scene);

  // Named places the cat lady likes to talk about
  const zones = [
    { id: 'porch', x: 0, z: -5.3, r: 3.5 },
    { id: 'garden', x: -11, z: 2, r: 5 },
    { id: 'barn', x: 11, z: -6, r: 5.5 },
    { id: 'pond', x: pond.x, z: pond.z, r: 5 },
    { id: 'gate', x: 0, z: 16, r: 3.5 },
  ];

  function update(t, dt) {
    for (const p of smokePuffs) {
      const k = (t * 0.18 + p.userData.phase) % 1;
      p.position.copy(p.userData.base).add(new THREE.Vector3(Math.sin(k * 6 + p.userData.phase * 9) * 0.3 + k * 0.8, k * 3.2, 0));
      p.scale.setScalar(0.5 + k * 1.6);
      p.material.opacity = 0.75 * (1 - k);
    }
    for (const c of clouds.children) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 130) c.position.x = -130;
    }
    for (const l of lilies) l.position.y = 0.05 + Math.sin(t * 1.3 + l.userData.phase) * 0.012;
    for (const b of butterflies) {
      const u = b.userData, a = t * u.sp + u.ph;
      b.position.set(u.cx + Math.cos(a) * u.r, 0.9 + Math.sin(a * 2.3) * 0.35, u.cz + Math.sin(a * 1.3) * u.r);
      b.rotation.y = -a;
      const f = Math.sin(t * 18 + u.ph) * 0.9;
      u.wl.rotation.z = f; u.wr.rotation.z = -f;
    }
  }

  return { resolve, groundHeight, zones, update, spawn: new THREE.Vector3(0, 0, 3.5) };
}
