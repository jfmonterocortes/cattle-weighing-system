require('dotenv').config();
const prisma = require('../src/db/prisma');
const { normalizeNameKey, normalizePhone, normalizeCedula } = require('../src/utils/normalization');

async function main() {
  const people = await prisma.person.findMany({
    select: { id: true, name: true, phone: true, cedula: true },
  });

  for (const person of people) {
    await prisma.person.update({
      where: { id: person.id },
      data: {
        nameKey: normalizeNameKey(person.name),
        phoneKey: normalizePhone(person.phone || '') || null,
        cedulaKey: normalizeCedula(person.cedula || '') || null,
      },
    });
  }

  console.log('Normalization complete for', people.length, 'persons');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
