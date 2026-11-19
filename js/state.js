// Game state for the sanctuary sim: what's in the garden, the pantry and her pockets.
// The whole object is saved into a browser save slot (see saves.js), so everything here is plain JSON.
export const STATE_VERSION = 2;

/** Granny's coffee: seconds of speed boost per cup, and seconds before the percolator has a fresh pot. */
export const COFFEE_SECONDS = 45, COFFEE_PERK = 60, COFFEE_SPEED = 1.8;

/** Crops you can grow. hours = watered in-game hours needed to ripen, food = home-cooked meals it makes for Granny. */
export const CROPS = {
  carrot: { name: 'Carrot', plural: 'Carrots', hours: 12, food: 1, color: '#f59a4f' },
  cabbage: { name: 'Cabbage', plural: 'Cabbages', hours: 20, food: 2, color: '#9edb7f' },
  pumpkin: { name: 'Pumpkin', plural: 'Pumpkins', hours: 32, food: 3, color: '#f5a35c' },
  // a cat-safe herb: not cooked into food, it's used by the vet to make remedies work faster
  chamomile: { name: 'Chamomile', plural: 'Chamomile', hours: 16, food: 0, herb: true, color: '#fff6d6' },
  // a cat treat: hand it to a cat for a burst of happiness (and bond)
  catnip: { name: 'Catnip', plural: 'Catnip', hours: 14, food: 0, treat: true, color: '#8fd36f' },
};
export const FOOD_CROPS = Object.keys(CROPS).filter((c) => CROPS[c].food > 0);
export const CROP_IDS = Object.keys(CROPS);
/** The seed club's daily mail: 3 random packets each morning, picked with these weights. Mail waits in the box (up to MAIL_MAX packets). */
export const MAIL_SEEDS = 3, MAIL_MAX = 9;
export const MAIL_WEIGHTS = { carrot: 3, cabbage: 2.5, pumpkin: 1.5, chamomile: 1.5, catnip: 1.5 };

/** The Farmers Market (roadside stand). price in coins; give = what gets delivered to the porch. */
export const SHOP = [
  { id: 'foodBag', name: 'Cat food bag', desc: '6 portions for the Cats\' House bowls', price: 12, icon: 'food', give: { food: 6 } },
  { id: 'medicine', name: 'Medicine', desc: 'One daily dose (pills or drops)', price: 5, icon: 'pill', give: { supplies: { medicine: 1 } } },
  { id: 'shot', name: 'Shot', desc: 'Vaccine / antibiotic injection', price: 9, icon: 'syringe', give: { supplies: { shot: 1 } } },
  { id: 'bandage', name: 'Bandage roll', desc: 'Soft wrap for sprains and sore paws', price: 4, icon: 'bandage', give: { supplies: { bandage: 1 } } },
  { id: 'catnipSeeds', name: 'Catnip seeds', desc: '2 packets: grow cat treats', price: 4, icon: 'catnip', give: { seeds: { catnip: 2 } } },
  { id: 'veggieSeeds', name: 'Veggie seeds', desc: '2 carrot, 1 cabbage, 1 pumpkin (your meals)', price: 4, icon: 'carrot', give: { seeds: { carrot: 2, cabbage: 1, pumpkin: 1 } } },
  { id: 'yarn', name: 'Yarn', desc: '2 balls: knit cat sweaters and hats (Knitting emote, T)', price: 5, icon: 'yarn', give: { yarn: 2 } },
  { id: 'bait', name: 'Worm bait', desc: '5 juicy worms for fishing at the pond', price: 3, icon: 'worm', give: { bait: 5 } },
  { id: 'chamomileSeeds', name: 'Chamomile seeds', desc: '2 packets: speeds up remedies', price: 3, icon: 'chamomile', give: { seeds: { chamomile: 2 } } },
];
export const DISHES_MAX = 8;
/** Knitted cat costumes (made with the Knitting emote, 1 yarn each). */
export const COSTUMES = { sweater: { name: 'Knit sweater', icon: '🧶' }, hat: { name: 'Bobble hat', icon: '🧢' } };
export const HAIRBALL_MAX = 6;
export const SUPPLY_LABELS = { medicine: 'Medicine', shot: 'Shots', bandage: 'Bandages' };

export function defaultState(tileCount) {
  return {
    version: STATE_VERSION,
    day: 1, hour: 7,                                  // in-game clock
    seeds: { carrot: 6, cabbage: 3, pumpkin: 2, chamomile: 2, catnip: 3 },     // seed packets in her apron
    crops: { carrot: 0, cabbage: 0, pumpkin: 0, chamomile: 0, catnip: 1 },     // harvested (veggies get cooked into her meals)
    food: 12,                                         // cat food portions in the pantry (a starter bag or two)
    coins: 60,                                        // sanctuary coins: adoption fees + the donation jar
    supplies: { medicine: 3, shot: 1, bandage: 2 },   // clinic supplies (order more at the Farmers Market)
    meals: 2,                                         // home-cooked meals for Granny herself
    yarn: 2, bait: 0,                                 // knitting yarn and fishing worms (Farmers Market)
    wardrobe: { sweater: 0, hat: 0 },                 // knitted costumes not being worn yet
    hairballs: [],                                    // {x, z} gross little surprises to scoop up
    bingo: { last: 0, wins: 0, games: 0 },            // bingo night (every 7th day): last day she went
    dishes: 0,                                        // dirty dishes stacked by the kitchen sink (cooking and eating make more)
    lady: { hunger: 85, energy: 100, coffee: 0, perk: 0 }, // her own soft needs; coffee = seconds of zoom left, perk = seconds until a fresh pot
    adopted: [], visitor: null, nextCat: 4,
    water: 10, waterMax: 10,                          // watering can
    tool: 0, seedType: 'carrot',
    mail: { seeds: {}, day: 0 },                      // seed packets waiting in the mailbox; day = last morning mail came
    market: { pending: null, parcels: [] },           // Farmers Market: ordered but not yet on the porch, and parcels waiting on the porch
    // tile.state: 'grass' | 'plowed' | 'planted'; growth 0..1 (1 = ripe, and it stays ripe); wet resets each dawn
    tiles: Array.from({ length: tileCount }, () => ({ state: 'grass', crop: null, growth: 0, wet: false, used: 1 })), // used = last day the plot was worked
    stats: { plowed: 0, planted: 0, watered: 0, harvested: 0, cooked: 0 },
    // the cats (filled in by cats.js), vet cases, the journal and the litter box
    cats: [], cases: [], journal: { moments: [], vetXP: 0 }, litter: 0, flags: {},
    litterBoxes: null, bowls: {},                    // Cats' House: litter box levels (0 clean..1) and which bowls are full
    ladyPos: null,                                    // where she was standing when the game was saved
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Merge a nested object of numbers/strings/bools with its defaults, dropping wrong types. */
function mergeShallow(def, got) {
  const out = { ...def };
  if (!isObj(got)) return out;
  for (const [k, v] of Object.entries(got)) {
    if (!(k in def)) { out[k] = v; continue; }           // extra keys (e.g. new stats) are fine
    if (typeof def[k] === 'number') out[k] = num(v, def[k]);
    else if (typeof v === typeof def[k] || def[k] === null) out[k] = v;
  }
  return out;
}

/**
 * Rebuild a full, valid game state from a saved one (any older version). Missing or broken fields fall
 * back to defaults, so an old or partly damaged save still loads. Throws only if it isn't a state at all.
 */
export function restoreState(saved, tileCount) {
  const fresh = defaultState(tileCount);
  if (!isObj(saved)) throw new Error('not a saved state');
  const s = { ...saved };
  // v1 saves from before the coin economy: give them the new starter pack once
  if (s.coins === undefined) { s.coins = fresh.coins; s.food = Math.max(num(s.food, 0), 8); }
  const out = { ...fresh };
  for (const [k, v] of Object.entries(s)) {
    if (k === 'version') continue;
    const d = fresh[k];
    if (d === undefined) out[k] = v;                                     // unknown extras: keep (future features)
    else if (typeof d === 'number') out[k] = num(v, d);
    else if (typeof d === 'string') out[k] = typeof v === 'string' ? v : d;
    else if (Array.isArray(d)) out[k] = Array.isArray(v) ? v : d;
    else if (d === null) out[k] = v ?? null;
    else if (isObj(d)) out[k] = (k === 'bowls' || k === 'flags') ? (isObj(v) ? { ...d, ...v } : d) : mergeShallow(d, v);
  }
  out.version = STATE_VERSION;
  // clock, tools and seeds
  out.day = Math.max(1, Math.floor(out.day));
  out.hour = Math.min(22, Math.max(0, out.hour));
  if (!CROP_IDS.includes(out.seedType)) out.seedType = 'carrot';
  out.tool = Math.min(3, Math.max(0, Math.floor(out.tool)));
  out.coins = Math.max(0, out.coins); out.food = Math.max(0, out.food);
  // garden plots: keep what we can, pad/trim to the current garden size
  const tiles = out.tiles.slice(0, tileCount).map((t) => {
    if (!isObj(t)) return { state: 'grass', crop: null, growth: 0, wet: false };
    const st = ['grass', 'plowed', 'planted'].includes(t.state) ? t.state : 'grass';
    const crop = st === 'planted' && CROPS[t.crop] ? t.crop : null;
    return { ...t, state: crop || st !== 'planted' ? st : 'plowed', crop, growth: crop ? Math.min(1, Math.max(0, num(t.growth, 0))) : 0, wet: !!t.wet, used: Math.min(out.day, Math.max(0, Math.floor(num(t.used, out.day)))) };
  });
  while (tiles.length < tileCount) tiles.push({ state: 'grass', crop: null, growth: 0, wet: false, used: out.day });
  out.tiles = tiles;
  // cats: only well-formed entries (cats.js fills in any missing needs/fields)
  out.cats = out.cats.filter((c) => isObj(c) && typeof c.id === 'string').map((c) => {
    const cc = { ...c };
    if (!isObj(cc.pos) || !Number.isFinite(cc.pos.x) || !Number.isFinite(cc.pos.z)) delete cc.pos;
    if (!isObj(cc.needs)) delete cc.needs;
    if (cc.def !== undefined && !isObj(cc.def)) delete cc.def;
    return cc;
  });
  out.cases = out.cases.filter(isObj);
  out.adopted = out.adopted.filter(isObj);
  out.journal.moments = Array.isArray(out.journal.moments) ? out.journal.moments.filter(isObj) : [];
  if (out.litterBoxes !== null && !Array.isArray(out.litterBoxes)) out.litterBoxes = null;
  if (out.visitor !== null && !isObj(out.visitor)) out.visitor = null;
  // mailbox + deliveries
  const cleanCounts = (o, keys) => { const r = {}; if (isObj(o)) for (const k of keys) { const n = Math.floor(num(o[k], 0)); if (n > 0) r[k] = Math.min(999, n); } return r; };
  const cleanGive = (gv) => {
    if (!isObj(gv)) return null;
    const r = {}; const f = Math.floor(num(gv.food, 0)); if (f > 0) r.food = Math.min(999, f);
    const sp = cleanCounts(gv.supplies, Object.keys(SUPPLY_LABELS)); if (Object.keys(sp).length) r.supplies = sp;
    const sd = cleanCounts(gv.seeds, CROP_IDS); if (Object.keys(sd).length) r.seeds = sd;
    for (const k of ['yarn', 'bait']) { const n = Math.floor(num(gv[k], 0)); if (n > 0) r[k] = Math.min(999, n); }
    return Object.keys(r).length ? r : null;
  };
  out.mail = { seeds: cleanCounts(out.mail && out.mail.seeds, CROP_IDS), day: Math.max(0, Math.floor(num(out.mail && out.mail.day, 0))) };
  const mk = isObj(out.market) ? out.market : {};
  out.market = { pending: cleanGive(mk.pending), parcels: (Array.isArray(mk.parcels) ? mk.parcels : []).map(cleanGive).filter(Boolean).slice(0, 12) };
  delete out.seedBoxDay;
  out.yarn = Math.min(999, Math.max(0, Math.floor(out.yarn))); out.bait = Math.min(999, Math.max(0, Math.floor(out.bait)));
  out.wardrobe = { sweater: Math.max(0, Math.floor(num(out.wardrobe.sweater, 0))), hat: Math.max(0, Math.floor(num(out.wardrobe.hat, 0))) };
  out.hairballs = out.hairballs.filter((h) => isObj(h) && Number.isFinite(h.x) && Number.isFinite(h.z)).slice(0, HAIRBALL_MAX);
  out.bingo = { last: Math.max(0, Math.floor(num(out.bingo.last, 0))), wins: Math.max(0, Math.floor(num(out.bingo.wins, 0))), games: Math.max(0, Math.floor(num(out.bingo.games, 0))) };
  out.dishes = Math.min(DISHES_MAX, Math.max(0, Math.floor(out.dishes)));
  out.lady.hunger = Math.min(100, Math.max(0, out.lady.hunger));
  out.lady.energy = Math.min(100, Math.max(0, out.lady.energy));
  out.lady.coffee = Math.min(COFFEE_SECONDS, Math.max(0, +out.lady.coffee || 0));
  out.lady.perk = Math.min(COFFEE_PERK, Math.max(0, +out.lady.perk || 0));
  if (!isObj(out.ladyPos) || !Number.isFinite(out.ladyPos.x) || !Number.isFinite(out.ladyPos.z)) out.ladyPos = null;
  return out;
}
