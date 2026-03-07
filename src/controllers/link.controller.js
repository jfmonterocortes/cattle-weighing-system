const { createLinkRequest, listLinkRequests, reviewLinkRequest } = require('../services/link.service');

async function createLinkRequestController(req, res, next) {
  try {
    const result = await createLinkRequest({
      userId: req.user.userId,
      personId: req.body.personId,
      notes: req.body.notes,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function listLinkRequestsController(req, res, next) {
  try {
    const result = await listLinkRequests(req.query.status);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function reviewLinkRequestController(req, res, next) {
  try {
    const result = await reviewLinkRequest({
      requestId: Number(req.params.requestId),
      reviewerUserId: req.user.userId,
      status: req.body.status,
      notes: req.body.notes,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createLinkRequestController,
  listLinkRequestsController,
  reviewLinkRequestController,
};
