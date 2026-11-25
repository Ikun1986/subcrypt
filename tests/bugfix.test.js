import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExport } from '../js/io.js';
import { addDays, isZombie, hauntingSummary } from '../js/model.js';
import { parsePriceToCents, validateDraft, validateExportFile } from '../js/schema.js';
import { createStorage, KEY } from '../js/storage.js';
import { createStore } from '../js/store.js';

function fakeLS(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
let n = 0;
const makeId = () => `b-${++n}`;
const boot = (ls, day = '2026-11-25') => {
  const store = createStore({ storage: createStorage(() => ls), now: () => new Date(`${day}T12:00:00`), makeId });
  store.init();
  return store;
};
const draft = (over = {}) => ({ name: 'Ok', priceCents: 500, cycle: 'monthly', nextRenewal: '2026-12-20', category: 'Other', status: 'active', ...over });

test('price input accepts "$" and comma thousands, still rejects junk', () => {
  assert.equal(parsePriceToCents('$9.99'), 999);
  assert.equal(parsePriceToCents('1,299.50'), 129950);
  assert.equal(parsePriceToCents('$100,000'), 10000000);
  for (const bad of ['1,29', ',5', '1,,000', '12,34,567', '-3', '-0.01', '0', '0.00', '$', '--', '9.9.9', ' ', 'NaN', 'Infinity', '１２']) {
    assert.equal(parsePriceToCents(bad), null, `should reject "${bad}"`);
  }
});

test('form: every bad field yields a readable message and no value', () => {
  const cases = [
    [{ name: '' }, 'name'],
    [{ name: '   ' }, 'name'],
    [{ price: '' }, 'price'],
    [{ price: 'abc' }, 'price'],
    [{ price: '-5' }, 'price'],
    [{ price: '0' }, 'price'],
    [{ nextRenewal: '' }, 'nextRenewal'],
    [{ nextRenewal: '2026-02-31' }, 'nextRenewal'],
  ];
  for (const [over, field] of cases) {
    const r = validateDraft({ name: 'Ok', price: '5', cycle: 'monthly', nextRenewal: '2026-12-20', category: 'Other', status: 'active', ...over });
    assert.equal(r.ok, false, JSON.stringify(over));
    assert.ok(r.errors[field] && r.errors[field].length > 10, `${field} message`);
    assert.equal('value' in r, false);
  }
});

test('store never writes bad data, even if the form check is bypassed', () => {
  const ls = fakeLS();
  const store = boot(ls);
  const before = ls.data[KEY];
  const bad = [
    draft({ name: '' }),
    draft({ name: 'x'.repeat(41) }),
    draft({ priceCents: 0 }),
    draft({ priceCents: -100 }),
    draft({ priceCents: 1.5 }),
    draft({ nextRenewal: '' }),
    draft({ nextRenewal: 'tomorrow' }),
    draft({ status: 'buried' }),
    draft({ cycle: 'weekly' }),
    draft({ category: 'Crypto' }),
  ];
  for (const d of bad) assert.equal(store.addSubscription(d), null, JSON.stringify(d));
  assert.equal(store.getState().subs.length, 4);
  assert.equal(ls.data[KEY], before);
  assert.ok(store.addSubscription(draft()));
  assert.equal(store.getState().subs.length, 5);
});

test('zombie boundary through the store: 29 days is healthy, 30 is a zombie, confirming resets it', () => {
  const day = '2026-11-25';
  const store = boot(fakeLS(), day);
  store.addSubscription(draft({ name: 'Edge' }));
  const edge = store.getState().subs.find((s) => s.name === 'Edge');
  const at = (days) => ({ ...edge, lastConfirmed: addDays(day, -days) });
  assert.equal(isZombie(at(29), day), false);
  assert.equal(isZombie(at(30), day), true);
  assert.equal(isZombie(at(31), day), true);
  // Same subscription, 30 days later on the calendar:
  const later = addDays(day, 30);
  assert.equal(isZombie(edge, addDays(day, 29)), false);
  assert.equal(isZombie(edge, later), true);
  store.confirmStillUsing(edge.id);
  assert.equal(isZombie(store.getSub(edge.id), day), false);
});

test('haunting set changes when a new renewal enters the window (banner re-shows)', () => {
  const day = '2026-11-25';
  const store = boot(fakeLS(), day);
  const before = hauntingSummary(store.getState().subs, day);
  store.addSubscription(draft({ name: 'Soon', nextRenewal: addDays(day, 2) }));
  const after = hauntingSummary(store.getState().subs, day);
  assert.notEqual(before.ids.join(','), after.ids.join(','));
  assert.equal(after.count, before.count + 1);
});

test('an exported file can be re-imported unchanged, including buried entries', () => {
  const day = '2026-11-25';
  const store = boot(fakeLS(), day);
  store.addSubscription(draft({ name: 'Extra', priceCents: 1234 }));
  store.bury(store.getState().subs.find((s) => s.name === 'CloudVault').id);
  const text = JSON.stringify(buildExport(store.getState().subs, new Date()), null, 2);
  const parsed = validateExportFile(text, Buffer.byteLength(text));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.subs, store.getState().subs);

  const fresh = boot(fakeLS(), day);
  fresh.replaceAll(parsed.subs);
  assert.deepEqual(fresh.getState().subs, store.getState().subs);
});

test('import messages for unusual files', () => {
  const msg = (text) => validateExportFile(text, text.length).message;
  assert.equal(msg(''), 'Import failed: the file is not valid JSON.');
  assert.equal(msg('[]'), 'Import failed: this is not a SubCrypt v1 export.');
  assert.equal(msg('"hello"'), 'Import failed: this is not a SubCrypt v1 export.');
  assert.equal(msg('{"format":"subcrypt","version":1}'), 'Import failed: subscriptions must be a list.');
  assert.equal(msg('{"format":"subcrypt","version":1,"subscriptions":[null]}'), 'Import failed: entry 1 is invalid (not an object).');
  assert.equal(validateExportFile('{"format":"subcrypt","version":1,"subscriptions":[]}', 50).ok, true);
});
