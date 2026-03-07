function normalizeSpace(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeNameKey(value) {
  return normalizeSpace(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeCedula(value) {
  return String(value || '').replace(/\D/g, '');
}

module.exports = {
  normalizeSpace,
  normalizeNameKey,
  normalizePhone,
  normalizeCedula,
};
