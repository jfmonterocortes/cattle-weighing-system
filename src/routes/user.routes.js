const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { listUsersQuerySchema, adminLinkUserToPersonSchema, updateUserSchema } = require('../validators/user.validators');
const { listUsersController, updateUserController, linkUserToPersonController } = require('../controllers/user.controller');

const router = express.Router();

router.get('/', authMiddleware, requireRoles('ADMIN'), validate(listUsersQuerySchema, 'query'), listUsersController);
router.patch('/:userId', authMiddleware, requireRoles('ADMIN'), validate(updateUserSchema), updateUserController);
router.patch('/:userId/person-link', authMiddleware, requireRoles('ADMIN'), validate(adminLinkUserToPersonSchema), linkUserToPersonController);

module.exports = router;
