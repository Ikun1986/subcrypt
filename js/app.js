// Bootstrap and controller: wires DOM events to store actions and re-renders on change.
import { createStorage } from './storage.js';
import { createStore } from './store.js';
import { hauntingSummary, totals } from './model.js';
import { exportFile, readImportFile } from './io.js';
import { h, replaceChildren } from './render/dom.js';
import { createBannerView } from './render/banner.js';
import { renderDashboard } from './render/dashboard.js';
import { createGraveyardView } from './render/graveyard.js';
import { createRipView } from './render/rip.js';
import { createAddDialog, createConfirm } from './render/dialogs.js';

const $ = (selector) => document.querySelector(selector);

const store = createStore({ storage: createStorage() });

const heading = $('#graveyard-title');
const plot = $('#graveyard-plot');
const noticesEl = $('#notices');
const fileInput = $('#import-file');

const graveyard = createGraveyardView({ plot, empty: $('#graveyard-empty') });
const banner = createBannerView($('#banner-region'));
const rip = createRipView({ totalEl: $('#rip-total'), listEl: $('#rip-list'), emptyEl: $('#rip-empty') });
const confirmDialog = createConfirm($('#confirm-dialog'));
const addDialog = createAddDialog({
  dialog: $('#add-dialog'),
  onSubmit: (draft) => store.addSubscription(draft),
  fallbackFocus: $('#add-btn'),
});

const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion = () => reduceMotionQuery.matches;

let dismissedBannerKey = null;
let lastNoticeSig = null;
const burying = new Set();

/* ---------- Rendering ---------- */

function renderNotices(notices) {
  const sig = notices.map((n) => `${n.key}:${n.tone}:${n.text}`).join('\n');
  if (sig === lastNoticeSig) return; // Do not re-announce unchanged notices.
  lastNoticeSig = sig;
  replaceChildren(
    noticesEl,
    notices.map((n) =>
      h(
        'div',
        { class: `notice notice--${n.tone}` },
        h('p', { class: 'notice__text' }, n.text),
        !n.persistent &&
          h('button', { type: 'button', class: 'btn btn--ghost', 'data-action': 'dismiss-notice', 'data-key': n.key, 'aria-label': 'Dismiss notice' }, 'Dismiss'),
      ),
    ),
  );
}

/** Tombstones can be rebuilt on change. Remember which button had focus so it can be restored. */
function captureFocus() {
  const active = document.activeElement;
  const button = active?.closest?.('#graveyard-plot [data-action][data-id]');
  return button ? { id: button.dataset.id, action: button.dataset.action } : null;
}

function restoreFocus(saved) {
  if (!saved) return;
  const active = document.activeElement;
  if (active && active !== document.body && active.isConnected) return;
  for (const candidate of plot.querySelectorAll(`[data-action="${saved.action}"][data-id]`)) {
    if (candidate.dataset.id === saved.id) {
      candidate.focus();
      return;
    }
  }
}

function render(state) {
  const today = store.getToday();
  const saved = captureFocus();

  renderDashboard($('#dashboard-list'), totals(state.subs, today));

  const summary = hauntingSummary(state.subs, today);
  if (summary.count === 0) dismissedBannerKey = null;
  banner.render(summary, dismissedBannerKey);

  graveyard.render(state.subs, today, { reduceMotion: reduceMotion() });
  rip.render(state.subs, today);
  renderNotices(state.notices);
  restoreFocus(saved);
}

/* ---------- Actions ---------- */

function sinkDurationMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--motion-sink');
  return Number.parseFloat(raw) || 1400;
}

function focusHeadingIfLost() {
  const active = document.activeElement;
  if (!active || active === document.body || !active.isConnected) heading.focus();
}

async function bury(id) {
  const sub = store.getSub(id);
  if (!sub || burying.has(id)) return;

  const confirmed = await confirmDialog({
    title: 'Bury this subscription?',
    message: `Bury ${sub.name}? Only do this once you've cancelled it.`,
    confirmLabel: 'Bury it',
    cancelLabel: 'Keep haunting',
    tone: 'danger',
    fallbackFocus: heading,
  });
  if (!confirmed || burying.has(id)) return;
  burying.add(id);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    burying.delete(id);
    store.bury(id);
    focusHeadingIfLost();
  };

  const el = graveyard.getElement(id);
  if (!el || reduceMotion()) {
    finish();
    return;
  }
  el.classList.add('is-sinking');
  el.querySelector('.tombstone__stone').addEventListener('animationend', (event) => {
    if (event.animationName === 'sink') finish();
  });
  setTimeout(finish, sinkDurationMs() + 800); // Fallback if animationend never fires.
}

async function resetDemo() {
  const ok = await confirmDialog({
    title: 'Reset to demo data?',
    message: 'Replace your graveyard with the demo data?',
    confirmLabel: 'Replace',
    cancelLabel: 'Keep my data',
    tone: 'danger',
    fallbackFocus: $('#reset-btn'),
  });
  if (ok) store.resetDemo();
}

async function importFile(file) {
  store.dismissNotice('import');
  const result = await readImportFile(file);
  if (!result.ok) {
    store.addNotice('import', result.message, 'error');
    return;
  }
  const count = result.subs.length;
  const noun = count === 1 ? 'subscription' : 'subscriptions';
  const ok = await confirmDialog({
    title: 'Import this graveyard?',
    message: `Replace your graveyard with ${count} ${noun} from this file?`,
    confirmLabel: 'Replace',
    cancelLabel: 'Keep my data',
    tone: 'danger',
    fallbackFocus: $('#import-btn'),
  });
  if (!ok) return;
  dismissedBannerKey = null;
  store.replaceAll(result.subs);
  store.addNotice('import', `Imported ${count} ${noun}.`, 'info');
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, key } = button.dataset;

  switch (action) {
    case 'add':
      addDialog.open();
      break;
    case 'export':
      exportFile(store.getState().subs);
      break;
    case 'import':
      fileInput.click();
      break;
    case 'reset-demo':
      resetDemo();
      break;
    case 'still-using':
      if (!burying.has(id)) store.confirmStillUsing(id);
      break;
    case 'bury':
      bury(id);
      break;
    case 'dismiss-banner':
      dismissedBannerKey = hauntingSummary(store.getState().subs, store.getToday()).ids.join(',');
      render(store.getState());
      focusHeadingIfLost();
      break;
    case 'dismiss-notice':
      store.dismissNotice(key);
      break;
    default:
      break;
  }
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (file) importFile(file);
});

/* ---------- Start ---------- */

store.subscribe(render);
store.init();

// Re-evaluate zombie and haunting state when the calendar day changes.
let lastDay = store.getToday();
function checkDay() {
  const today = store.getToday();
  if (today !== lastDay) {
    lastDay = today;
    store.refreshDate();
  }
}
setInterval(checkDay, 60_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkDay();
});
