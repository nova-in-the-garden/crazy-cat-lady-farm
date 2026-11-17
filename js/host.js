// The Crazy Cat Lady's personality: her floating nameplate and speech bubble.
// She greets visitors, chats about whatever spot of the farm she's near,
// and mutters cozy cat thoughts when you leave her standing around.
import * as THREE from 'three';

const LINES = {
  welcome: [
    'Welcome to my cat sanctuary, dearie!',
    "Oh! A visitor! Come in, come in, mind the yarn.",
  ],
  start: [
    "We're getting the sanctuary ready for the cats. Shall I show you around?",
    'Take a stroll with me! WASD to walk, Shift if you fancy a trot.',
  ],
  idle: [
    "One day this whole yard will be full of whiskers. I can feel it in my bones.",
    "Every cat deserves a warm lap and a full bowl.",
    "I've already picked out names. Biscuit, Pickles, Sir Fluffington...",
    'Is that a meow I hear? No... just the kettle.',
    "I knitted seventeen tiny sweaters. Just in case.",
    "A house isn't a home without a cat on the windowsill.",
    "They say I'm crazy. I say I'm prepared.",
    'Have you ever seen a cat in a sunbeam? Pure magic.',
    'My cat-ear headband? Oh, I never take it off, dearie.',
    "Cats choose you, you know. I'm just making it easy for them.",
    'I put the kibble out every morning. Any day now...',
    "The sanctuary's nearly ready. Just a few more cushions to fluff!",
    "Have you seen my new animal hospital? It's just past the garden.",
    "Purring is the best sound in the whole wide world.",
  ],
  clinic: [
    "That's Whisker Wellness, my little animal hospital! Pop inside, the door's open.",
    "Every sick kitty who comes here will get the very best care. And a blanket.",
  ],
  clinicInside: [
    "Exam table, scale, medicine cabinet... we're nearly ready to open!",
    "Those recovery kennels have the softest blankets. I washed them twice.",
    "Mind the IV stand, dearie. No patients yet, but I like to be prepared.",
  ],
  porch: [
    "That's my porch! Cat tree, food bowls, rocking chair. All ready for company.",
    'The cat flap on the door is for very important guests only.',
  ],
  garden: [
    "My veggie garden! Carrots, cabbages, pumpkins... and catnip, eventually.",
    'Mr. Whiskerscrow keeps the birds away. He has ears like me!',
  ],
  barn: [
    "The old barn. Hay bales make purr-fect napping spots.",
    "See the weathervane? It's a cat, naturally.",
  ],
  pond: [
    'Careful by the pond, dearie. Cats and water do NOT mix.',
    'I like to watch the lily pads bob. Very relaxing.',
  ],
  gate: [
    "That's my gate. When the sanctuary opens, strays will come right through here.",
    'The mailbox has a paw on it. I get letters from my cat club!',
  ],
  talk: [
    'Yes, dearie?',
    "Oh, you want to chat? I could talk about cats for hours. Days, really.",
    "Did I mention I'm the Crazy Cat Lady? It's a title I've earned!",
    'Tea? Cocoa? A ball of yarn?',
  ],
};

export class Host {
  constructor(lady, camera, world) {
    this.lady = lady; this.camera = camera; this.world = world;
    this.root = document.getElementById('host-ui');
    this.bubble = document.getElementById('bubble');
    this.text = document.getElementById('bubble-text');
    this.showFor = 0;           // seconds the current bubble stays up
    this.idleTime = 0;          // how long she's been standing still
    this.nextIdle = 6;
    this.zoneCooldown = {};     // so she doesn't repeat herself about the same spot
    this.currentZone = null;
    this.counters = {};
    this.v = new THREE.Vector3();
  }

  pick(kind) {
    const list = LINES[kind];
    const i = (this.counters[kind] = ((this.counters[kind] ?? -1) + 1)) % list.length;
    return list[i];
  }

  say(text, seconds = 5) {
    this.text.textContent = text;
    this.bubble.classList.remove('hidden');
    // restart the pop animation
    this.bubble.style.animation = 'none'; void this.bubble.offsetWidth; this.bubble.style.animation = '';
    this.showFor = seconds;
  }
  sayKind(kind, seconds) { this.say(this.pick(kind), seconds); }
  hide() { this.bubble.classList.add('hidden'); this.showFor = 0; }

  update(dt, moving, playing) {
    // Speech timing
    if (this.showFor > 0) { this.showFor -= dt; if (this.showFor <= 0) this.hide(); }

    if (playing) {
      // Comment on places as she arrives at them
      const p = this.lady.group.position;
      const z = this.world.zones.find((zn) => (zn.test ? zn.test(p.x, p.z) : Math.hypot(p.x - zn.x, p.z - zn.z) < zn.r));
      if (z && z.id !== this.currentZone && !(this.zoneCooldown[z.id] > 0)) {
        this.sayKind(z.id, 5.5); this.zoneCooldown[z.id] = 40;
      }
      this.currentZone = z ? z.id : null;
      for (const k in this.zoneCooldown) this.zoneCooldown[k] -= dt;
    }
    // Idle musings
    this.idleTime = moving ? 0 : this.idleTime + dt;
    if (this.idleTime > this.nextIdle && this.showFor <= 0) {
      this.sayKind('idle', 6); this.idleTime = 0; this.nextIdle = 7 + Math.random() * 5;
    }

    // Keep the nameplate + bubble over her head
    this.v.copy(this.lady.headAnchor.position);
    this.lady.headAnchor.getWorldPosition(this.v);
    const dist = this.v.distanceTo(this.camera.position);
    this.v.project(this.camera);
    const off = this.v.z > 1 || Math.abs(this.v.x) > 1.2 || Math.abs(this.v.y) > 1.2;
    this.root.classList.toggle('offscreen', off);
    this.root.classList.toggle('far', dist > 14);
    if (!off) {
      const x = (this.v.x * 0.5 + 0.5) * innerWidth, y = (-this.v.y * 0.5 + 0.5) * innerHeight;
      this.root.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
  }
}
