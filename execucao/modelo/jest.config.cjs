// Configuração do Jest usada pelo executor (testes de backend gerados pelos modelos).
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/backend/__testes__/**/*.test.js'],
  testTimeout: 20000,
  collectCoverageFrom: ['backend/src/**/*.js', '!backend/src/server.js', '!backend/src/db/seed.js'],
  coverageReporters: ['json-summary'],
  coverageDirectory: '<rootDir>/.cobertura/backend',
};
