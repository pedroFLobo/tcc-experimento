// Configuração do Playwright usada pelo executor (testes E2E gerados pelos modelos).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
    // Opcional: usar um Chromium já instalado (ex.: CLINICA_CHROMIUM=/caminho/chrome).
    launchOptions: process.env.CLINICA_CHROMIUM ? { executablePath: process.env.CLINICA_CHROMIUM } : {},
  },
});
