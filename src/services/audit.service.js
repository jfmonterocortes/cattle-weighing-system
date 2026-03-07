const prisma = require('../db/prisma');

async function addSheetAudit({ weighingSheetId, action, actorUserId, metadata }) {
  return prisma.sheetAuditLog.create({
    data: {
      weighingSheetId,
      action,
      actorUserId,
      metadata: metadata || undefined,
    },
  });
}

module.exports = {
  addSheetAudit,
};
