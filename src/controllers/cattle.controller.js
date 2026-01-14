const prisma = require('../db/prisma');

const addCattleToSheet = async (req, res) => {
  try {
    const sheetId = Number(req.params.sheetId);
    const { number, type, sex, weight, mark } = req.body;

    if (!Number.isFinite(sheetId)) {
      return res.status(400).json({ message: 'Invalid sheetId' });
    }

    if (!type || !sex || weight === undefined) {
      return res.status(400).json({ message: 'Missing required fields: type, sex, weight' });
    }

    // 1) Create cattle row
    const created = await prisma.cattle.create({
      data: {
        weighingSheetId: sheetId,
        number: String(number ?? ''),
        type: String(type),
        sex: String(sex),
        weight: Number(weight),
        mark: mark ? String(mark) : null,
      },
    });

    // 2) Recalculate totals
    const weights = await prisma.cattle.findMany({
      where: { weighingSheetId: sheetId },
      select: { weight: true },
    });

    const totalWeight = weights.reduce((sum, r) => sum + Number(r.weight), 0);
    const averageWeight = weights.length ? Math.floor(totalWeight / weights.length) : null;

    // 3) Update sheet
    const updatedSheet = await prisma.weighingSheet.update({
      where: { id: sheetId },
      data: { totalWeight, averageWeight },
    });

    return res.status(201).json({
      cattle: created,
      sheet: updatedSheet,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { addCattleToSheet };
