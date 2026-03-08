const { listUsers, updateUser, adminLinkUserToPerson, adminManualPasswordChange } = require('../services/user.service');
const { generatePasswordResetLink } = require('../services/auth.service');

async function listUsersController(req, res, next) {
  try {
    const users = await listUsers(req.query);
    return res.json(users);
  } catch (error) {
    return next(error);
  }
}

async function updateUserController(req, res, next) {
  try {
    const user = await updateUser(Number(req.params.userId), req.body);
    return res.json(user);
  } catch (error) {
    return next(error);
  }
}

async function linkUserToPersonController(req, res, next) {
  try {
    const user = await adminLinkUserToPerson({
      userId: Number(req.params.userId),
      personId: req.body.personId,
    });

    return res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      personId: user.personId,
    });
  } catch (error) {
    return next(error);
  }
}

async function manualPasswordChangeController(req, res, next) {
  try {
    const result = await adminManualPasswordChange({
      userId: Number(req.params.userId),
      newPassword: req.body.newPassword,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function generatePasswordResetLinkController(req, res, next) {
  try {
    const result = await generatePasswordResetLink(Number(req.params.userId));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsersController,
  updateUserController,
  linkUserToPersonController,
  manualPasswordChangeController,
  generatePasswordResetLinkController,
};
