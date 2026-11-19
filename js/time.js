// Day/night cycle: moves the sun, tints the sky and lights, twinkles stars at night.
// A "normal" in-game hour lasts DAY_SECONDS/24 real seconds; daytime hours (6 AM - 6 PM) run
// DAYLIGHT_STRETCH times slower, so it stays light twice as long before dusk.
import * as THREE from 'three';

export const DAY_SECONDS = 360;   // base pace: 15 real seconds per evening hour (a full day now takes about 7 real minutes)
export const DAWN = 6;            // soil dries and the seed club's mail arrives at 6:00
export const BEDTIME = 22;        // at 10 PM the clock stops until she goes to bed and sleeps
export const DUSK = 18;           // daylight ends around here
export const DAYLIGHT_STRETCH = 2; // daytime lasts twice as long (6 real minutes from 6 AM to 6 PM)
/** In-game hours per real second at a given hour. */
export function hourRate(h) { return (24 / DAY_SECONDS) / (h >= DAWN && h < DUSK ? DAYLIGHT_STRETCH : 1); }

const C = (h) => new THREE.Color(h);
const SKY = {
  day: { top: C('#7ec3ee'), mid: C('#bfe3f5'), horizon: C('#ffe2cf') },
  dusk: { top: C('#7f8fd6'), mid: C('#f3b6c4'), horizon: C('#ffbe8f') },
  night: { top: C('#18234d'), mid: C('#2c3a72'), horizon: C('#4d4f8e') },
};

export class DayCycle {
  constructor(state, { sun, hemi, fill, sky, scene }) {
    this.state = state; this.sun = sun; this.hemi = hemi; this.fill = fill; this.sky = sky; this.scene = scene;
    this.sunOffset = new THREE.Vector3(14, 26, 12);
    this.onDawn = null;      // called when a new morning starts
    this.onNewDay = null;
    // stars
    const n = 400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.random() * 0.9 + 0.08;
      const r = 260, y = Math.sin(v * Math.PI / 2) * r, rr = Math.cos(v * Math.PI / 2) * r;
      pos.set([Math.cos(u) * rr, y, Math.sin(u) * rr], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#fff8e0', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(g, this.starMat); this.stars.renderOrder = -1; scene.add(this.stars);
    // old saves (from before bedtime existed) might be stuck in the small hours: wind back to bedtime
    if (state.hour < DAWN || state.hour > BEDTIME) { if (state.hour < DAWN && state.day > 1) state.day -= 1; state.hour = BEDTIME; }
    this.apply();
  }

  /** True once it's 10 PM: time is frozen until she sleeps. */
  get bedtime() { return this.state.hour >= BEDTIME; }

  /** Advance the clock. Returns how many in-game hours passed. */
  update(dt) {
    // The day never rolls over on its own: at 10 PM the clock stops and waits for bedtime.
    const s = this.state;
    if (s.hour >= BEDTIME) { s.hour = BEDTIME; this.apply(); return 0; }
    const before = s.hour;
    let h = s.hour + hourRate(before) * dt;
    // crossing dusk: the rest of this frame runs at the (faster) evening rate
    if (before < DUSK && h > DUSK) h = DUSK + (dt - (DUSK - before) / hourRate(before)) * hourRate(DUSK);
    s.hour = Math.min(BEDTIME, h);
    if (s.hour >= BEDTIME && before < BEDTIME) this.onBedtime?.();
    this.apply();
    return s.hour - before;
  }

  /** Jump the clock forward by some in-game hours (stops at bedtime). Returns the hours actually passed. */
  advance(hours) {
    const s = this.state, before = s.hour;
    if (before >= BEDTIME) return 0;
    s.hour = Math.min(BEDTIME, before + hours);
    if (s.hour >= BEDTIME) this.onBedtime?.();
    this.apply();
    return s.hour - before;
  }

  /** Hours from now until the next 6:00 AM. */
  hoursUntilDawn() { return 24 - this.state.hour + DAWN; }

  /** Sleep until morning. Returns the hours skipped (so crops can grow in the meantime). */
  sleep() {
    const skipped = this.hoursUntilDawn();
    this.state.day += 1; this.onNewDay?.();
    this.state.hour = DAWN;
    this.onDawn?.();
    this.apply();
    return skipped;
  }

  get daylight() { return this._day ?? 1; }
  get isNight() { return this.daylight < 0.25; }

  label() {
    const h = this.state.hour, hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10;
    const h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  }

  apply() {
    const h = this.state.hour;
    const elev = Math.sin(((h - 6) / 12) * Math.PI);             // >0 between 6 AM and 6 PM
    const day = THREE.MathUtils.smoothstep(elev, -0.22, 0.3);     // 0 night .. 1 day
    const dusk = Math.exp(-(elev * elev) / 0.03) * THREE.MathUtils.smoothstep(elev, -0.35, 0);
    this._day = day;
    // sun direction: rises in the east (+x), sets in the west (-x)
    const az = ((h - 6) / 12) * Math.PI;
    if (day > 0.05) this.sunOffset.set(Math.cos(az) * 22, Math.max(6, elev * 28), 12);
    else this.sunOffset.set(-10, 26, 10); // moonlight from high up
    this.sun.intensity = 0.35 + 2.0 * day;
    this.sun.color.copy(C('#a9b8ff')).lerp(C('#fff0d8'), day).lerp(C('#ffb27a'), dusk * 0.7);
    this.hemi.intensity = 0.75 + 0.6 * day;
    this.hemi.color.copy(C('#9fb0e8')).lerp(C('#fff3e3'), day);
    this.hemi.groundColor.copy(C('#5f7a8a')).lerp(C('#9fcf8a'), day);
    this.fill.intensity = 0.2 + 0.25 * day;
    const u = this.sky.material.uniforms;
    for (const k of ['top', 'mid', 'horizon']) {
      u[k].value.copy(SKY.night[k]).lerp(SKY.day[k], day).lerp(SKY.dusk[k], dusk * 0.8);
    }
    this.scene.fog.color.copy(u.horizon.value);
    this.starMat.opacity = Math.max(0, 1 - day * 1.6);
  }
}
