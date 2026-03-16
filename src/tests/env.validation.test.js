const ORIGINAL_ENV = { ...process.env };

function loadFreshEnvModule() {
  const modulePath = require.resolve('../config/env');
  delete require.cache[modulePath];
  return require('../config/env');
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!Object.prototype.hasOwnProperty.call(ORIGINAL_ENV, key)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, ORIGINAL_ENV);
}

describe('env validation', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('requires PASSWORD_RESET_SECRET explicitly', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cattle_weighing_test_db';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.PASSWORD_RESET_SECRET = '';

    const { getEnv } = loadFreshEnvModule();

    expect(() => getEnv()).toThrow(/PASSWORD_RESET_SECRET/);
  });

  it('returns distinct auth and reset secrets when configured', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cattle_weighing_test_db';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.PASSWORD_RESET_SECRET = 'reset-secret';

    const { getEnv } = loadFreshEnvModule();
    const env = getEnv();

    expect(env.JWT_SECRET).toBe('jwt-secret');
    expect(env.PASSWORD_RESET_SECRET).toBe('reset-secret');
  });
});
