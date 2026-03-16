const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['src/tests/**/*.test.js'],
    globals: true,
    fileParallelism: false,
    pool: 'threads',
  },
});
