const prisma = require('../db/prisma');
const bcrypt = require('bcrypt');
const { SYSTEM_SETTING_KEYS, ROLE } = require('../constants/domain');
const { updatePersonRecord } = require('./person.service');

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
  if (user.role === ROLE.CLIENT) {
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
      canRequest: user.role === ROLE.CLIENT ? !linkRequest && !account?.personId : false,
    },
  };
}

async function updateClientProfile({ user, phone, cedula }) {
  if (user.role !== ROLE.CLIENT) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const account = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, personId: true },
  });

  if (!account?.personId) {
    const err = new Error('Debes vincular tu cuenta a una persona antes de actualizar teléfono o cédula.');
    err.statusCode = 409;
    throw err;
  }

  const updated = await updatePersonRecord(account.personId, { phone, cedula }, user);
  return {
    person: {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      cedula: updated.cedula,
    },
  };
}

async function updateOwnPassword({ userId, currentPassword, newPassword }) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!account) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const valid = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!valid) {
    const err = new Error('La contraseña actual no es correcta.');
    err.statusCode = 400;
    throw err;
  }

  if (currentPassword === newPassword) {
    const err = new Error('La nueva contraseña debe ser diferente a la actual.');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: true };
}

module.exports = {
  getDefaultPricePerHead,
  setDefaultPricePerHead,
  getSettingsForUser,
  updateClientProfile,
  updateOwnPassword,
};
