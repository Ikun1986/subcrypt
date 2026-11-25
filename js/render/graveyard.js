import { isBuried, isZombie, sortForGraveyard } from '../model.js';
import { createTombstone, signature } from './tombstone.js';

/**
 * Keyed view of the tombstones. Existing elements are kept when their content is
 * unchanged, so CSS animations (candles, ghosts) keep running instead of restarting.
 */
export function createGraveyardView({ plot, empty }) {
  const entries = new Map(); // id -> { el, sig, zombie }

  function scheduleUpright(el) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.classList.remove('is-zombie', 'is-recovering');
        setTimeout(() => el.querySelector('.ghost--side')?.remove(), 800);
      }),
    );
  }

  return {
    getElement: (id) => entries.get(id)?.el ?? null,

    render(subs, today, { reduceMotion = false } = {}) {
      const living = sortForGraveyard(subs.filter((s) => !isBuried(s)));
      empty.hidden = living.length > 0;

      const wanted = new Set(living.map((s) => s.id));
      for (const [id, entry] of entries) {
        if (!wanted.has(id)) {
          entry.el.remove();
          entries.delete(id);
        }
      }

      living.forEach((sub, index) => {
        const zombie = isZombie(sub, today);
        const sig = signature(sub, today);
        let entry = entries.get(sub.id);

        const sinking = entry?.el.classList.contains('is-sinking');
        if (!entry || (entry.sig !== sig && !sinking)) {
          const recovering = Boolean(entry) && entry.zombie && !zombie && !reduceMotion;
          const el = createTombstone(sub, { today, recovering });
          if (entry) entry.el.replaceWith(el);
          entry = { el, sig, zombie };
          entries.set(sub.id, entry);
          if (recovering) scheduleUpright(el);
        }

        const current = plot.children[index];
        if (current !== entry.el) plot.insertBefore(entry.el, current ?? null);
      });
    },
  };
}
