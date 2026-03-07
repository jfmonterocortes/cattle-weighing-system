const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['src/tests/**/*.test.js'],
    globals: true,
    pool: 'threads',
  },
});
