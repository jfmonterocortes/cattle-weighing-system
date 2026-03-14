const { loginWithPassword, registerUser, resetPasswordWithToken } = require('../services/auth.service');

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
    const user = await registerUser(req.body, {
      allowOperatorRole: false,
      allowPersonLinking: false,
    });
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

async function registerManaged(req, res, next) {
  try {
    const user = await registerUser(req.body, {
      allowOperatorRole: true,
      allowPersonLinking: true,
    });
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await resetPasswordWithToken({
      token: req.body.token,
      newPassword: req.body.newPassword,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  register,
  registerManaged,
  resetPassword,
};
