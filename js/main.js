// Crazy Cat Lady's Farm: entry point.
// Sets up the renderer, lights and camera, builds the world and the Crazy Cat Lady,
// then runs the game loop. Future features (cats!) can plug into the loop below.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { createCatLady } from './catLady.js';
import { Controls } from './controls.js';
import { Host } from './host.js';

const WALK_SPEED = 2.8, RUN_SPEED = 5.4, LADY_RADIUS = 0.35;

// Let the cute font load before canvas-drawn signs use it (but never wait more than 1.5 s)
await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

/* --- Renderer, scene, camera --- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 700);

/* --- Warm, soft lighting --- */
scene.add(new THREE.HemisphereLight('#fff3e3', '#9fcf8a', 1.35));
const sun = new THREE.DirectionalLight('#fff0d8', 2.3);
const SUN_OFFSET = new THREE.Vector3(14, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#ffd9e6', 0.45); // pinkish fill from the other side
fill.position.set(-15, 10, -8);
scene.add(fill);

/* --- World + the Crazy Cat Lady --- */
const world = buildWorld(scene);
const lady = createCatLady();
lady.group.position.copy(world.spawn);
scene.add(lady.group);

const controls = new Controls(renderer.domElement, camera);
const host = new Host(lady, camera, world);

/* --- Game state --- */
const state = { playing: false, heading: 0, speed: 0, time: 0 };
const timer = new THREE.Timer();
const raycaster = new THREE.Raycaster();

function talk() { host.sayKind('talk', 5); lady.wave(); }
controls.onTalk = talk;
controls.onTap = (x, y) => {
  if (!state.playing) return;
  raycaster.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  if (raycaster.intersectObject(lady.group, true).some((h) => h.object.userData.isLady)) talk();
};

/* --- Title screen --- */
const title = document.getElementById('title');
function start() {
  if (state.playing) return;
  state.playing = true;
  title.classList.add('fade');
  document.getElementById('hud').classList.remove('hidden');
  controls.enabled = true;
  controls.showJoystickIfTouch();
  controls.yaw = 0; controls.pitch = 0.4; controls.distance = 8;
  host.sayKind('start', 6); lady.wave();
  renderer.domElement.focus?.();
}
document.getElementById('start-btn').addEventListener('click', start);
addEventListener('keydown', (e) => { if (!state.playing && (e.code === 'Enter' || e.code === 'Space')) start(); });
document.getElementById('hud-toggle').addEventListener('click', () => document.getElementById('hud').classList.toggle('collapsed'));

// She greets you while the title is up
setTimeout(() => { host.sayKind('welcome', 7); lady.wave(); }, 900);

/* --- Main loop --- */
function shortestAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
const focus = new THREE.Vector3();

function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.05);
  state.time += dt;
  const pos = lady.group.position;

  let moveAmount = 0, running = false;
  if (state.playing) {
    const input = controls.getInput();
    running = controls.running;
    const len = Math.min(input.length(), 1);
    const target = len * (running ? RUN_SPEED : WALK_SPEED);
    state.speed += (target - state.speed) * Math.min(1, dt * 10);
    if (len > 0.05) {
      const dir = controls.toWorld(input).normalize();
      const want = Math.atan2(dir.x, dir.z);
      state.heading += shortestAngle(want - state.heading) * Math.min(1, dt * 12);
    }
    const fwd = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
    pos.addScaledVector(fwd, state.speed * dt);
    world.resolve(pos, LADY_RADIUS);
    pos.y += (world.groundHeight(pos.x, pos.z) - pos.y) * Math.min(1, dt * 14);
    lady.group.rotation.y = state.heading;
    moveAmount = Math.min(state.speed / WALK_SPEED, 1);
    focus.set(pos.x, pos.y + 1.3, pos.z);
    controls.updateCamera(dt, focus);
  } else {
    // Title screen: slow, cinematic drift around her, with the cottage behind
    // (on wide screens she stands to the right of the title card)
    const wide = innerWidth > innerHeight * 1.1;
    const sx = wide ? -2.3 : 0, sway = Math.sin(state.time * 0.15) * 0.6;
    camera.position.set(pos.x + sx + sway, 2.1 + Math.sin(state.time * 0.2) * 0.15, pos.z + 6.4);
    camera.lookAt(pos.x + sx * 1.15, wide ? 1.5 : 0.6, pos.z - 2);
    controls.target.set(pos.x, 1.3, pos.z);
  }

  lady.update(dt, moveAmount, running && moveAmount > 0.5);
  world.update(state.time, dt);
  host.update(dt, moveAmount > 0.1, state.playing);

  // shadows follow her so they stay crisp
  sun.target.position.set(pos.x, 0, pos.z);
  sun.position.copy(sun.target.position).add(SUN_OFFSET);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

document.getElementById('loading').classList.add('done');
requestAnimationFrame(frame);

// Handy hooks for testing in the browser console (and for future features)
window.ccl = {
  ready: true, scene, camera, lady, world, controls, host, state, start,
  teleport(x, z, heading = state.heading) { lady.group.position.set(x, world.groundHeight(x, z), z); state.heading = heading; controls.updateCamera(0, new THREE.Vector3(x, 1.3, z), true); },
};
