// Everything the sanctuary knows about cats: the starter cats, personalities,
// favorite things, gentle Tier 1 vet cases and the treatments for them.

/** Personalities and how they gently change the sim. */
export const PERSONALITIES = {
  affectionate: { label: 'Affectionate', blurb: 'Loves cuddles and follows you around.', hint: 'She rubs her cheek on your hand and starts purring right away.', affectionDecay: 1.2, bondGain: 1.2, settle: null },
  playful: { label: 'Playful', blurb: 'Bouncy, curious and always ready for a game.', hint: 'She keeps batting at your stethoscope. Someone wants to play!', funDecay: 1.4, bondGain: 1.0, settle: 'Dangle a toy to keep her still' },
  shy: { label: 'Shy', blurb: 'Gentle and cautious. Trust grows slowly but deeply.', hint: 'He tucks his tail and watches you with big round eyes.', affectionDecay: 0.8, bondGain: 0.7, settle: 'Offer a slow blink and a gentle chin scratch' },
  independent: { label: 'Independent', blurb: 'Does things on their own terms.', hint: 'Sits calmly and looks a little unimpressed by all the fuss.', affectionDecay: 0.6, bondGain: 0.9, settle: null },
  'food-motivated': { label: 'Food-motivated', blurb: 'Will do anything for a snack.', hint: 'Sniffs your apron pocket, hoping for a treat.', hungerDecay: 1.3, bondGain: 1.0, settle: 'Offer a little treat' },
  sleepy: { label: 'Sleepy', blurb: 'A champion napper who adores warm, soft spots.', hint: 'Yawns hugely and starts kneading the soft exam pad.', funDecay: 0.7, energyDecay: 1.4, bondGain: 1.0, settle: null },
  curious: { label: 'Curious', blurb: 'Nose first into everything. Has to inspect every box.', hint: 'Sniffs every instrument on the tray, whiskers twitching.', funDecay: 1.2, bondGain: 1.1, settle: 'Let the kitty sniff the stethoscope first' },
  chatty: { label: 'Chatty', blurb: 'Has a LOT to say, mostly about dinner.', hint: 'Keeps up a running commentary of chirps and meows.', affectionDecay: 1.1, hungerDecay: 1.1, bondGain: 1.15, settle: null },
};
export const PERSONALITY_IDS = Object.keys(PERSONALITIES);

/** Favorite resting spots around the sanctuary (world positions, y = how high the spot is). */
export const SPOTS = {
  porch: { label: 'the sunny porch', x: 1.3, y: 0.32, z: -5.6 },
  stoveBed: { label: 'the cat bed by the stove', x: -0.2, y: 0.36, z: -10.25 },
  hay: { label: 'the hay bales by the barn', x: 9.4, y: 1.1, z: -2.8 },
  garden: { label: 'the garden by the scarecrow', x: -15.0, y: 0, z: 0.9 },
  rug: { label: 'the pink rug in the cottage', x: 0.6, y: 0.32, z: -8.8 },
};

export const TOYS = { wand: 'feather wand', yarn: 'yarn ball' };

/**
 * The three starter cats. They arrive one at a time, unnamed: you name each one
 * at their Welcome Vet Check in the clinic.
 */
export const STARTER_CATS = [
  {
    id: 'rescue', arriveDay: 1, source: 'rescue', sourceLabel: 'Rescue from the Whiskerton Rescue League',
    arrival: 'gate', spawn: { x: 1.2, z: 14.2 },
    sex: 'girl', breed: 'Domestic Shorthair', coat: 'Orange tabby', look: 'orangeTabby', scale: 1,
    personality: 'affectionate', age: 'about 1 year old', ageClue: 'Bright white teeth, barely any wear: about 1 year old.',
    weight: 4.1, temp: 38.5, favToy: 'yarn', favSpot: 'porch', favTreat: 'pumpkin purée',
    starterIssue: null,
    names: ['Marmalade', 'Biscuit', 'Clementine', 'Pumpkin'],
  },
  {
    id: 'stray', arriveDay: 2, source: 'stray', sourceLabel: 'A shy stray who found the sanctuary garden',
    arrival: 'stray', spawn: { x: -15.6, z: 1.6 },
    sex: 'boy', breed: 'Domestic Medium-hair', coat: 'Black & white tuxedo', look: 'tuxedo', scale: 1.05,
    personality: 'shy', age: 'about 3 years old', ageClue: 'A little tartar on the back teeth: about 3 years old.',
    weight: 4.8, temp: 38.6, favToy: 'wand', favSpot: 'hay', favTreat: 'chicken bites',
    starterIssue: 'fleas',
    names: ['Oreo', 'Domino', 'Tux', 'Sir Pickles'],
  },
  {
    id: 'shelter', arriveDay: 3, source: 'shelter', sourceLabel: 'Adopted from the Paws & Whiskers Shelter',
    arrival: 'gate', spawn: { x: -1.2, z: 14.2 },
    sex: 'girl', breed: 'Siamese mix', coat: 'Cream with chocolate points', look: 'creamPoint', scale: 0.82,
    personality: 'playful', age: 'about 6 months old (a kitten!)', ageClue: 'Brand-new adult teeth just coming in: about 6 months old.',
    weight: 2.6, temp: 38.7, favToy: 'wand', favSpot: 'stoveBed', favTreat: 'tuna flakes',
    starterIssue: null,
    names: ['Mochi', 'Latte', 'Snowpea', 'Coco'],
  },
];
export const RANDOM_NAMES = ['Mittens', 'Noodle', 'Waffles', 'Pebble', 'Muffin', 'Tofu', 'Bean', 'Juniper', 'Pip', 'Hazel', 'Maple', 'Ziggy', 'Butterscotch', 'Olive', 'Nugget', 'Sprout', 'Luna', 'Poppy', 'Toast', 'Dumpling', 'Clover', 'Figaro', 'Socks', 'Peaches'];

/** The checks you can do on the exam table. */
export const CHECKS = [
  { id: 'scale', label: 'Weigh on the scale', short: 'Weight', icon: 'scale' },
  { id: 'thermo', label: 'Take temperature', short: 'Temperature', icon: 'thermo' },
  { id: 'heart', label: 'Listen with stethoscope', short: 'Heart & breathing', icon: 'steth' },
  { id: 'coat', label: 'Look at coat & skin', short: 'Coat & skin', icon: 'coat' },
  { id: 'eyes', label: 'Check eyes & ears', short: 'Eyes & ears', icon: 'eye' },
  { id: 'teeth', label: 'Peek at teeth', short: 'Teeth', icon: 'tooth' },
  { id: 'paws', label: 'Check paws', short: 'Paws', icon: 'paw' },
];

/** Normal (healthy) results for each check. */
export function normalResult(check, cat) {
  switch (check) {
    case 'scale': return `${cat.weight.toFixed(1)} kg: a healthy weight.`;
    case 'thermo': return `${cat.temp.toFixed(1)} °C: perfectly normal.`;
    case 'heart': return 'Steady heartbeat and soft, even breathing. Lovely purr too.';
    case 'coat': return 'Soft, glossy coat. Skin looks healthy.';
    case 'eyes': return 'Bright, clear eyes. Clean pink ears.';
    case 'teeth': return 'Clean little teeth and pink gums.';
    case 'paws': return 'Soft paw pads, no sore spots.';
    default: return 'All good.';
  }
}

/** Treatments available in the clinic. herb = uses 1 chamomile if you have it (heals faster). */
export const TREATMENTS = {
  salve: { label: 'Clean & apply herbal salve', icon: 'salve', desc: 'Gently clean the sore spot and dab on a soothing chamomile salve.' },
  bland: { label: 'Bland diet for a day', icon: 'bowl', desc: 'Plain rice with mashed carrot and a little chamomile tea for a gentle tummy.' },
  flea: { label: 'Flea treatment + comb', icon: 'comb', desc: 'A gentle herbal flea rinse and a careful comb-through.' },
  rest: { label: 'Quiet rest in the recovery bed', icon: 'bed', desc: 'A calm, cozy recovery bed with a soft blanket and chamomile to help settle.' },
  shot: { label: 'Antibiotic shot + daily medicine', icon: 'syringe', desc: 'A quick, gentle shot and a course of medicine.' },
  bandage: { label: 'Bandage wrap + daily medicine', icon: 'bandage', desc: 'A snug, soft bandage wrap and pain medicine.' },
  meds: { label: 'Daily medicine', icon: 'pill', desc: 'A course of soothing medicine.' },
};

/**
 * Tier 1 issues. cue = what you notice; clues = what each check reveals
 * (basic text for Vet Knowledge 1, clearer text from level 2).
 */
export const ISSUES = {
  paw: {
    name: 'Minor paw irritation', short: 'sore paw', treatment: 'salve', anim: 'lick',
    cue: 'keeps licking one front paw and walks a little slower',
    thought: 'paw',
    clues: { paws: ['One paw pad looks a little pink. {She} pulls it back gently.', 'One front pad is red and slightly swollen, likely a small scrape from outdoor play.'] },
    note: 'Paw irritation from outdoor play',
  },
  stomach: {
    name: 'Mild stomach upset', short: 'upset tummy', treatment: 'bland', anim: 'hunch',
    cue: 'is sitting hunched up and only nibbled at breakfast',
    thought: 'tummy',
    clues: { heart: ['Tummy gurgles a bit when you listen.', 'Gurgly, busy tummy sounds: a mild stomach upset (too many treats or new food?).'], scale: ['Weight is fine, maybe a smidge lighter.', 'Weight a touch lighter than usual: {she} has been eating less.'] },
    note: 'Too many treats or a change of food',
  },
  fleas: {
    name: 'Fleas', short: 'itchy fleas', treatment: 'flea', anim: 'scratch',
    cue: 'keeps scratching behind {his} ears',
    thought: 'itch',
    clues: { coat: ['Tiny dark specks near the base of the tail. Itchy skin.', 'Flea dirt (tiny dark specks) by the tail and a few little fleas: classic fleas.'], eyes: ['Ears look clean, just scratched a lot.', 'Ears are clean: the scratching is from skin itch, not an ear problem.'] },
    note: 'Fleas picked up outdoors',
  },
  stress: {
    name: 'New-cat stress', short: 'feeling stressed', treatment: 'rest', anim: 'hide',
    cue: 'is hiding more and flattening {his} ears since the new cat arrived',
    thought: 'cloud',
    clues: { heart: ['Heart is beating a little fast.', 'Slightly quick heartbeat that slows when you stroke {him}: nervous, not sick.'], eyes: ['Wide, watchful eyes. Ears turned back.', 'Wide pupils and flattened ears: signs of stress from all the changes.'], coat: ['Coat a little scruffy, less grooming lately.', 'Less grooming than usual: a common sign of stress.'] },
    note: 'Big changes at home: a new cat moved in',
  },
};
Object.assign(ISSUES, {
  cold: {
    name: 'Sniffly cat cold', short: 'sniffly cold', treatment: 'shot', anim: 'hunch',
    cue: 'is sneezing and has a runny little nose',
    thought: 'sneeze',
    clues: { heart: ['A little wheezy when {she} breathes in.', 'Snuffly, wheezy breathing from a stuffed-up nose: an upper respiratory cat cold.'], eyes: ['Eyes a bit watery.', 'Watery eyes and a runny nose: classic cat-cold signs.'], thermo: ['A touch warm.', 'A mild fever (39.4 °C): {his} body is fighting a cold.'] },
    note: 'A cat cold (upper respiratory infection)',
  },
  injury: {
    name: 'Sprained leg', short: 'sprained leg', treatment: 'bandage', anim: 'lick',
    cue: 'is limping and holding one front leg up',
    thought: 'limp',
    clues: { paws: ['{She} flinches when you touch one front leg.', 'Front leg is swollen at the wrist but nothing is broken: a sprain from a bad jump.'], scale: ['{She} won\'t put weight on one leg on the scale.', 'Keeps all the weight off one front leg: a painful sprain.'] },
    note: 'Sprained a leg jumping down from somewhere high',
  },
  ear: {
    name: 'Ear infection', short: 'sore ear', treatment: 'meds', anim: 'scratch',
    cue: 'keeps shaking {his} head and tilting it to one side',
    thought: 'ear',
    clues: { eyes: ['One ear looks pink and a little waxy inside.', 'Red, waxy ear canal with a funny smell: a mild ear infection.'], thermo: ['Temperature normal.', 'Normal temperature: the problem is just in the ear.'], coat: ['Scratched fur behind one ear.', 'Fur is scratched thin behind one ear from all the itching.'] },
    note: 'Mild ear infection',
  },
});
export const ISSUE_IDS = Object.keys(ISSUES);

/**
 * Clinic care plans. After the gentle diagnosis the cat is admitted to a kennel.
 * first = done once at admission (on the exam table), daily = each day until healed,
 * days = how many days of full care it takes. Every day also has a gentle "check".
 * Missed doses only slow healing down (nothing bad ever happens).
 */
export const CARE = {
  shot: { label: 'Give a shot', supply: 'shot', icon: 'syringe', done: 'Gave a gentle shot' },
  meds: { label: 'Give medicine', supply: 'medicine', icon: 'pill', done: 'Gave today\'s medicine' },
  bandage: { label: 'Wrap a bandage', supply: 'bandage', icon: 'bandage', done: 'Wrapped a fresh bandage' },
  check: { label: 'Daily check & cuddle', supply: null, icon: 'steth', done: 'Daily check & cuddle' },
};
export const PLANS = {
  paw: { first: ['bandage'], daily: ['meds'], days: 2, text: 'Clean the sore pad, salve and a soft bandage, then soothing medicine each day.' },
  stomach: { first: [], daily: ['meds'], days: 2, text: 'Tummy-settling medicine each day and a bland diet in the kennel.' },
  fleas: { first: ['meds'], daily: [], days: 1, text: 'A gentle flea treatment, a comb-through and a day of rest.' },
  stress: { first: [], daily: [], days: 2, text: 'A quiet kennel with a blanket, and lots of calm daily check-ins.' },
  cold: { first: ['shot'], daily: ['meds'], days: 3, text: 'An antibiotic shot, then a dose of medicine every day while the sniffles clear.' },
  injury: { first: ['bandage'], daily: ['meds'], days: 3, text: 'A snug bandage wrap for the sprain and pain medicine each day. Lots of rest!' },
  ear: { first: ['shot'], daily: ['meds'], days: 2, text: 'An antibiotic shot and soothing ear drops each day.' },
};
/** Which issues can show up for a cat later on (not the new-cat stress). */
export const SICK_ISSUES = ['paw', 'stomach', 'fleas', 'cold', 'injury', 'ear'];

/* ---------------- generated arrivals (cats 4 to 10 and beyond) ---------------- */
export const COATS = [
  { look: 'orangeTabby', coat: 'Orange tabby', breeds: ['Domestic Shorthair', 'Domestic Longhair'], names: ['Marmalade', 'Ginger', 'Cheeto', 'Apricot'] },
  { look: 'tuxedo', coat: 'Black & white tuxedo', breeds: ['Domestic Shorthair', 'Domestic Medium-hair'], names: ['Domino', 'Tux', 'Penguin', 'Bow Tie'] },
  { look: 'creamPoint', coat: 'Cream with chocolate points', breeds: ['Siamese mix', 'Ragdoll mix', 'Birman mix'], names: ['Latte', 'Mocha', 'Snowpea', 'Cocoa'] },
  { look: 'greyTabby', coat: 'Silver-grey tabby', breeds: ['Domestic Shorthair', 'American Shorthair', 'Maine Coon mix'], names: ['Smokey', 'Pewter', 'Misty', 'Ash'] },
  { look: 'calico', coat: 'Calico (orange, black & white)', breeds: ['Domestic Shorthair', 'Japanese Bobtail mix'], names: ['Patches', 'Confetti', 'Quilt', 'Freckles'] },
  { look: 'black', coat: 'Glossy black', breeds: ['Bombay mix', 'Domestic Shorthair'], names: ['Midnight', 'Salem', 'Inky', 'Licorice'] },
  { look: 'white', coat: 'Snowy white', breeds: ['Turkish Angora mix', 'Domestic Longhair'], names: ['Snowball', 'Marshmallow', 'Pearl', 'Cloud'] },
  { look: 'tortie', coat: 'Tortoiseshell', breeds: ['Domestic Shorthair', 'British Shorthair mix'], names: ['Toffee', 'Truffle', 'Brownie', 'Mosaic'] },
  { look: 'russianBlue', coat: 'Soft blue-grey', breeds: ['Russian Blue mix', 'Chartreux mix', 'British Shorthair'], names: ['Blue', 'Storm', 'Velvet', 'Earl Grey'] },
  { look: 'brownTabby', coat: 'Brown mackerel tabby', breeds: ['Maine Coon mix', 'Norwegian Forest mix', 'Domestic Shorthair'], names: ['Hazelnut', 'Acorn', 'Tiger', 'Bramble'] },
  { look: 'creamTabby', coat: 'Cream tabby', breeds: ['Domestic Longhair', 'Persian mix'], names: ['Custard', 'Butterscotch', 'Honey', 'Shortbread'] },
];
const AGES = [
  ['about 4 months old (a kitten!)', 'Tiny needle-sharp kitten teeth: about 4 months old.', 0.75],
  ['about 8 months old', 'Brand-new adult teeth, sparkling white: about 8 months old.', 0.85],
  ['about 2 years old', 'Clean teeth with the tiniest bit of wear: about 2 years old.', 1],
  ['about 5 years old', 'Some tartar on the back teeth: about 5 years old.', 1.05],
  ['about 9 years old (a wise senior)', 'Worn, yellowed teeth: a distinguished senior, about 9 years old.', 1.05],
];
const TREATS = ['tuna flakes', 'chicken bites', 'salmon pâté', 'pumpkin purée', 'freeze-dried shrimp', 'turkey crumbles', 'a lick of plain yogurt'];
const NEIGHBORS = ['Mrs. Pennywhistle', 'old Mr. Haverford', 'the Okafor family', 'young Pip from the bakery', 'Miss Delphine', 'the Larsen twins'];
const FOSTER_WHY = ['is off visiting family for a few weeks', 'found a kitten under the hedge', 'just moved somewhere with no pets allowed', 'is going into the hospital for a while'];
const STRAY_SPOTS = [{ x: -15.6, z: 1.6 }, { x: 3.6, z: 11.2 }, { x: -6.5, z: -4.0 }, { x: 15.5, z: 2.5 }];
export const SOURCES = {
  rescue: { from: 'Rescue', arrival: 'gate' },
  shelter: { from: 'Shelter transfer', arrival: 'gate' },
  stray: { from: 'Befriended stray', arrival: 'stray' },
  foster: { from: 'Neighbor foster', arrival: 'gate' },
};

/** Make a brand-new cat for the sanctuary (stored in the save, so it stays the same cat). */
export function makeCatDef(id, takenNames = [], rand = Math.random) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const coat = pick(COATS), [age, ageClue, ageScale] = pick(AGES);
  const source = pick(['rescue', 'rescue', 'shelter', 'shelter', 'stray', 'foster']);
  const sex = rand() < 0.5 ? 'girl' : 'boy';
  let sourceLabel;
  if (source === 'rescue') sourceLabel = pick(['Rescue from the Whiskerton Rescue League', 'Rescued from a rainy storm drain by the fire brigade', 'Rescue from a busy farm down the lane']);
  else if (source === 'shelter') sourceLabel = pick(['Transfer from the Paws & Whiskers Shelter', 'Transfer from the overcrowded city shelter', 'Transfer from the Hilltop Animal Shelter']);
  else if (source === 'stray') sourceLabel = 'A shy stray who wandered into the sanctuary';
  else sourceLabel = `Foster from ${pick(NEIGHBORS)}, who ${pick(FOSTER_WHY)}`;
  // strays and rescues more often arrive a little unwell
  const sickChance = source === 'stray' ? 0.55 : source === 'rescue' ? 0.4 : 0.25;
  const starterIssue = rand() < sickChance ? pick(['fleas', 'paw', 'cold', 'injury', 'ear', 'cold']) : null;
  const pool = [...coat.names, ...RANDOM_NAMES].filter((n) => !takenNames.includes(n));
  const names = [];
  while (names.length < 4 && pool.length) names.push(pool.splice(Math.floor(rand() * Math.min(pool.length, names.length < 2 ? coat.names.length : pool.length)), 1)[0]);
  const scale = +(ageScale * (0.92 + rand() * 0.16)).toFixed(2);
  return {
    id, generated: true, arriveDay: 0, source, sourceLabel,
    arrival: SOURCES[source].arrival,
    spawn: SOURCES[source].arrival === 'stray' ? pick(STRAY_SPOTS) : { x: rand() < 0.5 ? 1.2 : -1.2, z: 14.2 },
    sex, breed: pick(coat.breeds), coat: coat.coat, look: coat.look, scale,
    personality: pick(PERSONALITY_IDS), age, ageClue,
    weight: +(2 + ageScale * 2.6 + rand() * 0.9).toFixed(1), temp: +(38.3 + rand() * 0.5).toFixed(1),
    favToy: pick(['wand', 'yarn']), favSpot: pick(Object.keys(SPOTS)), favTreat: pick(TREATS),
    starterIssue, names,
  };
}

/** People who come by to adopt a cat. */
export const ADOPTERS = [
  { name: 'Mrs. Pennywhistle', who: 'a retired piano teacher with a sunny window seat', coat: '#c8aaf2', hat: '#f7a8c4' },
  { name: 'The Okafor family', who: 'a family with two gentle kids and a big garden', coat: '#9fd0ef', hat: '#ffd76e' },
  { name: 'Mr. Haverford', who: 'a quiet bookshop owner who needs a shop cat', coat: '#9fe0b8', hat: '#8c6a5a' },
  { name: 'Miss Delphine', who: 'a painter with a cozy studio flat', coat: '#ff9f85', hat: '#5b4256' },
  { name: 'The Larsen twins', who: 'college students sharing a sunny cottage', coat: '#ffd76e', hat: '#9fd0ef' },
  { name: 'Nana Rosa', who: 'a grandma who knits tiny cat blankets', coat: '#f7a8c4', hat: '#c8aaf2' },
];
export const MAX_CATS = 10;

/** Bond levels and what each one unlocks. */
export const BOND_LEVELS = [
  { xp: 0, label: 'Stranger' },
  { xp: 3, label: 'Curious', unlock: 'trills hello when you come near' },
  { xp: 8, label: 'Friend', unlock: 'follows you around sometimes' },
  { xp: 15, label: 'Buddy', unlock: 'naps near you when you rest' },
  { xp: 25, label: 'Best friend', unlock: 'brings you little gifts' },
  { xp: 40, label: 'Soulmate', unlock: 'curls up with you every night' },
];
export function bondLevel(xp) { let l = 0; BOND_LEVELS.forEach((b, i) => { if (xp >= b.xp) l = i; }); return l; }

/** Vet Knowledge levels (rise with Welcome Vet Checks and treated cases). */
export const VET_LEVELS = [0, 3, 8, 15, 25];
export function vetLevel(xp) { let l = 1; VET_LEVELS.forEach((v, i) => { if (xp >= v) l = i + 1; }); return l; }

/** Swap {she}/{her}/{he}/{him}/{his} for the cat's pronouns. */
export function pron(text, cat) {
  const girl = cat.sex === 'girl';
  return text.replace(/\{(she|he)\}/g, girl ? 'she' : 'he').replace(/\{(her|him)\}/g, girl ? 'her' : 'him').replace(/\{his\}/g, girl ? 'her' : 'his')
    .replace(/\{She\}/g, girl ? 'She' : 'He');
}
