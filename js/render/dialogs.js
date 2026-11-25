// Native <dialog> wiring: add form and a generic confirm dialog.
// showModal() gives focus containment, Escape to close, and an inert background.
import { CATEGORIES, validateDraft } from '../schema.js';
import { h } from './dom.js';

function restoreFocus(opener, fallback) {
  if (opener && opener.isConnected && !opener.disabled && typeof opener.focus === 'function') opener.focus();
  else if (fallback && fallback.isConnected) fallback.focus();
}

export function createConfirm(dialog) {
  const title = dialog.querySelector('[data-confirm-title]');
  const message = dialog.querySelector('[data-confirm-message]');
  const ok = dialog.querySelector('[data-confirm-ok]');
  const cancel = dialog.querySelector('[data-confirm-cancel]');

  /** Resolves true only when the user picks the confirm button. Escape and cancel resolve false. */
  return function confirm({ title: t, message: m, confirmLabel, cancelLabel, tone = 'danger', fallbackFocus }) {
    return new Promise((resolve) => {
      const opener = document.activeElement;
      title.textContent = t;
      message.textContent = m;
      ok.textContent = confirmLabel;
      cancel.textContent = cancelLabel;
      ok.className = tone === 'danger' ? 'btn btn--danger' : 'btn btn--primary';
      dialog.returnValue = '';

      const onClose = () => {
        dialog.removeEventListener('close', onClose);
        const confirmed = dialog.returnValue === 'confirm';
        restoreFocus(opener, fallbackFocus);
        resolve(confirmed);
      };
      dialog.addEventListener('close', onClose);
      dialog.showModal();
      cancel.focus(); // Safe default for destructive actions.
    });
  };
}

export function createAddDialog({ dialog, onSubmit, fallbackFocus }) {
  const form = dialog.querySelector('form');
  const fields = {
    name: form.elements.namedItem('name'),
    price: form.elements.namedItem('price'),
    cycle: form.elements.namedItem('cycle'),
    nextRenewal: form.elements.namedItem('nextRenewal'),
    category: form.elements.namedItem('category'),
    status: form.elements.namedItem('status'),
  };
  const errorEls = {};
  for (const key of Object.keys(fields)) errorEls[key] = form.querySelector(`[data-error="${key}"]`);

  fields.category.replaceChildren(...CATEGORIES.map((c) => h('option', { value: c, selected: c === 'Other' }, c)));

  let opener = null;

  function clearErrors() {
    for (const key of Object.keys(fields)) {
      errorEls[key].textContent = '';
      fields[key].removeAttribute('aria-invalid');
    }
  }

  function values() {
    const out = {};
    for (const key of Object.keys(fields)) out[key] = fields[key].value;
    return out;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();
    const result = validateDraft(values());
    if (!result.ok) {
      const keys = Object.keys(result.errors);
      for (const key of keys) {
        errorEls[key].textContent = result.errors[key];
        fields[key].setAttribute('aria-invalid', 'true');
      }
      fields[keys[0]].focus(); // Values stay as typed.
      return;
    }
    onSubmit(result.value);
    dialog.close('added');
  });

  form.querySelector('[data-add-cancel]').addEventListener('click', () => dialog.close('cancel'));

  dialog.addEventListener('close', () => {
    form.reset();
    clearErrors();
    restoreFocus(opener, fallbackFocus);
    opener = null;
  });

  return {
    open() {
      opener = document.activeElement;
      dialog.showModal();
      fields.name.focus();
    },
  };
}
