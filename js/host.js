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
    "The sanctuary is open, and our very first cat arrives today! We've a starter stock of cat food and some coins. Let's plant my veggie garden while we wait.",
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
    'Breakfast is at 8 and supper at 6, served in the Cats\' House bowls. Cat food comes in bags from the Supply Shelf.',
    'We can look after up to ten cats at once. When a cat is healthy, happy and loves us, a kind family may adopt them.',
    'Click or tap any cat to see their stats card: health, happiness, hunger, cleanliness and energy.',
    'A little catnip from the garden makes any cat do zoomies. And it grows your bond!',
    'Every adoption fee goes right back into food and medicine for the next cats who need us.',
    "Don't forget to feed yourself too, dearie. The garden veggies are for my supper now.",
    'Press J to open the Cat Journal. I write down every little moment with the cats.',
    'A cat that seems a little off just needs a gentle check at the clinic. Nothing scary, I promise.',
    'Play with each cat using different toys. Everyone has a favorite!',
    'No cat goes hungry here. Keep an eye on the cat food and pop by the Supply Shelf when it runs low.',
    'Need water? The pond is just past the path. Fill the can and the crops will thank you.',
    "Have you seen my new animal hospital? It's just past the garden.",
    "Purring is the best sound in the whole wide world.",
  ],
  clinic: [
    "That's Whisker Wellness, my little animal hospital! Pop inside, the door's open.",
    "Every kitty who comes here gets the very best care. And a blanket.",
    'New cats get a Welcome Vet Check here first. That is where you get to name them!',
  ],
  clinicInside: [
    'Walk a cat up to the exam table and press E for a gentle check-up.',
    'Do a few checks and read the clipboard. A wrong guess never hurts anyone, it just means a rest day.',
    'Poorly kitties stay in the kennels until they are healed. Visit each day for their medicine and a gentle check.',
    'Missed a dose? No harm done, dearie. Healing just takes a little longer.',
    'Shots, medicine and bandages come from the Supply Shelf. Keep a few in stock!',
    'Press E at a kennel to see the healing bar and today\'s care.',
    'Chamomile from the garden makes every remedy work faster.',
  ],
  porch: [
    "That's my porch! Cat tree, rocking chair and my porch swing. Press E by the swing to sit a spell.",
    'Nothing beats a slow swing on the porch at golden hour. The cats think so too.',
    'The cat flap on the door is for very important guests only.',
  ],
  garden: [
    'My garden! Plow, sow, water, harvest. The veggies become MY suppers now.',
    'Catnip grows fast. One sprig makes any cat roll about in bliss.',
    "Crops never wilt here, dearie. Once they're ripe, they'll wait for you.",
    'Mr. Whiskerscrow keeps the birds away. He has ears like me!',
    "Remember: crops only grow on days you water them. The soil dries every dawn.",
    'Chamomile is a gentle, cat-safe herb. We use it in remedies at the clinic.',
  ],
  kitchen: [
    "Welcome to my kitchen! Bring me veggies and I'll cook us a hearty meal at the stove.",
    'One carrot makes one meal, a cabbage makes two, and a pumpkin makes three!',
    "The cans on the pantry shelf are the cats' food. The Supply Shelf sells it by the bag.",
    'Tired? My bedroom is just through the living room. My very favorite cats like to pile on with me.',
    'Mind the cinnamon rolls, dearie, they are still cooling!',
    "The cats' food bowls and litter boxes are over in the Cats' House now. The old barn!",
  ],
  living: [
    'Welcome to my living room! Warm your toes by the woodstove.',
    'The cats adore that bed by the fire. Me, I prefer the armchair and my knitting.',
    'Kitchen through that door, bedroom through the other, and the bathroom past the bookshelf.',
  ],
  bedroom: [
    'My little bedroom. Come 10 PM, stand by the bed and press Sleep.',
    'Grandma made that quilt. Every square has a story, and a few have paw prints.',
  ],
  bath: [
    'A clawfoot tub! Nothing like a bubble bath after a day of cat wrangling.',
    'That rubber duck is purely decorative. The cats disagree.',
  ],
  barn: [
    "That's the Cats' House! It used to be the old barn. Now it's all theirs.",
    "See the weathervane? It's a cat, naturally.",
  ],
  catsHouse: [
    "Welcome to the Cats' House, dearie! Bowls, litter boxes and a bed with every cat's name on it.",
    'Press E at the feeding station to fill the bowls. Cat food comes in bags from the Supply Shelf.',
    "Breakfast at 8 and supper at 6 get served here too, as long as we have cat food.",
    'Ten beds, ten bowls and five litter boxes. Room for a whole cat family!',
    'Scoop the litter boxes when they get clumpy. Clean boxes make happy, tidy kitties.',
    'At night the cats curl up in their own little beds here. My best friends sneak onto my bed instead!',
  ],
  shop: [
    "The Supply Shelf! Cat food bags, medicine, shots, bandages and seeds. Press E to browse.",
    'Coins come from adoption fees and the donation jar. Spend them on the cats, dearie.',
  ],
  pond: [
    'Careful by the pond, dearie. Cats and water do NOT mix.',
    'I like to watch the lily pads bob. Very relaxing.',
  ],
  gate: [
    "That's my gate. New arrivals come right through here, and I always meet them with a smile.",
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
