const prisma = require("../db/prisma");

// A) Normalizador (igual para todo el proyecto)
function makeNameKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// B) Helper nuevo: busca/crea por nameKey, pero guarda name bonito
async function findOrCreatePersonByName(name) {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ");
  if (!cleanName) throw new Error("Nombre es obligatorio.");

  const nameKey = makeNameKey(cleanName);

  const existing = await prisma.person.findUnique({
    where: { nameKey }, // ✅ requiere nameKey @unique
  });

  if (existing) return existing;

  return prisma.person.create({
    data: { name: cleanName, nameKey },
  });
}

const createWeighingSheetByName = async (req, res) => {
  try {
    const { seller, buyer } = req.body;

    // ✅ Solo nombre
    if (!seller?.name || !buyer?.name) {
      return res.status(400).json({
        message: "Debes enviar seller{name} y buyer{name}.",
      });
    }

    const sellerPerson = await findOrCreatePersonByName(seller.name);
    const buyerPerson = await findOrCreatePersonByName(buyer.name);

    const sheet = await prisma.weighingSheet.create({
      data: {
        seller: { connect: { id: sellerPerson.id } },
        buyer: { connect: { id: buyerPerson.id } },
        createdBy: { connect: { id: req.user.userId } }, // ojo: tu auth guarda userId
      },
      include: { seller: true, buyer: true, cattle: true },
    });

    return res.status(201).json(sheet);
  } catch (err) {
    // En teoría ya no debería pasar si nameKey es único,
    // pero si ocurre por carrera, devolvemos 409.
    if (err?.code === "P2002") {
      return res.status(409).json({
        message: "Ya existe un cliente con ese nombre.",
      });
    }

    return res.status(500).json({ message: err.message || "Error creando planilla." });
  }
};

module.exports = {
  createWeighingSheetByName,
};