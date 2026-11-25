import { bannerText } from '../model.js';
import { decorativeImg, h, replaceChildren } from './dom.js';

/**
 * Renders into a persistent aria-live region. The DOM is only touched when the
 * content changes, so screen readers are not re-notified on every render.
 */
export function createBannerView(region) {
  let lastKey = null;

  return {
    render(summary, dismissedKey) {
      const key = summary.count === 0 || summary.ids.join(',') === dismissedKey ? '' : `${summary.ids.join(',')}|${summary.dueCents}`;
      if (key === lastKey) return;
      lastKey = key;

      if (key === '') {
        replaceChildren(region);
        return;
      }
      replaceChildren(
        region,
        h(
          'div',
          { class: 'banner' },
          decorativeImg('assets/svg/ghost.svg', 'banner__ghost'),
          h(
            'div',
            { class: 'banner__text' },
            h('p', { class: 'banner__title' }, bannerText(summary)),
            h('p', { class: 'banner__names' }, summary.names.join(', ')),
          ),
          h('button', { type: 'button', class: 'btn btn--ghost', 'data-action': 'dismiss-banner' }, 'Dismiss'),
        ),
      );
    },
  };
}
