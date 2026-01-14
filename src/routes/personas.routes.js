const express = require("express");
const prisma = require("../db/prisma");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/role.middleware");

const router = express.Router();

// Buscar personas por nombre o teléfono
router.get("/buscar", authMiddleware, requireAdmin, async (req, res) => {
  const query = String(req.query.query || "").trim();

  if (!query) return res.json([]);

  const results = await prisma.person.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, phone: true },
  });

  res.json(results);
});

module.exports = router;
