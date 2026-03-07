const express = require('express');
const { getSettingsController, updateSettingsController } = require('../controllers/settings.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateSettingSchema } = require('../validators/settings.validators');

const router = express.Router();

router.get('/', authMiddleware, getSettingsController);
router.patch('/', authMiddleware, requireRoles('ADMIN'), validate(updateSettingSchema), updateSettingsController);

module.exports = router;
