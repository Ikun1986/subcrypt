// In-memory state, actions, and persistence. One-way flow: action -> save -> notify.
import { newId, rollForward, rollForwardAll, todayISO, yearlyCents, isBuried } from './model.js';
import { makeDemo } from './demo.js';

export const NOTICE_TEXT = {
  corrupt: 'Your saved graveyard was unreadable. A backup was kept.',
  storage: 'Saving is unavailable in this browser. Export your data to keep it.',
};

/**
 * @param storage object with load() and save(subs)
 * @param now injectable clock
 * @param makeId injectable id generator
 */
export function createStore({ storage, now = () => new Date(), makeId = newId }) {
  const listeners = new Set();
  let state = { subs: [], storageOk: true, notices: [] };

  const today = () => todayISO(now());

  function notify() {
    for (const fn of listeners) fn(state);
  }

  function withoutNotice(notices, key) {
    return notices.filter((n) => n.key !== key);
  }

  /** Saves, then sets state and notifies. A failed save keeps working in memory with a notice. */
  function commit(subs, patch = {}) {
    const ok = storage.save(subs);
    let notices = withoutNotice(patch.notices ?? state.notices, 'storage');
    if (!ok) notices = [...notices, { key: 'storage', tone: 'warn', text: NOTICE_TEXT.storage, persistent: true }];
    state = { ...state, ...patch, subs, storageOk: ok, notices };
    notify();
  }

  function init() {
    const t = today();
    const loaded = storage.load();
    let subs = loaded.subs;
    let notices = [];
    let dirty = false;

    if (loaded.status === 'ok') {
      const rolled = rollForwardAll(subs, t);
      subs = rolled.subs;
      dirty = rolled.changed;
    } else if (loaded.status === 'empty' || loaded.status === 'unavailable') {
      subs = makeDemo(t, makeId);
      dirty = true;
    } else if (loaded.status === 'corrupt') {
      subs = [];
      notices = [{ key: 'corrupt', tone: 'warn', text: NOTICE_TEXT.corrupt }];
    }

    state = { subs, storageOk: loaded.status !== 'unavailable', notices };
    if (dirty || loaded.status === 'unavailable') {
      commit(subs);
    } else {
      notify();
    }
  }

  function update(id, fn) {
    const index = state.subs.findIndex((s) => s.id === id);
    if (index === -1) return false;
    const next = state.subs.slice();
    next[index] = fn(state.subs[index]);
    commit(next);
    return true;
  }

  return {
    init,
    getState: () => state,
    getToday: today,
    getSub: (id) => state.subs.find((s) => s.id === id),

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** `draft` is the validated output of validateDraft. */
    addSubscription(draft) {
      const t = today();
      const sub = {
        id: makeId(),
        name: draft.name,
        priceCents: draft.priceCents,
        cycle: draft.cycle,
        nextRenewal: rollForward(draft.nextRenewal, draft.cycle, t),
        category: draft.category,
        status: draft.status,
        lastConfirmed: t,
        createdAt: t,
      };
      commit([...state.subs, sub]);
      return sub;
    },

    confirmStillUsing(id) {
      const t = today();
      return update(id, (s) => (isBuried(s) ? s : { ...s, lastConfirmed: t, status: 'active' }));
    },

    bury(id) {
      const t = today();
      return update(id, (s) =>
        isBuried(s) ? s : { ...s, status: 'buried', buriedAt: t, savedYearlyCents: yearlyCents(s) },
      );
    },

    /** Used by import. Rolls dates forward before saving. */
    replaceAll(subs) {
      commit(rollForwardAll(subs, today()).subs);
    },

    resetDemo() {
      commit(makeDemo(today(), makeId));
    },

    /** Re-checks the date (midnight rollover) and re-renders. */
    refreshDate() {
      const rolled = rollForwardAll(state.subs, today());
      if (rolled.changed) commit(rolled.subs);
      else notify();
    },

    addNotice(key, text, tone = 'info', persistent = false) {
      const notices = [...withoutNotice(state.notices, key), { key, tone, text, persistent }];
      state = { ...state, notices };
      notify();
    },

    dismissNotice(key) {
      state = { ...state, notices: withoutNotice(state.notices, key) };
      notify();
    },
  };
}
