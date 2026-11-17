// A small pool of particles for dirt puffs, water drops, seeds and sparkles.
import * as THREE from 'three';

export class Particles {
  constructor(scene, max = 90) {
    this.list = [];
    const geo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.7, transparent: true, flatShading: true }));
      m.visible = false; scene.add(m);
      this.list.push({ m, v: new THREE.Vector3(), life: 0, max: 1, g: 9, size: 0.05, spin: 0 });
    }
  }
  emit(pos, { color = '#fff', count = 10, speed = 1.5, up = 2, gravity = 9, size = 0.05, life = 0.8, spread = 0.2, emissive = false } = {}) {
    let n = 0;
    for (const p of this.list) {
      if (p.life > 0) continue;
      p.m.position.set(pos.x + (Math.random() - 0.5) * spread, pos.y, pos.z + (Math.random() - 0.5) * spread);
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      p.v.set(Math.cos(a) * s, up * (0.6 + Math.random() * 0.6), Math.sin(a) * s);
      p.life = p.max = life * (0.7 + Math.random() * 0.5); p.g = gravity; p.size = size * (0.7 + Math.random() * 0.6);
      p.m.material.color.set(color); p.m.material.emissive.set(emissive ? color : '#000'); p.m.material.emissiveIntensity = emissive ? 0.8 : 0;
      p.m.visible = true; p.spin = (Math.random() - 0.5) * 10;
      if (++n >= count) break;
    }
  }
  update(dt) {
    for (const p of this.list) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.m.visible = false; continue; }
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.03) { p.m.position.y = 0.03; p.v.set(p.v.x * 0.3, Math.abs(p.v.y) * 0.2, p.v.z * 0.3); }
      const k = p.life / p.max;
      p.m.scale.setScalar(p.size * (0.4 + 0.6 * k));
      p.m.rotation.x += p.spin * dt; p.m.rotation.y += p.spin * dt;
      p.m.material.opacity = Math.min(1, k * 2);
    }
  }
}
