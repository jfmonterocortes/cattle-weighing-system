require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('../src/db/prisma');
const {
  ROLE,
  CATTLE_TYPE,
  CATTLE_SEX,
  LINK_REQUEST_STATUS,
  SYSTEM_SETTING_KEYS,
} = require('../src/constants/domain');
const { normalizeNameKey, normalizePhone, normalizeCedula } = require('../src/utils/normalization');
const { recalculateAndPersistSheet } = require('../src/services/sheet.service');

async function upsertPerson(name, phone, cedula) {
  const data = {
    name,
    nameKey: normalizeNameKey(name),
    phone: phone || null,
    phoneKey: phone ? normalizePhone(phone) : null,
    cedula: cedula || null,
    cedulaKey: cedula ? normalizeCedula(cedula) : null,
  };

  const existing = await prisma.person.findUnique({ where: { nameKey: data.nameKey } });
  if (!existing) return prisma.person.create({ data });

  return prisma.person.update({ where: { id: existing.id }, data });
}

async function ensureUser({ email, password, role, personId, alias }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      personId: personId || null,
      liquidadorAlias: alias || null,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role,
      personId: personId || null,
      liquidadorAlias: alias || null,
      isActive: true,
    },
  });
}

async function main() {
  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.DEFAULT_PRICE_PER_HEAD },
    update: { intValue: 5000 },
    create: { key: SYSTEM_SETTING_KEYS.DEFAULT_PRICE_PER_HEAD, intValue: 5000 },
  });

  const p1 = await upsertPerson('Carlos Montero', '3001112233', '1099001');
  const p2 = await upsertPerson('Ana Vargas', '3001112244', '1099002');
  const p3 = await upsertPerson('Rosa Martinez', '3001112255', '1099003');
  const p4 = await upsertPerson('Luis Herrera', '3001112266', '1099004');

  const admin = await ensureUser({
    email: 'admin@bascula.com',
    password: 'Admin123!',
    role: ROLE.ADMIN,
    personId: null,
    alias: 'ADM',
  });

  const liquidador = await ensureUser({
    email: 'liquidador@bascula.com',
    password: 'Liquidador123!',
    role: ROLE.LIQUIDADOR,
    personId: p2.id,
    alias: 'ANV',
  });

  const client = await ensureUser({
    email: 'cliente@bascula.com',
    password: 'Cliente123!',
    role: ROLE.CLIENT,
    personId: p3.id,
  });

  const orphanUser = await ensureUser({
    email: 'nuevo@bascula.com',
    password: 'Cliente123!',
    role: ROLE.CLIENT,
    personId: null,
  });

  const now = new Date();
  const year = now.getFullYear();

  const sheetA = await prisma.weighingSheet.upsert({
    where: { visibleNumber: `${year}-001` },
    update: {
      sellerId: p3.id,
      buyerId: p4.id,
      createdById: liquidador.id,
      liquidadorAliasSnapshot: liquidador.liquidadorAlias || 'LIQ',
      pricePerHead: 5200,
      editableUntilByLiquidador: new Date(now.getTime() + 10 * 60 * 1000),
      isPaid: true,
      paidAt: now,
      paidById: admin.id,
    },
    create: {
      visibleNumber: `${year}-001`,
      sheetYear: year,
      sheetSequence: 1,
      sellerId: p3.id,
      buyerId: p4.id,
      createdById: liquidador.id,
      liquidadorAliasSnapshot: liquidador.liquidadorAlias || 'LIQ',
      pricePerHead: 5200,
      editableUntilByLiquidador: new Date(now.getTime() + 10 * 60 * 1000),
      isPaid: true,
      paidAt: now,
      paidById: admin.id,
    },
  });

  const sheetB = await prisma.weighingSheet.upsert({
    where: { visibleNumber: `${year}-002` },
    update: {
      sellerId: p4.id,
      buyerId: p3.id,
      createdById: admin.id,
      liquidadorAliasSnapshot: 'ADM',
      pricePerHead: 5000,
      editableUntilByLiquidador: new Date(now.getTime() - 10 * 60 * 1000),
      isPaid: false,
      paidAt: null,
      paidById: null,
    },
    create: {
      visibleNumber: `${year}-002`,
      sheetYear: year,
      sheetSequence: 2,
      sellerId: p4.id,
      buyerId: p3.id,
      createdById: admin.id,
      liquidadorAliasSnapshot: 'ADM',
      pricePerHead: 5000,
      editableUntilByLiquidador: new Date(now.getTime() - 10 * 60 * 1000),
      isPaid: false,
    },
  });

  await prisma.cattleRow.deleteMany({ where: { weighingSheetId: { in: [sheetA.id, sheetB.id] } } });

  await prisma.cattleRow.createMany({
    data: [
      {
        weighingSheetId: sheetA.id,
        rowOrder: 1,
        type: CATTLE_TYPE.TERNERO,
        sex: CATTLE_SEX.MACHO,
        weight: 340,
        cattleNumber: '101',
        letters: 'AA',
      },
      {
        weighingSheetId: sheetA.id,
        rowOrder: 2,
        type: CATTLE_TYPE.NOVILLO,
        sex: CATTLE_SEX.MACHO,
        weight: 460,
        cattleNumber: '102',
        letters: null,
      },
      {
        weighingSheetId: sheetA.id,
        rowOrder: 3,
        type: CATTLE_TYPE.VACA,
        sex: CATTLE_SEX.HEMBRA,
        weight: 420,
        cattleNumber: '102',
        letters: 'B2',
      },
      {
        weighingSheetId: sheetB.id,
        rowOrder: 1,
        type: CATTLE_TYPE.BUFALO,
        sex: CATTLE_SEX.HEMBRA,
        weight: 510,
        cattleNumber: '201',
        letters: null,
      },
    ],
  });

  await recalculateAndPersistSheet(sheetA.id);
  await recalculateAndPersistSheet(sheetB.id);

  await prisma.paymentLog.deleteMany({ where: { weighingSheetId: { in: [sheetA.id, sheetB.id] } } });
  await prisma.paymentLog.create({
    data: {
      weighingSheetId: sheetA.id,
      previousStatus: false,
      newStatus: true,
      changedById: admin.id,
      amount: sheetA.totalValue,
      notes: 'Pago inicial demo',
    },
  });

  await prisma.personAccountLinkRequest.upsert({
    where: {
      userId_personId_status: {
        userId: orphanUser.id,
        personId: p4.id,
        status: LINK_REQUEST_STATUS.PENDING,
      },
    },
    update: { notes: 'Solicito vinculacion por coincidencia de cedula' },
    create: {
      userId: orphanUser.id,
      personId: p4.id,
      status: LINK_REQUEST_STATUS.PENDING,
      notes: 'Solicito vinculacion por coincidencia de cedula',
    },
  });

  await prisma.personAccountLinkRequest.upsert({
    where: {
      userId_personId_status: {
        userId: client.id,
        personId: p3.id,
        status: LINK_REQUEST_STATUS.APPROVED,
      },
    },
    update: {
      reviewedAt: now,
      reviewedById: admin.id,
      notes: 'Vinculacion aprobada en seed',
    },
    create: {
      userId: client.id,
      personId: p3.id,
      status: LINK_REQUEST_STATUS.APPROVED,
      reviewedAt: now,
      reviewedById: admin.id,
      notes: 'Vinculacion aprobada en seed',
    },
  });

  console.log('Seed completed. Demo users:');
  console.log('admin@bascula.com / Admin123!');
  console.log('liquidador@bascula.com / Liquidador123!');
  console.log('cliente@bascula.com / Cliente123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
