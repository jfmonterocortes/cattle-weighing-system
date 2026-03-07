const prisma = require('../db/prisma');
const bcrypt = require('bcrypt');
const { createToken } = require('../utils/auth');
const { findOrCreatePersonForAccount } = require('./person.service');
const { ROLE } = require('../constants/domain');

async function loginWithPassword({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    token: createToken(user),
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      personId: user.personId,
      liquidadorAlias: user.liquidadorAlias,
    },
  };
}

async function registerUser(data) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }

  let personId = null;
  if (data.person) {
    const person = await findOrCreatePersonForAccount(data.person);
    personId = person.id;
  }

  const role = data.role || ROLE.CLIENT;
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role,
      personId,
      liquidadorAlias: data.liquidadorAlias || null,
    },
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    personId: user.personId,
  };
}

module.exports = {
  loginWithPassword,
  registerUser,
};
