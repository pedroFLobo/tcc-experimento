// Configuração do Vitest usada pelo executor (testes de frontend gerados pelos modelos).
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['frontend/__testes__/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.mjs'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['frontend/src/**/*.{js,jsx}'],
      exclude: ['frontend/src/main.jsx'],
      reporter: ['json-summary'],
      reportOnFailure: true,
      reportsDirectory: './.cobertura/frontend',
    },
  },
});
