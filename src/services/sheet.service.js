const prisma = require('../db/prisma');
const { calculateSheetStats, resolveDefaultSex } = require('../utils/sheet-calculations');
const { ROLE, SHEET_AUDIT_ACTION } = require('../constants/domain');
const { getDefaultPricePerHead } = require('./settings.service');
const { addSheetAudit } = require('./audit.service');

function assertCanEditSheet(user, sheet) {
  if (user.role === ROLE.ADMIN) return;
  if (user.role === ROLE.LIQUIDADOR && sheet.createdById === user.userId) {
    if (new Date() <= new Date(sheet.editableUntilByLiquidador)) return;
  }

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

async function nextSheetNumber(dateValue = new Date()) {
  const year = dateValue.getFullYear();
  const last = await prisma.weighingSheet.findFirst({
    where: { sheetYear: year },
    orderBy: { sheetSequence: 'desc' },
    select: { sheetSequence: true },
  });

  const sequence = (last?.sheetSequence || 0) + 1;
  const visibleNumber = `${year}-${String(sequence).padStart(3, '0')}`;

  return { year, sequence, visibleNumber };
}

async function recalculateAndPersistSheet(sheetId) {
  const sheet = await prisma.weighingSheet.findUnique({
    where: { id: sheetId },
    include: { rows: { orderBy: { rowOrder: 'asc' } } },
  });
  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  const stats = calculateSheetStats(sheet.rows, sheet.pricePerHead);

  await prisma.weighingSheet.update({
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

async function createSheet({ user, data }) {
  const pricePerHead = data.pricePerHead || (await getDefaultPricePerHead());
  const date = data.date ? new Date(data.date) : new Date();
  const numbering = await nextSheetNumber(date);

  const createdBy = await prisma.user.findUnique({ where: { id: user.userId } });
  const alias = data.liquidadorAlias || createdBy?.liquidadorAlias || 'LIQ';

  const sheet = await prisma.weighingSheet.create({
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
      editableUntilByLiquidador: new Date(date.getTime() + 10 * 60 * 1000),
    },
    include: {
      seller: true,
      buyer: true,
      createdBy: { select: { id: true, email: true, role: true, liquidadorAlias: true } },
      rows: { orderBy: { rowOrder: 'asc' } },
    },
  });

  await addSheetAudit({
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

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  const [items, total] = await Promise.all([
    prisma.weighingSheet.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
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
    totalPages: Math.ceil(total / pageSize),
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

  const updated = await prisma.weighingSheet.update({
    where: { id: sheetId },
    data: {
      sellerId: data.sellerId,
      buyerId: data.buyerId,
      pricePerHead: data.pricePerHead,
      liquidadorAliasSnapshot: data.liquidadorAliasSnapshot,
      date: data.date ? new Date(data.date) : undefined,
    },
  });

  await recalculateAndPersistSheet(sheetId);

  await addSheetAudit({
    weighingSheetId: sheetId,
    action: SHEET_AUDIT_ACTION.PLANILLA_UPDATED,
    actorUserId: user.userId,
    metadata: { before, after: data },
  });

  if (data.pricePerHead !== undefined && data.pricePerHead !== before.pricePerHead) {
    await addSheetAudit({
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.PRICE_CHANGED,
      actorUserId: user.userId,
      metadata: { from: before.pricePerHead, to: data.pricePerHead },
    });
  }

  if (data.sellerId !== undefined && data.sellerId !== before.sellerId) {
    await addSheetAudit({
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.SELLER_CHANGED,
      actorUserId: user.userId,
      metadata: { from: before.sellerId, to: data.sellerId },
    });
  }

  if (data.buyerId !== undefined && data.buyerId !== before.buyerId) {
    await addSheetAudit({
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
    await addSheetAudit({
      weighingSheetId: sheetId,
      action: SHEET_AUDIT_ACTION.LIQUIDADOR_ALIAS_CHANGED,
      actorUserId: user.userId,
      metadata: { from: before.liquidadorAliasSnapshot, to: data.liquidadorAliasSnapshot },
    });
  }

  return updated;
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

  const sex = resolveDefaultSex(data.type, data.sex);
  const nextOrder = data.rowOrder || sheet.rows.length + 1;

  if (data.rowOrder && data.rowOrder <= sheet.rows.length) {
    await prisma.$executeRaw`
      UPDATE "CattleRow"
      SET "rowOrder" = "rowOrder" + 1
      WHERE "weighingSheetId" = ${sheetId} AND "rowOrder" >= ${data.rowOrder}
    `;
  }

  const row = await prisma.cattleRow.create({
    data: {
      weighingSheetId: sheetId,
      rowOrder: nextOrder,
      type: data.type,
      sex,
      weight: Math.trunc(data.weight),
      cattleNumber: data.cattleNumber,
      letters: data.letters || null,
    },
  });

  await recalculateAndPersistSheet(sheetId);

  await addSheetAudit({
    weighingSheetId: sheetId,
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

  const type = data.type || row.type;
  const sex = resolveDefaultSex(type, data.sex || row.sex);

  const updated = await prisma.cattleRow.update({
    where: { id: rowId },
    data: {
      type,
      sex,
      weight: data.weight !== undefined ? Math.trunc(data.weight) : undefined,
      cattleNumber: data.cattleNumber,
      letters: data.letters,
    },
  });

  await recalculateAndPersistSheet(sheetId);

  await addSheetAudit({
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
  });

  await recalculateAndPersistSheet(sheetId);

  await addSheetAudit({
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

  const sheetRowIds = sheet.rows.map((r) => r.id).sort((a, b) => a - b);
  const incoming = [...orderedRowIds].sort((a, b) => a - b);
  if (sheetRowIds.length !== incoming.length || sheetRowIds.some((id, index) => id !== incoming[index])) {
    const err = new Error('orderedRowIds must include all rows in the sheet');
    err.statusCode = 400;
    throw err;
  }

  await prisma.$transaction(
    orderedRowIds.map((rowId, index) =>
      prisma.cattleRow.update({
        where: { id: rowId },
        data: { rowOrder: index + 1 },
      })
    )
  );

  await addSheetAudit({
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

  const updated = await prisma.weighingSheet.update({
    where: { id: sheetId },
    data: {
      isPaid,
      paidAt: isPaid ? now : null,
      paidById: isPaid ? user.userId : null,
    },
  });

  await prisma.paymentLog.create({
    data: {
      weighingSheetId: sheetId,
      previousStatus: sheet.isPaid,
      newStatus: isPaid,
      changedById: user.userId,
      amount: updated.totalValue,
      notes: notes || null,
    },
  });

  await addSheetAudit({
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
    .map((r) => Number.parseInt(String(r.cattleNumber), 10))
    .filter((n) => Number.isFinite(n));

  if (!numeric.length) return '1';
  return String(Math.max(...numeric) + 1);
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
  updatePaymentStatus,
  suggestNextCattleNumber,
  recalculateAndPersistSheet,
};
