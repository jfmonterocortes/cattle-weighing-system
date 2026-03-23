const ROLE = {
  ADMIN: 'ADMIN',
  LIQUIDADOR: 'LIQUIDADOR',
  CLIENT: 'CLIENT',
};

const CATTLE_TYPE = {
  VACA: 'VACA',
  TORO: 'TORO',
  BUFALO: 'BUFALO',
  NOVILLO: 'NOVILLO',
  TERNERO: 'TERNERO',
};

const CATTLE_SEX = {
  MACHO: 'MACHO',
  HEMBRA: 'HEMBRA',
};

// Visible cattle categories shown to users in UI and PDF.
// Each category maps to the underlying type + sex stored in the database.
const CATTLE_CATEGORY = {
  TERNERA:  { type: 'TERNERO', sex: 'HEMBRA' },
  TERNERO:  { type: 'TERNERO', sex: 'MACHO'  },
  NOVILLA:  { type: 'NOVILLO', sex: 'HEMBRA' },
  NOVILLO:  { type: 'NOVILLO', sex: 'MACHO'  },
  BUFALA:   { type: 'BUFALO',  sex: 'HEMBRA' },
  BUFALO:   { type: 'BUFALO',  sex: 'MACHO'  },
  VACA:     { type: 'VACA',    sex: 'HEMBRA' },
  TORO:     { type: 'TORO',    sex: 'MACHO'  },
};

// Display order for UI dropdowns and summary tables.
const CATEGORY_DISPLAY_ORDER = ['TERNERA', 'TERNERO', 'NOVILLA', 'NOVILLO', 'BUFALA', 'BUFALO', 'VACA', 'TORO'];

/**
 * Returns the visible category name for a given type+sex pair stored in the DB.
 * Falls back to "TYPE SEX" if no matching category exists.
 */
function categoryFromTypeAndSex(type, sex) {
  const entry = Object.entries(CATTLE_CATEGORY).find(
    ([, v]) => v.type === type && v.sex === sex,
  );
  return entry ? entry[0] : `${String(type || '').toUpperCase()} ${String(sex || '').toUpperCase()}`.trim();
}

/**
 * Returns { type, sex } for a given category name.
 * Throws if the category is unknown.
 */
function typeAndSexFromCategory(category) {
  const entry = CATTLE_CATEGORY[String(category).toUpperCase()];
  if (!entry) throw new Error(`Unknown cattle category: ${category}`);
  return entry;
}

const LINK_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const SHEET_AUDIT_ACTION = {
  PLANILLA_CREATED: 'PLANILLA_CREATED',
  PLANILLA_UPDATED: 'PLANILLA_UPDATED',
  PLANILLA_DELETED: 'PLANILLA_DELETED',
  ROW_ADDED: 'ROW_ADDED',
  ROW_UPDATED: 'ROW_UPDATED',
  ROW_DELETED: 'ROW_DELETED',
  ROW_REORDERED: 'ROW_REORDERED',
  PRICE_CHANGED: 'PRICE_CHANGED',
  PAYMENT_STATUS_CHANGED: 'PAYMENT_STATUS_CHANGED',
  SELLER_CHANGED: 'SELLER_CHANGED',
  BUYER_CHANGED: 'BUYER_CHANGED',
  LIQUIDADOR_ALIAS_CHANGED: 'LIQUIDADOR_ALIAS_CHANGED',
  LINK_REQUEST_APPROVED: 'LINK_REQUEST_APPROVED',
  LINK_REQUEST_REJECTED: 'LINK_REQUEST_REJECTED',
};

const SYSTEM_SETTING_KEYS = {
  DEFAULT_PRICE_PER_HEAD: 'DEFAULT_PRICE_PER_HEAD',
};

module.exports = {
  ROLE,
  CATTLE_TYPE,
  CATTLE_SEX,
  CATTLE_CATEGORY,
  CATEGORY_DISPLAY_ORDER,
  categoryFromTypeAndSex,
  typeAndSexFromCategory,
  LINK_REQUEST_STATUS,
  SHEET_AUDIT_ACTION,
  SYSTEM_SETTING_KEYS,
};
