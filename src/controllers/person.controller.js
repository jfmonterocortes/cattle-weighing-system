const { createPersonRecord, updatePersonRecord, searchPeople, listPeople } = require('../services/person.service');

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
    const result = await searchPeople(req.query.q, req.query.limit);
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
