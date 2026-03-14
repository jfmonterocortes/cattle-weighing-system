const jwt = require('jsonwebtoken');
const { getEnv } = require('../config/env');

function createToken(user) {
  const { JWT_SECRET } = getEnv();
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      personId: user.personId || null,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { createToken };
