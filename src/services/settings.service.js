const prisma = require('../db/prisma');
const { SYSTEM_SETTING_KEYS } = require('../constants/domain');

async function getDefaultPricePerHead() {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.DEFAULT_PRICE_PER_HEAD },
  });

  if (row?.intValue && row.intValue > 0) return row.intValue;
  return 5000;
}

async function setDefaultPricePerHead(value) {
  return prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.DEFAULT_PRICE_PER_HEAD },
    update: { intValue: value },
    create: { key: SYSTEM_SETTING_KEYS.DEFAULT_PRICE_PER_HEAD, intValue: value },
  });
}

module.exports = {
  getDefaultPricePerHead,
  setDefaultPricePerHead,
};
