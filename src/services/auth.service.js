const prisma = require('../db/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createToken } = require('../utils/auth');
const { findOrCreatePersonForAccount } = require('./person.service');
const { ROLE } = require('../constants/domain');

const RESET_TOKEN_TTL_SECONDS = 60 * 60;

function getResetSecret() {
  return process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
}

function buildPasswordVersion(passwordHash) {
  return String(passwordHash || '').slice(-12);
}

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
  if (role === ROLE.ADMIN) {
    const err = new Error('No se permite crear cuentas ADMIN desde este flujo.');
    err.statusCode = 403;
    throw err;
  }

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

async function generatePasswordResetLink(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const token = jwt.sign(
    {
      purpose: 'password_reset',
      userId: user.id,
      pwdv: buildPasswordVersion(user.passwordHash),
    },
    getResetSecret(),
    { expiresIn: RESET_TOKEN_TTL_SECONDS }
  );

  const base = process.env.FRONTEND_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  const resetLink = `${base.replace(/\/$/, '')}/settings?resetToken=${encodeURIComponent(token)}`;

  return {
    resetToken: token,
    resetLink,
    expiresInMinutes: Math.trunc(RESET_TOKEN_TTL_SECONDS / 60),
  };
}

async function resetPasswordWithToken({ token, newPassword }) {
  let payload;
  try {
    payload = jwt.verify(token, getResetSecret());
  } catch {
    const err = new Error('Token de restablecimiento inválido o expirado.');
    err.statusCode = 400;
    throw err;
  }

  if (payload?.purpose !== 'password_reset' || !payload?.userId) {
    const err = new Error('Token de restablecimiento inválido o expirado.');
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: Number(payload.userId) } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (buildPasswordVersion(user.passwordHash) !== payload.pwdv) {
    const err = new Error('El token ya no es válido. Solicita uno nuevo.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: true };
}

module.exports = {
  loginWithPassword,
  registerUser,
  generatePasswordResetLink,
  resetPasswordWithToken,
};
