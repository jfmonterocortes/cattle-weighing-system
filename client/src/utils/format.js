/**
 * Number formatting utilities for Colombian locale.
 * Uses dot as thousands separator, no decimals for currency.
 */

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Format as Colombian currency: $1.250.000 */
export function fmtCurrency(value) {
  const n = safeNumber(value);
  if (n === null) return '-';
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

/** Format weight with unit: 1.250 kg */
export function fmtWeight(value) {
  const n = safeNumber(value);
  if (n === null) return '-';
  return `${Math.round(n).toLocaleString('es-CO')} kg`;
}

/** Format plain number with thousands separator: 1.250 */
export function fmtNumber(value) {
  const n = safeNumber(value);
  if (n === null) return '-';
  return Math.round(n).toLocaleString('es-CO');
}

const ROLE_LABELS = { ADMIN: 'Administrador', LIQUIDADOR: 'Liquidador', CLIENT: 'Cliente' };

/** Return a human-readable Spanish label for a role enum value. */
export function formatRole(role) {
  return ROLE_LABELS[role] ?? role ?? '-';
}
