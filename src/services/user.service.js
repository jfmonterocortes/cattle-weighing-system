const prisma = require('../db/prisma');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toSafeLimit(input) {
  const parsed = Number.parseInt(String(input ?? DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

async function listUsers({ q, role, limit = DEFAULT_LIMIT }) {
  const safeLimit = toSafeLimit(limit);

  return prisma.user.findMany({
    where: {
      AND: [
        role ? { role } : {},
        q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { person: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {},
      ],
    },
    take: safeLimit,
    orderBy: { email: 'asc' },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      liquidadorAlias: true,
      personId: true,
      person: { select: { id: true, name: true, phone: true, cedula: true } },
    },
  });
}

async function updateUser(userId, input) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (input.email && input.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      const err = new Error('Email already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      email: input.email,
      role: input.role,
      isActive: input.isActive,
      liquidadorAlias: input.liquidadorAlias,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      liquidadorAlias: true,
      personId: true,
      person: { select: { id: true, name: true, phone: true, cedula: true } },
    },
  });
}

async function adminLinkUserToPerson({ userId, personId }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (personId === null) {
    return prisma.user.update({ where: { id: userId }, data: { personId: null } });
  }

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) {
    const err = new Error('Person not found');
    err.statusCode = 404;
    throw err;
  }

  const linkedUser = await prisma.user.findFirst({ where: { personId, id: { not: userId } } });
  if (linkedUser) {
    const err = new Error('Person is already linked to another user');
    err.statusCode = 409;
    throw err;
  }

  return prisma.user.update({ where: { id: userId }, data: { personId } });
}

module.exports = {
  listUsers,
  updateUser,
  adminLinkUserToPerson,
  toSafeLimit,
};
