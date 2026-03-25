const {
  getSettingsForUser,
  setDefaultPricePerHead,
  updateOwnProfile,
  updateOwnPassword,
} = require('../services/settings.service');

async function getSettingsController(req, res, next) {
  try {
    const settings = await getSettingsForUser(req.user);
    return res.json(settings);
  } catch (error) {
    return next(error);
  }
}

async function updateSettingsController(req, res, next) {
  try {
    await setDefaultPricePerHead(req.body.defaultPricePerHead);
    return res.json({ defaultPricePerHead: req.body.defaultPricePerHead });
  } catch (error) {
    return next(error);
  }
}

async function updateOwnProfileController(req, res, next) {
  try {
    const result = await updateOwnProfile({
      user: req.user,
      name: req.body.name,
      phone: req.body.phone,
      cedula: req.body.cedula,
      liquidadorAlias: req.body.liquidadorAlias,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateOwnPasswordController(req, res, next) {
  try {
    const result = await updateOwnPassword({
      userId: req.user.userId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSettingsController,
  updateSettingsController,
  updateOwnProfileController,
  updateOwnPasswordController,
};
