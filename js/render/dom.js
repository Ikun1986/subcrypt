// Tiny element helper. Strings always become text nodes, never HTML,
// so imported or typed text cannot inject markup.

/**
 * h('button', { class: 'btn', onclick: fn, 'data-id': id }, 'Label')
 * Inline `style` attributes are intentionally unsupported (the CSP forbids them).
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style') continue;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else if (child instanceof Node) el.append(child);
    else el.append(document.createTextNode(String(child)));
  }
}

/** Decorative image: hidden from assistive technology. */
export function decorativeImg(src, className) {
  return h('img', { src, alt: '', 'aria-hidden': 'true', class: className, width: 64, height: 80, draggable: 'false' });
}

/** Stable 0..1 number from a string, used to desynchronise animations. */
export function seedFor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

export function replaceChildren(el, ...children) {
  el.replaceChildren();
  append(el, children);
}
