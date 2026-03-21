function notFoundHandler(req, res) {
  return res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = status >= 500 && isProduction
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';
  if (status >= 500) console.error('[ERROR]', err);
  return res.status(status).json({ message });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
