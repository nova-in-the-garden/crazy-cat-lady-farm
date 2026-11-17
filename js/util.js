// Small shared helpers: seeded random numbers, cached materials, mesh shortcuts
// and canvas-drawn textures for signs and fabric prints.
import * as THREE from 'three';

/** Deterministic random generator so the farm looks the same on every visit. */
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const matCache = new Map();
/** Soft, flat-shaded "low-poly" material. Same color + options share one material. */
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts }));
  }
  return matCache.get(key);
}

/** Create a mesh, place it, and turn on shadows in one line. */
export function mesh(geo, material, p = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(p.x || 0, p.y || 0, p.z || 0);
  m.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
  if (p.s !== undefined) m.scale.setScalar(p.s);
  if (p.sx || p.sy || p.sz) m.scale.set(p.sx || 1, p.sy || 1, p.sz || 1);
  m.castShadow = p.cast !== false;
  m.receiveShadow = p.receive !== false;
  return m;
}

/** Draw on a 2D canvas and turn it into a texture. */
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Draw a little paw print centered at (x, y). */
export function drawPaw(ctx, x, y, size, color, angle = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color;
  const s = size;
  ctx.beginPath(); ctx.ellipse(0, s * 0.25, s * 0.42, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  [[-0.5, -0.2, -0.35], [-0.18, -0.5, 0], [0.18, -0.5, 0], [0.5, -0.2, 0.35]].forEach(([tx, ty, r]) => {
    ctx.beginPath(); ctx.ellipse(tx * s, ty * s, s * 0.16, s * 0.22, r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

/** Wooden sign texture with friendly lettering. */
export function signTexture(lines, { w = 512, h = 256, bg = '#c89466', fg = '#fff6e8', paws = true, font = 64 } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // wood grain
    ctx.strokeStyle = 'rgba(90,50,30,0.18)'; ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); const y = (i + 0.5) * (h / 9);
      ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 3); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(90,50,30,0.35)'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lh = h / (lines.length + 0.6);
    lines.forEach((t, i) => {
      let size = i === 0 ? font : font * 0.7;
      ctx.font = `700 ${size}px Fredoka, "Trebuchet MS", sans-serif`;
      const maxW = w - (paws ? 180 : 60);
      const tw = ctx.measureText(t).width;
      if (tw > maxW) { size *= maxW / tw; ctx.font = `700 ${size}px Fredoka, "Trebuchet MS", sans-serif`; } // shrink to fit
      ctx.fillText(t, w / 2, lh * (i + 0.8));
    });
    if (paws) { drawPaw(ctx, 38, h - 36, 34, '#f4a3b5', -0.4); drawPaw(ctx, w - 38, h - 36, 34, '#f4a3b5', 0.4); }
  });
}
