require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('../src/db/prisma');
const { ROLE } = require('../src/constants/domain');

function readInput() {
  const [, , argEmail, argPassword, argAlias] = process.argv;

  return {
    email: (process.env.ADMIN_EMAIL || argEmail || '').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || argPassword || '',
    alias: (process.env.ADMIN_ALIAS || argAlias || 'ADM').trim() || 'ADM',
  };
}

function validateInput({ email, password, alias }) {
  if (!email) {
    throw new Error('Provide ADMIN_EMAIL or pass the email as the first argument.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  if (!password) {
    throw new Error('Provide ADMIN_PASSWORD or pass the password as the second argument.');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('ADMIN_PASSWORD must include uppercase, lowercase, and numeric characters.');
  }

  if (alias.length > 20) {
    throw new Error('ADMIN_ALIAS must be 20 characters or fewer.');
  }
}

async function main() {
  const input = readInput();
  validateInput(input);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing && existing.role !== ROLE.ADMIN) {
    throw new Error(`A non-admin user with email ${input.email} already exists. Choose a different email.`);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const admin = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          liquidadorAlias: input.alias,
          isActive: true,
        },
      })
    : await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: ROLE.ADMIN,
          liquidadorAlias: input.alias,
          isActive: true,
        },
      });

  console.log(`Admin ready: ${admin.email}`);
  console.log(existing ? 'Existing admin updated.' : 'New admin created.');
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
