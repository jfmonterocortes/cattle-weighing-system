const prisma = require('../db/prisma');

const getSheetById = async (req, res) => {
  try {
    const sheetId = Number(req.params.sheetId);
    if (!Number.isFinite(sheetId)) {
      return res.status(400).json({ message: 'Invalid sheetId' });
    }

    const sheet = await prisma.weighingSheet.findUnique({
      where: { id: sheetId },
      include: {
        seller: { select: { id: true, cedula: true, name: true, phone: true } },
        buyer: { select: { id: true, cedula: true, name: true, phone: true } },
        cattle: true,
      },
    });

    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    // Access control:
    // - Admin: can view any sheet
    // - Client: can only view if they are seller or buyer
    if (req.user.role !== 'ADMIN') {
      const personId = req.user.personId;
      const allowed = sheet.sellerId === personId || sheet.buyerId === personId;
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json(sheet);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSheetById };
