// Inside Granny's cottage: four real rooms with walls and doorways.
//   Living room (front door opens here): woodstove, sofa, armchair, bookshelf, cat beds
//   Country kitchen (back left): sage glass-front cabinets, honey-wood cupboards, butcher block,
//     farmhouse sink with a brass faucet, vintage cream stove, worn table + mismatched chairs
//   Bedroom (back right): her quilted bed (10 PM Sleep happens here), nightstands, lamp, rug
//   Bathroom (front right): clawfoot tub, pedestal sink, mirror, rug and towels
// Interior walls fade out whenever they'd hide her from the camera.
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';
import { addBox, addCircle } from './collision.js';
import { fadeable, setOpacity } from './building.js';
import { addSeat } from './seats.js';

// warm "country grandma" palette (from the user's reference kitchen)
const P = {
  sage: '#a9b98e', sageDark: '#8e9f74', honey: '#c98f4f', honeyDark: '#a8723c', butcher: '#d9a066',
  cream: '#f4ead2', creamWarm: '#efdcb4', porcelain: '#fbf6ec', brass: '#c9a24a', floor: '#b97f4c',
  rose: '#e59a8f', blush: '#f2c4bb', mint: '#cfe6d6', sky: '#bcd9e6', ink: '#5b4256',
};

/* ---------- canvas textures ---------- */
function floralPaper(bg, motif, leaf, seed = 1) {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    let s = seed * 9301;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 14; i++) {
      const x = (i % 4) * 64 + ((Math.floor(i / 4) % 2) * 32) + r() * 10, y = Math.floor(i / 4) * 70 + 20 + r() * 10;
      ctx.fillStyle = leaf; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.ellipse(x - 8, y + 6, 7, 3, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 8, y + 7, 7, 3, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = motif; ctx.globalAlpha = 0.6;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 3.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#f7e1a0'; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function stripePaper(a, b, dots) {
  const t = canvasTexture(128, 128, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? a : b; ctx.fillRect(i * 16, 0, 16, h); }
    ctx.fillStyle = dots; for (let y = 8; y < h; y += 24) for (let x = 8; x < w; x += 32) { ctx.beginPath(); ctx.arc(x, y + ((x / 32) % 2) * 12, 2.2, 0, Math.PI * 2); ctx.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function tiles(color, grout, n = 8) {
  const t = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = grout; ctx.fillRect(0, 0, w, h);
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { ctx.fillStyle = color; ctx.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const texMat = (tex, rx, ry, opts = {}) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, ...opts }); };

export function buildCottageInterior(house, { HX, HZ, W, D, H, T, FLOOR, walls }) {
  const g = new THREE.Group(); g.position.y = FLOOR; house.add(g);
  const IX = W / 2 - T, IZ = D / 2 - T;                  // inner faces of the outer walls
  const toWorld = (x, z) => new THREE.Vector3(HX + x, FLOOR, HZ + z);
  const add = (o, parent = g) => { parent.add(o); return o; };
  const box = (w, h, d, m, p, parent) => add(mesh(new THREE.BoxGeometry(w, h, d), m, p), parent);
  const cyl = (rt, rb, h, m, p, seg = 12, parent) => add(mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, { ...p }), parent);
  // things fixed to an outer wall live in that wall's group (so they fade together); wall groups sit at y=0 not FLOOR
  const onWall = (wall, o) => { o.position.y += FLOOR; walls[wall].add(o); return o; };
  const wmesh = (wall, geo, m, p) => onWall(wall, mesh(geo, m, p));

  /* ---------- rooms (house-local, x across, z front(+)/back(-)) ---------- */
  const ZMID = 0, XKB = 0.4, XLB = 2.0;                  // kitchen|bedroom wall x, living|bath wall x
  const ROOMS = {
    kitchen: { x0: -IX, x1: XKB, z0: -IZ, z1: ZMID, label: 'Kitchen' },
    bedroom: { x0: XKB, x1: IX, z0: -IZ, z1: ZMID, label: 'Bedroom' },
    living: { x0: -IX, x1: XLB, z0: ZMID, z1: IZ, label: 'Living room' },
    bath: { x0: XLB, x1: IX, z0: ZMID, z1: IZ, label: 'Bathroom' },
  };
  const DOORS = { kitchen: [-2.0, -0.8], bedroom: [0.65, 1.8], bath: [0.45, 1.6] }; // gaps in the partitions

  /* ---------- floors: warm planks, tiles in the bathroom ---------- */
  const plank = canvasTexture(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = ['#c48955', '#b97f4c', '#c99260', '#b37847'][i % 4]; ctx.fillRect(0, i * 32, w, 32);
      ctx.fillStyle = 'rgba(90,50,25,0.32)'; ctx.fillRect(0, i * 32, w, 2);
      ctx.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32); ctx.fillRect(((i * 53 + 120) % 230) + 10, i * 32, 2, 32);
      ctx.fillStyle = 'rgba(255,230,190,0.08)'; ctx.fillRect(0, i * 32 + 6, w, 6);
    }
  });
  plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
  const floorMat = (rx, ry) => { const t = plank.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2 }); };
  box(W - 2 * T, 0.01, D - 2 * T, floorMat(W / 2, D / 2), { y: 0.005, cast: false });
  const R = ROOMS.bath;
  add(mesh(new THREE.PlaneGeometry(R.x1 - R.x0 - 0.07, R.z1 - R.z0 - 0.07), texMat(tiles('#f4f1ea', '#cfc6b8', 6), 3, 3, { polygonOffset: true, polygonOffsetFactor: -3 }), { x: (R.x0 + R.x1) / 2 + 0.035, y: 0.012, z: (R.z0 + R.z1) / 2 + 0.035, rx: -Math.PI / 2, cast: false }));

  /* ---------- wallpaper per room ---------- */
  const PAPER = {
    kitchen: floralPaper('#f3e6c6', '#e6a895', '#a9b98e', 2),
    living: floralPaper('#e9e4cc', '#d99a8c', '#93a87e', 5),
    bedroom: stripePaper('#f7ddd6', '#fbe9e2', '#e8a7a0'),
    bath: stripePaper('#dcebe6', '#eaf4f0', '#9ccbbf'),
  };
  const wainsMat = { kitchen: mat(P.creamWarm), living: mat('#b7c49b'), bedroom: mat('#f3d2cb'), bath: mat('#ffffff') };
  // a wallpaper panel on a wall face: along x (nz = facing direction ±1) or along z (nx)
  const paperX = (parent, room, x1, x2, z, nz, yOff = 0) => {
    const len = x2 - x1, cx = (x1 + x2) / 2;
    add(mesh(new THREE.PlaneGeometry(len, H - 0.02), texMat(PAPER[room], len / 1.2, H / 1.2), { x: cx, y: H / 2 + yOff, z: z + nz * 0.012, ry: nz > 0 ? 0 : Math.PI, cast: false }), parent);
    add(mesh(new THREE.BoxGeometry(len, 0.9, 0.02), wainsMat[room], { x: cx, y: 0.45 + yOff, z: z + nz * 0.02, cast: false }), parent);
    add(mesh(new THREE.BoxGeometry(len, 0.05, 0.04), mat('#ffffff'), { x: cx, y: 0.92 + yOff, z: z + nz * 0.03, cast: false }), parent);
  };
  const paperZ = (parent, room, z1, z2, x, nx, yOff = 0) => {
    const len = z2 - z1, cz = (z1 + z2) / 2;
    add(mesh(new THREE.PlaneGeometry(len, H - 0.02), texMat(PAPER[room], len / 1.2, H / 1.2), { x: x + nx * 0.012, y: H / 2 + yOff, z: cz, ry: nx > 0 ? Math.PI / 2 : -Math.PI / 2, cast: false }), parent);
    add(mesh(new THREE.BoxGeometry(0.02, 0.9, len), wainsMat[room], { x: x + nx * 0.02, y: 0.45 + yOff, z: cz, cast: false }), parent);
    add(mesh(new THREE.BoxGeometry(0.04, 0.05, len), mat('#ffffff'), { x: x + nx * 0.03, y: 0.92 + yOff, z: cz, cast: false }), parent);
  };
  // outer walls (panels go in the wall groups, which sit at y=0, so lift by FLOOR)
  paperX(walls.back, 'kitchen', -IX, XKB, -IZ, 1, FLOOR); paperX(walls.back, 'bedroom', XKB, IX, -IZ, 1, FLOOR);
  paperX(walls.front, 'living', -IX, -0.7, IZ, -1, FLOOR); paperX(walls.front, 'living', 0.7, XLB, IZ, -1, FLOOR); paperX(walls.front, 'bath', XLB, IX, IZ, -1, FLOOR);
  paperZ(walls.left, 'kitchen', -IZ, ZMID, -IX, 1, FLOOR); paperZ(walls.left, 'living', ZMID, IZ, -IX, 1, FLOOR);
  paperZ(walls.right, 'bedroom', -IZ, ZMID, IX, -1, FLOOR); paperZ(walls.right, 'bath', ZMID, IZ, IX, -1, FLOOR);

  /* ---------- partition walls with doorways (each one can fade) ---------- */
  const PT = 0.14, LINTEL = 2.15;
  const wallCore = mat('#f1e4cc');
  const partitions = [];
  const trimM = mat('#ffffff');
  /** A wall along x at z, from x1 to x2, with door gaps [[a,b]]. Sides: room names for -z and +z faces. */
  function partX(z, x1, x2, gaps, roomNeg, roomPos) {
    const grp = new THREE.Group(); g.add(grp);
    const solid = []; let x = x1;
    for (const [a, b] of gaps) { solid.push([x, a, 0, H]); solid.push([a, b, LINTEL, H]); x = b; }
    solid.push([x, x2, 0, H]);
    for (const [a, b, y0, y1] of solid) {
      if (b - a < 0.01) continue;
      box(b - a, y1 - y0, PT, wallCore, { x: (a + b) / 2, y: (y0 + y1) / 2, z }, grp);
      if (y0 === 0) { paperX(grp, roomNeg, a, b, z - PT / 2, -1); paperX(grp, roomPos, a, b, z + PT / 2, 1); addBox(HX + (a + b) / 2, HZ + z, b - a, PT + 0.06); }
      else {
        add(mesh(new THREE.PlaneGeometry(b - a, y1 - y0), texMat(PAPER[roomNeg], (b - a) / 1.2, 0.5), { x: (a + b) / 2, y: (y0 + y1) / 2, z: z - PT / 2 - 0.012, ry: Math.PI, cast: false }), grp);
        add(mesh(new THREE.PlaneGeometry(b - a, y1 - y0), texMat(PAPER[roomPos], (b - a) / 1.2, 0.5), { x: (a + b) / 2, y: (y0 + y1) / 2, z: z + PT / 2 + 0.012, cast: false }), grp);
      }
    }
    for (const [a, b] of gaps) { // white door frames
      [a, b].forEach((xx) => box(0.08, LINTEL, PT + 0.08, trimM, { x: xx, y: LINTEL / 2, z }, grp));
      box(b - a + 0.16, 0.08, PT + 0.08, trimM, { x: (a + b) / 2, y: LINTEL, z }, grp);
    }
    partitions.push({ grp, a: new THREE.Vector2(HX + x1, HZ + z), b: new THREE.Vector2(HX + x2, HZ + z) });
    return grp;
  }
  function partZ(x, z1, z2, gaps, roomNeg, roomPos) {
    const grp = new THREE.Group(); g.add(grp);
    const solid = []; let z = z1;
    for (const [a, b] of gaps) { solid.push([z, a, 0, H]); solid.push([a, b, LINTEL, H]); z = b; }
    solid.push([z, z2, 0, H]);
    for (const [a, b, y0, y1] of solid) {
      if (b - a < 0.01) continue;
      box(PT, y1 - y0, b - a, wallCore, { x, y: (y0 + y1) / 2, z: (a + b) / 2 }, grp);
      if (y0 === 0) { paperZ(grp, roomNeg, a, b, x - PT / 2, -1); paperZ(grp, roomPos, a, b, x + PT / 2, 1); addBox(HX + x, HZ + (a + b) / 2, PT + 0.06, b - a); }
      else {
        add(mesh(new THREE.PlaneGeometry(b - a, y1 - y0), texMat(PAPER[roomNeg], (b - a) / 1.2, 0.5), { x: x - PT / 2 - 0.012, y: (y0 + y1) / 2, z: (a + b) / 2, ry: -Math.PI / 2, cast: false }), grp);
        add(mesh(new THREE.PlaneGeometry(b - a, y1 - y0), texMat(PAPER[roomPos], (b - a) / 1.2, 0.5), { x: x + PT / 2 + 0.012, y: (y0 + y1) / 2, z: (a + b) / 2, ry: Math.PI / 2, cast: false }), grp);
      }
    }
    for (const [a, b] of gaps) {
      [a, b].forEach((zz) => box(PT + 0.08, LINTEL, 0.08, trimM, { x, y: LINTEL / 2, z: zz }, grp));
      box(PT + 0.08, 0.08, b - a + 0.16, trimM, { x, y: LINTEL, z: (a + b) / 2 }, grp);
    }
    partitions.push({ grp, a: new THREE.Vector2(HX + x, HZ + z1), b: new THREE.Vector2(HX + x, HZ + z2) });
    return grp;
  }
  // the z=0 wall in three stretches (different rooms on each side), then the two short walls
  const wallKitchen = partX(ZMID, -IX - 0.01, XKB, [DOORS.kitchen], 'kitchen', 'living');
  partX(ZMID, XKB, XLB, [DOORS.bedroom], 'bedroom', 'living');
  const wallBath = partX(ZMID, XLB, IX + 0.01, [], 'bedroom', 'bath');
  partZ(XKB, -IZ, ZMID - PT / 2, [], 'kitchen', 'bedroom');
  const wallLB = partZ(XLB, ZMID + PT / 2, IZ, [DOORS.bath], 'living', 'bath');

  /* ================= COUNTRY KITCHEN ================= */
  const honey = mat(P.honey), honeyDark = mat(P.honeyDark), butcher = mat(P.butcher), sage = mat(P.sage), sageDark = mat(P.sageDark);
  const porcelain = mat(P.porcelain, { flatShading: false, roughness: 0.35 }), brass = mat(P.brass, { metalness: 0.6, roughness: 0.35, flatShading: false });
  const cream = mat(P.cream, { flatShading: false, roughness: 0.5 });
  const knob = mat('#7a5233');
  const backZ = -IZ + 0.31;                        // cabinet centre line along the back wall
  // honey-wood lower cabinets + butcher-block counter (x1..x2 along the back wall)
  const lowerRun = (x1, x2) => {
    const w = x2 - x1, cx = (x1 + x2) / 2;
    box(w, 0.82, 0.6, honey, { x: cx, y: 0.41, z: backZ });
    box(w + 0.03, 0.07, 0.66, butcher, { x: cx, y: 0.855, z: backZ + 0.02 });
    box(w, 0.08, 0.04, honeyDark, { x: cx, y: 0.04, z: backZ + 0.29 }); // toe kick
    const n = Math.max(1, Math.round(w / 0.5));
    for (let i = 0; i < n; i++) {
      const dx = x1 + (w / n) * (i + 0.5);
      box(w / n - 0.06, 0.18, 0.02, honeyDark, { x: dx, y: 0.7, z: backZ + 0.31, cast: false });           // drawer
      box(w / n - 0.06, 0.46, 0.02, honeyDark, { x: dx, y: 0.32, z: backZ + 0.31, cast: false });          // door
      box(w / n - 0.16, 0.36, 0.015, honey, { x: dx, y: 0.32, z: backZ + 0.325, cast: false });             // raised panel
      add(mesh(new THREE.SphereGeometry(0.022, 6, 5), knob, { x: dx, y: 0.7, z: backZ + 0.335, cast: false }));
      add(mesh(new THREE.SphereGeometry(0.02, 6, 5), knob, { x: dx + (w / n) * 0.3, y: 0.45, z: backZ + 0.335, cast: false }));
    }
    addBox(HX + cx, HZ + backZ, w, 0.66);
  };
  lowerRun(-IX, -3.4);            // corner
  lowerRun(-2.5, -1.0);           // under the window
  // farmhouse apron sink (between the runs) with brass bridge faucet
  const sinkX = -2.95;
  box(0.9, 0.82, 0.6, honey, { x: sinkX, y: 0.41, z: backZ });
  box(0.86, 0.36, 0.56, porcelain, { x: sinkX, y: 0.7, z: backZ + 0.04 });                 // apron front
  box(0.7, 0.04, 0.42, mat('#e7e1d4', { roughness: 0.3 }), { x: sinkX, y: 0.86, z: backZ + 0.03, cast: false }); // basin
  box(0.95, 0.07, 0.12, butcher, { x: sinkX, y: 0.855, z: backZ - 0.25 });
  addBox(HX + sinkX, HZ + backZ, 0.9, 0.66);
  cyl(0.018, 0.018, 0.26, brass, { x: sinkX, y: 1.02, z: backZ - 0.24 }, 8);
  box(0.26, 0.025, 0.025, brass, { x: sinkX, y: 1.1, z: backZ - 0.24, cast: false });
  [-1, 1].forEach((s) => { cyl(0.014, 0.014, 0.12, brass, { x: sinkX + s * 0.13, y: 1.05, z: backZ - 0.24 }, 6); cyl(0.03, 0.03, 0.02, brass, { x: sinkX + s * 0.13, y: 1.12, z: backZ - 0.24 }, 8); });
  add(mesh(new THREE.TorusGeometry(0.08, 0.016, 5, 10, Math.PI), brass, { x: sinkX, y: 1.15, z: backZ - 0.16, ry: Math.PI / 2, cast: false }));
  // cream square-tile backsplash along the back wall (on the wall group so it fades with it)
  const splash = texMat(tiles('#f6efdc', '#d9ccb2', 8), 1, 1);
  [[-IX, -1.0]].forEach(([a, b]) => { const t = splash.clone(); t.map = splash.map.clone(); t.map.needsUpdate = true; t.map.repeat.set((b - a) / 0.6, 1); wmesh('back', new THREE.PlaneGeometry(b - a, 0.6), t, { x: (a + b) / 2, y: 1.2, z: -IZ + 0.025, cast: false }); });
  // window over the counter with sheer cafe curtains and golden light
  const winX = -1.75;
  const glow = mat('#ffe2a6', { emissive: '#ffcf7a', emissiveIntensity: 0.9 });
  wmesh('back', new THREE.BoxGeometry(1.0, 1.05, 0.02), glow, { x: winX, y: 1.45, z: -IZ + 0.02, cast: false });
  wmesh('back', new THREE.BoxGeometry(0.05, 1.05, 0.06), trimM, { x: winX, y: 1.45, z: -IZ + 0.04, cast: false });
  wmesh('back', new THREE.BoxGeometry(1.0, 0.05, 0.06), trimM, { x: winX, y: 1.45, z: -IZ + 0.04, cast: false });
  wmesh('back', new THREE.BoxGeometry(1.16, 0.08, 0.14), trimM, { x: winX, y: 0.95, z: -IZ + 0.07 });
  wmesh('back', new THREE.BoxGeometry(1.16, 1.2, 0.04), mat('#ffffff'), { x: winX, y: 1.45, z: -IZ + 0.008, cast: false, sx: 1 });
  const sheer = new THREE.MeshStandardMaterial({ color: '#fffaf0', transparent: true, opacity: 0.6, roughness: 1, side: THREE.DoubleSide, emissive: '#ffe6b8', emissiveIntensity: 0.3 });
  [-1, 1].forEach((s) => wmesh('back', new THREE.PlaneGeometry(0.42, 0.55), sheer, { x: winX + s * 0.27, y: 1.2, z: -IZ + 0.09, cast: false }));
  wmesh('back', new THREE.CylinderGeometry(0.012, 0.012, 1.1, 5), brass, { x: winX, y: 1.47, z: -IZ + 0.09, rz: Math.PI / 2, cast: false });
  // jars + crock on the counter
  [['#efe1c2', -2.25, 0.12], ['#d9b98a', -2.1, 0.09]].forEach(([c, x, r]) => cyl(r * 0.8, r, r * 2, mat(c, { flatShading: false }), { x, y: 0.89 + r, z: backZ - 0.12 }, 10));
  // wooden shelf with plants + jars above the sink, and a tea-towel rod
  wmesh('back', new THREE.BoxGeometry(0.85, 0.04, 0.2), honeyDark, { x: sinkX, y: 1.62, z: -IZ + 0.12 });
  [-0.3, 0, 0.3].forEach((dx, i) => { wmesh('back', new THREE.CylinderGeometry(0.06, 0.05, 0.1, 8), mat(['#c97b5a', '#f4ead2', '#d9b98a'][i]), { x: sinkX + dx, y: 1.69, z: -IZ + 0.12 }); if (i !== 1) wmesh('back', new THREE.IcosahedronGeometry(0.08, 0), mat('#7fa868'), { x: sinkX + dx, y: 1.8, z: -IZ + 0.12 }); });
  wmesh('back', new THREE.BoxGeometry(0.1, 0.32, 0.02), mat('#b8834f'), { x: sinkX - 0.5, y: 1.78, z: -IZ + 0.04 }); // cutting board
  // stove (vintage cream gas range) at the end of the run
  const stoveX = -0.4;
  const stove = new THREE.Group(); stove.position.set(stoveX, 0, backZ); g.add(stove);
  stove.add(mesh(new THREE.BoxGeometry(0.78, 0.86, 0.62), cream, { y: 0.43 }));
  stove.add(mesh(new THREE.BoxGeometry(0.8, 0.04, 0.64), mat('#3d2b3a'), { y: 0.88 }));
  stove.add(mesh(new THREE.BoxGeometry(0.78, 0.26, 0.08), cream, { y: 1.02, z: -0.28 }));      // backsplash panel
  stove.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.02), mat('#3d2b3a'), { y: 1.04, z: -0.235, cast: false })); // clock strip
  const ovenGlow = mat('#ffcf8a', { emissive: '#ff9a3c', emissiveIntensity: 0.15 });
  stove.add(mesh(new THREE.BoxGeometry(0.48, 0.3, 0.02), ovenGlow, { y: 0.42, z: 0.32, cast: false }));
  stove.add(mesh(new THREE.BoxGeometry(0.6, 0.42, 0.015), mat('#e9dcc0'), { y: 0.42, z: 0.315, cast: false }));
  stove.add(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.05), mat('#cfd6dc', { metalness: 0.6 }), { y: 0.68, z: 0.34, cast: false }));
  for (let i = 0; i < 4; i++) stove.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), mat('#ffffff'), { x: -0.24 + i * 0.16, y: 0.78, z: 0.33, rx: Math.PI / 2, cast: false }));
  const burnerMat = mat('#3d2b3a', { emissive: '#ff6a3c', emissiveIntensity: 0 });
  [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.14], [0.18, 0.14]].forEach(([x, z]) => stove.add(mesh(new THREE.TorusGeometry(0.09, 0.018, 4, 12), burnerMat, { x, y: 0.91, z, rx: Math.PI / 2, cast: false })));
  // the cooking pot: an enamel stock pot
  const pot = new THREE.Group(); pot.position.set(-0.18, 0.91, -0.12); stove.add(pot);
  pot.add(mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.24, 14), mat('#e98f86', { flatShading: false, roughness: 0.4 }), { y: 0.12 }));
  const lid = new THREE.Group(); lid.position.y = 0.25; pot.add(lid);
  lid.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 14), mat('#d77b72', { flatShading: false }), {}));
  lid.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#ffffff'), { y: 0.025 }));
  // kettle on the front burner
  stove.add(mesh(new THREE.SphereGeometry(0.1, 12, 8), mat('#a9b98e', { flatShading: false, roughness: 0.4 }), { x: 0.18, y: 0.98, z: 0.14, sy: 0.85 }));
  stove.add(mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.1, 5), mat('#a9b98e'), { x: 0.29, y: 1.0, z: 0.14, rz: -0.9 }));
  addBox(HX + stoveX, HZ + backZ, 0.8, 0.66);
  // sage glass-front upper cabinets on the left wall, full of cream pitchers and teacups
  const upper = (z1, z2) => {
    const len = z2 - z1, cz = (z1 + z2) / 2, x = -IX + 0.19, y0 = 1.45, h = 0.95;
    wmesh('left', new THREE.BoxGeometry(0.36, h, len), sage, { x, y: y0 + h / 2, z: cz });
    wmesh('left', new THREE.BoxGeometry(0.4, 0.06, len + 0.06), sageDark, { x: x + 0.01, y: y0 + h + 0.03, z: cz });
    wmesh('left', new THREE.BoxGeometry(0.02, h - 0.12, len - 0.1), mat('#f6ecd6'), { x: x + 0.12, y: y0 + h / 2, z: cz, cast: false }); // cabinet back, lit
    for (let k = 0; k < 2; k++) {
      const sy = y0 + 0.08 + k * 0.42;
      wmesh('left', new THREE.BoxGeometry(0.3, 0.02, len - 0.1), sageDark, { x: x + 0.02, y: sy + 0.02, z: cz, cast: false });
      for (let i = 0; i < Math.floor(len / 0.17); i++) {
        const zz = z1 + 0.12 + i * 0.17;
        if (i % 3 === 1) { // pitcher
          wmesh('left', new THREE.CylinderGeometry(0.045, 0.06, 0.16, 10), cream, { x: x + 0.06, y: sy + 0.11, z: zz, cast: false });
          wmesh('left', new THREE.TorusGeometry(0.035, 0.01, 4, 8), cream, { x: x + 0.06, y: sy + 0.12, z: zz + 0.065, ry: 0, cast: false });
        } else if (i % 3 === 2) { // stack of plates
          wmesh('left', new THREE.CylinderGeometry(0.075, 0.075, 0.06, 12), mat('#fffaf0', { flatShading: false }), { x: x + 0.06, y: sy + 0.06, z: zz, cast: false });
          wmesh('left', new THREE.CylinderGeometry(0.076, 0.076, 0.01, 12), mat('#e6a895'), { x: x + 0.06, y: sy + 0.09, z: zz, cast: false });
        } else { // teacups
          wmesh('left', new THREE.CylinderGeometry(0.04, 0.03, 0.06, 10), mat('#fff6e6', { flatShading: false }), { x: x + 0.06, y: sy + 0.06, z: zz, cast: false });
          wmesh('left', new THREE.CylinderGeometry(0.055, 0.055, 0.008, 10), mat('#f2c4bb'), { x: x + 0.06, y: sy + 0.03, z: zz, cast: false });
        }
      }
    }
    // door frames with glass panes (muntins)
    const nDoors = Math.max(2, Math.round(len / 0.45));
    for (let i = 0; i <= nDoors; i++) wmesh('left', new THREE.BoxGeometry(0.03, h - 0.04, 0.05), sageDark, { x: x + 0.19, y: y0 + h / 2, z: z1 + 0.02 + (len - 0.04) * (i / nDoors), cast: false });
    [0.03, h / 2, h - 0.03].forEach((yy) => wmesh('left', new THREE.BoxGeometry(0.03, 0.05, len), sageDark, { x: x + 0.19, y: y0 + yy, z: cz, cast: false }));
    const glass = new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.18, roughness: 0.1 });
    wmesh('left', new THREE.PlaneGeometry(len - 0.06, h - 0.08), glass, { x: x + 0.185, y: y0 + h / 2, z: cz, ry: Math.PI / 2, cast: false });
    for (let i = 0; i < nDoors; i++) wmesh('left', new THREE.SphereGeometry(0.018, 6, 5), brass, { x: x + 0.22, y: y0 + 0.2, z: z1 + (len / nDoors) * (i + (i % 2 ? 0.15 : 0.85)), cast: false });
  };
  // left-wall counter run under the uppers (cabinet faces +x)
  const sideX = -IX + 0.31, sz1 = -IZ + 0.62, sz2 = -2.0;
  {
    const len = sz2 - sz1, cz = (sz1 + sz2) / 2;
    box(0.6, 0.82, len, honey, { x: sideX, y: 0.41, z: cz });
    box(0.66, 0.07, len + 0.03, butcher, { x: sideX + 0.02, y: 0.855, z: cz });
    const n = Math.max(1, Math.round(len / 0.5));
    for (let i = 0; i < n; i++) {
      const dz = sz1 + (len / n) * (i + 0.5);
      box(0.02, 0.18, len / n - 0.06, honeyDark, { x: sideX + 0.31, y: 0.7, z: dz, cast: false });
      box(0.02, 0.46, len / n - 0.06, honeyDark, { x: sideX + 0.31, y: 0.32, z: dz, cast: false });
      add(mesh(new THREE.SphereGeometry(0.022, 6, 5), knob, { x: sideX + 0.335, y: 0.7, z: dz, cast: false }));
    }
    addBox(HX + sideX, HZ + cz, 0.66, len);
    // bread box + rolling pin
    box(0.34, 0.2, 0.26, mat('#e9dcc0'), { x: sideX - 0.04, y: 0.99, z: cz - 0.2 });
    cyl(0.035, 0.035, 0.36, mat('#d9b98a'), { x: sideX + 0.05, y: 0.92, z: cz + 0.25, rx: Math.PI / 2 }, 8);
    const sp = texMat(tiles('#f6efdc', '#d9ccb2', 8), (len + 0.62) / 0.6, 1);
    wmesh('left', new THREE.PlaneGeometry(len + 0.62, 0.55), sp, { x: -IX + 0.025, y: 1.17, z: cz - 0.31, ry: Math.PI / 2, cast: false });
  }
  upper(-IZ + 0.05, -2.05);
  // embroidered tea towels on a brass rod (left wall, past the cabinets)
  wmesh('left', new THREE.CylinderGeometry(0.012, 0.012, 0.75, 5), brass, { x: -IX + 0.07, y: 1.45, z: -1.55, rx: Math.PI / 2, cast: false });
  const towelTex = canvasTexture(64, 96, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8b7a8'; ctx.fillRect(0, h - 10, w, 4); ctx.fillRect(0, 6, w, 3);
    ctx.fillStyle = '#d0605c'; [[22, 52], [40, 46], [32, 64]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#7fa868'; ctx.fillRect(30, 66, 3, 14);
  });
  [-0.25, 0, 0.25].forEach((dz) => wmesh('left', new THREE.PlaneGeometry(0.2, 0.34), new THREE.MeshStandardMaterial({ map: towelTex, roughness: 1, side: THREE.DoubleSide }), { x: -IX + 0.08, y: 1.27, z: -1.55 + dz, ry: Math.PI / 2, cast: false }));
  // little wooden wall shelf with jars (left wall, above the pantry)
  // worn wooden table, teapot + cinnamon rolls, mismatched sage/cream spindle chairs
  const tX = -2.25, tZ = -1.55;
  const table = new THREE.Group(); table.position.set(tX, 0, tZ); g.add(table);
  table.add(mesh(new THREE.BoxGeometry(1.15, 0.06, 0.78), mat('#c8935a'), { y: 0.74 }));
  table.add(mesh(new THREE.BoxGeometry(1.05, 0.1, 0.68), mat('#a8723c'), { y: 0.66 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => table.add(mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.66, 8), mat('#a8723c'), { x: sx * 0.48, y: 0.33, z: sz * 0.3 })));
  // teapot
  table.add(mesh(new THREE.SphereGeometry(0.1, 12, 9), porcelain, { x: -0.15, y: 0.86, z: -0.05, sy: 0.85 }));
  table.add(mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.12, 6), porcelain, { x: -0.03, y: 0.88, z: -0.05, rz: -1.0 }));
  table.add(mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 8), porcelain, { x: -0.26, y: 0.88, z: -0.05 }));
  table.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#e59a8f'), { x: -0.15, y: 0.95, z: -0.05 }));
  table.add(mesh(new THREE.CircleGeometry(0.025, 8), mat('#e59a8f'), { x: -0.15, y: 0.87, z: 0.045, cast: false }));
  // cooling rack of cinnamon rolls
  table.add(mesh(new THREE.BoxGeometry(0.36, 0.015, 0.26), mat('#9a8f86', { metalness: 0.4 }), { x: 0.22, y: 0.78, z: 0.05 }));
  for (let i = 0; i < 6; i++) {
    const rx = 0.12 + (i % 3) * 0.1, rz = -0.02 + Math.floor(i / 3) * 0.12;
    table.add(mesh(new THREE.CylinderGeometry(0.045, 0.048, 0.04, 10), mat('#d08a45', { flatShading: false }), { x: rx, y: 0.805, z: rz }));
    table.add(mesh(new THREE.TorusGeometry(0.025, 0.008, 4, 10), mat('#fff3dc'), { x: rx, y: 0.826, z: rz, rx: Math.PI / 2, cast: false }));
  }
  // gingham napkin
  const gingham = canvasTexture(32, 32, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 32, 32); ctx.fillStyle = 'rgba(229,154,143,0.6)'; for (let i = 0; i < 4; i++) { ctx.fillRect(i * 8, 0, 4, 32); ctx.fillRect(0, i * 8, 32, 4); } });
  table.add(mesh(new THREE.PlaneGeometry(0.24, 0.2), new THREE.MeshStandardMaterial({ map: gingham, roughness: 1 }), { x: -0.38, y: 0.775, z: 0.18, rx: -Math.PI / 2, rz: 0.3, cast: false }));
  addBox(HX + tX, HZ + tZ, 1.15, 0.78);
  const chair = (x, z, ry, color) => {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
    const m = mat(color), m2 = mat(color === P.cream ? '#e2d4b4' : P.sageDark);
    c.add(mesh(new THREE.BoxGeometry(0.42, 0.05, 0.4), m, { y: 0.46 }));
    [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]].forEach(([lx, lz]) => c.add(mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.46, 6), m2, { x: lx, y: 0.23, z: lz })));
    [-0.17, 0.17].forEach((lx) => c.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), m2, { x: lx, y: 0.75, z: 0.18 })));
    for (let i = 0; i < 4; i++) c.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), m, { x: -0.1 + i * 0.067, y: 0.72, z: 0.18 }));
    c.add(mesh(new THREE.BoxGeometry(0.44, 0.07, 0.05), m, { y: 1.0, z: 0.18 }));
    addCircle(HX + x, HZ + z, 0.22);
    return c;
  };
  // backs away from the table, so she sits facing it; she slides the chair out (out = local spot she stands on)
  const kc = [
    [chair(tX - 0.78, tZ, -Math.PI / 2, P.sage), [0.62, 0.02]],
    [chair(tX + 0.78, tZ + 0.05, Math.PI / 2, P.cream), [0, 0.66]],
    [chair(tX - 0.15, tZ - 0.62, Math.PI, P.cream), [0, 0.64]],
  ];
  kc.forEach(([c, out]) => addSeat({ parent: c, top: [0, 0.485, 0.02], back: 1, out, label: 'Sit at the kitchen table', kind: 'chair', noun: 'kitchen chair' }));
  // pantry shelf (cans of cat food fill it up) against the left wall near the door
  const pantry = new THREE.Group(); pantry.position.set(-IX + 0.24, 0, -1.0 + 0.0); pantry.rotation.y = Math.PI / 2; g.add(pantry);
  pantry.add(mesh(new THREE.BoxGeometry(1.0, 1.9, 0.04), mat('#e9dcc0'), { y: 0.95, z: -0.2 }));
  [-1, 1].forEach((s) => pantry.add(mesh(new THREE.BoxGeometry(0.05, 1.9, 0.44), honeyDark, { x: s * 0.5, y: 0.95 })));
  pantry.add(mesh(new THREE.BoxGeometry(1.05, 0.06, 0.46), honeyDark, { y: 1.92 }));
  const cans = [];
  const canCols = ['#e59a8f', '#a9b98e', '#f2c45c', '#c8aaf2', '#9fd0ef', '#f4ead2'];
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = 0.1 + shelf * 0.46;
    pantry.add(mesh(new THREE.BoxGeometry(0.96, 0.035, 0.4), honey, { y, cast: false }));
    if (shelf === 3) {
      ['#f59a4f', '#9edb7f', '#f5a35c'].forEach((c, i) => {
        pantry.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 10), mat('#e8f6ff', { transparent: true, opacity: 0.55 }), { x: -0.3 + i * 0.3, y: y + 0.14, cast: false }));
        pantry.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 10), mat(c), { x: -0.3 + i * 0.3, y: y + 0.09, cast: false }));
        pantry.add(mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 10), gingham ? new THREE.MeshStandardMaterial({ map: gingham }) : mat('#e8798f'), { x: -0.3 + i * 0.3, y: y + 0.28, cast: false }));
      });
      continue;
    }
    for (let i = 0; i < 5; i++) {
      const can = new THREE.Group(); can.position.set(-0.36 + i * 0.18, y + 0.02, 0.02);
      can.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), mat('#d7dde3', { metalness: 0.5, roughness: 0.35 }), { y: 0.06, cast: false }));
      can.add(mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.07, 10), mat(canCols[(i + shelf) % canCols.length]), { y: 0.06, cast: false }));
      pantry.add(can); cans.push(can); can.visible = false;
    }
  }
  addBox(HX - IX + 0.24, HZ - 1.0, 0.48, 1.05);
  // little "Kitchen" sampler
  const sampler = canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#a8723c'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = '#c0605c'; ctx.font = '700 40px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Home Sweet', w / 2, 70); ctx.fillText('Home', w / 2, 112);
    drawPaw(ctx, 40, 125, 22, '#a9b98e', -0.3); drawPaw(ctx, w - 40, 125, 22, '#a9b98e', 0.3);
  });
  wmesh('back', new THREE.PlaneGeometry(0.5, 0.31), new THREE.MeshStandardMaterial({ map: sampler, roughness: 1 }), { x: -0.4, y: 1.95, z: -IZ + 0.03, cast: false });

  /* ================= BEDROOM ================= */
  const woodDark = mat('#8f6446'), wood = mat('#c1906a'), white = mat('#ffffff');
  const bedX = 2.55, bedZ = -IZ + 1.05;
  const bed = new THREE.Group(); bed.position.set(bedX, 0, bedZ); g.add(bed);
  bed.add(mesh(new THREE.BoxGeometry(1.35, 0.35, 2.0), woodDark, { y: 0.2 }));
  bed.add(mesh(new THREE.BoxGeometry(1.35, 0.95, 0.1), woodDark, { y: 0.48, z: -1.0 }));
  bed.add(mesh(new THREE.CylinderGeometry(0.67, 0.67, 0.1, 16, 1, false, -Math.PI / 2, Math.PI), woodDark, { y: 0.95, z: -1.0, rx: Math.PI / 2 }));
  bed.add(mesh(new THREE.BoxGeometry(1.35, 0.55, 0.08), woodDark, { y: 0.38, z: 1.0 }));          // footboard
  bed.add(mesh(new THREE.BoxGeometry(1.25, 0.16, 1.9), white, { y: 0.45 }));
  const quiltTex = canvasTexture(128, 128, (ctx) => {
    const cs = ['#f2c4bb', '#f4ead2', '#a9b98e', '#e59a8f', '#cfe6d6', '#f7e1a0'];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { ctx.fillStyle = cs[(x * 2 + y * 3) % cs.length]; ctx.fillRect(x * 21.3, y * 21.3, 21.3, 21.3); }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 21.3, 0); ctx.lineTo(i * 21.3, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 21.3); ctx.lineTo(128, i * 21.3); ctx.stroke(); }
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if ((x + y) % 4 === 0) drawPaw(ctx, x * 21.3 + 10.6, y * 21.3 + 11, 10, '#ffffff');
  });
  bed.add(mesh(new THREE.BoxGeometry(1.4, 0.07, 1.35), new THREE.MeshStandardMaterial({ map: quiltTex, roughness: 1 }), { y: 0.56, z: 0.28 }));
  [-1, 1].forEach((s) => bed.add(mesh(new THREE.BoxGeometry(0.03, 0.3, 1.35), new THREE.MeshStandardMaterial({ map: quiltTex, roughness: 1 }), { x: s * 0.7, y: 0.42, z: 0.28 })));
  [-0.3, 0.3].forEach((x) => bed.add(mesh(new THREE.BoxGeometry(0.5, 0.14, 0.32), mat('#fffaf0', { flatShading: false }), { x, y: 0.6, z: -0.72 })));
  bed.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), mat('#f5b16b'), { x: 0.0, y: 0.68, z: -0.5, sy: 0.75 }));     // cat pillow
  [-1, 1].forEach((s) => bed.add(mesh(new THREE.ConeGeometry(0.045, 0.09, 4), mat('#f5b16b'), { x: s * 0.07, y: 0.8, z: -0.5 })));
  addBox(HX + bedX, HZ + bedZ, 1.4, 2.05);
  // braided oval rug at the foot of the bed
  const rug = (x, z, rx, rz, cols, parent = g) => cols.forEach((c, i) => add(mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: c, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 - i }), { x, y: 0.012 + i * 0.002, z, rx: -Math.PI / 2, sx: rx * (1 - i * 0.18), sy: rz * (1 - i * 0.18), cast: false }), parent));
  rug(bedX - 0.1, -1.0, 1.0, 0.55, ['#e59a8f', '#f4ead2', '#a9b98e', '#f2c4bb']);
  // nightstands, lamp (with a warm glow), alarm clock, book
  [[bedX - 1.0], [bedX + 1.0]].forEach(([x], i) => {
    box(0.42, 0.55, 0.4, wood, { x, y: 0.28, z: -IZ + 0.28 });
    box(0.36, 0.14, 0.02, woodDark, { x, y: 0.4, z: -IZ + 0.48, cast: false });
    addBox(HX + x, HZ - IZ + 0.28, 0.44, 0.42);
    if (i === 0) {
      cyl(0.03, 0.06, 0.3, mat('#f4ead2'), { x, y: 0.7, z: -IZ + 0.28 }, 8);
      cyl(0.1, 0.17, 0.2, mat('#f7d6c9', { emissive: '#ffcf9a', emissiveIntensity: 0.8, side: THREE.DoubleSide }), { x, y: 0.92, z: -IZ + 0.28 }, 12);
    } else {
      cyl(0.06, 0.06, 0.08, mat('#a9b98e'), { x, y: 0.6, z: -IZ + 0.28, rx: Math.PI / 2 }, 12);
      box(0.18, 0.04, 0.24, mat('#c0605c'), { x: x - 0.04, y: 0.58, z: -IZ + 0.22, ry: 0.3 });
    }
  });
  // dresser with a framed photo and a vase on the right wall
  box(0.5, 0.85, 1.1, wood, { x: IX - 0.26, y: 0.43, z: -1.0 });
  for (let i = 0; i < 3; i++) box(0.02, 0.22, 1.0, woodDark, { x: IX - 0.52, y: 0.17 + i * 0.27, z: -1.0, cast: false });
  cyl(0.06, 0.05, 0.2, mat('#cfe6d6', { flatShading: false }), { x: IX - 0.26, y: 0.96, z: -1.3 }, 10);
  [0, 1, 2].forEach((i) => add(mesh(new THREE.SphereGeometry(0.06, 6, 5), mat(['#e59a8f', '#f7e1a0', '#f2c4bb'][i]), { x: IX - 0.26 + (i - 1) * 0.05, y: 1.1 + (i % 2) * 0.04, z: -1.3 + (i - 1) * 0.04 })));
  box(0.04, 0.24, 0.2, mat('#c9a24a'), { x: IX - 0.3, y: 0.98, z: -0.8, rz: 0.08 });
  addBox(HX + IX - 0.26, HZ - 1.0, 0.52, 1.12);
  // window on the right (bedroom) wall
  const smallWin = (wall, x, y, z, ry, w = 0.9, h = 0.9) => {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry;
    grp.add(mesh(new THREE.BoxGeometry(w, h, 0.02), glow, { cast: false }));
    grp.add(mesh(new THREE.BoxGeometry(w + 0.12, 0.07, 0.12), trimM, { y: -h / 2 - 0.02, z: 0.04 }));
    grp.add(mesh(new THREE.BoxGeometry(0.05, h, 0.05), trimM, { z: 0.02, cast: false }));
    grp.add(mesh(new THREE.BoxGeometry(w, 0.05, 0.05), trimM, { z: 0.02, cast: false }));
    [-1, 1].forEach((s) => grp.add(mesh(new THREE.PlaneGeometry(w * 0.4, h * 1.05), sheer, { x: s * w * 0.36, y: 0.05, z: 0.06, cast: false })));
    onWall(wall, grp);
  };
  smallWin('right', IX - 0.02, 1.45, -2.6, -Math.PI / 2, 0.85, 0.8);
  smallWin('back', 1.2, 1.45, -IZ + 0.02, 0, 0.7, 0.66);
  // framed cat portraits above the bed
  const portrait = (wall, x, y, z, ry, look) => {
    const tex = canvasTexture(96, 120, (ctx, w, h) => { ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h); drawPaw(ctx, w / 2, h / 2 + 6, 46, look, 0); });
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry;
    grp.add(mesh(new THREE.BoxGeometry(0.34, 0.42, 0.03), mat('#c9a24a')));
    grp.add(mesh(new THREE.PlaneGeometry(0.27, 0.35), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), { z: 0.02, cast: false }));
    onWall(wall, grp);
  };
  portrait('back', bedX - 0.35, 2.05, -IZ + 0.03, 0, '#e59a8f');
  portrait('back', bedX + 0.35, 2.1, -IZ + 0.03, 0, '#a9b98e');

  /* ================= BATHROOM ================= */
  const tub = new THREE.Group(); tub.position.set(IX - 0.42, 0, 2.55); g.add(tub);
  const tubOuter = mat('#fbf6ec', { flatShading: false, roughness: 0.3 });
  tub.add(mesh(new THREE.CapsuleGeometry(0.34, 0.95, 6, 14), tubOuter, { y: 0.5, rx: Math.PI / 2, sx: 1, sy: 1, sz: 0.8 }));
  tub.add(mesh(new THREE.CapsuleGeometry(0.29, 0.9, 6, 14), mat('#cfe6ee', { flatShading: false, roughness: 0.15 }), { y: 0.62, rx: Math.PI / 2, sz: 0.55 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => tub.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), brass, { x: sx * 0.22, y: 0.1, z: sz * 0.55 })));
  tub.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), brass, { y: 0.95, z: 0.78 }));
  tub.add(mesh(new THREE.TorusGeometry(0.08, 0.018, 5, 10, Math.PI), brass, { y: 1.15, z: 0.7, ry: Math.PI / 2 }));
  // rubber duck!
  tub.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#ffd35c'), { x: 0.05, y: 0.82, z: -0.2 }));
  tub.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), mat('#ffd35c'), { x: 0.05, y: 0.88, z: -0.15 }));
  tub.add(mesh(new THREE.ConeGeometry(0.015, 0.04, 5), mat('#f59a4f'), { x: 0.05, y: 0.88, z: -0.11, rx: Math.PI / 2 }));
  addBox(HX + IX - 0.42, HZ + 2.55, 0.74, 1.75);
  // pedestal sink + oval mirror (mirror lives on the partition's group so it fades with it)
  const sinkPX = 3.2;
  cyl(0.07, 0.12, 0.78, porcelain, { x: sinkPX, y: 0.39, z: ZMID + 0.32 }, 12);
  add(mesh(new THREE.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), porcelain, { x: sinkPX, y: 0.86, z: ZMID + 0.36, rx: Math.PI, sy: 0.45 }));
  box(0.56, 0.05, 0.42, porcelain, { x: sinkPX, y: 0.87, z: ZMID + 0.3 });
  cyl(0.015, 0.015, 0.16, brass, { x: sinkPX, y: 0.97, z: ZMID + 0.14 }, 6);
  addCircle(HX + sinkPX, HZ + ZMID + 0.32, 0.3);
  const mirrorGrp = new THREE.Group(); mirrorGrp.position.set(sinkPX, 1.55, ZMID + PT / 2 + 0.03);
  mirrorGrp.add(mesh(new THREE.CircleGeometry(0.3, 24), mat('#c9a24a'), { sy: 1.3, cast: false }));
  mirrorGrp.add(mesh(new THREE.CircleGeometry(0.26, 24), mat('#dff0f5', { metalness: 0.6, roughness: 0.1, flatShading: false }), { z: 0.005, sy: 1.3, cast: false }));
  wallBath.add(mirrorGrp); // hangs on the wall, so it fades with it
  // towel rack + fluffy towels on the bath side of the living|bath wall
  const towelGrp = new THREE.Group(); towelGrp.position.set(XLB + PT / 2 + 0.06, 1.25, 2.7);
  towelGrp.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), brass, { rx: Math.PI / 2, cast: false }));
  towelGrp.add(mesh(new THREE.BoxGeometry(0.04, 0.55, 0.32), mat('#f2c4bb'), { y: -0.26, z: -0.17 }));
  towelGrp.add(mesh(new THREE.BoxGeometry(0.04, 0.45, 0.28), mat('#cfe6d6'), { y: -0.22, z: 0.18 }));
  wallLB.add(towelGrp);
  rug(3.0, 2.4, 0.45, 0.32, ['#a9b98e', '#fbf6ec']);
  // little potted fern + soap dish on a shelf
  smallWin('front', 3.2, 1.45, IZ - 0.02, Math.PI, 0.6, 0.58);
  box(0.3, 0.3, 0.3, mat('#c97b5a'), { x: IX - 0.25, y: 0.15, z: 0.4 });
  add(mesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#7fa868'), { x: IX - 0.25, y: 0.45, z: 0.4 }));
  addCircle(HX + IX - 0.25, HZ + 0.4, 0.22);

  /* ================= LIVING ROOM ================= */
  // cast-iron woodstove on a brick hearth (left wall) with a flickering fire
  const fsZ = 2.25;
  box(0.9, 0.06, 1.2, mat('#b4614f'), { x: -IX + 0.45, y: 0.03, z: fsZ });
  wmesh('left', new THREE.BoxGeometry(0.04, 1.6, 1.15), mat('#c27a62'), { x: -IX + 0.03, y: 0.8, z: fsZ, cast: false }); // brick surround
  const ws = new THREE.Group(); ws.position.set(-IX + 0.42, 0.06, fsZ); g.add(ws);
  const iron = mat('#3f3a3d', { roughness: 0.6 });
  ws.add(mesh(new THREE.BoxGeometry(0.55, 0.55, 0.65), iron, { y: 0.42 }));
  ws.add(mesh(new THREE.BoxGeometry(0.62, 0.06, 0.72), iron, { y: 0.72 }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => ws.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6), iron, { x: sx * 0.22, y: 0.07, z: sz * 0.26 })));
  const fireMat = mat('#ffb347', { emissive: '#ff7a1a', emissiveIntensity: 1.6 });
  ws.add(mesh(new THREE.BoxGeometry(0.02, 0.28, 0.36), fireMat, { x: 0.28, y: 0.42, cast: false }));
  ws.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 10), iron, { y: 1.55 }));
  ws.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10), brass, { x: 0.3, y: 0.42, z: 0.15, ry: Math.PI / 2, cast: false }));
  // kettle on the stove top + log basket
  ws.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), mat('#c0605c', { flatShading: false }), { y: 0.83, sy: 0.8 }));
  const fireLight = new THREE.PointLight('#ff9a4a', 1.6, 3.5, 1.8); fireLight.position.set(-IX + 0.95, 0.6, fsZ); g.add(fireLight);
  addBox(HX - IX + 0.42, HZ + fsZ, 0.7, 0.8);
  [0, 1, 2].forEach((i) => add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 7), mat('#9a6a45'), { x: -IX + 0.35, y: 0.08 + (i === 2 ? 0.1 : 0), z: fsZ + 0.75 + (i % 2) * 0.13 - (i === 2 ? 0.06 : 0), rx: Math.PI / 2 })));
  // big braided rug
  rug(-1.9, 2.05, 1.45, 1.0, ['#c97b5a', '#f4ead2', '#a9b98e', '#e59a8f', '#f7e1a0']);
  // sofa against the kitchen wall, facing the room
  const sofa = new THREE.Group(); sofa.position.set(-3.2, 0, ZMID + 0.48); g.add(sofa);
  const sofaM = mat('#c9a0a0'), sofaD = mat('#b38686');
  sofa.add(mesh(new THREE.BoxGeometry(1.7, 0.4, 0.8), sofaD, { y: 0.24 }));
  sofa.add(mesh(new THREE.BoxGeometry(1.7, 0.6, 0.2), sofaD, { y: 0.6, z: -0.3 }));
  [-0.42, 0.42].forEach((x) => sofa.add(mesh(new THREE.BoxGeometry(0.8, 0.14, 0.6), sofaM, { x, y: 0.5, z: 0.08 })));
  [-1, 1].forEach((s) => sofa.add(mesh(new THREE.BoxGeometry(0.16, 0.55, 0.8), sofaD, { x: s * 0.85, y: 0.4 })));
  sofa.add(mesh(new THREE.BoxGeometry(0.34, 0.3, 0.1), new THREE.MeshStandardMaterial({ map: gingham }), { x: -0.5, y: 0.7, z: -0.12, rz: 0.15 }));
  sofa.add(mesh(new THREE.BoxGeometry(0.32, 0.28, 0.1), mat('#a9b98e'), { x: 0.5, y: 0.69, z: -0.12, rz: -0.12 }));
  // crocheted granny-square throw over the arm
  const granny = canvasTexture(64, 64, (ctx) => { const cs = ['#f7e1a0', '#e59a8f', '#a9b98e', '#fbf6ec']; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = '#5b4256'; ctx.fillRect(x * 16, y * 16, 16, 16); ctx.fillStyle = cs[(x + y) % 4]; ctx.fillRect(x * 16 + 2, y * 16 + 2, 12, 12); ctx.fillStyle = cs[(x + y + 2) % 4]; ctx.fillRect(x * 16 + 5, y * 16 + 5, 6, 6); } });
  sofa.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.85), new THREE.MeshStandardMaterial({ map: granny, roughness: 1 }), { x: 0.6, y: 0.59, z: 0.0 }));
  addBox(HX - 3.2, HZ + ZMID + 0.48, 1.75, 0.82);
  addSeat({ parent: sofa, top: [-0.42, 0.57, 0.06], back: -1, cat: [0.45, 0.57, 0.06], label: 'Sit on the sofa', kind: 'sofa', noun: 'sofa' });
  // armchair angled toward the woodstove
  const arm = new THREE.Group(); arm.position.set(-2.9, 0, 3.15); arm.rotation.y = -Math.PI * 0.72; g.add(arm);
  const armM = mat('#a9b98e'), armD = mat('#8e9f74');
  arm.add(mesh(new THREE.BoxGeometry(0.78, 0.4, 0.72), armD, { y: 0.24 }));
  arm.add(mesh(new THREE.BoxGeometry(0.78, 0.75, 0.18), armD, { y: 0.7, z: -0.28 }));
  arm.add(mesh(new THREE.BoxGeometry(0.6, 0.14, 0.55), armM, { y: 0.5, z: 0.06 }));
  [-1, 1].forEach((s) => arm.add(mesh(new THREE.BoxGeometry(0.12, 0.55, 0.72), armD, { x: s * 0.39, y: 0.4 })));
  arm.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), mat('#e59a8f'), { x: 0.6, y: 0.11, z: 0.3 })); // ball of yarn (on the floor, so she can sit)
  arm.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 3), mat('#cfd6dc'), { x: 0.64, y: 0.18, z: 0.3, rz: 0.6 }));
  addCircle(HX - 2.9, HZ + 3.15, 0.45);
  addSeat({ parent: arm, top: [0, 0.57, 0.04], back: -1, out: [0, 0.8], label: 'Sit in the armchair', kind: 'armchair', noun: 'armchair' });
  // little coffee table with a teacup and a book
  box(0.7, 0.05, 0.45, mat('#c8935a'), { x: -2.0, y: 0.42, z: 1.85 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(0.04, 0.4, 0.04, mat('#a8723c'), { x: -2.0 + sx * 0.3, y: 0.2, z: 1.85 + sz * 0.18 }));
  cyl(0.04, 0.03, 0.06, porcelain, { x: -2.15, y: 0.48, z: 1.85 }, 10);
  box(0.2, 0.05, 0.28, mat('#7fa868'), { x: -1.85, y: 0.47, z: 1.9, ry: 0.4 });
  addBox(HX - 2.0, HZ + 1.85, 0.72, 0.47);
  // bookshelf against the bath wall (living side)
  const bs = new THREE.Group(); bs.position.set(XLB - PT / 2 - 0.2, 0, 2.9); bs.rotation.y = -Math.PI / 2; g.add(bs);
  bs.add(mesh(new THREE.BoxGeometry(1.0, 1.8, 0.36), honeyDark, { y: 0.9 }));
  bs.add(mesh(new THREE.BoxGeometry(0.92, 1.7, 0.02), mat('#e9dcc0'), { y: 0.9, z: -0.16, cast: false }));
  const bookCols = ['#c0605c', '#a9b98e', '#f7e1a0', '#8fb2c9', '#e59a8f', '#7a5233', '#cfe6d6'];
  for (let sh = 0; sh < 4; sh++) {
    const y = 0.12 + sh * 0.42;
    bs.add(mesh(new THREE.BoxGeometry(0.92, 0.03, 0.32), honey, { y, z: 0.02, cast: false }));
    let x = -0.42;
    for (let i = 0; x < 0.4 && i < 9; i++) {
      const w = 0.05 + ((i * 7 + sh * 3) % 4) * 0.015, h = 0.24 + ((i * 5 + sh) % 3) * 0.04;
      if (sh === 3 && i === 2) { bs.add(mesh(new THREE.IcosahedronGeometry(0.1, 0), mat('#7fa868'), { x: x + 0.1, y: y + 0.14, z: 0.03, cast: false })); x += 0.22; continue; }
      bs.add(mesh(new THREE.BoxGeometry(w, h, 0.24), mat(bookCols[(i + sh * 2) % bookCols.length]), { x: x + w / 2, y: y + h / 2 + 0.015, z: 0.04, cast: false }));
      x += w + 0.01;
    }
  }
  addBox(HX + XLB - PT / 2 - 0.2, HZ + 2.9, 0.38, 1.02);
  // floor lamp + plant by the front window
  cyl(0.15, 0.17, 0.04, mat('#5b4256'), { x: -IX + 0.35, y: 0.02, z: IZ - 0.35 }, 10);
  cyl(0.015, 0.015, 1.45, brass, { x: -IX + 0.35, y: 0.74, z: IZ - 0.35 }, 6);
  cyl(0.14, 0.24, 0.3, mat('#f7e1c0', { emissive: '#ffd08a', emissiveIntensity: 0.7, side: THREE.DoubleSide }), { x: -IX + 0.35, y: 1.5, z: IZ - 0.35 }, 12);
  addCircle(HX - IX + 0.35, HZ + IZ - 0.35, 0.2);
  box(0.32, 0.34, 0.32, mat('#c97b5a'), { x: -0.95, y: 0.17, z: IZ - 0.3 });
  add(mesh(new THREE.IcosahedronGeometry(0.3, 0), mat('#7fa868'), { x: -0.95, y: 0.55, z: IZ - 0.3 }));
  addCircle(HX - 0.95, HZ + IZ - 0.3, 0.24);
  // two cat beds so cats can lounge by the fire and by the books
  const catBed = (x, z, c1, c2) => {
    add(mesh(new THREE.TorusGeometry(0.28, 0.11, 8, 16), mat(c1, { flatShading: false }), { x, y: 0.11, z, rx: Math.PI / 2 }));
    add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 14), mat(c2), { x, y: 0.05, z }));
  };
  const catBedA = new THREE.Vector3(-IX + 0.5, 0, fsZ - 0.95), catBedB = new THREE.Vector3(1.35, 0, IZ - 0.45);
  catBed(catBedA.x, catBedA.z, '#e59a8f', '#f4ead2');
  catBed(catBedB.x, catBedB.z, '#a9b98e', '#fbf6ec');
  // framed pictures + a clock above the sofa
  portrait('left', -IX + 0.03, 1.9, 0.9, Math.PI / 2, '#c0605c');
  const clockGrp = new THREE.Group(); clockGrp.position.set(-3.2, 2.0, ZMID + PT / 2 + 0.03);
  clockGrp.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20), mat('#a8723c'), { rx: Math.PI / 2 }));
  clockGrp.add(mesh(new THREE.CircleGeometry(0.16, 20), mat('#fbf6ec'), { z: 0.025, cast: false }));
  clockGrp.add(mesh(new THREE.BoxGeometry(0.012, 0.12, 0.01), mat('#3d2b3a'), { y: 0.05, z: 0.03, cast: false }));
  clockGrp.add(mesh(new THREE.BoxGeometry(0.09, 0.012, 0.01), mat('#3d2b3a'), { x: 0.04, z: 0.03, cast: false }));
  wallKitchen.add(clockGrp);
  smallWin('front', -2.4, 1.45, IZ - 0.02, Math.PI, 0.95, 0.88);
  smallWin('left', -IX + 0.02, 1.45, 3.35, Math.PI / 2, 0.75, 0.75);

  // every interior wall (with whatever hangs on it) can now fade on its own
  partitions.forEach((pt) => (pt.f = fadeable(pt.grp)));

  /* ---------- warm golden-hour lighting: one light per half of the cottage ---------- */
  const lightBack = new THREE.PointLight('#ffd29a', 5.5, 7.5, 1.4); lightBack.position.set(-0.4, H - 0.5, -2.0); g.add(lightBack);
  const lightFront = new THREE.PointLight('#ffcf94', 4.5, 7, 1.4); lightFront.position.set(-0.6, H - 0.5, 2.0); g.add(lightFront);

  /* ---------- steam for cooking ---------- */
  const steam = [];
  const steamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0, roughness: 1, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const p = mesh(new THREE.IcosahedronGeometry(0.08, 1), steamMat.clone(), { cast: false, receive: false });
    p.userData.phase = i / 6; stove.add(p); steam.push(p);
  }
  let cooking = 0;
  // vintage sage-enamel coffee percolator with a glass perk knob, two mugs on a little tray
  const potX = -1.35;
  const perc = new THREE.Group(); perc.position.set(potX, 0.89, backZ - 0.08); g.add(perc);
  const enamel = mat('#9fb487', { flatShading: false, roughness: 0.35 }), chrome = mat('#d9dde0', { metalness: 0.6, roughness: 0.3, flatShading: false });
  perc.add(mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.26, 14), enamel, { y: 0.13 }));
  perc.add(mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.025, 14), chrome, { y: 0.012 }));
  perc.add(mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.03, 14), chrome, { y: 0.27 }));
  perc.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), mat('#e8a35a', { transparent: true, opacity: 0.85, emissive: '#c8742a', emissiveIntensity: 0.25, flatShading: false }), { y: 0.3 }));
  perc.add(mesh(new THREE.TorusGeometry(0.065, 0.014, 5, 10, Math.PI), mat('#3d2b3a'), { x: 0.1, y: 0.15, rz: -Math.PI / 2 }));
  perc.add(mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.13, 6), enamel, { x: -0.11, y: 0.2, rz: 0.7 }));
  // a white daisy on the front of the perc
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; perc.add(mesh(new THREE.SphereGeometry(0.014, 6, 5), mat('#ffffff'), { x: Math.cos(a) * 0.022, y: 0.14 + Math.sin(a) * 0.022, z: 0.098, sz: 0.4, cast: false })); }
  perc.add(mesh(new THREE.SphereGeometry(0.012, 6, 5), mat('#ffd76e'), { y: 0.14, z: 0.1, sz: 0.4, cast: false }));
  box(0.36, 0.015, 0.2, mat('#b8834f'), { x: potX + 0.26, y: 0.9, z: backZ - 0.04, cast: false });
  [[0.18, '#f4ead2'], [0.34, '#e59a8f']].forEach(([dx, c]) => {
    cyl(0.04, 0.035, 0.08, mat(c, { flatShading: false }), { x: potX + dx, y: 0.95, z: backZ - 0.04 }, 10);
    add(mesh(new THREE.TorusGeometry(0.022, 0.008, 4, 8), mat(c), { x: potX + dx + 0.045, y: 0.95, z: backZ - 0.04, ry: Math.PI / 2, cast: false }));
  });
  const potSteam = [];
  for (let i = 0; i < 4; i++) {
    const p = mesh(new THREE.IcosahedronGeometry(0.035, 1), steamMat.clone(), { cast: false, receive: false });
    p.userData.phase = i / 4; perc.add(p); potSteam.push(p);
  }
  let perking = 1;   // 1 = fresh perc ready (steams a little), 0 = re-perking

  /* ---------- rooms + doorways (for cats walking between rooms) ---------- */
  const roomOf = (x, z) => { // world coords; assumes inside the cottage
    const lx = x - HX, lz = z - HZ;
    if (lz < ZMID) return lx < XKB ? 'kitchen' : 'bedroom';
    return lx < XLB ? 'living' : 'bath';
  };
  const w2 = (x, z) => [HX + x, HZ + z];
  const links = {
    'living-kitchen': [w2((DOORS.kitchen[0] + DOORS.kitchen[1]) / 2, 0.75), w2((DOORS.kitchen[0] + DOORS.kitchen[1]) / 2, -0.75)],
    'living-bedroom': [w2((DOORS.bedroom[0] + DOORS.bedroom[1]) / 2, 0.75), w2((DOORS.bedroom[0] + DOORS.bedroom[1]) / 2, -0.75)],
    'living-bath': [w2(XLB - 0.6, (DOORS.bath[0] + DOORS.bath[1]) / 2), w2(XLB + 0.6, (DOORS.bath[0] + DOORS.bath[1]) / 2)],
  };

  // interior walls between the camera and her fade away (so you can always see her)
  let camY = 0, headY = 0, wallTop = 0;
  const cam2 = new THREE.Vector2(), lady2 = new THREE.Vector2(), dir = new THREE.Vector2(), q = new THREE.Vector2();
  /** Is any part of this wall inside the "corridor" between the camera and her (about 4 m wide)? */
  const blocksView = (pt) => {
    const len = pt.a.distanceTo(pt.b), n = Math.max(2, Math.ceil(len / 0.4));
    dir.copy(lady2).sub(cam2); const L = dir.length(); if (L < 0.01) return false; dir.divideScalar(L);
    for (let i = 0; i <= n; i++) {
      q.copy(pt.a).lerp(pt.b, i / n).sub(cam2);
      const along = q.dot(dir), across = Math.abs(q.x * dir.y - q.y * dir.x);
      if (along > -0.5 && along < L - 0.25 && across < 1.5 + along * 0.12) {
        // only if the sight line (camera -> her head) actually dips below the top of this wall here
        const h = camY + (headY - camY) * Math.max(0, along) / L;
        if (h < wallTop + 0.15) return true;
      }
    }
    return false;
  };
  function fadePartitions(dt, ladyPos, camera, inside) {
    const k = Math.min(1, dt * 7);
    if (camera && ladyPos) { cam2.set(camera.position.x, camera.position.z); lady2.set(ladyPos.x, ladyPos.z); camY = camera.position.y; headY = ladyPos.y + 1.3; wallTop = ladyPos.y + H; }
    for (const pt of partitions) {
      let target = 1;
      if (inside && camera && blocksView(pt)) target = 0.1;
      const a = pt.f.opacity + (target - pt.f.opacity) * k;
      if (Math.abs(a - pt.f.opacity) > 0.002) setOpacity(pt.f, a);
    }
  }

  return {
    stovePos: toWorld(stoveX, backZ + 0.75),           // stand here to cook
    bedPos: toWorld(bedX - 1.05, bedZ + 0.6),          // beside the bed, in the bedroom
    pantryPos: toWorld(-IX + 0.95, -1.0),
    coffeePos: toWorld(potX + 0.05, backZ + 0.75),      // stand here to pour a cup
    coffeePot: toWorld(potX, backZ - 0.08).setY(FLOOR + 1.2),
    setCoffeeReady(v) { perking = v ? 1 : 0; },
    rooms: ROOMS, roomOf, links,
    bedTop: { x: HX + bedX, y: FLOOR + 0.6, z: HZ + bedZ },
    catBeds: [catBedA, catBedB].map((v) => toWorld(v.x, v.z).setY(FLOOR + 0.05)),
    rugSpot: toWorld(-1.9, 2.4),
    setLitter() { /* litter lives in the Cats' House now */ },
    /** show up to 15 cans on the pantry shelves */
    setFood(n) { cans.forEach((c, i) => (c.visible = i < Math.min(n, cans.length))); },
    cook(seconds = 3) { cooking = seconds; },
    fadePartitions, partitions,
    animate(dt, t) {
      cooking = Math.max(0, cooking - dt);
      const on = cooking > 0 ? Math.min(1, cooking) : 0;
      burnerMat.emissiveIntensity = on * 1.2;
      ovenGlow.emissiveIntensity = 0.15 + on * 0.6;
      lid.position.y = 0.25 + (on ? Math.abs(Math.sin(t * 18)) * 0.03 : 0);
      for (const p of steam) {
        const k = (t * 0.6 + p.userData.phase) % 1;
        p.position.set(-0.18 + Math.sin(k * 7 + p.userData.phase * 9) * 0.06, 1.2 + k * 0.7, -0.12);
        p.scale.setScalar(0.6 + k * 1.4);
        p.material.opacity = 0.65 * (1 - k) * on;
      }
      // the percolator steams gently when a fresh pot is ready
      for (const p of potSteam) {
        const k = (t * 0.45 + p.userData.phase) % 1;
        p.position.set(Math.sin(k * 6 + p.userData.phase * 7) * 0.03, 0.33 + k * 0.4, 0);
        p.scale.setScalar(0.6 + k * 1.3);
        p.material.opacity = 0.5 * (1 - k) * perking;
      }
      // the woodstove fire flickers
      const f = 0.8 + Math.sin(t * 11) * 0.12 + Math.sin(t * 23.7) * 0.08;
      fireMat.emissiveIntensity = 1.3 + f * 0.6; fireLight.intensity = 1.2 + f * 0.8;
    },
  };
}
