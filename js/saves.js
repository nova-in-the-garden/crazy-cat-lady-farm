// Save slots: every visitor keeps up to three sanctuaries in their own browser (localStorage, no server).
// A slot holds a small envelope { format, saveVersion, savedAt, state }. Loading is forgiving:
// missing fields fall back to defaults (see restoreState in state.js) and a damaged slot never crashes the game.
export const SLOT_COUNT = 3;
export const SAVE_VERSION = 2;
const PREFIX = 'ccl-sanctuary-slot-';
const LEGACY_KEY = 'ccl-sanctuary-save-v1';   // the single save from before slots existed
const LAST_KEY = 'ccl-sanctuary-last-slot';
const FORMAT = 'ccl-sanctuary-save';

const keyOf = (slot) => `${PREFIX}${slot}`;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

/** True if this browser lets us save at all (private mode on some browsers says no). */
export function storageWorks() {
  try { localStorage.setItem('ccl-probe', '1'); localStorage.removeItem('ccl-probe'); return true; } catch { return false; }
}

/** Move the old single save into slot 1 (once). */
export function migrateLegacy() {
  const old = store.get(LEGACY_KEY);
  if (!old) return;
  if (!store.get(keyOf(1))) {
    try {
      const state = JSON.parse(old);
      if (state && typeof state === 'object') store.set(keyOf(1), JSON.stringify(envelope(state)));
      else store.set(`${keyOf(1)}-damaged`, old);
    } catch { store.set(`${keyOf(1)}-damaged`, old); }
  }
  store.del(LEGACY_KEY);
}

function envelope(state) { return { format: FORMAT, saveVersion: SAVE_VERSION, savedAt: Date.now(), state }; }

/** A quick look at a saved state for the slot cards. */
export function summarize(state, savedAt) {
  const cats = Array.isArray(state.cats) ? state.cats.filter((c) => c && c.joined) : [];
  return {
    day: Number.isFinite(state.day) ? state.day : 1,
    hour: Number.isFinite(state.hour) ? state.hour : 7,
    coins: Number.isFinite(state.coins) ? Math.round(state.coins) : 0,
    cats: cats.length,
    names: cats.filter((c) => c.named && c.name).map((c) => String(c.name)).slice(0, 4),
    savedAt: Number.isFinite(savedAt) ? savedAt : 0,
  };
}

/** Pull the state out of whatever is in a slot (or a pasted code). Throws if it isn't a save. */
function unwrap(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('not a save');
  // envelope (v2+) or a bare v1 state
  const state = obj.format === FORMAT ? obj.state : obj;
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('no state');
  if (!('day' in state) && !('tiles' in state) && !('cats' in state)) throw new Error('not a sanctuary');
  return { state, savedAt: obj.savedAt };
}

/** { status: 'empty' | 'ok' | 'corrupt', state?, summary? } */
export function readSlot(slot) {
  const raw = store.get(keyOf(slot));
  if (!raw) return { status: 'empty', slot };
  try {
    const { state, savedAt } = unwrap(JSON.parse(raw));
    return { status: 'ok', slot, state, summary: summarize(state, savedAt) };
  } catch { return { status: 'corrupt', slot }; }
}

export function listSlots() { return Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(i + 1)); }

export function writeSlot(slot, state) {
  const ok = store.set(keyOf(slot), JSON.stringify(envelope(state)));
  if (ok) store.set(LAST_KEY, String(slot));
  return ok;
}

/** Delete a slot. A damaged save is kept aside (…-damaged) just in case, never silently lost. */
export function deleteSlot(slot) {
  const r = readSlot(slot);
  if (r.status === 'corrupt') store.set(`${keyOf(slot)}-damaged`, store.get(keyOf(slot)));
  store.del(keyOf(slot));
  if (store.get(LAST_KEY) === String(slot)) store.del(LAST_KEY);
}

export function lastSlot() {
  const n = Number(store.get(LAST_KEY));
  return n >= 1 && n <= SLOT_COUNT ? n : 0;
}

/* ---------- Export / import: a short text code (or a small file) to move a save between devices ---------- */
const b64 = {
  enc(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; },
};
async function pipe(bytes, Stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('gzip'))).arrayBuffer()); }

/** Turn a slot into a code like "CCL2z.H4sI…" (gzip when the browser can, plain otherwise). */
export async function exportCode(slot) {
  const raw = store.get(keyOf(slot));
  if (!raw) throw new Error('empty slot');
  const bytes = new TextEncoder().encode(raw);
  if (typeof CompressionStream === 'function') {
    try { return `CCL2z.${b64.enc(await pipe(bytes, CompressionStream))}`; } catch { /* fall through */ }
  }
  return `CCL2.${b64.enc(bytes)}`;
}

/** Read a code (or the text of a save file). Returns { state, summary } or throws with a friendly message. */
export async function parseCode(text) {
  const t = String(text || '').trim().replace(/\s+/g, '');
  let json;
  try {
    if (t.startsWith('CCL2z.')) {
      if (typeof DecompressionStream !== 'function') throw new Error('old browser');
      json = new TextDecoder().decode(await pipe(b64.dec(t.slice(6)), DecompressionStream));
    } else if (t.startsWith('CCL2.')) json = new TextDecoder().decode(b64.dec(t.slice(5)));
    else json = String(text).trim(); // a raw JSON save file
    const { state, savedAt } = unwrap(JSON.parse(json));
    return { state, summary: summarize(state, savedAt) };
  } catch (e) {
    throw new Error(e.message === 'old browser' ? 'This browser can\'t unpack that code. Try a newer browser.' : 'Hmm, that doesn\'t look like a sanctuary save code. Check you copied all of it?');
  }
}

/** Put an imported state into a slot (keeps the original save time if it had one). */
export function importToSlot(slot, state) { return writeSlot(slot, state); }

/** Remember to jump straight into a slot after the page reloads (New Game / Main menu). */
export function setAutostart(slot, fresh) { try { sessionStorage.setItem('ccl-autostart', JSON.stringify({ slot, fresh: !!fresh })); } catch { /* ignore */ } }
export function takeAutostart() {
  try { const v = JSON.parse(sessionStorage.getItem('ccl-autostart') || 'null'); sessionStorage.removeItem('ccl-autostart'); return v && v.slot ? v : null; } catch { return null; }
}
