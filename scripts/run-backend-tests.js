const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');
const { getEnv } = require('../src/config/env');

const repoRoot = path.join(__dirname, '..');
const prismaCli = require.resolve('prisma/build/index.js');
const vitestCli = require.resolve('vitest/vitest.mjs');

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists(databaseUrl) {
  const targetUrl = new URL(databaseUrl);
  const databaseName = targetUrl.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('TEST_DATABASE_URL must include a database name.');
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

function runCommand(label, command, args, env) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function main() {
  const env = getEnv({ requireDatabase: false, requireTestDatabase: true });
  const testEnv = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: env.TEST_DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    PASSWORD_RESET_SECRET: env.PASSWORD_RESET_SECRET,
    CORS_ORIGIN: env.CORS_ORIGIN,
    FRONTEND_BASE_URL: env.FRONTEND_BASE_URL,
  };

  await ensureDatabaseExists(env.TEST_DATABASE_URL);

  runCommand('Prisma generate', process.execPath, [prismaCli, 'generate'], testEnv);
  runCommand(
    'Reset test database',
    process.execPath,
    [prismaCli, 'migrate', 'reset', '--force'],
    testEnv
  );
  runCommand('Seed test database', process.execPath, [path.join(repoRoot, 'prisma', 'seed.js')], testEnv);
  runCommand('Vitest', process.execPath, [vitestCli, 'run', ...process.argv.slice(2)], testEnv);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
