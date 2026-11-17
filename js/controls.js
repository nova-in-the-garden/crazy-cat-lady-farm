// Input + camera: keyboard (WASD / arrows / Shift), mouse drag to orbit, wheel / pinch to zoom,
// and an on-screen joystick for touch devices.
import * as THREE from 'three';

export class Controls {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.keys = new Set();
    this.yaw = 0.35;          // camera angle around her (radians)
    this.pitch = 0.42;        // camera height angle
    this.distance = 8;        // zoom
    this.target = new THREE.Vector3();
    this.joy = new THREE.Vector2();
    this.enabled = false;
    this.onTalk = null;       // set by main.js
    this.onTap = null;        // tap/click (no drag) on the canvas -> (clientX, clientY)

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (e.code === 'KeyT' && !e.repeat && this.onTalk) this.onTalk();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    // Drag to orbit (mouse or finger), pinch to zoom
    const pointers = new Map();
    let pinchDist = 0, downAt = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist) this.zoom((pinchDist - d) * 0.03);
        pinchDist = d;
      } else {
        this.yaw -= (e.clientX - p.x) * 0.006;
        this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - p.y) * 0.004, 0.12, 1.25);
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && performance.now() - downAt.t < 400 && this.onTap) this.onTap(e.clientX, e.clientY);
      downAt = null;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY * 0.01); }, { passive: false });

    this.setupJoystick();
  }

  zoom(amount) { this.distance = THREE.MathUtils.clamp(this.distance + amount, 3.5, 18); }

  setupJoystick() {
    const pad = document.getElementById('joystick'), knob = document.getElementById('joy-knob');
    this.joyPad = pad;
    let id = null;
    const move = (e) => {
      const r = pad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 10, len = Math.min(Math.hypot(dx, dy), max), a = Math.atan2(dy, dx);
      const x = Math.cos(a) * len, y = Math.sin(a) * len;
      knob.style.transform = `translate(${x}px, ${y}px)`;
      this.joy.set(x / max, -y / max);
    };
    pad.addEventListener('pointerdown', (e) => { id = e.pointerId; pad.setPointerCapture(id); move(e); e.stopPropagation(); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.joy.set(0, 0); knob.style.transform = ''; };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }

  showJoystickIfTouch() {
    if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) this.joyPad.classList.remove('hidden');
  }

  /** Movement input as a 2D vector: x = right, y = forward (length 0..1). */
  getInput() {
    const k = this.keys, v = new THREE.Vector2();
    if (k.has('KeyW') || k.has('ArrowUp')) v.y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) v.y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) v.x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) v.x -= 1;
    if (v.lengthSq() > 0) v.normalize();
    else if (this.joy.lengthSq() > 0.01) v.copy(this.joy);
    return v;
  }
  get running() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.joy.length() > 0.95; }

  /** Turn stick/keys input into a world-space direction based on where the camera looks. */
  toWorld(input) {
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);  // camera forward on the ground
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);    // camera right
    return new THREE.Vector3(rx * input.x + fx * input.y, 0, rz * input.x + fz * input.y);
  }

  /** Smoothly follow a point (her head/shoulders). */
  // opts.minPitch / opts.maxDist let the game tilt the camera down and in (e.g. indoors)
  updateCamera(dt, focus, snap = false, opts = {}) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 8);
    this.target.lerp(focus, k);
    const k2 = snap ? 1 : 1 - Math.exp(-dt * 3);
    this.curMinPitch = (this.curMinPitch ?? 0) + ((opts.minPitch ?? 0) - (this.curMinPitch ?? 0)) * k2;
    this.curMaxDist = (this.curMaxDist ?? 18) + ((opts.maxDist ?? 18) - (this.curMaxDist ?? 18)) * k2;
    const d = Math.min(this.distance, this.curMaxDist);
    const pitch = Math.max(this.pitch, this.curMinPitch);
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch)).multiplyScalar(d);
    this.camera.position.copy(this.target).add(off);
    if (this.camera.position.y < 0.6) this.camera.position.y = 0.6;
    this.camera.lookAt(this.target);
  }
}
