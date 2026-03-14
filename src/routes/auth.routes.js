const express = require('express');
const { login, register, registerManaged, resetPassword } = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const {
  loginSchema,
  publicRegisterSchema,
  managedRegisterSchema,
  resetPasswordSchema,
} = require('../validators/auth.validators');
const { authRateLimiter } = require('../middlewares/rate-limit.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/register', authRateLimiter, validate(publicRegisterSchema), register);
router.post('/register-managed', authMiddleware, requireRoles('ADMIN'), validate(managedRegisterSchema), registerManaged);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;
