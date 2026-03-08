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

async function getSettingsForUser(user) {
  const defaultPricePerHead = await getDefaultPricePerHead();

  const account = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      role: true,
      liquidadorAlias: true,
      isActive: true,
      personId: true,
      person: { select: { id: true, name: true, phone: true, cedula: true } },
    },
  });

  let linkRequest = null;
  if (user.role === 'CLIENT') {
    linkRequest = await prisma.personAccountLinkRequest.findFirst({
      where: { userId: user.userId },
      orderBy: { requestedAt: 'desc' },
      include: {
        person: { select: { id: true, name: true, phone: true, cedula: true } },
      },
    });
  }

  return {
    defaultPricePerHead,
    profile: account,
    link: {
      hasUsedRequest: Boolean(linkRequest),
      latestRequest: linkRequest,
      canRequest: user.role === 'CLIENT' ? !linkRequest && !account?.personId : false,
    },
  };
}

module.exports = {
  getDefaultPricePerHead,
  setDefaultPricePerHead,
  getSettingsForUser,
};
