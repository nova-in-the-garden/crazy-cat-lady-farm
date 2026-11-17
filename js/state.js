// Game state for the sanctuary sim: what's in the garden, the pantry and her pockets.
// Saved to localStorage so your garden is still there next visit.
const KEY = 'ccl-sanctuary-save-v1';

/** Crops you can grow. hours = watered in-game hours needed to ripen, food = cat food portions it cooks into. */
export const CROPS = {
  carrot: { name: 'Carrot', plural: 'Carrots', hours: 12, food: 1, color: '#f59a4f' },
  cabbage: { name: 'Cabbage', plural: 'Cabbages', hours: 20, food: 2, color: '#9edb7f' },
  pumpkin: { name: 'Pumpkin', plural: 'Pumpkins', hours: 32, food: 4, color: '#f5a35c' },
  // a cat-safe herb: not cooked into food, it's used by the vet to make remedies work faster
  chamomile: { name: 'Chamomile', plural: 'Chamomile', hours: 16, food: 0, herb: true, color: '#fff6d6' },
};
export const FOOD_CROPS = Object.keys(CROPS).filter((c) => !CROPS[c].herb);
export const CROP_IDS = Object.keys(CROPS);
export const DAILY_SEEDS = { carrot: 3, cabbage: 2, pumpkin: 1, chamomile: 1 };

export function defaultState(tileCount) {
  return {
    version: 1,
    day: 1, hour: 7,                                  // in-game clock
    seeds: { carrot: 6, cabbage: 3, pumpkin: 2, chamomile: 2 },     // seed packets in her apron
    crops: { carrot: 0, cabbage: 0, pumpkin: 0, chamomile: 0 },     // harvested, waiting to be cooked
    food: 4,                                          // cat food portions in the pantry (a small starter sack)
    water: 10, waterMax: 10,                          // watering can
    tool: 0, seedType: 'carrot',
    seedBoxDay: 0,                                    // last day the free seed box was collected
    // tile.state: 'grass' | 'plowed' | 'planted'; growth 0..1 (1 = ripe, and it stays ripe); wet resets each dawn
    tiles: Array.from({ length: tileCount }, () => ({ state: 'grass', crop: null, growth: 0, wet: false })),
    stats: { plowed: 0, planted: 0, watered: 0, harvested: 0, cooked: 0 },
    // the cats (filled in by cats.js), vet cases, the journal and the litter box
    cats: [], cases: [], journal: { moments: [], vetXP: 0 }, litter: 0, flags: {},
  };
}

export function loadState(tileCount) {
  const fresh = defaultState(tileCount);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Array.isArray(s.tiles) || s.tiles.length !== tileCount) return fresh;
    return { ...fresh, ...s, seeds: { ...fresh.seeds, ...s.seeds }, crops: { ...fresh.crops, ...s.crops }, stats: { ...fresh.stats, ...s.stats }, journal: { ...fresh.journal, ...s.journal }, flags: { ...fresh.flags, ...s.flags } };
  } catch { return fresh; }
}

export function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. */ } }
export function clearState() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
