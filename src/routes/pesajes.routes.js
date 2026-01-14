const express = require("express");
const prisma = require("../db/prisma");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/role.middleware");

const { createWeighingSheetByName } = require("../controllers/pesajes.controller");

const router = express.Router();

/**
 * Autocomplete: sugiere personas por nombre o teléfono
 * GET /pesajes/sugerencias-personas?q=...
 */
router.get("/sugerencias-personas", authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json([]);

    const people = await prisma.person.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, name: true, phone: true },
      take: 10,
      orderBy: { name: "asc" },
    });

    return res.json(people);
  } catch (err) {
    return res.status(500).json({ message: "Error en sugerencias." });
  }
});

/**
 * Cliente ve sus planillas (y puede filtrar por nombre/teléfono y por fecha)
 * GET /pesajes/mis-planillas?q=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get("/mis-planillas", authMiddleware, async (req, res) => {
  try {
    const personId = req.user.personId;

    const q = String(req.query.q || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const where = {
      OR: [{ sellerId: personId }, { buyerId: personId }],
      AND: [],
    };

    // Filtro por texto: nombre o teléfono del vendedor o comprador
    if (q) {
      where.AND.push({
        OR: [
          { seller: { name: { contains: q, mode: "insensitive" } } },
          { buyer: { name: { contains: q, mode: "insensitive" } } },
          { seller: { phone: { contains: q } } },
          { buyer: { phone: { contains: q } } },
        ],
      });
    }

    // Filtro por fechas (opcional)
    if (from || to) {
      const dateFilter = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        // incluye todo el día "to"
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.AND.push({ date: dateFilter });
    }

    // Si no hay ANDs, Prisma acepta AND: []
    const sheets = await prisma.weighingSheet.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        seller: true,
        buyer: true,
        cattle: true,
      },
    });

    return res.json(sheets);
  } catch (err) {
    return res.status(500).json({ message: "Error cargando planillas." });
  }
});

// Admin crea planilla por nombre (tu controlador actual)
router.post(
  "/crear-planilla-nombre",
  authMiddleware,
  requireAdmin,
  createWeighingSheetByName
);

module.exports = router;