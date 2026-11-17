// Game state for the sanctuary sim: what's in the garden, the pantry and her pockets.
// Saved to localStorage so your garden is still there next visit.
const KEY = 'ccl-sanctuary-save-v1';

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
    version: 1,
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
  };
}

export function loadState(tileCount) {
  const fresh = defaultState(tileCount);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Array.isArray(s.tiles) || s.tiles.length !== tileCount) return fresh;
    // older saves: crops used to become cat food. Give them the new economy's starter pack once.
    if (s.coins === undefined) { s.coins = fresh.coins; s.food = Math.max(s.food || 0, 8); }
    return { ...fresh, ...s, seeds: { ...fresh.seeds, ...s.seeds }, crops: { ...fresh.crops, ...s.crops }, supplies: { ...fresh.supplies, ...s.supplies }, lady: { ...fresh.lady, ...s.lady }, stats: { ...fresh.stats, ...s.stats }, journal: { ...fresh.journal, ...s.journal }, flags: { ...fresh.flags, ...s.flags } };
  } catch { return fresh; }
}

export function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. */ } }
export function clearState() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
