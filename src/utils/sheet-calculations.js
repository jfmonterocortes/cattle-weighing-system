const { CATTLE_TYPE, CATTLE_SEX, CATEGORY_DISPLAY_ORDER, resolveSpecification } = require('../constants/domain');

function resolveDefaultSex(type, currentSex) {
  if (type === CATTLE_TYPE.VACA) return CATTLE_SEX.HEMBRA;
  if (type === CATTLE_TYPE.TORO) return CATTLE_SEX.MACHO;
  if (type === CATTLE_TYPE.NOVILLO) return CATTLE_SEX.MACHO;
  return currentSex;
}

function buildSpecification(row) {
  return resolveSpecification(row);
}

function calculateSheetStats(rows, pricePerHead) {
  const safeRows = rows || [];
  const headCount = safeRows.length;
  const totalWeight = safeRows.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  const averageWeight = headCount ? Math.trunc(totalWeight / headCount) : 0;

  const maleRows = safeRows.filter((row) => row.sex === CATTLE_SEX.MACHO);
  const femaleRows = safeRows.filter((row) => row.sex === CATTLE_SEX.HEMBRA);

  const totalMaleWeight = maleRows.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  const totalFemaleWeight = femaleRows.reduce((sum, row) => sum + Number(row.weight || 0), 0);

  const averageMaleWeight = maleRows.length ? Math.trunc(totalMaleWeight / maleRows.length) : 0;
  const averageFemaleWeight = femaleRows.length ? Math.trunc(totalFemaleWeight / femaleRows.length) : 0;

  const totalsBySpec = {};
  for (const row of safeRows) {
    // OTHER rows group by their custom spec text; built-in rows by type+sex.
    const key = row.type === 'OTHER'
      ? `OTHER|${String(row.customSpecification || '').toUpperCase()}`
      : `${row.type}|${row.sex}`;
    if (!totalsBySpec[key]) {
      totalsBySpec[key] = {
        type: row.type,
        sex: row.sex,
        customSpecification: row.type === 'OTHER' ? (row.customSpecification || null) : null,
        count: 0,
        totalWeight: 0,
        averageWeight: 0,
      };
    }
    totalsBySpec[key].count += 1;
    totalsBySpec[key].totalWeight += Number(row.weight || 0);
  }

  Object.values(totalsBySpec).forEach((group) => {
    group.averageWeight = group.count ? Math.trunc(group.totalWeight / group.count) : 0;
    group.specification = buildSpecification(group);
  });

  const sortedTotalsByTypeSex = Object.values(totalsBySpec).sort((a, b) => {
    const ai = CATEGORY_DISPLAY_ORDER.indexOf(a.specification);
    const bi = CATEGORY_DISPLAY_ORDER.indexOf(b.specification);
    // Built-in categories use fixed order; OTHER/unknown sorts alphabetically after them.
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.specification.localeCompare(b.specification);
  });

  const totalValue = Math.trunc(Number(pricePerHead || 0)) * headCount;

  return {
    headCount,
    totalWeight,
    averageWeight,
    totalMaleWeight,
    averageMaleWeight,
    totalFemaleWeight,
    averageFemaleWeight,
    totalValue,
    totalsByTypeSex: sortedTotalsByTypeSex,
  };
}

module.exports = {
  resolveDefaultSex,
  buildSpecification,
  calculateSheetStats,
};
