const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { getSheetById } = require('../controllers/planillas.controller');

const router = express.Router();

// Client/Admin: view sheet details (with access control inside controller)
router.get('/planillas/:sheetId', authMiddleware, getSheetById);

module.exports = router;
