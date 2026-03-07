const { listUsers, updateUser, adminLinkUserToPerson } = require('../services/user.service');

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

module.exports = {
  listUsersController,
  updateUserController,
  linkUserToPersonController,
};
