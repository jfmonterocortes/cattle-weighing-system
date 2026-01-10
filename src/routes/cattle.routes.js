const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { addCattleToSheet } = require('../controllers/cattle.controller');

const router = express.Router();

// Admin adds cattle to a sheet
router.post('/planillas/:sheetId/reses', authMiddleware, requireAdmin, addCattleToSheet);

module.exports = router;
