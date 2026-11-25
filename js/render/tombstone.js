import {
  confirmedLabel,
  cycleLabel,
  formatDate,
  formatUSD,
  hauntDays,
  isZombie,
  monthlyCents,
  renewalLabel,
} from '../model.js';
import { decorativeImg, h, seedFor } from './dom.js';

const GHOST = 'assets/svg/ghost.svg';

/** Changes whenever the visible content of a tombstone changes. */
export function signature(sub, today) {
  return [sub.id, sub.name, sub.priceCents, sub.cycle, sub.nextRenewal, sub.category, sub.status, sub.lastConfirmed, today].join('|');
}

/** Plain-text state summary for assistive technology (exposed via aria-describedby). */
export function summaryText(sub, today) {
  const parts = [`${sub.name}`, `${formatUSD(sub.priceCents)} per ${sub.cycle === 'yearly' ? 'year' : 'month'}`];
  const days = hauntDays(sub, today);
  parts.push(days === null ? `renews ${formatDate(sub.nextRenewal)}` : renewalLabel(days).toLowerCase());
  if (isZombie(sub, today)) parts.push(`zombie, burning ${formatUSD(monthlyCents(sub))} per month`);
  return parts.join(', ');
}

function candle(side) {
  return h('span', { class: `candle candle--${side}`, 'aria-hidden': 'true' });
}

/**
 * @param ctx.today 'YYYY-MM-DD'
 * @param ctx.recovering render the old zombie look so CSS can animate it back to upright
 */
export function createTombstone(sub, ctx) {
  const { today, recovering = false } = ctx;
  const zombie = isZombie(sub, today);
  const haunt = hauntDays(sub, today);
  const zombieLook = zombie || recovering;

  const nameId = `tomb-name-${sub.id}`;
  const summaryId = `tomb-summary-${sub.id}`;

  const el = h(
    'article',
    {
      class: ['tombstone', zombieLook && 'is-zombie', haunt !== null && 'is-haunting', recovering && 'is-recovering']
        .filter(Boolean)
        .join(' '),
      'data-id': sub.id,
      'aria-labelledby': nameId,
      'aria-describedby': summaryId,
    },
    h(
      'div',
      { class: 'tombstone__stage' },
      haunt !== null && decorativeImg(GHOST, 'tombstone__ghost ghost--above'),
      zombieLook && decorativeImg(GHOST, 'tombstone__ghost ghost--side'),
      h(
        'div',
        { class: 'tombstone__stone' },
        h('p', { class: 'tombstone__category' }, sub.category),
        h('h3', { class: 'tombstone__name', id: nameId }, sub.name),
        h(
          'p',
          { class: 'tombstone__price' },
          h('span', { class: 'money' }, formatUSD(sub.priceCents)),
          h('span', { class: 'tombstone__cycle' }, cycleLabel(sub.cycle)),
        ),
        h('p', { class: 'tombstone__renewal' }, 'Next renewal: ', h('time', { datetime: sub.nextRenewal }, formatDate(sub.nextRenewal))),
        haunt !== null && h('p', { class: 'badge badge--haunt' }, renewalLabel(haunt)),
        zombie && h('p', { class: 'badge badge--zombie' }, `Zombie — burning ${formatUSD(monthlyCents(sub))}/month`),
        h('p', { class: 'tombstone__confirmed' }, confirmedLabel(sub, today)),
      ),
    ),
    h('p', { id: summaryId, hidden: true }, summaryText(sub, today)),
    h(
      'div',
      { class: 'tombstone__plot' },
      candle('left'),
      h(
        'div',
        { class: 'tombstone__actions' },
        h('button', { type: 'button', class: 'btn btn--ecto', 'data-action': 'still-using', 'data-id': sub.id, 'aria-label': `Still using it: ${sub.name}` }, 'Still using it'),
        h('button', { type: 'button', class: 'btn btn--danger', 'data-action': 'bury', 'data-id': sub.id, 'aria-label': `Bury it: ${sub.name}` }, 'Bury it'),
      ),
      candle('right'),
    ),
  );
  el.style.setProperty('--seed', String(seedFor(sub.id)));
  return el;
}
