const { loginWithPassword, registerUser } = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const result = await loginWithPassword(req.body);
    if (!result) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({ token: result.token, user: result.user });
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  register,
};
