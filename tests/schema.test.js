import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExport } from '../js/io.js';
import { makeDemo } from '../js/demo.js';
import { parsePriceToCents, validateDraft, validateExportFile, validateSubscription } from '../js/schema.js';

const draft = (over = {}) => ({
  name: 'CloudVault',
  price: '9.99',
  cycle: 'monthly',
  nextRenewal: '2026-12-10',
  category: 'Storage',
  status: 'active',
  ...over,
});

test('price parsing accepts 0.01..100000 with at most two decimals', () => {
  assert.equal(parsePriceToCents('9.99'), 999);
  assert.equal(parsePriceToCents('10'), 1000);
  assert.equal(parsePriceToCents('0.5'), 50);
  assert.equal(parsePriceToCents(' 100000 '), 10000000);
  assert.equal(parsePriceToCents('0.01'), 1);
  for (const bad of ['0', '0.00', '-1', '100000.01', '1.999', '1e3', 'abc', '', '1,5', '$5', null, 5]) {
    assert.equal(parsePriceToCents(bad), null, `should reject ${String(bad)}`);
  }
});

test('validateDraft returns a clean value', () => {
  const r = validateDraft(draft({ name: '  CloudVault  ' }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    name: 'CloudVault',
    priceCents: 999,
    cycle: 'monthly',
    nextRenewal: '2026-12-10',
    category: 'Storage',
    status: 'active',
  });
});

test('validateDraft uses the specified messages, in form order', () => {
  const r = validateDraft(draft({ name: '   ', price: '0', nextRenewal: '' }));
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors), ['name', 'price', 'nextRenewal']);
  assert.equal(r.errors.name, 'Give it a name (1–40 characters).');
  assert.equal(r.errors.price, 'Enter a price between $0.01 and $100,000.');
  assert.equal(r.errors.nextRenewal, 'Pick the next renewal date.');
});

test('validateDraft name length and date validity', () => {
  assert.equal(validateDraft(draft({ name: 'x'.repeat(40) })).ok, true);
  assert.equal(validateDraft(draft({ name: 'x'.repeat(41) })).ok, false);
  assert.equal(validateDraft(draft({ nextRenewal: '2026-02-30' })).ok, false);
  assert.equal(validateDraft(draft({ nextRenewal: '2026-13-01' })).ok, false);
});

test('validateDraft rejects buried status, unknown cycle and category', () => {
  assert.equal(validateDraft(draft({ status: 'buried' })).ok, false);
  assert.equal(validateDraft(draft({ cycle: 'weekly' })).ok, false);
  assert.equal(validateDraft(draft({ category: 'Crypto' })).ok, false);
});

const demo = () => {
  let n = 0;
  return makeDemo('2026-11-25', () => `id-${++n}`);
};

test('demo data validates, uses only fictional brands, and covers every state', () => {
  const subs = demo();
  assert.deepEqual(subs.map((s) => s.name).sort(), ['CloudVault', 'FitGhost', 'MoonMusic', 'StreamPeak']);
  for (const s of subs) assert.equal(validateSubscription(s).ok, true, s.name);
  assert.ok(subs.some((s) => s.status === 'buried'));
});

test('validateSubscription drops unknown properties and checks buried fields', () => {
  const [first, , , buried] = demo();
  const r = validateSubscription({ ...first, evil: '<script>' });
  assert.equal(r.ok, true);
  assert.equal('evil' in r.value, false);
  assert.equal(validateSubscription({ ...buried, savedYearlyCents: undefined }).ok, false);
  assert.equal(validateSubscription({ ...buried, buriedAt: 'nope' }).ok, false);
  assert.equal(validateSubscription({ ...first, priceCents: 9.5 }).ok, false);
  assert.equal(validateSubscription({ ...first, status: 'zombie' }).ok, false);
  assert.equal(validateSubscription(null).ok, false);
});

const fileText = (subs, over = {}) => JSON.stringify({ ...buildExport(subs), ...over });

test('export then import round-trips', () => {
  const subs = demo();
  const text = fileText(subs);
  const r = validateExportFile(text, text.length);
  assert.equal(r.ok, true);
  assert.deepEqual(r.subs, subs);
});

test('import rejects bad files with the specified messages', () => {
  const subs = demo();
  const msg = (text, size = text.length) => validateExportFile(text, size).message;

  assert.equal(msg('{}', 2_000_000), 'Import failed: file is larger than 1 MB.');
  assert.equal(msg('not json'), 'Import failed: the file is not valid JSON.');
  assert.equal(msg(fileText(subs, { format: 'other' })), 'Import failed: this is not a SubCrypt v1 export.');
  assert.equal(msg(fileText(subs, { version: 2 })), 'Import failed: this is not a SubCrypt v1 export.');
  assert.equal(msg('null'), 'Import failed: this is not a SubCrypt v1 export.');

  const bad = [subs[0], { ...subs[1], priceCents: -5 }];
  assert.equal(msg(fileText(bad)), 'Import failed: entry 2 is invalid (price out of range).');

  const dup = [subs[0], { ...subs[1], id: subs[0].id }];
  assert.equal(msg(fileText(dup)), 'Import failed: entry 2 is invalid (duplicate id).');

  const many = Array.from({ length: 501 }, (_, i) => ({ ...subs[0], id: `m${i}` }));
  assert.equal(msg(fileText(many)), 'Import failed: more than 500 subscriptions.');
  assert.equal(msg(fileText([], { subscriptions: 'x' })), 'Import failed: subscriptions must be a list.');
});

test('import accepts exactly 500 subscriptions', () => {
  const subs = Array.from({ length: 500 }, (_, i) => ({ ...demo()[0], id: `m${i}` }));
  assert.equal(validateExportFile(fileText(subs), 10).ok, true);
});
