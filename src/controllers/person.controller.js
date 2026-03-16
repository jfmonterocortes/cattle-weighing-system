const { ROLE } = require('../constants/domain');
const { createPersonRecord, updatePersonRecord, searchPeople, listPeople, CLIENT_SEARCH_MIN_LENGTH } = require('../services/person.service');

function validationErrorResponse(message, path = 'q') {
  return {
    message: 'Validation failed',
    errors: [{ path, message }],
  };
}

async function createPerson(req, res, next) {
  try {
    const person = await createPersonRecord(req.body);
    return res.status(201).json(person);
  } catch (error) {
    return next(error);
  }
}

async function updatePerson(req, res, next) {
  try {
    const person = await updatePersonRecord(Number(req.params.personId), req.body, req.user);
    return res.json(person);
  } catch (error) {
    return next(error);
  }
}

async function listPeopleController(req, res, next) {
  try {
    const result = await listPeople(req.query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function searchPerson(req, res, next) {
  try {
    if (req.user?.role === ROLE.CLIENT && String(req.query.q || '').trim().length < CLIENT_SEARCH_MIN_LENGTH) {
      return res.status(400).json(validationErrorResponse(`Escribe al menos ${CLIENT_SEARCH_MIN_LENGTH} caracteres para buscar.`));
    }

    const result = await searchPeople({
      user: req.user,
      q: req.query.q,
      limit: req.query.limit,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPerson,
  updatePerson,
  listPeopleController,
  searchPerson,
};
