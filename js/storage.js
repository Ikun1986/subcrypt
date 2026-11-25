// localStorage persistence with backup-on-corrupt and graceful fallback.
import { validateSubscriptionList, SCHEMA_VERSION } from './schema.js';

export const KEY = 'subcrypt:v1';
export const BACKUP_KEY = 'subcrypt:v1:backup';

/**
 * @param getLS returns a Storage-like object. Injected so tests can pass a fake.
 * load() resolves to { status: 'empty' | 'ok' | 'corrupt' | 'unavailable', subs }.
 */
export function createStorage(getLS = () => window.localStorage) {
  function area() {
    try {
      return getLS() || null;
    } catch {
      return null; // Access itself can throw (blocked storage).
    }
  }

  return {
    load() {
      const ls = area();
      if (!ls) return { status: 'unavailable', subs: [] };

      let raw;
      try {
        raw = ls.getItem(KEY);
      } catch {
        return { status: 'unavailable', subs: [] };
      }
      if (raw === null) return { status: 'empty', subs: [] };

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      const result =
        parsed && typeof parsed === 'object' && parsed.version === SCHEMA_VERSION
          ? validateSubscriptionList(parsed.subscriptions)
          : { ok: false };
      if (result.ok) return { status: 'ok', subs: result.subs };

      try {
        ls.setItem(BACKUP_KEY, raw);
      } catch {
        /* Backup is best effort. */
      }
      return { status: 'corrupt', subs: [] };
    },

    /** Returns true when the write succeeded. */
    save(subs) {
      const ls = area();
      if (!ls) return false;
      try {
        ls.setItem(KEY, JSON.stringify({ version: SCHEMA_VERSION, subscriptions: subs }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
