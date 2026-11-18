// Game state for the sanctuary sim: what's in the garden, the pantry and her pockets.
// The whole object is saved into a browser save slot (see saves.js), so everything here is plain JSON.
export const STATE_VERSION = 2;

/** Crops you can grow. hours = watered in-game hours needed to ripen, food = home-cooked meals it makes for the Crazy Cat Lady. */
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
export const DAILY_SEEDS = { carrot: 2, cabbage: 1, pumpkin: 1, chamomile: 1, catnip: 1 };

/** The Supply Shelf (Whisker Supply Co. stall). price in coins; give = what you get. */
export const SHOP = [
  { id: 'foodBag', name: 'Cat food bag', desc: '6 portions for the Cats\' House bowls', price: 12, icon: 'food', give: { food: 6 } },
  { id: 'medicine', name: 'Medicine', desc: 'One daily dose (pills or drops)', price: 5, icon: 'pill', give: { supplies: { medicine: 1 } } },
  { id: 'shot', name: 'Shot', desc: 'Vaccine / antibiotic injection', price: 9, icon: 'syringe', give: { supplies: { shot: 1 } } },
  { id: 'bandage', name: 'Bandage roll', desc: 'Soft wrap for sprains and sore paws', price: 4, icon: 'bandage', give: { supplies: { bandage: 1 } } },
  { id: 'catnipSeeds', name: 'Catnip seeds', desc: '2 packets: grow cat treats', price: 4, icon: 'catnip', give: { seeds: { catnip: 2 } } },
  { id: 'veggieSeeds', name: 'Veggie seeds', desc: '2 carrot, 1 cabbage, 1 pumpkin (your meals)', price: 4, icon: 'carrot', give: { seeds: { carrot: 2, cabbage: 1, pumpkin: 1 } } },
  { id: 'chamomileSeeds', name: 'Chamomile seeds', desc: '2 packets: speeds up remedies', price: 3, icon: 'chamomile', give: { seeds: { chamomile: 2 } } },
];
export const SUPPLY_LABELS = { medicine: 'Medicine', shot: 'Shots', bandage: 'Bandages' };

export function defaultState(tileCount) {
  return {
    version: STATE_VERSION,
    day: 1, hour: 7,                                  // in-game clock
    seeds: { carrot: 6, cabbage: 3, pumpkin: 2, chamomile: 2, catnip: 3 },     // seed packets in her apron
    crops: { carrot: 0, cabbage: 0, pumpkin: 0, chamomile: 0, catnip: 1 },     // harvested (veggies get cooked into her meals)
    food: 12,                                         // cat food portions in the pantry (a starter bag or two)
    coins: 60,                                        // sanctuary coins: adoption fees + the donation jar
    supplies: { medicine: 3, shot: 1, bandage: 2 },   // clinic supplies (refill at the Supply Shelf)
    meals: 2,                                         // home-cooked meals for the Crazy Cat Lady herself
    lady: { hunger: 85, energy: 100 },                // her own soft needs (only slow her down a little)
    adopted: [], visitor: null, nextCat: 4,
    water: 10, waterMax: 10,                          // watering can
    tool: 0, seedType: 'carrot',
    seedBoxDay: 0,                                    // last day the free seed box was collected
    // tile.state: 'grass' | 'plowed' | 'planted'; growth 0..1 (1 = ripe, and it stays ripe); wet resets each dawn
    tiles: Array.from({ length: tileCount }, () => ({ state: 'grass', crop: null, growth: 0, wet: false })),
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
    return { ...t, state: crop || st !== 'planted' ? st : 'plowed', crop, growth: crop ? Math.min(1, Math.max(0, num(t.growth, 0))) : 0, wet: !!t.wet };
  });
  while (tiles.length < tileCount) tiles.push({ state: 'grass', crop: null, growth: 0, wet: false });
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
  if (!isObj(out.ladyPos) || !Number.isFinite(out.ladyPos.x) || !Number.isFinite(out.ladyPos.z)) out.ladyPos = null;
  return out;
}
