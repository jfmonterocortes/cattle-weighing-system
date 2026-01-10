const prisma = require('../db/prisma');

const createWeighingSheet = async (req, res) => {
  try {
    const { sellerCedula, buyerCedula } = req.body;

    const seller = await prisma.person.findUnique({ where: { cedula: sellerCedula } });
    const buyer = await prisma.person.findUnique({ where: { cedula: buyerCedula } });

    if (!seller || !buyer) {
      return res.status(404).json({ message: 'Seller or Buyer not found' });
    }

    const sheet = await prisma.weighingSheet.create({
      data: {
        sellerId: seller.id,
        buyerId: buyer.id,
        createdById: req.user.userId,
      }
    });

    res.status(201).json(sheet);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createWeighingSheet };
