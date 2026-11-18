// The start screen: Continue / New Game and three save slots (each with a summary, delete, export, import).
import { listSlots, readSlot, deleteSlot, lastSlot, exportCode, parseCode, importToSlot, storageWorks, SLOT_COUNT } from './saves.js';

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function ago(ms) {
  if (!ms) return '';
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return 'saved just now';
  if (s < 3600) return `saved ${Math.round(s / 60)} min ago`;
  if (s < 86400) return `saved ${Math.round(s / 3600)} h ago`;
  return `saved ${new Date(ms).toLocaleDateString()}`;
}
function clock(h) { const hh = Math.floor(h), h12 = ((hh + 11) % 12) + 1; return `${h12} ${hh < 12 ? 'AM' : 'PM'}`; }
export function describe(sum) {
  return `Day ${sum.day} · ${sum.cats} cat${sum.cats === 1 ? '' : 's'} · ${sum.coins} coins`;
}

/** A small cozy dialog. buttons: [{ label, cls, value }]. Resolves with the clicked value (or null on backdrop/Esc). */
export function dialog({ title, html = '', buttons, setup }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div'); wrap.id = 'save-dialog';
    wrap.innerHTML = `<div class="dlg" role="dialog" aria-modal="true"><h2>${title}</h2>${html}<div class="row"></div></div>`;
    const row = wrap.querySelector('.row');
    const done = (v) => { removeEventListener('keydown', key, true); wrap.remove(); resolve(v); };
    const key = (e) => { if (e.code === 'Escape') { e.stopPropagation(); done(null); } else e.stopPropagation(); };
    buttons.forEach((b) => {
      const el = document.createElement('button'); el.type = 'button'; el.className = `sbtn ${b.cls || ''}`; el.textContent = b.label;
      if (b.id) el.id = b.id;
      el.addEventListener('click', async () => { if (b.check && !(await b.check(wrap))) return; done(b.value ?? b.label); });
      row.appendChild(el);
    });
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) done(null); });
    addEventListener('keydown', key, true);
    document.body.appendChild(wrap);
    setup && setup(wrap);
  });
}

export function initStartScreen({ onPlay }) {
  const btn = document.getElementById('start-btn'), list = document.getElementById('slots'), note = document.getElementById('save-note');
  let busy = false;
  if (!storageWorks()) note.textContent = 'Heads up: this browser is blocking storage (private mode?), so progress can\'t be saved here.';

  const play = (slot, state) => { if (busy) return; busy = true; onPlay(slot, state); };
  const firstEmpty = () => listSlots().find((s) => s.status === 'empty')?.slot || 0;

  async function newGame(slot) {
    const r = readSlot(slot);
    if (r.status === 'ok') {
      const yes = await dialog({
        title: `Start over in Slot ${slot}?`,
        html: `<p>This replaces <b>${esc(describe(r.summary))}</b>${r.summary.names.length ? ` (${esc(r.summary.names.join(', '))})` : ''}. Your cats, garden, coins and journal in this slot will be gone for good.</p>`,
        buttons: [{ label: 'Keep my save', value: false }, { label: 'Yes, start over', cls: 'danger solid', value: true, id: 'confirm-new' }],
      });
      if (!yes) return;
    }
    play(slot, null);
  }

  async function remove(slot) {
    const r = readSlot(slot);
    const yes = await dialog({
      title: `Delete Slot ${slot}?`,
      html: r.status === 'ok' ? `<p>Delete <b>${esc(describe(r.summary))}</b>? This can't be undone.</p>` : '<p>Clear this damaged save? (A backup copy is tucked away in this browser just in case.)</p>',
      buttons: [{ label: 'Cancel', value: false }, { label: 'Delete', cls: 'danger solid', value: true, id: 'confirm-delete' }],
    });
    if (yes) { deleteSlot(slot); render(); }
  }

  async function exportSlot(slot) {
    let code;
    try { code = await exportCode(slot); } catch { return; }
    const r = readSlot(slot);
    await dialog({
      title: `Save code for Slot ${slot}`,
      html: `<p>Copy this code (or download it as a file) and use <b>Import a save</b> on another device or browser.</p><textarea id="export-code" readonly>${esc(code)}</textarea><p class="err" id="copy-msg"></p>`,
      buttons: [
        { label: 'Copy code', cls: 'primary', check: async (w) => { const t = w.querySelector('textarea'); t.select(); let ok = false; try { await navigator.clipboard.writeText(code); ok = true; } catch { try { ok = document.execCommand('copy'); } catch { /* ignore */ } } w.querySelector('#copy-msg').textContent = ok ? 'Copied! 🐾' : 'Select the code and copy it by hand.'; return false; } },
        { label: 'Download file', check: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); a.download = `cat-sanctuary-slot${slot}-day${r.summary?.day || 1}.cclsave`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return false; } },
        { label: 'Done' },
      ],
    });
  }

  async function importSave(target) {
    let parsed = null, parsedDefault = 0;
    const slotsHtml = Array.from({ length: SLOT_COUNT }, (_, i) => {
      const r = readSlot(i + 1);
      const label = r.status === 'ok' ? describe(r.summary) : r.status === 'corrupt' ? 'damaged' : 'empty';
      return `<option value="${i + 1}" ${target === i + 1 || (!target && r.status === 'empty' && !parsedDefault++) ? 'selected' : ''}>Slot ${i + 1} (${esc(label)})</option>`;
    });
    const res = await dialog({
      title: 'Import a save',
      html: `<p>Paste a save code, or pick a <b>.cclsave</b> file.</p><textarea id="import-code" placeholder="CCL2z.…"></textarea>
        <div class="row" style="margin-top:8px"><label class="sbtn">Choose file<input id="import-file" type="file" accept=".cclsave,.txt,.json,text/plain,application/json" hidden></label>
        <select id="import-slot" class="sbtn">${slotsHtml.join('')}</select></div><p class="err" id="import-err"></p>`,
      setup: (w) => {
        w.querySelector('#import-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) w.querySelector('textarea').value = (await f.text()).slice(0, 2_000_000); });
      },
      buttons: [
        { label: 'Cancel', value: null },
        { label: 'Import', cls: 'primary', id: 'import-go', check: async (w) => {
          const err = w.querySelector('#import-err');
          try { parsed = await parseCode(w.querySelector('textarea').value); } catch (e) { err.textContent = e.message; return false; }
          parsed.slot = Number(w.querySelector('#import-slot').value);
          return true;
        }, value: 'go' },
      ],
    });
    if (res !== 'go' || !parsed) return;
    const cur = readSlot(parsed.slot);
    if (cur.status === 'ok') {
      const yes = await dialog({ title: `Replace Slot ${parsed.slot}?`, html: `<p>Slot ${parsed.slot} has <b>${esc(describe(cur.summary))}</b>. Replace it with the imported <b>${esc(describe(parsed.summary))}</b>?</p>`,
        buttons: [{ label: 'Cancel', value: false }, { label: 'Replace', cls: 'danger solid', value: true, id: 'confirm-replace' }] });
      if (!yes) return;
    }
    importToSlot(parsed.slot, parsed.state);
    render();
    note.textContent = `Imported into Slot ${parsed.slot}: ${describe(parsed.summary)}. Press Play to continue it!`;
  }

  function render() {
    const slots = listSlots(), last = lastSlot();
    const recent = slots.filter((s) => s.status === 'ok').sort((a, b) => b.summary.savedAt - a.summary.savedAt)[0];
    const cont = (last && slots[last - 1].status === 'ok') ? slots[last - 1] : recent;
    // big button: Continue the latest save, or start a new game in the first free slot
    if (cont) {
      btn.innerHTML = `Continue<small>Slot ${cont.slot} · ${esc(describe(cont.summary))}</small>`;
      btn.onclick = () => play(cont.slot, cont.state);
    } else {
      btn.innerHTML = 'Come on in!<small>New game</small>';
      btn.onclick = () => play(firstEmpty() || 1, null);
    }
    list.innerHTML = '';
    slots.forEach((r) => {
      const card = document.createElement('div');
      card.className = `slot-card ${r.status}${cont && cont.slot === r.slot ? ' last' : ''}`;
      card.dataset.slot = r.slot;
      const info = r.status === 'ok'
        ? `<b>${esc(describe(r.summary))}</b><span>${esc(clock(r.summary.hour))}${r.summary.names.length ? ' · ' + esc(r.summary.names.join(', ')) : ''} · ${esc(ago(r.summary.savedAt))}</span>`
        : r.status === 'corrupt' ? '<b>Oh dear, this save got scrambled</b><span>It can\'t be loaded. Start fresh or clear it.</span>' : '<b>Empty slot</b><span>A fresh sanctuary is waiting</span>';
      card.innerHTML = `<div class="num">${r.slot}</div><div class="info">${info}</div><div class="acts"></div>`;
      const acts = card.querySelector('.acts');
      const add = (label, cls, fn, act) => { const b = document.createElement('button'); b.type = 'button'; b.className = `sbtn ${cls}`; b.textContent = label; b.dataset.act = act; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); acts.appendChild(b); };
      if (r.status === 'ok') {
        add('Play', 'primary', () => play(r.slot, r.state), 'play');
        add('New Game', 'danger', () => newGame(r.slot), 'new');
        add('Export', '', () => exportSlot(r.slot), 'export');
        add('Delete', 'ghost', () => remove(r.slot), 'delete');
      } else if (r.status === 'corrupt') {
        add('New Game', 'danger', () => play(r.slot, null), 'new');
        add('Delete', 'ghost', () => remove(r.slot), 'delete');
      } else {
        add('New Game', 'primary', () => play(r.slot, null), 'new');
        add('Import', '', () => importSave(r.slot), 'import');
      }
      list.appendChild(card);
    });
  }

  document.getElementById('import-btn').addEventListener('click', () => importSave(0));
  render();
  return {
    render,
    /** Enter / Space on the title: same as the big button. */
    quickStart() { if (!document.getElementById('save-dialog')) btn.click(); },
    showLoadError(slot, err) {
      return dialog({
        title: 'That save wouldn\'t load',
        html: `<p>Sorry, dearie! Something in Slot ${slot} got muddled, so I couldn't open it. Your cats are fine in my heart. 🐾</p><p style="font-size:.8rem">(${esc(err && err.message || err)})</p>`,
        buttons: [{ label: 'Back to slots', value: 'back' }, { label: `New Game in Slot ${slot}`, cls: 'danger solid', value: 'new', id: 'load-fail-new' }],
      });
    },
  };
}
