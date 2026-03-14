const prisma = require('../db/prisma');
const { LINK_REQUEST_STATUS, SHEET_AUDIT_ACTION } = require('../constants/domain');
const { addSheetAuditsBestEffort } = require('./audit.service');

const ONE_TIME_LINK_MESSAGE =
  'Tu solicitud de vinculación ya fue utilizada. Si necesitas hacer una corrección, por favor comunícate con atención al cliente o con el administrador.';

async function createLinkRequest({ userId, personId, notes }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.personId) {
    const err = new Error('Your account is already linked to a person');
    err.statusCode = 409;
    throw err;
  }

  const previousRequest = await prisma.personAccountLinkRequest.findFirst({
    where: { userId },
    orderBy: { requestedAt: 'asc' },
  });
  if (previousRequest) {
    const err = new Error(ONE_TIME_LINK_MESSAGE);
    err.statusCode = 409;
    throw err;
  }

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) {
    const err = new Error('Person not found');
    err.statusCode = 404;
    throw err;
  }

  const existingLinkedUser = await prisma.user.findFirst({ where: { personId } });
  if (existingLinkedUser) {
    const err = new Error('This person is already linked to another user');
    err.statusCode = 409;
    throw err;
  }

  const existingPending = await prisma.personAccountLinkRequest.findFirst({
    where: { userId, personId, status: LINK_REQUEST_STATUS.PENDING },
  });

  if (existingPending) {
    const err = new Error('A pending request already exists for this person');
    err.statusCode = 409;
    throw err;
  }

  return prisma.personAccountLinkRequest.create({
    data: {
      userId,
      personId,
      notes: notes || null,
      status: LINK_REQUEST_STATUS.PENDING,
    },
    include: {
      person: { select: { id: true, name: true, phone: true, cedula: true } },
    },
  });
}

async function listLinkRequests(status) {
  return prisma.personAccountLinkRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { id: true, email: true, role: true, personId: true } },
      person: { select: { id: true, name: true, phone: true, cedula: true } },
      reviewedBy: { select: { id: true, email: true, role: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });
}

async function getMyLinkStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      personId: true,
      person: { select: { id: true, name: true, phone: true, cedula: true } },
    },
  });

  const latestRequest = await prisma.personAccountLinkRequest.findFirst({
    where: { userId },
    include: {
      person: { select: { id: true, name: true, phone: true, cedula: true } },
      reviewedBy: { select: { id: true, email: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });

  return {
    linkedPerson: user?.person || null,
    canRequestLink: !latestRequest && !user?.personId,
    used: Boolean(latestRequest),
    blockedMessage: latestRequest ? ONE_TIME_LINK_MESSAGE : null,
    latestRequest,
  };
}

async function reviewLinkRequest({ requestId, reviewerUserId, status, notes }) {
  const request = await prisma.personAccountLinkRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    const err = new Error('Link request not found');
    err.statusCode = 404;
    throw err;
  }

  if (request.status !== LINK_REQUEST_STATUS.PENDING) {
    const err = new Error('Link request already reviewed');
    err.statusCode = 409;
    throw err;
  }

  const duplicateReviewedStatus = await prisma.personAccountLinkRequest.findFirst({
    where: {
      id: { not: requestId },
      userId: request.userId,
      personId: request.personId,
      status,
    },
    select: { id: true },
  });

  if (duplicateReviewedStatus) {
    const err = new Error(`A ${status.toLowerCase()} record already exists for this user and person`);
    err.statusCode = 409;
    throw err;
  }

  if (status === LINK_REQUEST_STATUS.APPROVED) {
    const requestUser = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, personId: true },
    });

    if (!requestUser) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    if (requestUser.personId && requestUser.personId !== request.personId) {
      const err = new Error('User is already linked to another person');
      err.statusCode = 409;
      throw err;
    }

    const linkedUser = await prisma.user.findFirst({
      where: { personId: request.personId, id: { not: request.userId } },
      select: { id: true },
    });

    if (linkedUser) {
      const err = new Error('Person is already linked to another user');
      err.statusCode = 409;
      throw err;
    }
  }

  const reviewed = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.personAccountLinkRequest.update({
      where: { id: requestId },
      data: {
        status,
        notes: notes || request.notes,
        reviewedById: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    if (status === LINK_REQUEST_STATUS.APPROVED) {
      await tx.user.update({
        where: { id: request.userId },
        data: { personId: request.personId },
      });
    }

    return updatedRequest;
  });

  const sheets = await prisma.weighingSheet.findMany({
    where: {
      OR: [{ sellerId: request.personId }, { buyerId: request.personId }],
    },
    select: { id: true },
  });

  const action =
    status === LINK_REQUEST_STATUS.APPROVED
      ? SHEET_AUDIT_ACTION.LINK_REQUEST_APPROVED
      : SHEET_AUDIT_ACTION.LINK_REQUEST_REJECTED;

  await addSheetAuditsBestEffort(
    sheets.map((sheet) => ({
      weighingSheetId: sheet.id,
      action,
      actorUserId: reviewerUserId,
      metadata: { requestId, userId: request.userId, personId: request.personId },
    }))
  );

  return reviewed;
}

module.exports = {
  createLinkRequest,
  listLinkRequests,
  getMyLinkStatus,
  reviewLinkRequest,
  ONE_TIME_LINK_MESSAGE,
};
