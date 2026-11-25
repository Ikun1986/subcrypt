// Pure validation for the add form, stored data, and import files.
import { isValidISO } from './model.js';

export const CATEGORIES = [
  'Entertainment',
  'Music',
  'Video',
  'Storage',
  'Fitness',
  'Productivity',
  'News',
  'Gaming',
  'Other',
];
export const CYCLES = ['monthly', 'yearly'];
export const DRAFT_STATUSES = ['active', 'idle'];
export const STATUSES = ['active', 'idle', 'buried'];

export const LIMITS = {
  nameMax: 40,
  maxCents: 10_000_000, // $100,000.00
  maxSavedCents: 120_000_000, // max price x 12
  maxSubs: 500,
  maxBytes: 1_048_576, // 1 MB
  idMax: 64,
};

export const EXPORT_FORMAT = 'subcrypt';
export const SCHEMA_VERSION = 1;

export const MESSAGES = {
  name: 'Give it a name (1–40 characters).',
  price: 'Enter a price between $0.01 and $100,000.',
  nextRenewal: 'Pick the next renewal date.',
  cycle: 'Choose monthly or yearly.',
  category: 'Choose a category.',
  status: 'Choose active or idle.',
};

/** "12.99" -> 1299. Returns null unless 0.01 <= price <= 100000 with at most two decimals. */
export function parsePriceToCents(input) {
  if (typeof input !== 'string') return null;
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return cents >= 1 && cents <= LIMITS.maxCents ? cents : null;
}

/** Validates the Add Subscription form. Error keys are in form order. */
export function validateDraft(values) {
  const errors = {};
  const name = typeof values.name === 'string' ? values.name.trim() : '';
  if (name.length < 1 || name.length > LIMITS.nameMax) errors.name = MESSAGES.name;

  const priceCents = parsePriceToCents(values.price);
  if (priceCents === null) errors.price = MESSAGES.price;

  if (!CYCLES.includes(values.cycle)) errors.cycle = MESSAGES.cycle;
  if (!isValidISO(values.nextRenewal)) errors.nextRenewal = MESSAGES.nextRenewal;
  if (!CATEGORIES.includes(values.category)) errors.category = MESSAGES.category;
  if (!DRAFT_STATUSES.includes(values.status)) errors.status = MESSAGES.status;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      priceCents,
      cycle: values.cycle,
      nextRenewal: values.nextRenewal,
      category: values.category,
      status: values.status,
    },
  };
}

function fail(reason) {
  return { ok: false, reason };
}

/** Validates one stored or imported subscription. Unknown properties are dropped. */
export function validateSubscription(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return fail('not an object');

  const { id, name, priceCents, cycle, nextRenewal, category, status, lastConfirmed, createdAt } = obj;

  if (typeof id !== 'string' || id.length < 1 || id.length > LIMITS.idMax) return fail('bad id');
  if (typeof name !== 'string') return fail('name must be text');
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > LIMITS.nameMax) return fail('name must be 1–40 characters');
  if (!Number.isInteger(priceCents) || priceCents < 1 || priceCents > LIMITS.maxCents) {
    return fail('price out of range');
  }
  if (!CYCLES.includes(cycle)) return fail('unknown cycle');
  if (!isValidISO(nextRenewal)) return fail('bad renewal date');
  if (!CATEGORIES.includes(category)) return fail('unknown category');
  if (!STATUSES.includes(status)) return fail('unknown status');
  if (!isValidISO(lastConfirmed)) return fail('bad confirmed date');
  if (!isValidISO(createdAt)) return fail('bad created date');

  const value = {
    id,
    name: trimmed,
    priceCents,
    cycle,
    nextRenewal,
    category,
    status,
    lastConfirmed,
    createdAt,
  };

  if (status === 'buried') {
    const { buriedAt, savedYearlyCents } = obj;
    if (!isValidISO(buriedAt)) return fail('bad buried date');
    if (!Number.isInteger(savedYearlyCents) || savedYearlyCents < 0 || savedYearlyCents > LIMITS.maxSavedCents) {
      return fail('bad saved amount');
    }
    value.buriedAt = buriedAt;
    value.savedYearlyCents = savedYearlyCents;
  }
  return { ok: true, value };
}

/**
 * Validates a list of subscriptions.
 * Failure is { ok:false, message } for list-level problems or { ok:false, index, reason } (index is 1-based).
 */
export function validateSubscriptionList(list) {
  if (!Array.isArray(list)) return { ok: false, message: 'subscriptions must be a list' };
  if (list.length > LIMITS.maxSubs) return { ok: false, message: 'more than 500 subscriptions' };
  const seen = new Set();
  const subs = [];
  for (let i = 0; i < list.length; i += 1) {
    const result = validateSubscription(list[i]);
    if (!result.ok) return { ok: false, index: i + 1, reason: result.reason };
    if (seen.has(result.value.id)) return { ok: false, index: i + 1, reason: 'duplicate id' };
    seen.add(result.value.id);
    subs.push(result.value);
  }
  return { ok: true, subs };
}

/** Validates the text of an import file. `byteSize` is the file size in bytes. */
export function validateExportFile(text, byteSize) {
  if (byteSize > LIMITS.maxBytes) return { ok: false, message: 'Import failed: file is larger than 1 MB.' };

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Import failed: the file is not valid JSON.' };
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    parsed.format !== EXPORT_FORMAT ||
    parsed.version !== SCHEMA_VERSION
  ) {
    return { ok: false, message: 'Import failed: this is not a SubCrypt v1 export.' };
  }

  const result = validateSubscriptionList(parsed.subscriptions);
  if (result.ok) return { ok: true, subs: result.subs };
  if (result.message) return { ok: false, message: `Import failed: ${result.message}.` };
  return { ok: false, message: `Import failed: entry ${result.index} is invalid (${result.reason}).` };
}
