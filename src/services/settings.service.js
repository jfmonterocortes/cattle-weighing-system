const prisma = require('../db/prisma');
const bcrypt = require('bcrypt');
const { SYSTEM_SETTING_KEYS, ROLE } = require('../constants/domain');
const { normalizeSpace } = require('../utils/normalization');
const { createPersonRecord, updatePersonRecord } = require('./person.service');

const ownProfileSelect = {
  id: true,
  email: true,
  role: true,
  liquidadorAlias: true,
  isActive: true,
  personId: true,
  person: { select: { id: true, name: true, phone: true, cedula: true } },
};

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
    select: ownProfileSelect,
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

async function updateOwnProfile({ user, name, phone, cedula, liquidadorAlias }) {
  const account = await prisma.user.findUnique({
    where: { id: user.userId },
    select: ownProfileSelect,
  });

  if (!account) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.role === ROLE.CLIENT) {
    if (!account.personId) {
      const err = new Error('Debes vincular tu cuenta a una persona antes de actualizar telefono o cedula.');
      err.statusCode = 409;
      throw err;
    }

    const updatedPerson = await updatePersonRecord(account.personId, { phone, cedula }, user);
    return {
      profile: {
        ...account,
        person: {
          id: updatedPerson.id,
          name: updatedPerson.name,
          phone: updatedPerson.phone,
          cedula: updatedPerson.cedula,
        },
      },
    };
  }

  const hasPersonInput = name !== undefined || phone !== undefined || cedula !== undefined;
  const updateData = {};

  if (liquidadorAlias !== undefined) {
    updateData.liquidadorAlias = normalizeSpace(liquidadorAlias || '') || null;
  }

  let nextPerson = account.person || null;

  if (hasPersonInput) {
    if (account.personId) {
      const updatedPerson = await updatePersonRecord(account.personId, { name, phone, cedula }, user);
      nextPerson = {
        id: updatedPerson.id,
        name: updatedPerson.name,
        phone: updatedPerson.phone,
        cedula: updatedPerson.cedula,
      };
    } else {
      const nextName = normalizeSpace(name || '');
      if (!nextName) {
        const err = new Error('Debes indicar el nombre para crear la persona vinculada.');
        err.statusCode = 400;
        throw err;
      }

      const createdPerson = await createPersonRecord({
        name: nextName,
        phone,
        cedula,
      });

      updateData.personId = createdPerson.id;
      nextPerson = {
        id: createdPerson.id,
        name: createdPerson.name,
        phone: createdPerson.phone,
        cedula: createdPerson.cedula,
      };
    }
  }

  if (!Object.keys(updateData).length) {
    return { profile: account };
  }

  const updatedAccount = await prisma.user.update({
    where: { id: user.userId },
    data: updateData,
    select: ownProfileSelect,
  });

  return {
    profile: {
      ...updatedAccount,
      person: nextPerson,
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
    const err = new Error('La contrasena actual no es correcta.');
    err.statusCode = 400;
    throw err;
  }

  if (currentPassword === newPassword) {
    const err = new Error('La nueva contrasena debe ser diferente a la actual.');
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
  updateOwnProfile,
  updateOwnPassword,
};
