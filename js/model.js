// Pure domain logic: dates, money, classification, aggregates.
// Nothing here reads the clock or touches the DOM. Callers pass `today` ('YYYY-MM-DD').

const MS_DAY = 86400000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1970;
const MAX_YEAR = 2200;

export const ZOMBIE_AFTER_DAYS = 30;
export const HAUNT_WINDOW_DAYS = 7;

/* ---------- Dates (local calendar dates as 'YYYY-MM-DD') ---------- */

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseISO(iso) {
  if (typeof iso !== 'string') return null;
  const m = ISO_RE.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < MIN_YEAR || y > MAX_YEAR) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > daysInMonth(y, mo)) return null;
  return { y, m: mo, d };
}

export function isValidISO(value) {
  return parseISO(value) !== null;
}

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

function formatISO(y, m, d) {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

function utcDay(iso) {
  const p = parseISO(iso);
  return Date.UTC(p.y, p.m - 1, p.d) / MS_DAY;
}

/** Today as a local calendar date. */
export function todayISO(now = new Date()) {
  return formatISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Whole days from `fromISO` to `toISO` (positive when `toISO` is later). */
export function daysBetween(fromISO, toISO) {
  return utcDay(toISO) - utcDay(fromISO);
}

export function addDays(iso, n) {
  const date = new Date((utcDay(iso) + n) * MS_DAY);
  return formatISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Adds calendar months and clamps to the last day of the target month. */
export function addMonths(iso, n) {
  const { y, m, d } = parseISO(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return formatISO(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** One billing step forward. 31 Jan monthly gives 28/29 Feb. */
export function addCycle(iso, cycle) {
  return addMonths(iso, cycle === 'yearly' ? 12 : 1);
}

/**
 * Smallest renewal date on or after `today`, found by stepping the original date by
 * whole cycles. Stepping from the original date (not from the previous result)
 * avoids drift after a month-end clamp.
 */
export function rollForward(dateISO, cycle, today) {
  if (dateISO >= today) return dateISO;
  const step = cycle === 'yearly' ? 12 : 1;
  const from = parseISO(dateISO);
  const to = parseISO(today);
  const monthsApart = to.y * 12 + to.m - (from.y * 12 + from.m);
  // For any k below this start, the stepped date is in an earlier month than today.
  let k = Math.max(1, Math.floor(monthsApart / step) - 1);
  let next = addMonths(dateISO, step * k);
  while (next < today) {
    k += 1;
    next = addMonths(dateISO, step * k);
  }
  return next;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(iso) {
  const { y, m, d } = parseISO(iso);
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d)));
}

/* ---------- Money (integer cents) ---------- */

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function monthlyCents(sub) {
  return sub.cycle === 'yearly' ? Math.round(sub.priceCents / 12) : sub.priceCents;
}

export function yearlyCents(sub) {
  return sub.cycle === 'yearly' ? sub.priceCents : sub.priceCents * 12;
}

export function formatUSD(cents) {
  return usd.format(cents / 100);
}

/** Epitaph style: "$39" for whole dollars, "$39.50" otherwise. */
export function formatUSDShort(cents) {
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usd.format(cents / 100);
}

export function cycleLabel(cycle) {
  return cycle === 'yearly' ? '/year' : '/month';
}

/* ---------- Classification ---------- */

export function isBuried(sub) {
  return sub.status === 'buried';
}

export function isZombie(sub, today) {
  if (isBuried(sub)) return false;
  return sub.status === 'idle' || daysBetween(sub.lastConfirmed, today) >= ZOMBIE_AFTER_DAYS;
}

/** Days until renewal (0..7) when Haunting, else null. */
export function hauntDays(sub, today) {
  if (isBuried(sub)) return null;
  const days = daysBetween(today, sub.nextRenewal);
  return days >= 0 && days <= HAUNT_WINDOW_DAYS ? days : null;
}

export function renewalLabel(days) {
  if (days === 0) return 'Renews today';
  if (days === 1) return 'Renews tomorrow';
  return `Renews in ${days} days`;
}

export function confirmedLabel(sub, today) {
  const days = Math.max(0, daysBetween(sub.lastConfirmed, today));
  if (days === 0) return 'Confirmed today';
  return days === 1 ? 'Confirmed 1 day ago' : `Confirmed ${days} days ago`;
}

/* ---------- Aggregates and text ---------- */

export function totals(subs, today) {
  const result = { monthlyCents: 0, yearlyCents: 0, deadMonthlyCents: 0, savedYearlyCents: 0, zombieCount: 0 };
  for (const sub of subs) {
    if (isBuried(sub)) {
      result.savedYearlyCents += sub.savedYearlyCents ?? 0;
      continue;
    }
    result.monthlyCents += monthlyCents(sub);
    result.yearlyCents += yearlyCents(sub);
    if (isZombie(sub, today)) {
      result.deadMonthlyCents += monthlyCents(sub);
      result.zombieCount += 1;
    }
  }
  return result;
}

/** Haunting subscriptions, amount due (the price actually charged), and a stable key for the set. */
export function hauntingSummary(subs, today) {
  const haunting = subs.filter((s) => hauntDays(s, today) !== null);
  return {
    count: haunting.length,
    dueCents: haunting.reduce((sum, s) => sum + s.priceCents, 0),
    ids: haunting.map((s) => s.id).sort(),
    names: haunting.map((s) => s.name),
  };
}

export function bannerText(summary) {
  const noun = summary.count === 1 ? 'haunting' : 'hauntings';
  return `${summary.count} ${noun} this week — ${formatUSD(summary.dueCents)} due`;
}

export function epitaph(sub) {
  return `RIP ${sub.name} — saved ${formatUSDShort(sub.savedYearlyCents ?? 0)}/year`;
}

export function sortForGraveyard(subs) {
  return [...subs].sort(
    (a, b) => a.nextRenewal.localeCompare(b.nextRenewal) || a.name.localeCompare(b.name, 'en'),
  );
}

/** Most recently buried first. */
export function sortBuried(subs) {
  return [...subs].sort(
    (a, b) => (b.buriedAt ?? '').localeCompare(a.buriedAt ?? '') || a.name.localeCompare(b.name, 'en'),
  );
}

/** Advances past renewal dates of non-buried subscriptions. Returns the new list and whether anything changed. */
export function rollForwardAll(subs, today) {
  let changed = false;
  const next = subs.map((sub) => {
    if (isBuried(sub)) return sub;
    const rolled = rollForward(sub.nextRenewal, sub.cycle, today);
    if (rolled === sub.nextRenewal) return sub;
    changed = true;
    return { ...sub, nextRenewal: rolled };
  });
  return { subs: next, changed };
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
