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

// Audit writes are best-effort: once the primary mutation commits, audit failures
// are logged but must not turn a successful business operation into a 500.
async function addSheetAuditBestEffort(entry) {
  try {
    return await addSheetAudit(entry);
  } catch (error) {
    console.error(
      `Sheet audit write failed for sheet ${entry.weighingSheetId} (${entry.action}):`,
      error
    );
    return null;
  }
}

async function addSheetAuditsBestEffort(entries) {
  return Promise.all(entries.map((entry) => addSheetAuditBestEffort(entry)));
}

module.exports = {
  addSheetAudit,
  addSheetAuditBestEffort,
  addSheetAuditsBestEffort,
};
