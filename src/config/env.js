const dotenv = require('dotenv');

let loaded = false;

function loadDotenv() {
  if (loaded) return;
  dotenv.config();
  loaded = true;
}

function getEnv(options = {}) {
  const {
    requireDatabase = true,
    requireJwt = true,
    requireTestDatabase = false,
    requirePasswordResetSecret = true,
  } = options;

  loadDotenv();

  const missing = [];
  if (requireDatabase && !process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (requireJwt && !process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (requirePasswordResetSecret && !process.env.PASSWORD_RESET_SECRET) missing.push('PASSWORD_RESET_SECRET');
  if (requireTestDatabase && !process.env.TEST_DATABASE_URL) missing.push('TEST_DATABASE_URL');

  if (missing.length) {
    const err = new Error(
      `Missing required environment variables: ${missing.join(
        ', '
      )}. Copy .env.example to .env and set the required values.`
    );
    err.code = 'ENV_VALIDATION_ERROR';
    throw err;
  }

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const frontendBaseUrl = process.env.FRONTEND_BASE_URL || corsOrigin;
  const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);

  return {
    PORT: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000,
    DATABASE_URL: process.env.DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    PASSWORD_RESET_SECRET: process.env.PASSWORD_RESET_SECRET,
    CORS_ORIGIN: corsOrigin,
    FRONTEND_BASE_URL: frontendBaseUrl,
  };
}

module.exports = {
  getEnv,
};
