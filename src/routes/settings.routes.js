const express = require('express');
const {
  getSettingsController,
  updateSettingsController,
  updateOwnProfileController,
  updateOwnPasswordController,
} = require('../controllers/settings.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateSettingSchema, updateOwnProfileSchema, updateOwnPasswordSchema } = require('../validators/settings.validators');

const router = express.Router();

router.get('/', authMiddleware, getSettingsController);
router.patch('/', authMiddleware, requireRoles('ADMIN'), validate(updateSettingSchema), updateSettingsController);
router.patch('/profile', authMiddleware, requireRoles('CLIENT'), validate(updateOwnProfileSchema), updateOwnProfileController);
router.patch('/password', authMiddleware, validate(updateOwnPasswordSchema), updateOwnPasswordController);

module.exports = router;
