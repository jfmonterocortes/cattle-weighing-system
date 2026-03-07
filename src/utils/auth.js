const jwt = require('jsonwebtoken');

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      personId: user.personId || null,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { createToken };
