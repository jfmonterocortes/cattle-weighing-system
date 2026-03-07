const express = require('express');
const { createPerson, updatePerson, searchPerson } = require('../controllers/person.controller');
const { validate } = require('../middlewares/validate.middleware');
const { personCreateSchema, personUpdateSchema, personSearchQuerySchema } = require('../validators/person.validators');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/search', authMiddleware, validate(personSearchQuerySchema, 'query'), searchPerson);
router.post('/', authMiddleware, requireRoles('ADMIN', 'LIQUIDADOR'), validate(personCreateSchema), createPerson);
router.patch('/:personId', authMiddleware, requireRoles('ADMIN'), validate(personUpdateSchema), updatePerson);

module.exports = router;
