// Simple 2D collision for the farm: circles and axis-aligned boxes on the ground,
// plus raised walkable floors (like the porch deck).
export const PLAY_RADIUS = 26;   // how far from the center she may walk

/* ------------------------------------------------------------------ */
/* Collision                                                           */
/* ------------------------------------------------------------------ */
export const circles = [];   // { x, z, r }
export const boxes = [];     // { minX, maxX, minZ, maxZ }
export const raised = [];    // { minX, maxX, minZ, maxZ, h } walkable raised floors (porch)

export function addCircle(x, z, r) { circles.push({ x, z, r }); }
export function addBox(cx, cz, w, d) { boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }); }

/** Push a position (Vector3) out of every obstacle. */
export function resolve(pos, r) {
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

export function groundHeight(x, z) {
  for (const f of raised) if (x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ) return f.h;
  return 0;
}

