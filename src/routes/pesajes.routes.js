const express = require('express');
const prisma = require('../db/prisma');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { createWeighingSheet } = require('../controllers/pesajes.controller');

const router = express.Router();

// Cliente ve sus planillas
router.get('/mis-planillas', authMiddleware, async (req, res) => {
  const personId = req.user.personId;

  const sheets = await prisma.weighingSheet.findMany({
    where: {
      OR: [
        { sellerId: personId },
        { buyerId: personId }
      ]
    },
    orderBy: { date: 'desc' }
  });

  res.json(sheets);
});

// Admin crea planilla
router.post('/crear-planilla', authMiddleware, requireAdmin, createWeighingSheet);

module.exports = router;
