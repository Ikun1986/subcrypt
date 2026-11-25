import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, KEY, BACKUP_KEY } from '../js/storage.js';
import { createStore, NOTICE_TEXT } from '../js/store.js';
import { hauntDays, isZombie, totals } from '../js/model.js';

function fakeLS(initial = {}, { failWrites = false } = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem(k, v) {
      if (failWrites) throw new Error('quota');
      data[k] = String(v);
    },
  };
}

const clock = (iso) => () => new Date(`${iso}T12:00:00`);
let counter = 0;
const makeId = () => `id-${++counter}`;

function boot(ls, day = '2026-11-25') {
  const store = createStore({ storage: createStorage(() => ls), now: clock(day), makeId });
  store.init();
  return store;
}

test('first visit seeds demo data and persists it', () => {
  const ls = fakeLS();
  const store = boot(ls);
  const { subs } = store.getState();
  assert.equal(subs.length, 4);
  assert.ok(KEY in ls.data);
  const t = '2026-11-25';
  assert.ok(subs.some((s) => s.status !== 'buried' && !isZombie(s, t) && hauntDays(s, t) === null), 'healthy');
  assert.ok(subs.some((s) => isZombie(s, t)), 'zombie');
  assert.ok(subs.some((s) => hauntDays(s, t) !== null), 'haunting');
  assert.ok(subs.some((s) => s.status === 'buried'), 'buried');
});

test('data survives a reload', () => {
  const ls = fakeLS();
  const first = boot(ls);
  first.addSubscription({ name: 'Persist', priceCents: 500, cycle: 'monthly', nextRenewal: '2026-12-20', category: 'Other', status: 'active' });
  const second = boot(ls);
  assert.ok(second.getState().subs.some((s) => s.name === 'Persist'));
});

test('corrupt data is backed up, graveyard starts empty, notice shown', () => {
  const ls = fakeLS({ [KEY]: '{"version":1,"subscriptions":[{"bad":true}]}' });
  const store = boot(ls);
  assert.equal(store.getState().subs.length, 0);
  assert.equal(ls.data[BACKUP_KEY], '{"version":1,"subscriptions":[{"bad":true}]}');
  assert.equal(store.getState().notices[0].text, NOTICE_TEXT.corrupt);

  const unparsable = fakeLS({ [KEY]: '{not json' });
  boot(unparsable);
  assert.equal(unparsable.data[BACKUP_KEY], '{not json');
});

test('unavailable or failing storage keeps working in memory with a notice', () => {
  const blocked = createStore({
    storage: createStorage(() => {
      throw new Error('SecurityError');
    }),
    now: clock('2026-11-25'),
    makeId,
  });
  blocked.init();
  assert.equal(blocked.getState().subs.length, 4);
  assert.equal(blocked.getState().notices[0].text, NOTICE_TEXT.storage);

  const store = boot(fakeLS({}, { failWrites: true }));
  assert.equal(store.getState().storageOk, false);
  store.confirmStillUsing(store.getState().subs[0].id);
  assert.equal(store.getState().notices.filter((n) => n.key === 'storage').length, 1);
});

test('past renewal dates roll forward on load and are persisted', () => {
  const ls = fakeLS();
  boot(ls, '2026-11-25');
  const later = boot(ls, '2026-12-30');
  const dates = later.getState().subs.filter((s) => s.status !== 'buried').map((s) => s.nextRenewal);
  assert.ok(dates.every((d) => d >= '2026-12-30'));
  const saved = JSON.parse(ls.data[KEY]).subscriptions.filter((s) => s.status !== 'buried');
  assert.ok(saved.every((s) => s.nextRenewal >= '2026-12-30'));
});

test('still using it resets the timer and un-idles', () => {
  const store = boot(fakeLS());
  const t = '2026-11-25';
  const zombie = store.getState().subs.find((s) => isZombie(s, t));
  assert.ok(zombie);
  store.confirmStillUsing(zombie.id);
  const after = store.getSub(zombie.id);
  assert.equal(after.lastConfirmed, t);
  assert.equal(isZombie(after, t), false);

  store.addSubscription({ name: 'Sleepy', priceCents: 700, cycle: 'monthly', nextRenewal: '2026-12-25', category: 'Other', status: 'idle' });
  const idle = store.getState().subs.find((s) => s.name === 'Sleepy');
  assert.equal(isZombie(idle, t), true);
  store.confirmStillUsing(idle.id);
  assert.equal(store.getSub(idle.id).status, 'active');
});

test('burying records the date and saved amount, and totals follow', () => {
  const store = boot(fakeLS());
  const t = '2026-11-25';
  const before = totals(store.getState().subs, t);
  const cloud = store.getState().subs.find((s) => s.name === 'CloudVault');
  store.bury(cloud.id);
  const buried = store.getSub(cloud.id);
  assert.equal(buried.status, 'buried');
  assert.equal(buried.buriedAt, t);
  assert.equal(buried.savedYearlyCents, 999 * 12);
  const after = totals(store.getState().subs, t);
  assert.equal(after.savedYearlyCents, before.savedYearlyCents + 999 * 12);
  assert.equal(after.monthlyCents, before.monthlyCents - 999);
  // Buried subscriptions never come back through "still using it".
  store.confirmStillUsing(cloud.id);
  assert.equal(store.getSub(cloud.id).status, 'buried');
});

test('adding a subscription with a past date rolls it forward', () => {
  const store = boot(fakeLS());
  const sub = store.addSubscription({ name: 'Old', priceCents: 100, cycle: 'monthly', nextRenewal: '2026-11-01', category: 'Other', status: 'active' });
  assert.equal(sub.nextRenewal, '2026-12-01');
  assert.equal(sub.lastConfirmed, '2026-11-25');
});

test('subscribers are notified on every change', () => {
  const store = boot(fakeLS());
  let calls = 0;
  store.subscribe(() => (calls += 1));
  store.confirmStillUsing(store.getState().subs[0].id);
  store.resetDemo();
  assert.equal(calls, 2);
});
