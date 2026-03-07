require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../src/db/prisma');
const { normalizeNameKey } = require('../src/utils/normalization');

(async () => {
  const person = await prisma.person.upsert({
    where: { nameKey: normalizeNameKey('Admin General') },
    update: { name: 'Admin General' },
    create: {
      name: 'Admin General',
      nameKey: normalizeNameKey('Admin General'),
      cedula: '0000000000',
      cedulaKey: '0000000000',
    },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bascula.com' },
    update: { role: 'ADMIN', personId: person.id, passwordHash, isActive: true },
    create: {
      email: 'admin@bascula.com',
      passwordHash,
      role: 'ADMIN',
      personId: person.id,
      liquidadorAlias: 'ADM',
      isActive: true,
    },
  });

  console.log('Admin ready:', admin.email);
  process.exit(0);
})();
