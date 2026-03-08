const express = require('express');
const {
  createLinkRequestController,
  listLinkRequestsController,
  reviewLinkRequestController,
  getMyLinkStatusController,
} = require('../controllers/link.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createLinkRequestSchema, reviewLinkRequestSchema } = require('../validators/link.validators');

const router = express.Router();

router.get('/me', authMiddleware, requireRoles('CLIENT'), getMyLinkStatusController);
router.post('/', authMiddleware, requireRoles('CLIENT'), validate(createLinkRequestSchema), createLinkRequestController);
router.get('/', authMiddleware, requireRoles('ADMIN'), listLinkRequestsController);
router.patch('/:requestId/review', authMiddleware, requireRoles('ADMIN'), validate(reviewLinkRequestSchema), reviewLinkRequestController);

module.exports = router;
