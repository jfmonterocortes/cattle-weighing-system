const express = require('express');
const {
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
  paymentStatusController,
} = require('../controllers/sheet.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createSheetSchema,
  updateSheetSchema,
  listSheetsQuerySchema,
  createRowSchema,
  updateRowSchema,
  reorderRowsSchema,
  paymentStatusSchema,
} = require('../validators/sheet.validators');

const router = express.Router();

router.get('/', authMiddleware, validate(listSheetsQuerySchema, 'query'), listSheetsController);
router.post('/', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), validate(createSheetSchema), createSheetController);
router.get('/:sheetId', authMiddleware, getSheetByIdController);
router.patch('/:sheetId', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), validate(updateSheetSchema), updateSheetController);
router.delete('/:sheetId', authMiddleware, requireRoles('ADMIN'), deleteSheetController);

router.post('/:sheetId/rows', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), validate(createRowSchema), addRowController);
router.patch('/:sheetId/rows/:rowId', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), validate(updateRowSchema), updateRowController);
router.delete('/:sheetId/rows/:rowId', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), deleteRowController);
router.post('/:sheetId/rows/reorder', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), validate(reorderRowsSchema), reorderRowsController);
router.get('/:sheetId/rows/next-number', authMiddleware, nextCattleNumberController);

router.post('/:sheetId/payment-status', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), validate(paymentStatusSchema), paymentStatusController);

module.exports = router;
