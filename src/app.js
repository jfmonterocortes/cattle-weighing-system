const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getEnv } = require('./config/env');

const authRoutes = require('./routes/auth.routes');
const personRoutes = require('./routes/person.routes');
const sheetRoutes = require('./routes/sheet.routes');
const linkRoutes = require('./routes/link.routes');
const settingsRoutes = require('./routes/settings.routes');
const exportRoutes = require('./routes/export.routes');
const userRoutes = require('./routes/user.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const { CORS_ORIGIN } = getEnv();
const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN,
  })
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'cattle-weighing-api' });
});

app.use('/auth', authRoutes);
app.use('/people', personRoutes);
app.use('/sheets', sheetRoutes);
app.use('/link-requests', linkRoutes);
app.use('/settings', settingsRoutes);
app.use('/exports', exportRoutes);
app.use('/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
