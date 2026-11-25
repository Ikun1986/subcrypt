import { epitaph, formatDate, formatUSD, isBuried, sortBuried, totals } from '../model.js';
import { h, replaceChildren } from './dom.js';

/** Renders the Rest in Peace section. New entries fade in; the first render does not animate. */
export function createRipView({ totalEl, listEl, emptyEl }) {
  const seen = new Set();
  let first = true;

  return {
    render(subs, today) {
      const buried = sortBuried(subs.filter(isBuried));
      const saved = totals(subs, today).savedYearlyCents;

      replaceChildren(totalEl, 'Total saved: ', h('strong', { class: 'money' }, formatUSD(saved)), '/year');
      emptyEl.hidden = buried.length > 0;
      listEl.hidden = buried.length === 0;

      replaceChildren(
        listEl,
        buried.map((sub) =>
          h(
            'li',
            { class: ['rip__item', !first && !seen.has(sub.id) && 'is-new'].filter(Boolean).join(' ') },
            h('p', { class: 'rip__epitaph' }, epitaph(sub)),
            h('p', { class: 'rip__date' }, 'Buried ', h('time', { datetime: sub.buriedAt }, formatDate(sub.buriedAt))),
          ),
        ),
      );
      for (const sub of buried) seen.add(sub.id);
      first = false;
    },
  };
}
