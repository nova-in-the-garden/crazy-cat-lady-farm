// Shared helpers for buildings you can walk into (the clinic and the cottage).
// Walls and roofs are grouped so each group can fade out on its own when the
// Crazy Cat Lady is inside and that piece would block the camera.
import * as THREE from 'three';

/** Make every material inside a group unique so the group can fade on its own. */
export function fadeable(group) {
  const mats = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.userData.baseOpacity = m.opacity; mats.push(m); });
    o.userData.origCast = o.castShadow;
  });
  return { group, mats, opacity: 1 };
}

export function setOpacity(f, a) {
  f.opacity = a;
  f.group.visible = a > 0.03;
  for (const m of f.mats) {
    m.opacity = m.userData.baseOpacity * a;
    const tr = a < 0.999 || m.userData.baseOpacity < 1;
    if (tr !== m.transparent) { m.transparent = tr; m.needsUpdate = true; } // (three.js bakes "opaque" into the shader)
    m.depthWrite = a > 0.6;
  }
  f.group.traverse((o) => { if (o.isMesh) o.castShadow = a > 0.6 && o.userData.origCast; });
}

/**
 * Fade controller for one building.
 * walls: [{ ...fadeable(group), normal: Vector3, half: distance from center to that wall }]
 * roofs: [fadeable(group)]   (hidden whenever she's inside)
 */
export function makeFader({ cx, cz, walls, roofs }) {
  const v = new THREE.Vector3();
  return function update(dt, inside, camera) {
    const k = Math.min(1, dt * 6);
    for (const r of roofs) {
      const a = r.opacity + ((inside ? 0 : 1) - r.opacity) * k;
      if (Math.abs(a - r.opacity) > 0.001) setOpacity(r, a);
    }
    for (const w of walls) {
      let target = 1;
      if (inside && camera) {
        v.set(camera.position.x - cx, 0, camera.position.z - cz);
        if (v.dot(w.normal) > w.half * 0.4) target = 0; // wall is on the camera's side
      }
      const a = w.opacity + (target - w.opacity) * k;
      if (Math.abs(a - w.opacity) > 0.001) setOpacity(w, a);
    }
  };
}
