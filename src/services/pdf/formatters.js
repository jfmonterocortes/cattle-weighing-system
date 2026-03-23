// All three formatters are pure functions (no closures, no shared state) so the
// PDF bytes they produce are identical for identical inputs — a property the
// determinism test in export.pdf.test.js relies on.

const LOCALE = 'es-CO';
const TZ     = 'America/Bogota';

/**
 * Format a Date as "DD/MM/YYYY HH:MM" in Colombia time (UTC-5, no DST).
 * Uses formatToParts so the output is stable across Node/ICU versions.
 */
function fmtDate(date) {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

/** Format a weight in kg as a whole number — e.g. 1234 → "1.234". */
function fmtWeight(kg) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kg);
}

/** Format a COP amount with no decimals — e.g. 800000 → "$ 800.000". */
function fmtMoney(amount) {
  return new Intl.NumberFormat(LOCALE, {
    style:                 'currency',
    currency:              'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

module.exports = { fmtDate, fmtWeight, fmtMoney };
