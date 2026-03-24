const {
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
} = require('../services/sheet.service');

async function createSheetController(req, res, next) {
  try {
    const sheet = await createSheet({ user: req.user, data: req.body });
    return res.status(201).json(sheet);
  } catch (error) {
    return next(error);
  }
}

async function listSheetsController(req, res, next) {
  try {
    const result = await listSheets({ user: req.user, filters: req.query });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getSheetByIdController(req, res, next) {
  try {
    const sheet = await getSheetById({ user: req.user, sheetId: Number(req.params.sheetId) });
    return res.json(sheet);
  } catch (error) {
    return next(error);
  }
}

async function updateSheetController(req, res, next) {
  try {
    const sheet = await updateSheet({
      user: req.user,
      sheetId: Number(req.params.sheetId),
      data: req.body,
    });
    return res.json(sheet);
  } catch (error) {
    return next(error);
  }
}

async function deleteSheetController(req, res, next) {
  try {
    const result = await deleteSheet({ user: req.user, sheetId: Number(req.params.sheetId) });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function addRowController(req, res, next) {
  try {
    const row = await addRow({
      user: req.user,
      sheetId: Number(req.params.sheetId),
      data: req.body,
    });
    return res.status(201).json(row);
  } catch (error) {
    return next(error);
  }
}

async function updateRowController(req, res, next) {
  try {
    const row = await updateRow({
      user: req.user,
      sheetId: Number(req.params.sheetId),
      rowId: Number(req.params.rowId),
      data: req.body,
    });
    return res.json(row);
  } catch (error) {
    return next(error);
  }
}

async function deleteRowController(req, res, next) {
  try {
    const result = await deleteRow({
      user: req.user,
      sheetId: Number(req.params.sheetId),
      rowId: Number(req.params.rowId),
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function reorderRowsController(req, res, next) {
  try {
    const rows = await reorderRows({
      user: req.user,
      sheetId: Number(req.params.sheetId),
      orderedRowIds: req.body.orderedRowIds,
    });
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function nextCattleNumberController(req, res, next) {
  try {
    const value = await suggestNextCattleNumber(Number(req.params.sheetId));
    return res.json({ cattleNumber: value });
  } catch (error) {
    return next(error);
  }
}

async function lockSheetController(req, res, next) {
  try {
    const sheet = await lockSheet({ user: req.user, sheetId: Number(req.params.sheetId) });
    return res.json(sheet);
  } catch (error) {
    return next(error);
  }
}

async function paymentStatusController(req, res, next) {
  try {
    const sheet = await updatePaymentStatus({
      user: req.user,
      sheetId: Number(req.params.sheetId),
      isPaid: req.body.isPaid,
      notes: req.body.notes,
    });
    return res.json(sheet);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSheetController,
  listSheetsController,
  getSheetByIdController,
  updateSheetController,
  deleteSheetController,
  addRowController,
  updateRowController,
  deleteRowController,
  reorderRowsController,
  nextCattleNumberController,
  lockSheetController,
  paymentStatusController,
};
