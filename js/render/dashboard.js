import { formatUSD } from '../model.js';
import { h, replaceChildren } from './dom.js';

function stat(modifier, label, cents, hint) {
  return h(
    'div',
    { class: `stat stat--${modifier}` },
    h('dt', { class: 'stat__label' }, label),
    h('dd', { class: 'stat__value money' }, formatUSD(cents)),
    hint && h('dd', { class: 'stat__hint' }, hint),
  );
}

export function renderDashboard(list, t) {
  const zombieHint =
    t.zombieCount === 0 ? 'No zombies. Nothing is burning.' : `${t.zombieCount} zombie ${t.zombieCount === 1 ? 'subscription' : 'subscriptions'}`;
  replaceChildren(
    list,
    stat('monthly', 'Monthly total', t.monthlyCents),
    stat('yearly', 'Yearly total', t.yearlyCents),
    stat('dead', 'Dead money per month', t.deadMonthlyCents, zombieHint),
    stat('saved', 'Total saved per year', t.savedYearlyCents),
  );
}
