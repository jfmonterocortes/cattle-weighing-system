const express = require('express');
const { login, registerClient } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/register-client', authMiddleware, requireAdmin, registerClient);

module.exports = router;
