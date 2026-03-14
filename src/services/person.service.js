const prisma = require('../db/prisma');
const { ROLE } = require('../constants/domain');
const { normalizeNameKey, normalizePhone, normalizeCedula, normalizeSpace } = require('../utils/normalization');

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function sanitizeSearchLimit(limit) {
  const parsed = Number.parseInt(String(limit ?? DEFAULT_SEARCH_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SEARCH_LIMIT;
  return Math.min(parsed, MAX_SEARCH_LIMIT);
}

function toSafePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toSafePage(value) {
  return toSafePositiveInt(value, DEFAULT_PAGE);
}

function toSafePageSize(value) {
  return Math.min(toSafePositiveInt(value, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
}

function buildDuplicateError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

async function createPersonRecord(input) {
  const name = normalizeSpace(input.name);
  const nameKey = normalizeNameKey(name);
  const phone = normalizeSpace(input.phone || '');
  const phoneKey = normalizePhone(phone);
  const cedula = normalizeSpace(input.cedula || '');
  const cedulaKey = normalizeCedula(cedula);

  if (!name) {
    const err = new Error('El nombre es obligatorio.');
    err.statusCode = 400;
    throw err;
  }

  if (phoneKey) {
    const existingByPhone = await prisma.person.findFirst({ where: { phoneKey } });
    if (existingByPhone) {
      throw buildDuplicateError('Ya existe una persona registrada con ese teléfono.');
    }
  }

  if (cedulaKey) {
    const existingByCedula = await prisma.person.findFirst({ where: { cedulaKey } });
    if (existingByCedula) {
      throw buildDuplicateError('Ya existe una persona registrada con esa cédula.');
    }
  }

  return prisma.person.create({
    data: {
      name,
      nameKey,
      phone: phoneKey ? phone : null,
      phoneKey: phoneKey || null,
      cedula: cedulaKey ? cedula : null,
      cedulaKey: cedulaKey || null,
    },
  });
}

async function updatePersonRecord(personId, input, user) {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) {
    const err = new Error('Person not found');
    err.statusCode = 404;
    throw err;
  }

  if (user?.role === ROLE.LIQUIDADOR && input.name !== undefined) {
    const err = new Error('LIQUIDADOR no puede editar el nombre.');
    err.statusCode = 403;
    throw err;
  }

  const nextName = input.name !== undefined ? normalizeSpace(input.name) : person.name;
  const nextNameKey = normalizeNameKey(nextName);
  const nextPhone = input.phone !== undefined ? normalizeSpace(input.phone || '') : person.phone || '';
  const nextPhoneKey = normalizePhone(nextPhone);
  const nextCedula = input.cedula !== undefined ? normalizeSpace(input.cedula || '') : person.cedula || '';
  const nextCedulaKey = normalizeCedula(nextCedula);

  if (!nextName) {
    const err = new Error('El nombre es obligatorio.');
    err.statusCode = 400;
    throw err;
  }

  if (nextPhoneKey) {
    const existingByPhone = await prisma.person.findFirst({ where: { phoneKey: nextPhoneKey, id: { not: personId } } });
    if (existingByPhone) {
      throw buildDuplicateError('Ya existe una persona registrada con ese teléfono.');
    }
  }

  if (nextCedulaKey) {
    const existingByCedula = await prisma.person.findFirst({ where: { cedulaKey: nextCedulaKey, id: { not: personId } } });
    if (existingByCedula) {
      throw buildDuplicateError('Ya existe una persona registrada con esa cédula.');
    }
  }

  return prisma.person.update({
    where: { id: personId },
    data: {
      name: nextName,
      nameKey: nextNameKey,
      phone: nextPhoneKey ? nextPhone : null,
      phoneKey: nextPhoneKey || null,
      cedula: nextCedulaKey ? nextCedula : null,
      cedulaKey: nextCedulaKey || null,
    },
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  });
}

async function listPeople({ q, page, pageSize }) {
  const safePage = toSafePage(page);
  const safePageSize = toSafePageSize(pageSize);
  const query = normalizeSpace(q || '');

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { cedula: { contains: query } },
        ],
      }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.person.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true } },
      },
    }),
    prisma.person.count({ where }),
  ]);

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

async function findOrCreatePersonForAccount(input) {
  const name = normalizeSpace(input.name);
  const nameKey = normalizeNameKey(name);
  const phone = normalizeSpace(input.phone || '');
  const phoneKey = normalizePhone(phone);
  const cedula = normalizeSpace(input.cedula || '');
  const cedulaKey = normalizeCedula(cedula);

  if (!name) {
    const err = new Error('Name is required');
    err.statusCode = 400;
    throw err;
  }

  if (cedulaKey) {
    const byCedula = await prisma.person.findFirst({ where: { cedulaKey } });
    if (byCedula) return byCedula;
  }

  if (phoneKey) {
    const byPhone = await prisma.person.findFirst({ where: { phoneKey } });
    if (byPhone) return byPhone;
  }

  const byName = await prisma.person.findFirst({ where: { nameKey } });
  if (byName) return byName;

  return prisma.person.create({
    data: {
      name,
      nameKey,
      phone: phoneKey ? phone : null,
      phoneKey: phoneKey || null,
      cedula: cedulaKey ? cedula : null,
      cedulaKey: cedulaKey || null,
    },
  });
}

async function searchPeople({ user, q, limit = DEFAULT_SEARCH_LIMIT }) {
  const query = normalizeSpace(q);
  const phone = normalizePhone(q);
  const cedula = normalizeCedula(q);
  const baseSelect = {
    id: true,
    name: true,
    phone: true,
    cedula: true,
  };
  const select =
    user?.role === ROLE.CLIENT
      ? baseSelect
      : {
          ...baseSelect,
          user: {
            select: {
              id: true,
              role: true,
              email: true,
            },
          },
        };

  return prisma.person.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        ...(phone ? [{ phoneKey: { contains: phone } }] : []),
        ...(cedula ? [{ cedulaKey: { contains: cedula } }] : []),
      ],
    },
    take: sanitizeSearchLimit(limit),
    orderBy: { name: 'asc' },
    select,
  });
}

module.exports = {
  createPersonRecord,
  updatePersonRecord,
  listPeople,
  findOrCreatePersonForAccount,
  searchPeople,
  sanitizeSearchLimit,
};
