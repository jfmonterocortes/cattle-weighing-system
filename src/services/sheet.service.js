const prisma = require('../db/prisma');
const { calculateSheetStats, resolveDefaultSex } = require('../utils/sheet-calculations');
const { ROLE, SHEET_AUDIT_ACTION, typeAndSexFromCategory } = require('../constants/domain');
const { getDefaultPricePerHead } = require('./settings.service');
const {
  addSheetAuditBestEffort,
  addSheetAuditsBestEffort,
} = require('./audit.service');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const REORDER_OFFSET = 1000;

function toSafePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toSafePage(value) {
  return toSafePositiveInt(value, DEFAULT_PAGE);
}

function toSafePageSize(value) {
  const parsed = toSafePositiveInt(value, DEFAULT_PAGE_SIZE);
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function assertCanEditSheet(user, sheet) {
  if (user.role === ROLE.ADMIN) return;
  if (user.role === ROLE.LIQUIDADOR && sheet.createdById === user.userId && !sheet.lockedByLiquidador) return;

  const err = new Error('Sheet is closed for your role');
  err.statusCode = 403;
  throw err;
}

function assertCanViewSheet(user, sheet) {
  if (user.role === ROLE.ADMIN || user.role === ROLE.LIQUIDADOR) return;
  if (user.role === ROLE.CLIENT && user.personId && (sheet.sellerId === user.personId || sheet.buyerId === user.personId)) return;

  const err = new Error('Forbidden');
  err.statusCode = 403;
  throw err;
}

async function nextSheetNumber(dateValue = new Date(), db = prisma) {
  const year = dateValue.getFullYear();
  const last = await db.weighingSheet.findFirst({
    where: { sheetYear: year },
    orderBy: { sheetSequence: 'desc' },
    select: { sheetSequence: true },
  });

  const sequence = (last?.sheetSequence || 0) + 1;
  const visibleNumber = `${year}-${String(sequence).padStart(3, '0')}`;

  return { year, sequence, visibleNumber };
}

async function recalculateAndPersistSheet(sheetId, db = prisma) {
  const sheet = await db.weighingSheet.findUnique({
    where: { id: sheetId },
    include: { rows: { orderBy: { rowOrder: 'asc' } } },
  });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  const stats = calculateSheetStats(sheet.rows, sheet.pricePerHead);

  await db.weighingSheet.update({
    where: { id: sheetId },
    data: {
      totalWeight: stats.totalWeight,
      averageWeight: stats.averageWeight,
      totalMaleWeight: stats.totalMaleWeight,
      averageMaleWeight: stats.averageMaleWeight,
      totalFemaleWeight: stats.totalFemaleWeight,
      averageFemaleWeight: stats.averageFemaleWeight,
      headCount: stats.headCount,
      totalValue: stats.totalValue,
    },
  });

  return stats;
}

// Primary sheet mutations commit inside transactions; audit writes run separately
// as best-effort side effects so they cannot turn a committed business write into a 500.
async function createSheet({ user, data }) {
  const pricePerHead = data.pricePerHead || (await getDefaultPricePerHead());
  const date = data.date ? new Date(data.date) : new Date();

  const sheet = await prisma.$transaction(async (tx) => {
    const numbering = await nextSheetNumber(date, tx);
    const createdBy = await tx.user.findUnique({ where: { id: user.userId } });
    const alias = data.liquidadorAlias || createdBy?.liquidadorAlias || 'LIQ';

    return tx.weighingSheet.create({
      data: {
        visibleNumber: numbering.visibleNumber,
        sheetYear: numbering.year,
        sheetSequence: numbering.sequence,
        date,
        sellerId: data.sellerId,
        buyerId: data.buyerId,
        createdById: user.userId,
        liquidadorAliasSnapshot: alias,
        pricePerHead,
      },
      include: {
        seller: true,
        buyer: true,
        createdBy: { select: { id: true, email: true, role: true, liquidadorAlias: true } },
        rows: { orderBy: { rowOrder: 'asc' } },
      },
    });
  });

  await addSheetAuditBestEffort({
    weighingSheetId: sheet.id,
    action: SHEET_AUDIT_ACTION.PLANILLA_CREATED,
    actorUserId: user.userId,
    metadata: { sellerId: data.sellerId, buyerId: data.buyerId, pricePerHead },
  });

  return sheet;
}

async function listSheets({ user, filters }) {
  const where = { AND: [] };

  if (user.role === ROLE.CLIENT) {
    where.AND.push({ OR: [{ sellerId: user.personId || -1 }, { buyerId: user.personId || -1 }] });
  }

  if (filters.q) {
    where.AND.push({
      OR: [
        { visibleNumber: { contains: filters.q, mode: 'insensitive' } },
        { seller: { name: { contains: filters.q, mode: 'insensitive' } } },
        { buyer: { name: { contains: filters.q, mode: 'insensitive' } } },
        { seller: { phone: { contains: filters.q } } },
        { buyer: { phone: { contains: filters.q } } },
      ],
    });
  }

  if (filters.seller) where.AND.push({ seller: { name: { contains: filters.seller, mode: 'insensitive' } } });
  if (filters.buyer) where.AND.push({ buyer: { name: { contains: filters.buyer, mode: 'insensitive' } } });
  if (filters.sellerPhone) where.AND.push({ seller: { phone: { contains: filters.sellerPhone } } });
  if (filters.buyerPhone) where.AND.push({ buyer: { phone: { contains: filters.buyerPhone } } });

  if (filters.from || filters.to) {
    const dateFilter = {};
    if (filters.from) dateFilter.gte = new Date(`${filters.from}T00:00:00.000Z`);
    if (filters.to) dateFilter.lte = new Date(`${filters.to}T23:59:59.999Z`);
    where.AND.push({ date: dateFilter });
  }

  if (filters.paymentStatus) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    if (filters.paymentStatus === 'paid') where.AND.push({ isPaid: true });
    if (filters.paymentStatus === 'unpaid') where.AND.push({ isPaid: false });
    if (filters.paymentStatus === 'paid_today') where.AND.push({ isPaid: true, paidAt: { gte: todayStart } });
    if (filters.paymentStatus === 'paid_yesterday') where.AND.push({ isPaid: true, paidAt: { gte: yesterdayStart, lt: todayStart } });
  }

  const page = toSafePage(filters.page);
  const pageSize = toSafePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.weighingSheet.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
      include: {
        seller: { select: { id: true, name: true, phone: true } },
        buyer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.weighingSheet.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function getSheetById({ user, sheetId }) {
  const sheet = await prisma.weighingSheet.findUnique({
    where: { id: sheetId },
    include: {
      seller: { select: { id: true, name: true, phone: true, cedula: true } },
      buyer: { select: { id: true, name: true, phone: true, cedula: true } },
      rows: { orderBy: { rowOrder: 'asc' } },
      paymentLogs: {
        orderBy: { changedAt: 'desc' },
        include: { changedBy: { select: { id: true, email: true, role: true } } },
      },
      auditLogs: {
        orderBy: { changedAt: 'desc' },
        include: { actor: { select: { id: true, email: true, role: true } } },
      },
      createdBy: { select: { id: true, email: true, role: true } },
      paidBy: { select: { id: true, email: true, role: true } },
    },
  });

  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  assertCanViewSheet(user, sheet);

  const stats = calculateSheetStats(sheet.rows, sheet.pricePerHead);

  return {
    ...sheet,
    computed: {
      totalsByTypeSex: stats.totalsByTypeSex,
    },
  };
}

async function updateSheet({ user, sheetId, data }) {
  const sheet = await prisma.weighingSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  assertCanEditSheet(user, sheet);

  const before = {
    sellerId: sheet.sellerId,
    buyerId: sheet.buyerId,
    pricePerHead: sheet.pricePerHead,
    liquidadorAliasSnapshot: sheet.liquidadorAliasSnapshot,
  };

  await prisma.$transaction(async (tx) => {
    await tx.weighingSheet.update({
      where: { id: sheetId },
      data: {
        sellerId: data.sellerId,
        buyerId: data.buyerId,
        pricePerHead: data.pricePerHead,
        liquidadorAliasSnapshot: data.liquidadorAliasSnapshot,
        date: data.date ? new Date(data.date) : undefined,
      },
    });

    await recalculateAndPersistSheet(sheetId, tx);
  });

  const auditEntries = [
    {
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.PLANILLA_UPDATED,
      actorUserId: user.userId,
      metadata: { before, after: data },
    },
  ];

  if (data.pricePerHead !== undefined && data.pricePerHead !== before.pricePerHead) {
    auditEntries.push({
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.PRICE_CHANGED,
      actorUserId: user.userId,
      metadata: { from: before.pricePerHead, to: data.pricePerHead },
    });
  }

  if (data.sellerId !== undefined && data.sellerId !== before.sellerId) {
    auditEntries.push({
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.SELLER_CHANGED,
      actorUserId: user.userId,
      metadata: { from: before.sellerId, to: data.sellerId },
    });
  }

  if (data.buyerId !== undefined && data.buyerId !== before.buyerId) {
    auditEntries.push({
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.BUYER_CHANGED,
      actorUserId: user.userId,
      metadata: { from: before.buyerId, to: data.buyerId },
    });
  }

  if (
    data.liquidadorAliasSnapshot !== undefined &&
    data.liquidadorAliasSnapshot !== before.liquidadorAliasSnapshot
  ) {
    auditEntries.push({
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.LIQUIDADOR_ALIAS_CHANGED,
      actorUserId: user.userId,
      metadata: { from: before.liquidadorAliasSnapshot, to: data.liquidadorAliasSnapshot },
    });
  }

  await addSheetAuditsBestEffort(auditEntries);

  return prisma.weighingSheet.findUnique({ where: { id: sheetId } });
}

async function deleteSheet({ user, sheetId }) {
  if (user.role !== ROLE.ADMIN) {
    const err = new Error('Only admin can delete sheets');
    err.statusCode = 403;
    throw err;
  }

  const sheet = await prisma.weighingSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.$transaction([
    prisma.cattleRow.deleteMany({ where: { weighingSheetId: sheetId } }),
    prisma.paymentLog.deleteMany({ where: { weighingSheetId: sheetId } }),
    prisma.sheetAuditLog.deleteMany({ where: { weighingSheetId: sheetId } }),
    prisma.weighingSheet.delete({ where: { id: sheetId } }),
  ]);

  return { deleted: true };
}

async function addRow({ user, sheetId, data }) {
  const sheet = await prisma.weighingSheet.findUnique({
    where: { id: sheetId },
    include: { rows: true },
  });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  assertCanEditSheet(user, sheet);

  let resolved;
  if (data.category === 'OTHER') {
    resolved = { type: 'OTHER', sex: data.sex };
  } else if (data.category) {
    resolved = typeAndSexFromCategory(data.category);
  } else {
    resolved = { type: data.type, sex: resolveDefaultSex(data.type, data.sex) };
  }
  const nextOrder = data.rowOrder || sheet.rows.length + 1;

  const row = await prisma.$transaction(async (tx) => {
    if (data.rowOrder && data.rowOrder <= sheet.rows.length) {
      await tx.$executeRaw`
        UPDATE "CattleRow"
        SET "rowOrder" = "rowOrder" + 1
        WHERE "weighingSheetId" = ${sheetId} AND "rowOrder" >= ${data.rowOrder}
      `;
    }

    const createdRow = await tx.cattleRow.create({
      data: {
        weighingSheetId: sheetId,
        rowOrder: nextOrder,
        type: resolved.type,
        sex: resolved.sex,
        weight: Math.trunc(data.weight),
        cattleNumber: data.cattleNumber,
        letters: data.letters || null,
        customSpecification: resolved.type === 'OTHER' ? (data.customSpecification || null) : null,
      },
    });

    await recalculateAndPersistSheet(sheetId, tx);
    return createdRow;
  });

  await addSheetAuditBestEffort({
    weighingSheetId: sheet.id,
    action: SHEET_AUDIT_ACTION.ROW_ADDED,
    actorUserId: user.userId,
    metadata: { rowId: row.id, rowOrder: row.rowOrder },
  });

  return row;
}

async function updateRow({ user, sheetId, rowId, data }) {
  const sheet = await prisma.weighingSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }
  assertCanEditSheet(user, sheet);

  const row = await prisma.cattleRow.findFirst({ where: { id: rowId, weighingSheetId: sheetId } });
  if (!row) {
    const err = new Error('Row not found');
    err.statusCode = 404;
    throw err;
  }

  let type, sex, customSpecification;
  if (data.category === 'OTHER') {
    type = 'OTHER';
    sex = data.sex;
    customSpecification = data.customSpecification || null;
  } else if (data.category) {
    ({ type, sex } = typeAndSexFromCategory(data.category));
    customSpecification = null;
  } else {
    type = data.type || row.type;
    sex = resolveDefaultSex(type, data.sex || row.sex);
    customSpecification = type === 'OTHER' ? (data.customSpecification !== undefined ? data.customSpecification : row.customSpecification) : null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextRow = await tx.cattleRow.update({
      where: { id: rowId },
      data: {
        type,
        sex,
        weight: data.weight !== undefined ? Math.trunc(data.weight) : undefined,
        cattleNumber: data.cattleNumber,
        letters: data.letters,
        customSpecification,
      },
    });

    await recalculateAndPersistSheet(sheetId, tx);
    return nextRow;
  });

  await addSheetAuditBestEffort({
    weighingSheetId: sheetId,
    action: SHEET_AUDIT_ACTION.ROW_UPDATED,
    actorUserId: user.userId,
    metadata: { rowId },
  });

  return updated;
}

async function deleteRow({ user, sheetId, rowId }) {
  const sheet = await prisma.weighingSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  assertCanEditSheet(user, sheet);

  const row = await prisma.cattleRow.findFirst({ where: { id: rowId, weighingSheetId: sheetId } });
  if (!row) {
    const err = new Error('Row not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.cattleRow.delete({ where: { id: rowId } });
    await tx.$executeRaw`
      UPDATE "CattleRow"
      SET "rowOrder" = "rowOrder" - 1
      WHERE "weighingSheetId" = ${sheetId} AND "rowOrder" > ${row.rowOrder}
    `;
    await recalculateAndPersistSheet(sheetId, tx);
  });

  await addSheetAuditBestEffort({
    weighingSheetId: sheetId,
    action: SHEET_AUDIT_ACTION.ROW_DELETED,
    actorUserId: user.userId,
    metadata: { rowId },
  });

  return { deleted: true };
}

async function reorderRows({ user, sheetId, orderedRowIds }) {
  const sheet = await prisma.weighingSheet.findUnique({
    where: { id: sheetId },
    include: { rows: true },
  });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  assertCanEditSheet(user, sheet);

  const sheetRowIds = sheet.rows.map((row) => row.id).sort((a, b) => a - b);
  const incoming = [...orderedRowIds].sort((a, b) => a - b);
  if (sheetRowIds.length !== incoming.length || sheetRowIds.some((id, index) => id !== incoming[index])) {
    const err = new Error('orderedRowIds must include all rows in the sheet');
    err.statusCode = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    for (const row of sheet.rows) {
      await tx.cattleRow.update({
        where: { id: row.id },
        data: { rowOrder: row.rowOrder + REORDER_OFFSET },
      });
    }

    for (let index = 0; index < orderedRowIds.length; index += 1) {
      await tx.cattleRow.update({
        where: { id: orderedRowIds[index] },
        data: { rowOrder: index + 1 },
      });
    }
  });

  await addSheetAuditBestEffort({
    weighingSheetId: sheetId,
    action: SHEET_AUDIT_ACTION.ROW_REORDERED,
    actorUserId: user.userId,
    metadata: { orderedRowIds },
  });

  return prisma.cattleRow.findMany({ where: { weighingSheetId: sheetId }, orderBy: { rowOrder: 'asc' } });
}

async function updatePaymentStatus({ user, sheetId, isPaid, notes }) {
  if (![ROLE.ADMIN, ROLE.LIQUIDADOR].includes(user.role)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const sheet = await prisma.weighingSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  if (sheet.isPaid === isPaid) {
    return sheet;
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const nextSheet = await tx.weighingSheet.update({
      where: { id: sheetId },
      data: {
        isPaid,
        paidAt: isPaid ? now : null,
        paidById: isPaid ? user.userId : null,
      },
    });

    await tx.paymentLog.create({
      data: {
        weighingSheetId: sheetId,
        previousStatus: sheet.isPaid,
        newStatus: isPaid,
        changedById: user.userId,
        amount: nextSheet.totalValue,
        notes: notes || null,
      },
    });

    return nextSheet;
  });

  await addSheetAuditBestEffort({
    weighingSheetId: sheetId,
    action: SHEET_AUDIT_ACTION.PAYMENT_STATUS_CHANGED,
    actorUserId: user.userId,
    metadata: { previous: sheet.isPaid, next: isPaid, notes: notes || null },
  });

  return updated;
}

async function suggestNextCattleNumber(sheetId) {
  const rows = await prisma.cattleRow.findMany({
    where: { weighingSheetId: sheetId },
    select: { cattleNumber: true },
    orderBy: { rowOrder: 'asc' },
  });

  const numeric = rows
    .map((row) => Number.parseInt(String(row.cattleNumber), 10))
    .filter((value) => Number.isFinite(value));

  if (!numeric.length) return '1';
  return String(Math.max(...numeric) + 1);
}

async function lockSheet({ user, sheetId }) {
  const sheet = await prisma.weighingSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.role === ROLE.LIQUIDADOR && sheet.createdById !== user.userId) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const updated = await prisma.weighingSheet.update({
    where: { id: sheetId },
    data: { lockedByLiquidador: true },
    include: {
      seller: true,
      buyer: true,
      createdBy: { select: { id: true, email: true, role: true, liquidadorAlias: true } },
      rows: { orderBy: { rowOrder: 'asc' } },
    },
  });

  await addSheetAuditBestEffort({
    weighingSheetId: sheetId,
    action: SHEET_AUDIT_ACTION.PLANILLA_LOCKED,
    actorUserId: user.userId,
    metadata: {},
  });

  return updated;
}

module.exports = {
  assertCanEditSheet,
  assertCanViewSheet,
  createSheet,
  listSheets,
  getSheetById,
  updateSheet,
  deleteSheet,
  addRow,
  updateRow,
  deleteRow,
  reorderRows,
  lockSheet,
  updatePaymentStatus,
  suggestNextCattleNumber,
  recalculateAndPersistSheet,
  toSafePage,
  toSafePageSize,
};
