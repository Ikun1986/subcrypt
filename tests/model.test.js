import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCycle,
  addDays,
  bannerText,
  confirmedLabel,
  daysBetween,
  epitaph,
  formatUSD,
  formatUSDShort,
  hauntDays,
  hauntingSummary,
  isZombie,
  monthlyCents,
  renewalLabel,
  rollForward,
  rollForwardAll,
  sortForGraveyard,
  totals,
  yearlyCents,
} from '../js/model.js';

const T = '2026-11-25';
const sub = (over = {}) => ({
  id: 'a',
  name: 'Alpha',
  priceCents: 1000,
  cycle: 'monthly',
  nextRenewal: '2026-12-25',
  category: 'Other',
  status: 'active',
  lastConfirmed: T,
  createdAt: T,
  ...over,
});

test('daysBetween counts whole calendar days across month and DST boundaries', () => {
  assert.equal(daysBetween('2026-11-25', '2026-11-25'), 0);
  assert.equal(daysBetween('2026-11-25', '2026-12-02'), 7);
  assert.equal(daysBetween('2026-03-01', '2026-04-01'), 31);
  assert.equal(daysBetween('2026-12-02', '2026-11-25'), -7);
});

test('addDays crosses month and year ends', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-11-25', -30), '2026-10-26');
});

test('addCycle clamps to the last day of the month', () => {
  assert.equal(addCycle('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(addCycle('2028-01-31', 'monthly'), '2028-02-29');
  assert.equal(addCycle('2028-02-29', 'yearly'), '2029-02-28');
  assert.equal(addCycle('2026-12-15', 'monthly'), '2027-01-15');
});

test('rollForward keeps future dates and advances past dates by whole cycles', () => {
  assert.equal(rollForward('2026-11-25', 'monthly', T), '2026-11-25');
  assert.equal(rollForward('2026-12-01', 'monthly', T), '2026-12-01');
  assert.equal(rollForward('2026-11-24', 'monthly', T), '2026-12-24');
  assert.equal(rollForward('2026-08-10', 'monthly', T), '2026-12-10');
  assert.equal(rollForward('2024-03-01', 'yearly', T), '2027-03-01');
  assert.equal(rollForward('2025-11-25', 'yearly', T), '2026-11-25');
});

test('rollForward does not drift after a month-end clamp', () => {
  // 31 Jan monthly: Feb clamps to 28, but March must return to 31, not stay on 28.
  assert.equal(rollForward('2026-01-31', 'monthly', '2026-03-10'), '2026-03-31');
  assert.equal(rollForward('2026-01-31', 'monthly', '2026-02-10'), '2026-02-28');
});

test('rollForward handles very old dates quickly', () => {
  assert.equal(rollForward('1970-01-01', 'monthly', T), '2026-12-01');
});

test('rollForwardAll skips buried subscriptions and reports changes', () => {
  const buried = sub({ id: 'b', status: 'buried', nextRenewal: '2020-01-01', buriedAt: T, savedYearlyCents: 12000 });
  const stale = sub({ id: 'c', nextRenewal: '2026-11-01' });
  const result = rollForwardAll([buried, stale], T);
  assert.equal(result.changed, true);
  assert.equal(result.subs[0].nextRenewal, '2020-01-01');
  assert.equal(result.subs[1].nextRenewal, '2026-12-01');
  assert.equal(rollForwardAll(result.subs, T).changed, false);
});

test('money helpers', () => {
  assert.equal(monthlyCents(sub()), 1000);
  assert.equal(yearlyCents(sub()), 12000);
  assert.equal(monthlyCents(sub({ cycle: 'yearly', priceCents: 3900 })), 325);
  assert.equal(monthlyCents(sub({ cycle: 'yearly', priceCents: 1000 })), 83);
  assert.equal(yearlyCents(sub({ cycle: 'yearly', priceCents: 3900 })), 3900);
  assert.equal(formatUSD(123450), '$1,234.50');
  assert.equal(formatUSDShort(3900), '$39');
  assert.equal(formatUSDShort(3950), '$39.50');
});

test('zombie threshold: idle, or confirmed 30+ days ago', () => {
  assert.equal(isZombie(sub({ lastConfirmed: addDays(T, -29) }), T), false);
  assert.equal(isZombie(sub({ lastConfirmed: addDays(T, -30) }), T), true);
  assert.equal(isZombie(sub({ status: 'idle' }), T), true);
  assert.equal(isZombie(sub({ status: 'buried', lastConfirmed: addDays(T, -90) }), T), false);
});

test('haunt window: today through 7 days, inclusive', () => {
  assert.equal(hauntDays(sub({ nextRenewal: addDays(T, -1) }), T), null);
  assert.equal(hauntDays(sub({ nextRenewal: T }), T), 0);
  assert.equal(hauntDays(sub({ nextRenewal: addDays(T, 7) }), T), 7);
  assert.equal(hauntDays(sub({ nextRenewal: addDays(T, 8) }), T), null);
  assert.equal(hauntDays(sub({ status: 'buried', nextRenewal: T }), T), null);
});

test('labels', () => {
  assert.equal(renewalLabel(0), 'Renews today');
  assert.equal(renewalLabel(1), 'Renews tomorrow');
  assert.equal(renewalLabel(5), 'Renews in 5 days');
  assert.equal(confirmedLabel(sub(), T), 'Confirmed today');
  assert.equal(confirmedLabel(sub({ lastConfirmed: addDays(T, -1) }), T), 'Confirmed 1 day ago');
  assert.equal(confirmedLabel(sub({ lastConfirmed: addDays(T, -12) }), T), 'Confirmed 12 days ago');
});

test('totals: monthly/yearly include idle subs, dead money is zombies only, saved is buried only', () => {
  const subs = [
    sub({ id: '1', priceCents: 1599 }), // healthy
    sub({ id: '2', priceCents: 2999, status: 'idle' }), // zombie
    sub({ id: '3', priceCents: 3900, cycle: 'yearly', lastConfirmed: addDays(T, -40) }), // zombie, yearly
    sub({ id: '4', status: 'buried', priceCents: 999, buriedAt: T, savedYearlyCents: 11988 }),
  ];
  const t = totals(subs, T);
  assert.equal(t.monthlyCents, 1599 + 2999 + 325);
  assert.equal(t.yearlyCents, 1599 * 12 + 2999 * 12 + 3900);
  assert.equal(t.deadMonthlyCents, 2999 + 325);
  assert.equal(t.zombieCount, 2);
  assert.equal(t.savedYearlyCents, 11988);
});

test('haunting summary sums the price due and names the ids', () => {
  const subs = [
    sub({ id: 'x', name: 'X', priceCents: 999, nextRenewal: addDays(T, 3) }),
    sub({ id: 'y', name: 'Y', priceCents: 1999, nextRenewal: addDays(T, 5) }),
    sub({ id: 'z', nextRenewal: addDays(T, 20) }),
  ];
  const s = hauntingSummary(subs, T);
  assert.equal(s.count, 2);
  assert.equal(s.dueCents, 2998);
  assert.deepEqual(s.ids, ['x', 'y']);
  assert.equal(bannerText(s), '2 hauntings this week — $29.98 due');
  assert.equal(bannerText({ count: 1, dueCents: 999 }), '1 haunting this week — $9.99 due');
});

test('epitaph omits .00 for whole dollars', () => {
  assert.equal(epitaph({ name: 'MoonMusic', savedYearlyCents: 3900 }), 'RIP MoonMusic — saved $39/year');
  assert.equal(epitaph({ name: 'CloudVault', savedYearlyCents: 11988 }), 'RIP CloudVault — saved $119.88/year');
});

test('graveyard order: renewal date, then name', () => {
  const ordered = sortForGraveyard([
    sub({ id: '1', name: 'Zed', nextRenewal: '2026-12-01' }),
    sub({ id: '2', name: 'Bob', nextRenewal: '2026-12-01' }),
    sub({ id: '3', name: 'Amy', nextRenewal: '2026-12-09' }),
  ]);
  assert.deepEqual(ordered.map((s) => s.name), ['Bob', 'Zed', 'Amy']);
});
