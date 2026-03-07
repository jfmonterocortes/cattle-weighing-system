const { getDefaultPricePerHead, setDefaultPricePerHead } = require('../services/settings.service');

async function getSettingsController(req, res, next) {
  try {
    const defaultPricePerHead = await getDefaultPricePerHead();
    return res.json({ defaultPricePerHead });
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

module.exports = {
  getSettingsController,
  updateSettingsController,
};
