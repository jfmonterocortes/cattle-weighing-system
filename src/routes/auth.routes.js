const express = require('express');
const { login, register } = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { loginSchema, registerSchema } = require('../validators/auth.validators');
const { authRateLimiter } = require('../middlewares/rate-limit.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/register-managed', authMiddleware, requireRoles('ADMIN'), validate(registerSchema), register);

module.exports = router;
