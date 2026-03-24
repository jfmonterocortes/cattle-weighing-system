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
    update: { passwordHash, role, personId: personId || null, liquidadorAlias: alias || null, isActive: true },
    create: { email, passwordHash, role, personId: personId || null, liquidadorAlias: alias || null, isActive: true },
  });
}

async function createSheet({ visibleNumber, sequence, date, sellerId, buyerId, createdById, alias, pricePerHead, locked, isPaid, paidAt, paidById }) {
  const year = date.getFullYear();
  return prisma.weighingSheet.upsert({
    where: { visibleNumber },
    update: {
      sellerId, buyerId, createdById,
      liquidadorAliasSnapshot: alias,
      pricePerHead,
      lockedByLiquidador: locked,
      isPaid: isPaid || false,
      paidAt: paidAt || null,
      paidById: paidById || null,
    },
    create: {
      visibleNumber,
      sheetYear: year,
      sheetSequence: sequence,
      date,
      sellerId, buyerId, createdById,
      liquidadorAliasSnapshot: alias,
      pricePerHead,
      lockedByLiquidador: locked,
      isPaid: isPaid || false,
      paidAt: paidAt || null,
      paidById: paidById || null,
    },
  });
}

function d(year, month, day, hour = 8, min = 0) {
  return new Date(year, month - 1, day, hour, min, 0);
}

async function main() {
  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.DEFAULT_PRICE_PER_HEAD },
    update: { intValue: 5000 },
    create: { key: SYSTEM_SETTING_KEYS.DEFAULT_PRICE_PER_HEAD, intValue: 5000 },
  });

  // --- Personas ---
  const p1  = await upsertPerson('Carlos Montero',     '3001112233', '10990010');
  const p2  = await upsertPerson('Ana Vargas',         '3157890011', '10990020');  // liquidador
  const p3  = await upsertPerson('Rosa Martinez',      '3204561122', '10990030');  // client
  const p4  = await upsertPerson('Luis Herrera',       '3112233445', '10990040');
  const p5  = await upsertPerson('Jorge Peña',         '3008877665', '10990050');
  const p6  = await upsertPerson('Maria Castillo',     '3143344556', '10990060');
  const p7  = await upsertPerson('Hernando Ospina',    '3006655443', '10990070');
  const p8  = await upsertPerson('Claudia Rios',       '3175566778', '10990080');
  const p9  = await upsertPerson('Fabio Gutierrez',    '3009988776', '10990090');
  const p10 = await upsertPerson('Patricia Moreno',    '3164455667', '10990100');
  const p11 = await upsertPerson('Andres Salcedo',     '3002211334', '10990110');
  const p12 = await upsertPerson('Esperanza Lozano',   '3153322441', '10990120');

  // --- Usuarios ---
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

  // --- Planillas ---
  const sheet1 = await createSheet({
    visibleNumber: '2026-001',
    sequence: 1,
    date: d(2026, 2, 10, 7, 30),
    sellerId: p3.id,   // Rosa Martinez
    buyerId: p4.id,    // Luis Herrera
    createdById: liquidador.id,
    alias: 'ANV',
    pricePerHead: 5200,
    locked: true,
    isPaid: true,
    paidAt: d(2026, 2, 10, 15, 0),
    paidById: admin.id,
  });

  const sheet2 = await createSheet({
    visibleNumber: '2026-002',
    sequence: 2,
    date: d(2026, 2, 14, 8, 0),
    sellerId: p5.id,   // Jorge Peña
    buyerId: p6.id,    // Maria Castillo
    createdById: liquidador.id,
    alias: 'ANV',
    pricePerHead: 5000,
    locked: true,
    isPaid: false,
  });

  const sheet3 = await createSheet({
    visibleNumber: '2026-003',
    sequence: 3,
    date: d(2026, 2, 20, 9, 15),
    sellerId: p7.id,   // Hernando Ospina
    buyerId: p8.id,    // Claudia Rios
    createdById: admin.id,
    alias: 'ADM',
    pricePerHead: 5500,
    locked: false,
    isPaid: true,
    paidAt: d(2026, 2, 20, 17, 0),
    paidById: admin.id,
  });

  const sheet4 = await createSheet({
    visibleNumber: '2026-004',
    sequence: 4,
    date: d(2026, 3, 3, 7, 45),
    sellerId: p9.id,   // Fabio Gutierrez
    buyerId: p4.id,    // Luis Herrera
    createdById: liquidador.id,
    alias: 'ANV',
    pricePerHead: 5000,
    locked: true,
    isPaid: false,
  });

  const sheet5 = await createSheet({
    visibleNumber: '2026-005',
    sequence: 5,
    date: d(2026, 3, 8, 8, 30),
    sellerId: p11.id,  // Andres Salcedo
    buyerId: p10.id,   // Patricia Moreno
    createdById: admin.id,
    alias: 'ADM',
    pricePerHead: 5200,
    locked: false,
    isPaid: true,
    paidAt: d(2026, 3, 8, 14, 30),
    paidById: admin.id,
  });

  const sheet6 = await createSheet({
    visibleNumber: '2026-006',
    sequence: 6,
    date: d(2026, 3, 15, 7, 0),
    sellerId: p1.id,   // Carlos Montero
    buyerId: p12.id,   // Esperanza Lozano
    createdById: liquidador.id,
    alias: 'ANV',
    pricePerHead: 5000,
    locked: false,
    isPaid: false,
  });

  const sheet7 = await createSheet({
    visibleNumber: '2026-007',
    sequence: 7,
    date: d(2026, 3, 19, 9, 0),
    sellerId: p3.id,   // Rosa Martinez
    buyerId: p11.id,   // Andres Salcedo
    createdById: liquidador.id,
    alias: 'ANV',
    pricePerHead: 5000,
    locked: true,
    isPaid: false,
  });

  const sheet8 = await createSheet({
    visibleNumber: '2026-008',
    sequence: 8,
    date: d(2026, 3, 22, 8, 0),
    sellerId: p7.id,   // Hernando Ospina
    buyerId: p6.id,    // Maria Castillo
    createdById: admin.id,
    alias: 'ADM',
    pricePerHead: 5500,
    locked: false,
    isPaid: false,
  });

  // --- Filas de reses ---
  const allSheetIds = [sheet1.id, sheet2.id, sheet3.id, sheet4.id, sheet5.id, sheet6.id, sheet7.id, sheet8.id];
  await prisma.cattleRow.deleteMany({ where: { weighingSheetId: { in: allSheetIds } } });

  await prisma.cattleRow.createMany({
    data: [
      // Sheet 1 — Rosa → Luis (6 reses, paid, locked)
      { weighingSheetId: sheet1.id, rowOrder: 1,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.MACHO,   weight: 310, cattleNumber: '101', letters: 'AA' },
      { weighingSheetId: sheet1.id, rowOrder: 2,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.HEMBRA,  weight: 285, cattleNumber: '102', letters: 'AB' },
      { weighingSheetId: sheet1.id, rowOrder: 3,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 420, cattleNumber: '103', letters: null },
      { weighingSheetId: sheet1.id, rowOrder: 4,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.HEMBRA,  weight: 390, cattleNumber: '104', letters: 'B1' },
      { weighingSheetId: sheet1.id, rowOrder: 5,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 460, cattleNumber: '105', letters: null },
      { weighingSheetId: sheet1.id, rowOrder: 6,  type: CATTLE_TYPE.TORO,    sex: CATTLE_SEX.MACHO,   weight: 540, cattleNumber: '106', letters: 'C1' },

      // Sheet 2 — Jorge → Maria (5 reses, unpaid, locked)
      { weighingSheetId: sheet2.id, rowOrder: 1,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 445, cattleNumber: '201', letters: null },
      { weighingSheetId: sheet2.id, rowOrder: 2,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 430, cattleNumber: '202', letters: null },
      { weighingSheetId: sheet2.id, rowOrder: 3,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.HEMBRA,  weight: 400, cattleNumber: '203', letters: 'A1' },
      { weighingSheetId: sheet2.id, rowOrder: 4,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 475, cattleNumber: '204', letters: null },
      { weighingSheetId: sheet2.id, rowOrder: 5,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 490, cattleNumber: '205', letters: 'B2' },

      // Sheet 3 — Hernando → Claudia (7 reses, paid)
      { weighingSheetId: sheet3.id, rowOrder: 1,  type: CATTLE_TYPE.BUFALO,  sex: CATTLE_SEX.MACHO,   weight: 520, cattleNumber: '301', letters: null },
      { weighingSheetId: sheet3.id, rowOrder: 2,  type: CATTLE_TYPE.BUFALO,  sex: CATTLE_SEX.MACHO,   weight: 505, cattleNumber: '302', letters: null },
      { weighingSheetId: sheet3.id, rowOrder: 3,  type: CATTLE_TYPE.BUFALO,  sex: CATTLE_SEX.HEMBRA,  weight: 470, cattleNumber: '303', letters: 'A1' },
      { weighingSheetId: sheet3.id, rowOrder: 4,  type: CATTLE_TYPE.BUFALO,  sex: CATTLE_SEX.HEMBRA,  weight: 450, cattleNumber: '304', letters: 'A2' },
      { weighingSheetId: sheet3.id, rowOrder: 5,  type: CATTLE_TYPE.TORO,    sex: CATTLE_SEX.MACHO,   weight: 580, cattleNumber: '305', letters: null },
      { weighingSheetId: sheet3.id, rowOrder: 6,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 440, cattleNumber: '306', letters: 'B1' },
      { weighingSheetId: sheet3.id, rowOrder: 7,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 415, cattleNumber: '307', letters: null },

      // Sheet 4 — Fabio → Luis (4 reses, unpaid, locked)
      { weighingSheetId: sheet4.id, rowOrder: 1,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.MACHO,   weight: 295, cattleNumber: '401', letters: null },
      { weighingSheetId: sheet4.id, rowOrder: 2,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.MACHO,   weight: 320, cattleNumber: '402', letters: null },
      { weighingSheetId: sheet4.id, rowOrder: 3,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.HEMBRA,  weight: 270, cattleNumber: '403', letters: 'AA' },
      { weighingSheetId: sheet4.id, rowOrder: 4,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 455, cattleNumber: '404', letters: null },

      // Sheet 5 — Andres → Patricia (8 reses, paid)
      { weighingSheetId: sheet5.id, rowOrder: 1,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 465, cattleNumber: '501', letters: null },
      { weighingSheetId: sheet5.id, rowOrder: 2,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 480, cattleNumber: '502', letters: null },
      { weighingSheetId: sheet5.id, rowOrder: 3,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 455, cattleNumber: '503', letters: 'A1' },
      { weighingSheetId: sheet5.id, rowOrder: 4,  type: CATTLE_TYPE.TORO,    sex: CATTLE_SEX.MACHO,   weight: 560, cattleNumber: '504', letters: null },
      { weighingSheetId: sheet5.id, rowOrder: 5,  type: CATTLE_TYPE.TORO,    sex: CATTLE_SEX.MACHO,   weight: 575, cattleNumber: '505', letters: null },
      { weighingSheetId: sheet5.id, rowOrder: 6,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 435, cattleNumber: '506', letters: 'B1' },
      { weighingSheetId: sheet5.id, rowOrder: 7,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.HEMBRA,  weight: 395, cattleNumber: '507', letters: null },
      { weighingSheetId: sheet5.id, rowOrder: 8,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.MACHO,   weight: 335, cattleNumber: '508', letters: 'C2' },

      // Sheet 6 — Carlos → Esperanza (5 reses, open)
      { weighingSheetId: sheet6.id, rowOrder: 1,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 440, cattleNumber: '601', letters: null },
      { weighingSheetId: sheet6.id, rowOrder: 2,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 425, cattleNumber: '602', letters: null },
      { weighingSheetId: sheet6.id, rowOrder: 3,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.HEMBRA,  weight: 405, cattleNumber: '603', letters: 'A1' },
      { weighingSheetId: sheet6.id, rowOrder: 4,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.MACHO,   weight: 305, cattleNumber: '604', letters: null },
      { weighingSheetId: sheet6.id, rowOrder: 5,  type: CATTLE_TYPE.TERNERO, sex: CATTLE_SEX.HEMBRA,  weight: 280, cattleNumber: '605', letters: 'AB' },

      // Sheet 7 — Rosa → Andres (6 reses, locked, unpaid)
      { weighingSheetId: sheet7.id, rowOrder: 1,  type: CATTLE_TYPE.BUFALO,  sex: CATTLE_SEX.MACHO,   weight: 510, cattleNumber: '701', letters: null },
      { weighingSheetId: sheet7.id, rowOrder: 2,  type: CATTLE_TYPE.BUFALO,  sex: CATTLE_SEX.HEMBRA,  weight: 465, cattleNumber: '702', letters: 'A1' },
      { weighingSheetId: sheet7.id, rowOrder: 3,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 450, cattleNumber: '703', letters: null },
      { weighingSheetId: sheet7.id, rowOrder: 4,  type: CATTLE_TYPE.NOVILLO, sex: CATTLE_SEX.MACHO,   weight: 435, cattleNumber: '704', letters: null },
      { weighingSheetId: sheet7.id, rowOrder: 5,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 470, cattleNumber: '705', letters: 'B1' },
      { weighingSheetId: sheet7.id, rowOrder: 6,  type: CATTLE_TYPE.TORO,    sex: CATTLE_SEX.MACHO,   weight: 555, cattleNumber: '706', letters: null },

      // Sheet 8 — Hernando → Maria (4 reses, open)
      { weighingSheetId: sheet8.id, rowOrder: 1,  type: CATTLE_TYPE.TORO,    sex: CATTLE_SEX.MACHO,   weight: 590, cattleNumber: '801', letters: null },
      { weighingSheetId: sheet8.id, rowOrder: 2,  type: CATTLE_TYPE.TORO,    sex: CATTLE_SEX.MACHO,   weight: 610, cattleNumber: '802', letters: null },
      { weighingSheetId: sheet8.id, rowOrder: 3,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 455, cattleNumber: '803', letters: 'A1' },
      { weighingSheetId: sheet8.id, rowOrder: 4,  type: CATTLE_TYPE.VACA,    sex: CATTLE_SEX.HEMBRA,  weight: 445, cattleNumber: '804', letters: null },
    ],
  });

  for (const id of allSheetIds) {
    await recalculateAndPersistSheet(id);
  }

  // --- Pagos ---
  await prisma.paymentLog.deleteMany({ where: { weighingSheetId: { in: allSheetIds } } });

  await prisma.paymentLog.createMany({
    data: [
      {
        weighingSheetId: sheet1.id,
        previousStatus: false,
        newStatus: true,
        changedById: admin.id,
        amount: sheet1.totalValue,
        notes: 'Pago al contado en báscula',
      },
      {
        weighingSheetId: sheet3.id,
        previousStatus: false,
        newStatus: true,
        changedById: admin.id,
        amount: sheet3.totalValue,
        notes: 'Transferencia bancaria confirmada',
      },
      {
        weighingSheetId: sheet5.id,
        previousStatus: false,
        newStatus: true,
        changedById: admin.id,
        amount: sheet5.totalValue,
        notes: 'Pago en efectivo',
      },
    ],
  });

  // --- Solicitudes de vinculación ---
  await prisma.personAccountLinkRequest.upsert({
    where: { userId_personId_status: { userId: orphanUser.id, personId: p4.id, status: LINK_REQUEST_STATUS.PENDING } },
    update: { notes: 'Solicito vinculacion, cédula coincide con mis registros' },
    create: { userId: orphanUser.id, personId: p4.id, status: LINK_REQUEST_STATUS.PENDING, notes: 'Solicito vinculacion, cédula coincide con mis registros' },
  });

  await prisma.personAccountLinkRequest.upsert({
    where: { userId_personId_status: { userId: client.id, personId: p3.id, status: LINK_REQUEST_STATUS.APPROVED } },
    update: { reviewedAt: d(2026, 1, 15), reviewedById: admin.id, notes: 'Vinculacion aprobada' },
    create: { userId: client.id, personId: p3.id, status: LINK_REQUEST_STATUS.APPROVED, reviewedAt: d(2026, 1, 15), reviewedById: admin.id, notes: 'Vinculacion aprobada' },
  });

  console.log('\nSeed completado. Usuarios demo:');
  console.log('  admin@bascula.com      / Admin123!');
  console.log('  liquidador@bascula.com / Liquidador123!');
  console.log('  cliente@bascula.com    / Cliente123!');
  console.log('\n  8 planillas | 12 personas | 47 reses');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
