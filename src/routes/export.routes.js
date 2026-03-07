const express = require('express');
const { exportExcelController, exportSheetPdfController } = require('../controllers/export.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/excel', authMiddleware, requireRoles('ADMIN'), exportExcelController);
router.get('/sheet/:sheetId/pdf', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR', 'CLIENT'), exportSheetPdfController);

module.exports = router;
