// Everything the sanctuary knows about cats: the starter cats, personalities,
// favorite things, gentle Tier 1 vet cases and the treatments for them.

/** Personalities and how they gently change the sim. */
export const PERSONALITIES = {
  affectionate: { label: 'Affectionate', blurb: 'Loves cuddles and follows you around.', hint: 'She rubs her cheek on your hand and starts purring right away.', affectionDecay: 1.2, bondGain: 1.2, settle: null },
  playful: { label: 'Playful', blurb: 'Bouncy, curious and always ready for a game.', hint: 'She keeps batting at your stethoscope. Someone wants to play!', funDecay: 1.4, bondGain: 1.0, settle: 'Dangle a toy to keep her still' },
  shy: { label: 'Shy', blurb: 'Gentle and cautious. Trust grows slowly but deeply.', hint: 'He tucks his tail and watches you with big round eyes.', affectionDecay: 0.8, bondGain: 0.7, settle: 'Offer a slow blink and a gentle chin scratch' },
  independent: { label: 'Independent', blurb: 'Does things on their own terms.', hint: 'Sits calmly and looks a little unimpressed by all the fuss.', affectionDecay: 0.6, bondGain: 0.9, settle: null },
  'food-motivated': { label: 'Food-motivated', blurb: 'Will do anything for a snack.', hint: 'Sniffs your apron pocket, hoping for a treat.', hungerDecay: 1.3, bondGain: 1.0, settle: 'Offer a little treat' },
};

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
export const ISSUE_IDS = Object.keys(ISSUES);

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
