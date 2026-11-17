// Whisker Wellness Animal Hospital: the sanctuary's vet clinic, where sick cats will go.
// The building is enterable. When the Crazy Cat Lady steps inside, the roof and any wall
// between her and the camera fade away so you can see the room.
import * as THREE from 'three';
import { mulberry32, mat, mesh, canvasTexture, drawPaw } from './util.js';
import { addBox, addCircle } from './collision.js';
import { fadeable, setOpacity, makeFader } from './building.js';

export const CLINIC = { x: -12, z: -9.5, w: 8, d: 7, h: 3 }; // center, width (x), depth (z), wall height

const COL = {
  wall: '#e3f5ee', wallInside: '#fff8ee', wainscot: '#f7c6d2', trim: '#ffffff', roof: '#6fc2bd', roofDark: '#57a9a5',
  door: '#f4a3b5', floorA: '#d9f0e8', floorB: '#fff6ea', steel: '#d7dde3', cross: '#ef7f95',
};

/** Paw + heart badge used on the signs. */
function drawBadge(ctx, x, y, r) {
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COL.cross; ctx.lineWidth = r * 0.12; ctx.stroke();
  // heart
  ctx.fillStyle = COL.cross; ctx.beginPath();
  const s = r * 0.62;
  ctx.moveTo(x, y + s * 0.75);
  ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.0, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.3, y - s * 0.1, x, y + s * 0.75);
  ctx.fill();
  drawPaw(ctx, x, y - s * 0.05, s * 0.55, '#ffffff');
}

function clinicSignTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 60); ctx.fill();
    ctx.strokeStyle = COL.roof; ctx.lineWidth = 12; ctx.stroke();
    drawBadge(ctx, 128, h / 2, 88);
    ctx.fillStyle = '#4f8f8b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '700 84px Fredoka, "Trebuchet MS", sans-serif'; ctx.fillText('Whisker Wellness', 240, h * 0.38);
    ctx.fillStyle = '#d0607c'; ctx.font = '600 56px Fredoka, "Trebuchet MS", sans-serif'; ctx.fillText('Animal Hospital', 244, h * 0.72);
  });
}

function posterTexture(kind) {
  return canvasTexture(256, 340, (ctx, w, h) => {
    ctx.fillStyle = kind === 'paws' ? '#fff3c9' : '#e2f3ff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.textAlign = 'center'; ctx.fillStyle = '#5b4256';
    if (kind === 'paws') {
      ctx.font = '700 40px Fredoka, sans-serif'; ctx.fillText('Wash your', w / 2, 62); ctx.fillText('paws!', w / 2, 106);
      drawPaw(ctx, 90, 190, 70, '#f4a3b5', -0.3); drawPaw(ctx, 170, 250, 70, '#9fd0ef', 0.3);
      ctx.font = '600 24px Fredoka, sans-serif'; ctx.fillText('(both of you)', w / 2, 318);
    } else {
      // a cute cat chart
      ctx.font = '700 34px Fredoka, sans-serif'; ctx.fillText('Know Your Cat', w / 2, 52);
      ctx.fillStyle = '#f5b16b';
      ctx.beginPath(); ctx.ellipse(128, 220, 70, 55, 0, 0, Math.PI * 2); ctx.fill();          // body
      ctx.beginPath(); ctx.arc(128, 140, 45, 0, Math.PI * 2); ctx.fill();                    // head
      [[-1], [1]].forEach(([s]) => { ctx.beginPath(); ctx.moveTo(128 + s * 40, 120); ctx.lineTo(128 + s * 30, 82); ctx.lineTo(128 + s * 10, 104); ctx.fill(); });
      ctx.strokeStyle = '#f5b16b'; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(195, 240); ctx.quadraticCurveTo(240, 200, 220, 160); ctx.stroke(); // tail
      ctx.fillStyle = '#5b4256'; [[-16], [16]].forEach(([dx]) => { ctx.beginPath(); ctx.arc(128 + dx, 138, 5, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#d0607c'; ctx.beginPath(); ctx.arc(150, 215, 13, 0, 7); ctx.fill();   // heart spot
      ctx.font = '600 20px Fredoka, sans-serif'; ctx.fillStyle = '#5b4256';
      ctx.fillText('heart: very big', 128, 300); ctx.fillText('purr: healing', 128, 324);
    }
  });
}

export function buildClinic(scene) {
  const { x: CX, z: CZ, w: W, d: D, h: H } = CLINIC;
  const T = 0.22; // wall thickness
  const root = new THREE.Group(); root.position.set(CX, 0, CZ); scene.add(root);
  const rand = mulberry32(404);

  /* --- Floor (checkered tiles) + low stone footing --- */
  const floorTex = canvasTexture(256, 256, (ctx, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = (x + y) % 2 ? COL.floorA : COL.floorB; ctx.fillRect(x * 64, y * 64, 64, 64); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 2, D / 2);
  root.add(mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), {
    y: 0.02, rx: -Math.PI / 2, cast: false,
  }));
  // welcome mat at the door, outside
  root.add(mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ color: '#f4a3b5', roughness: 1, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }), {
    y: 0.025, z: D / 2 + 0.6, rx: -Math.PI / 2, cast: false,
  }));

  /* --- Walls: each is a group (outer mint skin + inner cream skin + details) so it can fade --- */
  const walls = [];
  function wallPiece(group, len, height, cx, cy, thick = T) {
    group.add(mesh(new THREE.BoxGeometry(len, height, thick * 0.55), mat(COL.wall), { x: cx, y: cy, z: thick * 0.22 }));
    group.add(mesh(new THREE.BoxGeometry(len, height, thick * 0.45), mat(COL.wallInside, { flatShading: false }), { x: cx, y: cy, z: -thick * 0.27 }));
    if (cy - height / 2 < 0.1) { // pink wainscot stripe inside + white base outside
      group.add(mesh(new THREE.BoxGeometry(len, 0.9, 0.03), mat(COL.wainscot), { x: cx, y: 0.45, z: -thick / 2 - 0.01, cast: false }));
      group.add(mesh(new THREE.BoxGeometry(len, 0.08, 0.05), mat(COL.trim), { x: cx, y: 0.92, z: -thick / 2 - 0.02, cast: false }));
      group.add(mesh(new THREE.BoxGeometry(len, 0.3, 0.05), mat('#cfe7df'), { x: cx, y: 0.15, z: thick / 2 + 0.02, cast: false }));
    }
  }
  function windowOn(group, x, y, w = 1.2, h = 1.0) {
    // frame and warm glowing glass on the outside face
    group.add(mesh(new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.08), mat(COL.trim), { x, y, z: T / 2 + 0.03 }));
    group.add(mesh(new THREE.BoxGeometry(w, h, 0.1), mat('#fff1c2', { emissive: '#ffd27a', emissiveIntensity: 0.5 }), { x, y, z: T / 2 + 0.04, cast: false }));
    group.add(mesh(new THREE.BoxGeometry(0.05, h, 0.12), mat(COL.trim), { x, y, z: T / 2 + 0.05, cast: false }));
    group.add(mesh(new THREE.BoxGeometry(w, 0.05, 0.12), mat(COL.trim), { x, y, z: T / 2 + 0.05, cast: false }));
    // little pink awning
    group.add(mesh(new THREE.BoxGeometry(w + 0.3, 0.06, 0.45), mat(COL.door), { x, y: y + h / 2 + 0.2, z: T / 2 + 0.2, rx: 0.35 }));
    // window glass also seen from inside
    group.add(mesh(new THREE.BoxGeometry(w, h, 0.02), mat('#cfeefa', { emissive: '#bfe8ff', emissiveIntensity: 0.4 }), { x, y, z: -T / 2 - 0.01, cast: false }));
  }
  function makeWall(len, normal, pos, rotY, build) {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY;
    build(g, len);
    root.add(g);
    const f = fadeable(g); f.normal = normal; walls.push(f);
    return g;
  }
  const DOOR = 1.8;
  // Front wall (+z) with the doorway, sign and windows
  makeWall(W, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, D / 2), 0, (g) => {
    const side = (W - DOOR) / 2;
    wallPiece(g, side, H, -(DOOR / 2 + side / 2), H / 2);
    wallPiece(g, side, H, DOOR / 2 + side / 2, H / 2);
    wallPiece(g, DOOR, H - 2.3, 0, 2.3 + (H - 2.3) / 2);
    // door frame + pink door swung open
    [-1, 1].forEach((s) => g.add(mesh(new THREE.BoxGeometry(0.14, 2.35, T + 0.1), mat(COL.trim), { x: s * DOOR / 2, y: 1.17 })));
    g.add(mesh(new THREE.BoxGeometry(DOOR + 0.28, 0.14, T + 0.1), mat(COL.trim), { y: 2.35 }));
    const door = mesh(new THREE.BoxGeometry(0.85, 2.2, 0.08), mat(COL.door), { x: 0.42, y: 1.1 });
    const hinge = new THREE.Group(); hinge.position.set(-DOOR / 2 + 0.06, 0, -0.05); hinge.rotation.y = -1.9; hinge.add(door);
    door.add(mesh(new THREE.CircleGeometry(0.17, 14), mat('#fff1c2', { emissive: '#ffd27a', emissiveIntensity: 0.3 }), { y: 0.45, z: 0.045, cast: false }));
    g.add(hinge);
    windowOn(g, -2.55, 1.55);
    windowOn(g, 2.55, 1.55);
    // big sign above the door
    const sign = mesh(new THREE.PlaneGeometry(3.1, 0.78), new THREE.MeshStandardMaterial({ map: clinicSignTexture(), roughness: 0.7, transparent: true }), { y: 2.78, z: 0.32, cast: false });
    g.add(sign);
    // "NOW OPEN" hanging tag on the door frame
    const tag = canvasTexture(256, 96, (ctx, w, h) => {
      ctx.fillStyle = '#fff6e8'; ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 20); ctx.fill();
      ctx.fillStyle = '#d0607c'; ctx.font = '700 40px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NOW OPEN', w / 2, h / 2 + 2);
    });
    g.add(mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.8 }), { x: DOOR / 2 + 0.5, y: 1.55, z: T / 2 + 0.06, cast: false }));
  });
  // Back wall (-z)
  makeWall(W, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -D / 2), Math.PI, (g) => {
    wallPiece(g, W, H, 0, H / 2); windowOn(g, -2.2, 1.7); windowOn(g, 2.2, 1.7);
  });
  // Side walls
  makeWall(D, new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-W / 2, 0, 0), -Math.PI / 2, (g) => {
    wallPiece(g, D + T, H, 0, H / 2); windowOn(g, 0.8, 1.6, 1.6, 1.0);
  });
  makeWall(D, new THREE.Vector3(1, 0, 0), new THREE.Vector3(W / 2, 0, 0), Math.PI / 2, (g) => {
    wallPiece(g, D + T, H, 0, H / 2); windowOn(g, -0.6, 1.6, 1.6, 1.0);
  });
  // wall collisions (world space)
  const side = (W - DOOR) / 2;
  addBox(CX - (DOOR / 2 + side / 2), CZ + D / 2, side, T + 0.05);
  addBox(CX + (DOOR / 2 + side / 2), CZ + D / 2, side, T + 0.05);
  addBox(CX, CZ - D / 2, W, T + 0.05);
  addBox(CX - W / 2, CZ, T + 0.05, D);
  addBox(CX + W / 2, CZ, T + 0.05, D);

  /* --- Roof: soft teal hip roof with a heart-cross badge on top --- */
  const roof = new THREE.Group(); roof.position.y = H; root.add(roof);
  const cone = new THREE.ConeGeometry(1, 1, 4, 1); cone.rotateY(Math.PI / 4);
  roof.add(mesh(cone, mat(COL.roof), { y: 0.95, sx: (W + 1) * 0.7071, sy: 1.9, sz: (D + 1) * 0.7071 }));
  roof.add(mesh(new THREE.BoxGeometry(W + 0.5, 0.18, D + 0.5), mat(COL.roofDark), { y: 0.02 })); // eaves
  roof.add(mesh(new THREE.BoxGeometry(W + 0.2, 0.25, D + 0.2), mat(COL.trim), { y: -0.1 }));       // white fascia band
  const badgeTex = canvasTexture(256, 256, (ctx) => drawBadge(ctx, 128, 128, 120));
  [1, -1].forEach((s) => roof.add(mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.7, transparent: true }), {
    y: 2.4, z: s * 0.04, ry: s > 0 ? 0 : Math.PI, cast: false,
  })));
  roof.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), mat(COL.trim), { y: 1.9 }));
  const roofFade = fadeable(roof);

  /* --- Interior --- */
  const steel = mat(COL.steel, { metalness: 0.5, roughness: 0.35 });
  const inside = new THREE.Group(); root.add(inside);
  // Exam table (center-left)
  const exam = new THREE.Group(); exam.position.set(-1.6, 0, -0.9); inside.add(exam);
  exam.add(mesh(new THREE.BoxGeometry(1.5, 0.08, 0.85), steel, { y: 0.85 }));
  exam.add(mesh(new THREE.BoxGeometry(1.3, 0.05, 0.7), mat('#bfe8df'), { y: 0.91 })); // soft mint pad
  exam.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 8), steel, { y: 0.4 }));
  exam.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 10), steel, { y: 0.03 }));
  exam.add(mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), mat('#9fd0ef'), { x: 0.4, y: 0.96, rx: Math.PI / 2 })); // stethoscope
  exam.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), steel, { x: 0.55, y: 0.95, z: 0.1 }));
  addBox(CX - 1.6, CZ - 0.9, 1.5, 0.85);
  // Cat scale with a dial
  const scale = new THREE.Group(); scale.position.set(-3.1, 0, 0.6); inside.add(scale);
  scale.add(mesh(new THREE.BoxGeometry(0.8, 0.12, 0.6), mat('#ffffff'), { y: 0.06 }));
  scale.add(mesh(new THREE.BoxGeometry(0.7, 0.03, 0.5), mat('#f7c6d2'), { y: 0.13 }));
  scale.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), steel, { x: -0.3, y: 0.45, z: -0.25 }));
  const dialTex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(64, 64, 60, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d0607c'; ctx.lineWidth = 6; ctx.stroke();
    for (let i = 0; i < 10; i++) { const a = i * 0.6 - 2.7; ctx.fillStyle = '#5b4256'; ctx.fillRect(64 + Math.cos(a) * 42 - 2, 64 + Math.sin(a) * 42 - 2, 5, 5); }
    ctx.strokeStyle = '#d0607c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(90, 40); ctx.stroke();
  });
  scale.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 16), [mat('#ffffff'), new THREE.MeshStandardMaterial({ map: dialTex }), mat('#ffffff')], { x: -0.3, y: 0.85, z: -0.25, rx: Math.PI / 2 }));
  addBox(CX - 3.1, CZ + 0.6, 0.8, 0.6);
  // IV stand next to the table
  const iv = new THREE.Group(); iv.position.set(-0.5, 0, -1.5); inside.add(iv);
  iv.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6), steel, { y: 0.95 }));
  [0, 1, 2, 3].forEach((i) => iv.add(mesh(new THREE.BoxGeometry(0.4, 0.03, 0.04), steel, { y: 0.03, ry: i * Math.PI / 4 })));
  iv.add(mesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), steel, { y: 1.88 }));
  iv.add(mesh(new THREE.CapsuleGeometry(0.08, 0.16, 4, 8), mat('#bfe8ff', { transparent: true, opacity: 0.8 }), { x: 0.15, y: 1.65 }));
  iv.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.8, 4), mat('#e8f6ff'), { x: 0.15, y: 1.15, cast: false }));
  addCircle(CX - 0.5, CZ - 1.5, 0.22);
  // Medicine cabinet (back wall) full of colorful bottles
  const cab = new THREE.Group(); cab.position.set(1.0, 0, -D / 2 + 0.38); inside.add(cab);
  cab.add(mesh(new THREE.BoxGeometry(2.0, 2.3, 0.06), mat('#e7f4f8'), { y: 1.15, z: -0.22 }));            // back panel
  [-1, 1].forEach((sd) => cab.add(mesh(new THREE.BoxGeometry(0.07, 2.3, 0.5), mat('#ffffff'), { x: sd * 0.965, y: 1.15 })));
  cab.add(mesh(new THREE.BoxGeometry(2.0, 0.08, 0.5), mat('#ffffff'), { y: 2.26 }));
  cab.add(mesh(new THREE.BoxGeometry(2.0, 0.12, 0.5), mat('#ffffff'), { y: 0.06 }));
  const bottleCols = ['#f58fa8', '#9fd0ef', '#ffd76e', '#a6e3b8', '#c8aaf2', '#ff9f85'];
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = 0.25 + shelf * 0.52;
    cab.add(mesh(new THREE.BoxGeometry(1.86, 0.04, 0.42), mat('#ffffff'), { y, z: 0.05, cast: false }));
    for (let b = 0; b < 7; b++) {
      const c = bottleCols[Math.floor(rand() * bottleCols.length)];
      const tall = 0.18 + rand() * 0.14, bx = -0.78 + b * 0.26;
      if (rand() < 0.75) {
        cab.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, tall, 8), mat(c, { roughness: 0.3, flatShading: false }), { x: bx, y: y + tall / 2 + 0.02, z: 0.08, cast: false }));
        cab.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), mat('#ffffff'), { x: bx, y: y + tall + 0.045, z: 0.08, cast: false }));
      } else {
        cab.add(mesh(new THREE.BoxGeometry(0.18, 0.13, 0.2), mat(c), { x: bx, y: y + 0.085, z: 0.08, cast: false })); // pill box
      }
    }
  }
  // red-cross badge on top of the cabinet
  cab.add(mesh(new THREE.BoxGeometry(0.34, 0.1, 0.06), mat(COL.cross), { y: 2.45, z: 0.1 }));
  cab.add(mesh(new THREE.BoxGeometry(0.1, 0.34, 0.06), mat(COL.cross), { y: 2.45, z: 0.1 }));
  addBox(CX + 1.0, CZ - D / 2 + 0.38, 2.0, 0.55);
  // Recovery kennels along the right wall (2 x 2), each with a cozy blanket
  const kennels = new THREE.Group(); kennels.position.set(W / 2 - 0.55, 0, -1.4); kennels.rotation.y = -Math.PI / 2; inside.add(kennels);
  const blankets = ['#f7a8c4', '#9fd0ef', '#ffd76e', '#c8aaf2'];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const k = new THREE.Group(); k.position.set(-0.5 + c * 1.0, r * 0.8, 0); kennels.add(k);
    k.add(mesh(new THREE.BoxGeometry(0.95, 0.06, 0.8), mat('#ffffff'), { y: 0.03 }));
    k.add(mesh(new THREE.BoxGeometry(0.95, 0.06, 0.8), mat('#ffffff'), { y: 0.75 }));
    k.add(mesh(new THREE.BoxGeometry(0.06, 0.75, 0.8), mat('#ffffff'), { x: -0.45, y: 0.39 }));
    k.add(mesh(new THREE.BoxGeometry(0.06, 0.75, 0.8), mat('#ffffff'), { x: 0.45, y: 0.39 }));
    k.add(mesh(new THREE.BoxGeometry(0.95, 0.75, 0.04), mat('#eaf2f2'), { y: 0.39, z: -0.38 }));
    for (let b = 0; b < 6; b++) k.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.68, 4), steel, { x: -0.36 + b * 0.145, y: 0.39, z: 0.39, cast: false }));
    k.add(mesh(new THREE.BoxGeometry(0.75, 0.08, 0.6), mat(blankets[r * 2 + c]), { y: 0.1, z: -0.02, rz: 0.05 }));
    k.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(blankets[(r * 2 + c + 1) % 4]), { x: -0.2, y: 0.16, sy: 0.5 })); // pillow
    // name card
    k.add(mesh(new THREE.BoxGeometry(0.22, 0.12, 0.01), mat('#fff6e8'), { x: 0.25, y: 0.62, z: 0.41, cast: false }));
  }
  addBox(CX + W / 2 - 0.55, CZ - 1.4, 0.85, 2.0);
  // Reception desk near the door (right) with computer, clipboard and treat jar
  const desk = new THREE.Group(); desk.position.set(2.2, 0, 1.75); inside.add(desk);
  desk.add(mesh(new THREE.BoxGeometry(1.8, 0.9, 0.7), mat('#f7c6d2'), { y: 0.45 }));
  desk.add(mesh(new THREE.BoxGeometry(1.95, 0.07, 0.8), mat('#ffffff'), { y: 0.93 }));
  for (let i = 0; i < 3; i++) desk.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#ffffff'), { x: -0.6 + i * 0.6, y: 0.5, z: 0.36, sz: 0.3, cast: false }));
  desk.add(mesh(new THREE.BoxGeometry(0.55, 0.38, 0.05), mat('#6b7280'), { x: -0.35, y: 1.25, z: -0.15 }));
  desk.add(mesh(new THREE.BoxGeometry(0.48, 0.3, 0.02), mat('#bfe8ff', { emissive: '#9fd8ff', emissiveIntensity: 0.6 }), { x: -0.35, y: 1.25, z: -0.12, cast: false }));
  desk.add(mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), mat('#6b7280'), { x: -0.35, y: 1.04, z: -0.17 }));
  desk.add(mesh(new THREE.BoxGeometry(0.4, 0.02, 0.15), mat('#ffffff'), { x: -0.35, y: 0.97, z: 0.12, cast: false })); // keyboard
  desk.add(mesh(new THREE.BoxGeometry(0.26, 0.02, 0.34), mat(PALETTE_WOOD), { x: 0.35, y: 0.97, z: 0.05, ry: 0.2, cast: false })); // clipboard
  desk.add(mesh(new THREE.BoxGeometry(0.22, 0.01, 0.28), mat('#ffffff'), { x: 0.35, y: 0.985, z: 0.06, ry: 0.2, cast: false }));
  desk.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 10), mat('#e8f6ff', { transparent: true, opacity: 0.6 }), { x: 0.75, y: 1.07, z: -0.1 })); // treat jar
  desk.add(mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 10), mat(COL.cross), { x: 0.75, y: 1.2, z: -0.1 }));
  desk.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), mat('#c99a6b'), { x: 0.75, y: 1.0, z: -0.1, cast: false }));
  // desk stool
  desk.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10), mat('#9fd0ef'), { y: 0.6, z: -0.65 }));
  desk.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), steel, { y: 0.3, z: -0.65 }));
  addBox(CX + 2.2, CZ + 1.75, 1.95, 0.8);
  addCircle(CX + 2.2, CZ + 1.1, 0.22);
  // Cat beds with little blankets (front-left corner)
  [[-3.1, 2.4, '#f7a8c4', '#fff3c9'], [-2.1, 2.7, '#c8aaf2', '#e2f3ff']].forEach(([x, z, c, b]) => {
    inside.add(mesh(new THREE.TorusGeometry(0.3, 0.12, 8, 16), mat(c, { flatShading: false }), { x, y: 0.12, z, rx: Math.PI / 2 }));
    inside.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 14), mat(b), { x, y: 0.06, z }));
    inside.add(mesh(new THREE.BoxGeometry(0.35, 0.04, 0.25), mat(c), { x: x + 0.05, y: 0.12, z: z + 0.05, ry: 0.5, cast: false }));
  });
  addCircle(CX - 3.1, CZ + 2.4, 0.4); addCircle(CX - 2.1, CZ + 2.7, 0.4);
  // potted plant in the back-left corner
  inside.add(mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.35, 10), mat('#f4a3b5'), { x: -3.4, y: 0.18, z: -2.9 }));
  inside.add(mesh(new THREE.IcosahedronGeometry(0.35, 1), mat('#7fc67c'), { x: -3.4, y: 0.65, z: -2.9 }));
  addCircle(CX - 3.4, CZ - 2.9, 0.3);
  // Posters (on the inner faces of the left and back walls)
  inside.add(mesh(new THREE.PlaneGeometry(0.75, 1.0), new THREE.MeshStandardMaterial({ map: posterTexture('paws'), roughness: 0.9 }), { x: -W / 2 + T / 2 + 0.02, y: 1.75, z: -1.8, ry: Math.PI / 2, cast: false }));
  inside.add(mesh(new THREE.PlaneGeometry(0.75, 1.0), new THREE.MeshStandardMaterial({ map: posterTexture('cat'), roughness: 0.9 }), { x: -1.0, y: 1.85, z: -D / 2 + T / 2 + 0.02, cast: false }));
  // ceiling lamp + warm light
  const lampY = H - 0.35;
  inside.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), mat('#888888'), { y: lampY + 0.18, cast: false }));
  inside.add(mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ffd6e0', { side: THREE.DoubleSide }), { y: lampY, cast: false }));
  inside.add(mesh(new THREE.SphereGeometry(0.12, 10, 8), mat('#fff6d6', { emissive: '#ffe2a0', emissiveIntensity: 1.5 }), { y: lampY - 0.05, cast: false }));
  const light = new THREE.PointLight('#ffe0b8', 6, 9, 1.6); light.position.set(0, lampY - 0.2, 0); inside.add(light);

  /* --- Outside: path end, sign post, planters, benches, cat ambulance --- */
  const out = new THREE.Group(); root.add(out);
  const wood = mat('#8f6446');
  // planters either side of the door
  [-1, 1].forEach((s) => {
    out.add(mesh(new THREE.BoxGeometry(0.75, 0.45, 0.55), mat('#ffffff'), { x: s * 1.55, y: 0.22, z: D / 2 + 0.55 }));
    out.add(mesh(new THREE.BoxGeometry(0.66, 0.05, 0.46), mat('#9c6b4b'), { x: s * 1.55, y: 0.45, z: D / 2 + 0.55, cast: false }));
    for (let i = 0; i < 5; i++) out.add(mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(['#f7a8c4', '#ffd76e', '#c8aaf2', '#ffffff', '#ff9f85'][i]), { x: s * 1.55 - 0.24 + i * 0.12, y: 0.55 + (i % 2) * 0.05, z: D / 2 + 0.55 + (i % 2 ? 0.08 : -0.08), cast: false }));
    addBox(CX + s * 1.55, CZ + D / 2 + 0.55, 0.75, 0.55);
  });
  // benches out front
  const bench = (bx, bz, ry) => {
    const b = new THREE.Group(); b.position.set(bx, 0, bz); b.rotation.y = ry; out.add(b);
    b.add(mesh(new THREE.BoxGeometry(1.5, 0.08, 0.45), mat('#c1906a'), { y: 0.45 }));
    b.add(mesh(new THREE.BoxGeometry(1.5, 0.35, 0.06), mat('#c1906a'), { y: 0.75, z: -0.2, rx: -0.12 }));
    [-0.6, 0.6].forEach((x) => b.add(mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), mat('#6aae9f'), { x, y: 0.22 })));
    b.add(mesh(new THREE.BoxGeometry(0.4, 0.1, 0.35), mat('#f7c6d2'), { x: 0.35, y: 0.53 })); // cushion
  };
  bench(-3.2, D / 2 + 1.4, 0.15); addBox(CX - 3.2, CZ + D / 2 + 1.4, 1.5, 0.5);
  // Cat ambulance wagon: a white cart with a pink cross, big wheels and a handle
  const amb = new THREE.Group(); amb.position.set(W / 2 + 1.3, 0, 1.8); amb.rotation.y = -0.4; out.add(amb);
  amb.add(mesh(new THREE.BoxGeometry(1.5, 0.75, 0.95), mat('#ffffff'), { y: 0.75 }));
  amb.add(mesh(new THREE.BoxGeometry(1.55, 0.12, 1.0), mat(COL.cross), { y: 0.45 }));
  amb.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 12, 1, false, 0, Math.PI), mat('#bfe8df'), { y: 1.12, rz: Math.PI / 2, ry: Math.PI / 2, sx: 1, sz: 1 })); // canopy
  [-1, 1].forEach((s) => {
    amb.add(mesh(new THREE.BoxGeometry(0.4, 0.12, 0.02), mat(COL.cross), { y: 0.8, z: s * 0.485, cast: false }));
    amb.add(mesh(new THREE.BoxGeometry(0.12, 0.4, 0.02), mat(COL.cross), { y: 0.8, z: s * 0.485, cast: false }));
    [-0.45, 0.45].forEach((x) => {
      amb.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 14), mat('#5b4256'), { x, y: 0.26, z: s * 0.52, rx: Math.PI / 2 }));
      amb.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 10), mat('#ffd76e'), { x, y: 0.26, z: s * 0.53, rx: Math.PI / 2, cast: false }));
    });
  });
  amb.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), wood, { x: 1.15, y: 0.75, rz: 1.1 }));
  amb.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), mat(COL.cross), { x: 1.55, y: 0.95, rx: Math.PI / 2 }));
  amb.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), mat('#ff9f85', { emissive: '#ff6f61', emissiveIntensity: 0.5 }), { x: 0.3, y: 1.64 })); // siren light
  addCircle(CX + W / 2 + 1.3, CZ + 1.8, 1.0);
  // Sign post by the path
  const post = new THREE.Group(); post.position.set(W / 2 + 0.9, 0, D / 2 + 2.6); out.add(post);
  post.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.9, 6), wood, { y: 0.95 }));
  const arrowTex = (pointLeft) => canvasTexture(512, 160, (ctx, w, h) => {
    ctx.save();
    if (pointLeft) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(w - 70, 10); ctx.lineTo(w - 6, h / 2); ctx.lineTo(w - 70, h - 10); ctx.lineTo(10, h - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = COL.roof; ctx.lineWidth = 8; ctx.stroke();
    ctx.restore();
    const x0 = pointLeft ? 80 : 20;
    drawBadge(ctx, x0 + 50, h / 2, 48);
    ctx.fillStyle = '#4f8f8b'; ctx.font = '700 46px Fredoka, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText('Cat Hospital', x0 + 108, h / 2 + 2);
  });
  post.add(mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshStandardMaterial({ map: arrowTex(true), transparent: true, roughness: 0.8 }), { x: -0.55, y: 1.6, z: 0.01, cast: false }));
  post.add(mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshStandardMaterial({ map: arrowTex(false), transparent: true, roughness: 0.8 }), { x: -0.55, y: 1.6, z: -0.01, ry: Math.PI, cast: false }));
  addCircle(CX + W / 2 + 0.9, CZ + D / 2 + 2.6, 0.15);

  /* --- Fading logic --- */
  const isInside = (x, z) => Math.abs(x - CX) < W / 2 && Math.abs(z - CZ) < D / 2;
  walls.forEach((w) => (w.half = w.normal.x ? W / 2 : D / 2));
  const fader = makeFader({ cx: CX, cz: CZ, walls, roofs: [roofFade] });
  function update(dt, ladyPos, camera) { fader(dt, ladyPos && isInside(ladyPos.x, ladyPos.z), camera); }

  return { update, isInside };
}

const PALETTE_WOOD = '#c1906a';
