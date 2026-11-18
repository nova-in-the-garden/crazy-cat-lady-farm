// Crazy Cat Lady's Farm: entry point.
// Sets up the renderer, lights and camera, builds the world and the Crazy Cat Lady,
// then runs the game loop. Future features (cats!) can plug into the loop below.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { createCatLady } from './catLady.js';
import { Controls } from './controls.js';
import { Host } from './host.js';
import { Game } from './game.js';
import { migrateLegacy, takeAutostart, deleteSlot, setAutostart } from './saves.js';
import { initStartScreen } from './startScreen.js';

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
const hemi = new THREE.HemisphereLight('#fff3e3', '#9fcf8a', 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d8', 2.3);
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
// The sanctuary itself is created once the player picks a save slot on the start screen
let game = null;
const DEFAULT_SUN = new THREE.Vector3(14, 26, 12);

/* --- Game state --- */
const state = { playing: false, heading: 0, speed: 0, time: 0 };
const timer = new THREE.Timer();
const raycaster = new THREE.Raycaster();

function talk() { host.sayKind('talk', 5); lady.wave(); }
controls.onTalk = talk;
controls.onTap = (x, y) => {
  if (!state.playing) return;
  raycaster.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  // tap a cat to care for it
  if (!game) return;
  for (const c of game.cats.list) {
    if (raycaster.intersectObject(c.model.group, true).some((h) => h.object.userData.isCat)) { game.tapCat(c); return; }
  }
  if (raycaster.intersectObject(lady.group, true).some((h) => h.object.userData.isLady)) talk();
};

/* --- Title screen --- */
const title = document.getElementById('title');
/** Open a save slot (savedState = null for a brand-new game) and step into the sanctuary. */
function start(slot = 1, savedState = null) {
  if (state.playing || game) return;
  try {
    game = new Game({ scene, world, lady, host, camera, lights: { sun, hemi, fill }, slot, savedState });
  } catch (err) {
    console.error('Could not load save', err);
    screen.showLoadError(slot, err).then((v) => {
      if (v === 'new') { deleteSlot(slot); setAutostart(slot, true); }
      location.reload();
    });
    return;
  }
  exposeApi();
  state.playing = true;
  title.classList.add('fade');
  document.getElementById('hud').classList.remove('hidden');
  controls.enabled = true;
  controls.showJoystickIfTouch();
  controls.yaw = 0; controls.pitch = 0.4; controls.distance = 8;
  host.sayKind('start', 6); lady.wave();
  game.start();
  if (game.touch) document.getElementById('hud').classList.add('collapsed');
  renderer.domElement.focus?.();
}
migrateLegacy();
const screen = initStartScreen({ onPlay: (slot, saved) => start(slot, saved) });
addEventListener('keydown', (e) => { if (!state.playing && !game && (e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); screen.quickStart(); } });
document.getElementById('hud-toggle').addEventListener('click', () => document.getElementById('hud').classList.toggle('collapsed'));

// She greets you while the title is up
setTimeout(() => { host.sayKind('welcome', 7); lady.wave(); }, 900);

/* --- Main loop --- */
function shortestAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
const focus = new THREE.Vector3();
const examLook = new THREE.Vector3();
// after an exam the camera eases back to the normal follow view instead of snapping
let easeBack = null, hadCamView = false;
const easeTmp = new THREE.Vector3();

function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.05);
  state.time += dt;
  const pos = lady.group.position;

  let moveAmount = 0, running = false;
  if (state.playing) {
    const input = game.blocked ? new THREE.Vector2() : controls.getInput();
    running = controls.running;
    const len = Math.min(input.length(), 1);
    if (game.sitting) {
      // on the porch swing: the game moves her with the swing; walking off stands her up
      state.speed = 0;
      if (len > 0.35 && !game.blocked) { game.standUp(); }
    }
    if (!game.sitting) {
    const target = len * (running ? RUN_SPEED : WALK_SPEED) * (game.ladySpeed || 1);
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
    }
    focus.set(pos.x, pos.y + 1.3, pos.z);
    const indoors = world.clinic.isInside(pos.x, pos.z) || world.cottage.isInside(pos.x, pos.z) || world.catsHouse.isInside(pos.x, pos.z);
    if (game.camView) {
      // calm close-up during a vet exam
      const ck = game.camView.instant ? 1 : Math.min(1, dt * 3);
      camera.position.lerp(game.camView.pos, ck);
      examLook.lerp(game.camView.look, ck);
      camera.lookAt(examLook);
      hadCamView = true; easeBack = null;
    } else {
      if (hadCamView) { hadCamView = false; easeBack = { pos: camera.position.clone(), look: examLook.clone(), t: 0, dur: 1.4 }; }
      controls.updateCamera(dt, focus, false, indoors ? { minPitch: 0.75, maxDist: 9 } : {});
      if (easeBack) {
        easeBack.t += dt;
        const u = Math.min(1, easeBack.t / easeBack.dur), e = u * u * (3 - 2 * u); // smoothstep
        easeTmp.copy(camera.position);
        camera.position.lerpVectors(easeBack.pos, easeTmp, e);
        examLook.lerpVectors(easeBack.look, controls.target, e);
        camera.lookAt(examLook);
        if (u >= 1) easeBack = null;
      } else examLook.copy(focus);
    }
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
  if (game) game.update(dt, state.time);
  world.update(state.time, dt, pos, camera);
  host.update(dt, moveAmount > 0.1, state.playing);

  // shadows follow her so they stay crisp
  sun.target.position.set(pos.x, 0, pos.z);
  sun.position.copy(sun.target.position).add(game ? game.day.sunOffset : DEFAULT_SUN);

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
function exposeApi() { window.game = game.api(); game.teleport = (x, z, h) => window.ccl.teleport(x, z, h); }
// "New Game" after a save failed to load: jump straight back in
const auto = takeAutostart();
if (auto) setTimeout(() => start(auto.slot, null), 0);

// Handy hooks for testing in the browser console (and for future features)
window.ccl = {
  ready: true, get game() { return game; }, scene, camera, lady, world, controls, host, state, start, screen,
  teleport(x, z, heading = state.heading) { lady.group.position.set(x, world.groundHeight(x, z), z); state.heading = heading; lady.group.rotation.y = heading; state.speed = 0; controls.updateCamera(0, new THREE.Vector3(x, 1.3, z), true); },
};
