const { CATTLE_TYPE, CATTLE_SEX } = require('../constants/domain');

function resolveDefaultSex(type, currentSex) {
  if (type === CATTLE_TYPE.VACA) return CATTLE_SEX.HEMBRA;
  if (type === CATTLE_TYPE.TORO) return CATTLE_SEX.MACHO;
  if (type === CATTLE_TYPE.NOVILLO) return CATTLE_SEX.MACHO;
  return currentSex;
}

function buildSpecification(type, sex) {
  return `${String(type || '').toLowerCase()} ${String(sex || '').toLowerCase()}`.trim();
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

  const totalsByTypeSex = {};
  for (const row of safeRows) {
    const key = `${row.type}|${row.sex}`;
    if (!totalsByTypeSex[key]) {
      totalsByTypeSex[key] = {
        type: row.type,
        sex: row.sex,
        count: 0,
        totalWeight: 0,
        averageWeight: 0,
      };
    }
    totalsByTypeSex[key].count += 1;
    totalsByTypeSex[key].totalWeight += Number(row.weight || 0);
  }

  Object.values(totalsByTypeSex).forEach((group) => {
    group.averageWeight = group.count ? Math.trunc(group.totalWeight / group.count) : 0;
    group.specification = buildSpecification(group.type, group.sex);
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
    totalsByTypeSex: Object.values(totalsByTypeSex),
  };
}

module.exports = {
  resolveDefaultSex,
  buildSpecification,
  calculateSheetStats,
};
