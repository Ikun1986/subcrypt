// JSON export and import.
import { todayISO } from './model.js';
import { EXPORT_FORMAT, SCHEMA_VERSION, LIMITS, validateExportFile } from './schema.js';

export function buildExport(subs, now = new Date()) {
  return {
    format: EXPORT_FORMAT,
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    subscriptions: subs,
  };
}

export function exportFilename(now = new Date()) {
  return `subcrypt-${todayISO(now)}.json`;
}

/** Triggers a browser download of all subscriptions, including buried ones. */
export function exportFile(subs, now = new Date()) {
  const json = JSON.stringify(buildExport(subs, now), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFilename(now);
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Validates a chosen file before anything is changed. */
export async function readImportFile(file) {
  if (file.size > LIMITS.maxBytes) {
    return { ok: false, message: 'Import failed: file is larger than 1 MB.' };
  }
  let text;
  try {
    text = await file.text();
  } catch {
    return { ok: false, message: 'Import failed: the file could not be read.' };
  }
  return validateExportFile(text, file.size);
}
