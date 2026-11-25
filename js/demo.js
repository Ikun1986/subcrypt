// Demo data. Fictional brands only: MoonMusic, CloudVault, StreamPeak, FitGhost.
import { addDays } from './model.js';

/** Dates are relative to `today` so every haunted state is visible on any day. */
export function makeDemo(today, makeId) {
  const base = { createdAt: addDays(today, -200) };
  return [
    {
      ...base,
      id: makeId(),
      name: 'StreamPeak',
      priceCents: 1599,
      cycle: 'monthly',
      nextRenewal: addDays(today, 18),
      category: 'Video',
      status: 'active',
      lastConfirmed: addDays(today, -3),
    },
    {
      ...base,
      id: makeId(),
      name: 'CloudVault',
      priceCents: 999,
      cycle: 'monthly',
      nextRenewal: addDays(today, 3),
      category: 'Storage',
      status: 'active',
      lastConfirmed: addDays(today, -5),
    },
    {
      ...base,
      id: makeId(),
      name: 'FitGhost',
      priceCents: 2999,
      cycle: 'monthly',
      nextRenewal: addDays(today, 5),
      category: 'Fitness',
      status: 'active',
      lastConfirmed: addDays(today, -47),
    },
    {
      ...base,
      id: makeId(),
      name: 'MoonMusic',
      priceCents: 3900,
      cycle: 'yearly',
      nextRenewal: addDays(today, 120),
      category: 'Music',
      status: 'buried',
      lastConfirmed: addDays(today, -60),
      buriedAt: addDays(today, -4),
      savedYearlyCents: 3900,
    },
  ];
}
