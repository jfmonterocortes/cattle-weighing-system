require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../src/db/prisma');

(async () => {
  const person = await prisma.person.upsert({
    where: { cedula: '0000000000' },
    update: { name: 'Admin', phone: null },
    create: { cedula: '0000000000', name: 'Admin', phone: null },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bascula.com' },
    update: {},
    create: {
      email: 'admin@bascula.com',
      password: passwordHash,
      role: 'ADMIN',
      personId: person.id,
    },
  });

  console.log('Admin ready:', admin.email);
  process.exit(0);
})();
