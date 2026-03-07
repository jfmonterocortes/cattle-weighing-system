function notFoundHandler(req, res) {
  return res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || 500;
  return res.status(status).json({
    message: err.message || 'Unexpected server error',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
