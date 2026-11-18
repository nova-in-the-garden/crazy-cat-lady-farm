// The Cats' House: the old red barn, now the cats' own home.
// Inside: a feeding station with a bowl per cat, litter boxes, a named little bed for every cat,
// a scratching post and a cat tree. Like the clinic and cottage, the roof and near walls fade
// when Granny steps inside.
import * as THREE from 'three';
import { mat, mesh, canvasTexture, drawPaw } from './util.js';
import { addBox, addCircle } from './collision.js';
import { fadeable, makeFader } from './building.js';

export const CATS_HOUSE = { x: 13, z: -7, w: 6.5, d: 6, h: 3.2 }; // center, width (x), depth (z), wall height
const DOOR = 1.8;                                                   // doorway in the west wall (faces the path)
const COL = { barn: '#e0726a', board: '#c9625b', roof: '#8c5f62', trim: '#fff6ec', inside: '#f6e3c8', floor: '#d9b48a', floorB: '#cfa77c', rug: '#f7c6d2' };
const BOWL_COLORS = ['#f4a3b5', '#9fd0ef', '#c8aaf2', '#9fe0b8', '#ffd76e', '#ff9f85'];
const BED_COLORS = ['#f7a8c4', '#9fd0ef', '#c8aaf2', '#ffd76e', '#9fe0b8', '#ff9f85'];

function signTex() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fff6ec'; ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 70); ctx.fill();
    ctx.strokeStyle = '#c95c74'; ctx.lineWidth = 12; ctx.stroke();
    drawPaw(ctx, 130, h / 2, 120, '#f4a3b5', -0.25); drawPaw(ctx, w - 130, h / 2, 120, '#f4a3b5', 0.25);
    ctx.fillStyle = '#8c4a5a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 120px Fredoka, "Trebuchet MS", sans-serif'; ctx.fillText("Cats' House", w / 2, h / 2 + 6);
  });
}
function plaqueTex(name, color) {
  return canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#fff6ec'; ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 26); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = '#5b4256'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const n = name || '(new friend)';
    ctx.font = `700 ${n.length > 9 ? 34 : 44}px Fredoka, "Trebuchet MS", sans-serif`; ctx.fillText(n, w / 2, h / 2 + 3);
  });
}

/** slots: how many cats can live here (one bowl and one bed each, one litter box per two). */
export function buildCatsHouse(scene, slots = 10) {
  const { x: CX, z: CZ, w: W, d: D, h: H } = CATS_HOUSE;
  const T = 0.22;
  const root = new THREE.Group(); root.position.set(CX, 0, CZ); scene.add(root);
  const toWorld = (x, z) => new THREE.Vector3(CX + x, 0, CZ + z);

  /* --- floor: warm wooden planks + a pink rug --- */
  const floorTex = canvasTexture(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? COL.floor : COL.floorB; ctx.fillRect(0, i * 32, w, 32); ctx.fillStyle = 'rgba(90,60,40,0.25)'; ctx.fillRect(0, i * 32, w, 2); ctx.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 2.5, D / 2.5);
  root.add(mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), { y: 0.02, rx: -Math.PI / 2, cast: false }));
  root.add(mesh(new THREE.CircleGeometry(1.2, 28), new THREE.MeshStandardMaterial({ color: COL.rug, roughness: 1, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), { x: -0.4, y: 0.03, z: 0.3, rx: -Math.PI / 2, sx: 1.3, cast: false }));
  // welcome mat outside the door
  root.add(mesh(new THREE.PlaneGeometry(0.8, 1.6), new THREE.MeshStandardMaterial({ color: '#f4a3b5', roughness: 1, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }), { x: -W / 2 - 0.6, y: 0.025, rx: -Math.PI / 2, cast: false }));

  /* --- walls (each its own fadeable group) --- */
  const walls = [];
  const red = mat(COL.barn), board = mat(COL.board), inner = mat(COL.inside), trim = mat(COL.trim);
  function piece(g, len, height, cx, cy) {
    g.add(mesh(new THREE.BoxGeometry(len, height, T * 0.55), red, { x: cx, y: cy, z: T * 0.22 }));
    g.add(mesh(new THREE.BoxGeometry(len, height, T * 0.45), inner, { x: cx, y: cy, z: -T * 0.27 }));
    for (let x = cx - len / 2 + 0.25; x < cx + len / 2 - 0.1; x += 0.5) g.add(mesh(new THREE.BoxGeometry(0.04, height, 0.03), board, { x, y: cy, z: T / 2 + 0.01, cast: false }));
    if (cy - height / 2 < 0.1) g.add(mesh(new THREE.BoxGeometry(len, 0.7, 0.03), mat('#e9c9a4'), { x: cx, y: 0.35, z: -T / 2 - 0.01, cast: false }));
  }
  function windowOn(g, x, y) {
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.85, 0.08), trim, { x, y, z: T / 2 + 0.03 }));
    g.add(mesh(new THREE.BoxGeometry(0.82, 0.68, 0.1), mat('#fff1c2', { emissive: '#ffd27a', emissiveIntensity: 0.5 }), { x, y, z: T / 2 + 0.04, cast: false }));
    g.add(mesh(new THREE.BoxGeometry(0.82, 0.68, 0.02), mat('#cfeefa', { emissive: '#bfe8ff', emissiveIntensity: 0.4 }), { x, y, z: -T / 2 - 0.01, cast: false }));
    // a little window box of flowers
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.16, 0.22), trim, { x, y: y - 0.52, z: T / 2 + 0.12 }));
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), mat(['#f7a8c4', '#ffd76e', '#c8aaf2', '#ffffff', '#ff9f85'][i]), { x: x - 0.36 + i * 0.18, y: y - 0.4, z: T / 2 + 0.14, cast: false }));
  }
  function makeWall(normal, pos, rotY, build) {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY; build(g); root.add(g);
    const f = fadeable(g); f.normal = normal; f.half = normal.x ? W / 2 : D / 2; walls.push(f);
  }
  // west wall (faces the path) with the doorway, sign and open barn doors; local +x = world +z
  makeWall(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-W / 2, 0, 0), -Math.PI / 2, (g) => {
    const side = (D - DOOR) / 2;
    piece(g, side, H, -(DOOR / 2 + side / 2), H / 2); piece(g, side, H, DOOR / 2 + side / 2, H / 2);
    piece(g, DOOR, H - 2.3, 0, 2.3 + (H - 2.3) / 2);
    [-1, 1].forEach((s) => g.add(mesh(new THREE.BoxGeometry(0.14, 2.35, T + 0.1), trim, { x: s * DOOR / 2, y: 1.17 })));
    g.add(mesh(new THREE.BoxGeometry(DOOR + 0.28, 0.14, T + 0.1), trim, { y: 2.35 }));
    // the two big barn doors, swung wide open against the wall (with their white X)
    [-1, 1].forEach((s) => {
      const leaf = new THREE.Group(); leaf.position.set(s * (DOOR / 2 + 0.47), 0, T / 2 + 0.08); g.add(leaf);
      leaf.add(mesh(new THREE.BoxGeometry(0.9, 2.2, 0.08), mat('#d0645d'), { y: 1.1 }));
      leaf.add(mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), trim, { y: 2.15 })); leaf.add(mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), trim, { y: 0.05 }));
      [-1, 1].forEach((d) => leaf.add(mesh(new THREE.BoxGeometry(0.07, 2.2, 0.1), trim, { y: 1.1, rz: d * 0.39 })));
    });
    // the sign
    g.add(mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.7, transparent: true }), { y: 2.75, z: T / 2 + 0.06, cast: false }));
    windowOn(g, -2.25, 1.55);
    windowOn(g, 2.25, 1.55);
  });
  makeWall(new THREE.Vector3(1, 0, 0), new THREE.Vector3(W / 2, 0, 0), Math.PI / 2, (g) => { piece(g, D + T, H, 0, H / 2); windowOn(g, 1.6, 1.7); });
  makeWall(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -D / 2), Math.PI, (g) => { piece(g, W, H, 0, H / 2); windowOn(g, 1.9, 1.75); });
  makeWall(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, D / 2), 0, (g) => { piece(g, W, H, 0, H / 2); windowOn(g, -1.2, 1.75); windowOn(g, 1.6, 1.75); });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => root.add(mesh(new THREE.BoxGeometry(0.22, H, 0.22), trim, { x: sx * W / 2, y: H / 2, z: sz * D / 2 })));
  // wall collisions (world)
  const side = (D - DOOR) / 2;
  addBox(CX - W / 2, CZ - (DOOR / 2 + side / 2), T + 0.05, side);
  addBox(CX - W / 2, CZ + (DOOR / 2 + side / 2), T + 0.05, side);
  addBox(CX + W / 2, CZ, T + 0.05, D);
  addBox(CX, CZ - D / 2, W, T + 0.05);
  addBox(CX, CZ + D / 2, W, T + 0.05);

  /* --- gambrel roof (ridge runs east-west, gables at the door and the back) --- */
  const roof = new THREE.Group(); roof.position.y = 0; roof.rotation.y = -Math.PI / 2; root.add(roof);
  const RW = D, RD = W; // roof local width spans world z, local depth spans world x
  const roofM = mat(COL.roof), lowA = 1.1, lowW = 1.35, upW = 1.9;
  const ux = RW / 2 - lowW * Math.cos(lowA) + 0.2;
  [-1, 1].forEach((s) => {
    roof.add(mesh(new THREE.BoxGeometry(lowW + 0.1, 0.15, RD + 0.6), roofM, { x: s * (RW / 2 - lowW * Math.cos(lowA) / 2 + 0.2), y: H + Math.sin(lowA) * lowW / 2, rz: -s * lowA }));
    roof.add(mesh(new THREE.BoxGeometry(upW, 0.15, RD + 0.6), roofM, { x: s * ux / 2, y: H + Math.sin(lowA) * lowW + 0.35, rz: -s * 0.36 }));
  });
  const gs = new THREE.Shape();
  gs.moveTo(-RW / 2, 0); gs.lineTo(RW / 2, 0); gs.lineTo(ux, Math.sin(lowA) * lowW); gs.lineTo(0, Math.sin(lowA) * lowW + 0.7); gs.lineTo(-ux, Math.sin(lowA) * lowW); gs.closePath();
  const gGeo = new THREE.ShapeGeometry(gs);
  [-1, 1].forEach((s) => roof.add(mesh(gGeo, red, { y: H, z: s * (RD / 2 + 0.01), ry: s > 0 ? 0 : Math.PI })));
  // hayloft window over the door, with a heart
  roof.add(mesh(new THREE.BoxGeometry(1.0, 0.8, 0.1), trim, { y: H + 0.6, z: RD / 2 + 0.03 }));
  const heart = canvasTexture(128, 128, (ctx) => { ctx.fillStyle = '#6b3f45'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#f4a3b5'; ctx.beginPath(); ctx.moveTo(64, 100); ctx.bezierCurveTo(-10, 50, 30, 0, 64, 38); ctx.bezierCurveTo(98, 0, 138, 50, 64, 100); ctx.fill(); });
  roof.add(mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshStandardMaterial({ map: heart, roughness: 0.8 }), { y: H + 0.6, z: RD / 2 + 0.09, cast: false }));
  // cat weathervane
  const vane = new THREE.Group(); vane.position.set(0, H + Math.sin(lowA) * lowW + 0.75, 0);
  const iron = mat('#5b4256');
  vane.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), iron, { y: 0.45 }));
  vane.add(mesh(new THREE.BoxGeometry(0.5, 0.18, 0.03), iron, { y: 0.85 }));
  vane.add(mesh(new THREE.SphereGeometry(0.11, 6, 5), iron, { x: 0.28, y: 0.95, sz: 0.3 }));
  [-1, 1].forEach((s) => vane.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 3), iron, { x: 0.28 + s * 0.06, y: 1.08, sz: 0.3 })));
  vane.add(mesh(new THREE.TorusGeometry(0.15, 0.025, 4, 8, Math.PI), iron, { x: -0.3, y: 1.0, rz: Math.PI / 2 }));
  roof.add(vane);
  const roofFade = fadeable(roof);

  /* --- interior --- */
  const inside = new THREE.Group(); root.add(inside);
  const lampY = H - 0.35;
  inside.add(mesh(new THREE.SphereGeometry(0.12, 10, 8), mat('#fff6d6', { emissive: '#ffe2a0', emissiveIntensity: 1.5 }), { y: lampY, cast: false }));
  inside.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, H - lampY, 4), iron, { y: (H + lampY) / 2, cast: false }));
  const light = new THREE.PointLight('#ffe0b8', 6, 9, 1.6); light.position.set(0, lampY - 0.2, 0); inside.add(light);
  // string of fairy lights along the back wall
  for (let i = 0; i < 11; i++) inside.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), mat(BOWL_COLORS[i % 6], { emissive: BOWL_COLORS[i % 6], emissiveIntensity: 0.9 }), { x: -W / 2 + 0.5 + i * 0.55, y: 2.55 - Math.sin((i / 10) * Math.PI) * 0.18, z: -D / 2 + 0.16, cast: false }));

  // Feeding station (north-east corner): food bin, scoop and a shelf with treat jars
  const feed = new THREE.Group(); feed.position.set(W / 2 - 0.55, 0, -D / 2 + 0.55); inside.add(feed);
  feed.add(mesh(new THREE.BoxGeometry(0.75, 0.85, 0.6), mat('#9fd6bf'), { y: 0.43 }));
  feed.add(mesh(new THREE.BoxGeometry(0.8, 0.08, 0.65), mat('#7fbfa6'), { y: 0.89 }));
  const fishTex = canvasTexture(128, 96, (ctx, w, h) => { ctx.fillStyle = '#fff6ec'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ef7f95'; ctx.beginPath(); ctx.ellipse(56, 48, 34, 20, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(86, 48); ctx.lineTo(116, 26); ctx.lineTo(116, 70); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(40, 42, 5, 0, 7); ctx.fill(); });
  feed.add(mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshStandardMaterial({ map: fishTex, roughness: 0.8 }), { x: -0.38, y: 0.5, ry: -Math.PI / 2, cast: false }));
  feed.add(mesh(new THREE.BoxGeometry(0.14, 0.04, 0.3), mat('#f7a8c4'), { x: 0.05, y: 0.95, ry: 0.5 })); // scoop
  [-0.22, 0.02, 0.24].forEach((x, i) => feed.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 10), mat(['#ffd76e', '#c8aaf2', '#9fd0ef'][i], { transparent: true, opacity: 0.85 }), { x, y: 1.55, z: -0.1 })));
  feed.add(mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), mat('#c1906a'), { y: 1.43, z: -0.1 }));
  addBox(CX + W / 2 - 0.55, CZ - D / 2 + 0.55, 0.8, 0.65);
  const feedPos = toWorld(W / 2 - 1.25, -D / 2 + 1.0);   // where she stands to serve food

  // Bowls: one per slot (up to 10 cats) on a long mat along the east wall
  const BOWL_Z0 = -D / 2 + 1.35, BOWL_DZ = 0.4;
  const bowls = Array.from({ length: slots }, (_, i) => {
    const z = BOWL_Z0 + i * BOWL_DZ, x = W / 2 - 0.4;
    const g = new THREE.Group(); g.position.set(x, 0, z); inside.add(g);
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.08, 14), mat(BOWL_COLORS[i % 6], { roughness: 0.5 }), { y: 0.04 }));
    const food = mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 12), mat('#b9784a'), { y: 0.075, cast: false }); food.visible = false; g.add(food);
    return { slot: i, pos: toWorld(x, z), eatPos: toWorld(x - 0.42, z), food };
  });
  inside.add(mesh(new THREE.BoxGeometry(0.5, 0.012, slots * BOWL_DZ + 0.2), mat('#f7c6d2'), { x: W / 2 - 0.4, y: 0.026, z: BOWL_Z0 + (slots - 1) * BOWL_DZ / 2, cast: false }));

  // Litter boxes along the south wall (one for every two cats), each visibly dirty or clean
  const nBoxes = Math.ceil(slots / 2);
  const litter = Array.from({ length: nBoxes }, (_, i) => {
    const x = W / 2 - 1.3 - i * 0.78, z = D / 2 - 0.42;
    const g = new THREE.Group(); g.position.set(x, 0, z); inside.add(g);
    g.add(mesh(new THREE.BoxGeometry(0.66, 0.18, 0.48), mat(['#9fd0ef', '#c8aaf2', '#9fe0b8'][i % 3]), { y: 0.09 }));
    const sand = mesh(new THREE.BoxGeometry(0.57, 0.02, 0.4), mat('#efe3c8'), { y: 0.17, cast: false }); g.add(sand);
    const clumps = [];
    for (let k = 0; k < 4; k++) { const m = mesh(new THREE.SphereGeometry(0.04, 6, 4), mat('#a88a6a'), { x: -0.2 + k * 0.13, y: 0.19, z: (k % 2 ? 0.08 : -0.09), cast: false }); m.visible = false; g.add(m); clumps.push(m); }
    const flies = mesh(new THREE.TorusGeometry(0.11, 0.012, 4, 12), mat('#bda98f', { transparent: true, opacity: 0.6 }), { y: 0.4, rx: Math.PI / 2, cast: false }); flies.visible = false; g.add(flies); // little stink swirl
    addBox(CX + x, CZ + z, 0.66, 0.48);
    return { pos: toWorld(x, z - 0.72), clumps, flies, sand };
  });

  // Cozy beds: five on the floor along the north side, five more up on a sturdy wall shelf (bunk style)
  const COLS = [-2.6, -1.6, -0.6, 0.4, 1.4];
  const shelfZ = -D / 2 + 0.42, floorZ = -D / 2 + 1.25, SHELF_Y = 0.86;
  const wood = mat('#c1906a'), woodDark = mat('#a8774f');
  inside.add(mesh(new THREE.BoxGeometry(5.0, 0.08, 0.66), wood, { x: -0.6, y: SHELF_Y - 0.05, z: shelfZ }));
  [-3.0, -1.1, 0.9, 1.8].forEach((x) => inside.add(mesh(new THREE.BoxGeometry(0.07, SHELF_Y - 0.08, 0.07), woodDark, { x, y: (SHELF_Y - 0.08) / 2, z: shelfZ + 0.26 })));
  inside.add(mesh(new THREE.BoxGeometry(0.42, 0.04, 1.1), wood, { x: 1.95, y: SHELF_Y * 0.5, z: shelfZ + 0.55, rx: -0.75, cast: false })); // little ramp up
  addBox(CX - 0.6, CZ + shelfZ, 5.0, 0.66);
  const beds = Array.from({ length: slots }, (_, i) => {
    const up = i >= 5, x = COLS[i % 5], z = up ? shelfZ : floorZ, y = up ? SHELF_Y : 0;
    const col = BED_COLORS[i % 6];
    const g = new THREE.Group(); g.position.set(x, y, z); inside.add(g);
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.33, 0.13, 18), mat(col), { y: 0.065 }));
    g.add(mesh(new THREE.TorusGeometry(0.31, 0.09, 8, 20), mat(col), { y: 0.15, rx: Math.PI / 2 }));
    g.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 16), mat('#fff6ec'), { y: 0.14, cast: false }));
    // name plaque: on the wall above shelf beds, on a little stake behind floor beds
    const plaque = mesh(new THREE.PlaneGeometry(0.62, 0.23), new THREE.MeshStandardMaterial({ map: plaqueTex('', col), roughness: 0.8 }), up ? { y: 0.62, z: -0.27, cast: false } : { y: 0.5, z: -0.36, rx: -0.2, cast: false });
    g.add(plaque);
    g.add(mesh(new THREE.BoxGeometry(0.66, 0.27, 0.02), wood, up ? { y: 0.62, z: -0.285, cast: false } : { y: 0.5, z: -0.375, rx: -0.2, cast: false }));
    if (!up) g.add(mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), woodDark, { y: 0.2, z: -0.4, cast: false }));
    return { slot: i, pos: toWorld(x, up ? floorZ + 0.45 : z), spot: new THREE.Vector3(CX + x, y + 0.17, CZ + z), plaque, color: col, name: '' };
  });

  // Scratching post (south side) and a two-level cat tree (south-west corner)
  const post = new THREE.Group(); post.position.set(-W / 2 + 1.42, 0, D / 2 - 0.42); inside.add(post);
  post.add(mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.08, 12), mat('#c8aaf2'), { y: 0.04 }));
  post.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), mat('#ead6aa'), { y: 0.55 }));
  for (let k = 0; k < 6; k++) post.add(mesh(new THREE.TorusGeometry(0.095, 0.012, 4, 10), mat('#d9c08c'), { y: 0.15 + k * 0.15, rx: Math.PI / 2, cast: false }));
  post.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#f58fa8'), { x: 0.12, y: 0.82 })); // dangling pom-pom
  addCircle(CX - W / 2 + 1.42, CZ + D / 2 - 0.42, 0.26);
  const tree = new THREE.Group(); tree.position.set(-W / 2 + 0.55, 0, D / 2 - 0.6); inside.add(tree);
  tree.add(mesh(new THREE.BoxGeometry(0.75, 0.08, 0.75), mat('#c1906a'), { y: 0.04 }));
  tree.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), mat('#ead6aa'), { y: 0.95 }));
  tree.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), mat('#ead6aa'), { x: 0.25, y: 0.55, z: -0.2 }));
  tree.add(mesh(new THREE.BoxGeometry(0.6, 0.07, 0.55), mat('#f7c6d2'), { x: 0.1, y: 1.05, z: -0.1 }));
  tree.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14), mat('#9fd0ef'), { y: 1.86 }));
  tree.add(mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 14), mat('#9fd0ef'), { y: 1.92, rx: Math.PI / 2 }));
  tree.add(mesh(new THREE.SphereGeometry(0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#c8aaf2'), { y: 0.1, x: 0.05, z: 0.15, sy: 0.9 })); // little hidey dome
  addCircle(CX - W / 2 + 0.55, CZ + D / 2 - 0.6, 0.4);
  // perch spots on the cat tree (for napping)
  const perches = [new THREE.Vector3(CX - W / 2 + 0.55, 1.95, CZ + D / 2 - 0.6), new THREE.Vector3(CX - W / 2 + 0.65, 1.12, CZ + D / 2 - 0.7)];
  // a basket of toys
  const toyB = new THREE.Group(); toyB.position.set(-0.4, 0, 0.6); inside.add(toyB);
  toyB.add(mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.25, 12, 1, true), mat('#c89466', { side: THREE.DoubleSide }), { y: 0.13 }));
  [['#f58fa8', 0.06, 0.25, 0], ['#9fd0ef', -0.08, 0.26, 0.05], ['#ffd76e', 0.02, 0.27, -0.08]].forEach(([c, x, y, z]) => toyB.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(c), { x, y, z })));
  addCircle(CX - 0.4, CZ + 0.6, 0.28);

  /* --- fading --- */
  const isInside = (x, z) => Math.abs(x - CX) < W / 2 && Math.abs(z - CZ) < D / 2;
  const fader = makeFader({ cx: CX, cz: CZ, walls, roofs: [roofFade] });
  let flyT = 0;
  return {
    isInside, feedPos, bowls, litter, beds, perches, center: new THREE.Vector3(CX, 0, CZ),
    door: { out: [CX - W / 2 - 1.0, CZ], in: [CX - W / 2 + 1.0, CZ] },
    update(dt, ladyPos, camera) {
      fader(dt, ladyPos && isInside(ladyPos.x, ladyPos.z), camera);
      flyT += dt; litter.forEach((b, i) => { if (b.flies.visible) { b.flies.rotation.z = flyT * 2 + i; b.flies.position.y = 0.4 + Math.sin(flyT * 3 + i) * 0.04; } });
    },
    /** levels: 0 (fresh) .. 1 (needs scooping), one per box */
    setLitter(levels) { litter.forEach((b, i) => { const v = levels[i] || 0; b.clumps.forEach((c, k) => (c.visible = v > 0.15 + k * 0.17)); b.flies.visible = v > 0.75; b.sand.material.color.set(v > 0.6 ? '#ddd0b0' : '#efe3c8'); }); },
    setBowl(slot, full) { const b = bowls[slot]; if (b) b.food.visible = !!full; },
    setBedName(slot, name) {
      const b = beds[slot]; if (!b || b.name === (name || '')) return;
      b.name = name || ''; b.plaque.material.map.dispose(); b.plaque.material.map = plaqueTex(b.name, b.color); b.plaque.material.needsUpdate = true;
    },
  };
}
