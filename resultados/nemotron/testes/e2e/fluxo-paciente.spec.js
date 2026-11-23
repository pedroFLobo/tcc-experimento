// Testes E2E — fluxo do paciente (RF01, RF02, RF08, RF09, RF10)
// Atributos: Adequação funcional, Usabilidade, Confiabilidade
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('paciente faz login, agenda, confirma, cancela e vê suas consultas', async ({ page }) => {
  // --- Login ---
  await page.goto('/login');
  await page.fill('#login-email', 'ana@email.com');
  await page.fill('#login-senha', 'Senha123');
  await page.click('#login-entrar');
  await expect(page).toHaveURL(/\/paciente/);

  // --- Agendar consulta ---
  await page.click('text=Agendar consulta');
  await expect(page).toHaveURL(/\/paciente\/agendar/);
  await page.selectOption('select[name="medicoId"]', { label: /Carlos/ });
  await page.fill('input[name="inicio"]', '2026-10-20T10:00');
  await page.click('#agendar-confirmar');
  await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();

  // --- Lista de consultas mostra a nova consulta ---
  await page.click('text=Minhas consultas');
  await expect(page.locator('tr[data-consulta-id]')).toHaveCount(1);
  await expect(page.locator('[data-status]')).toContainText('Agendada');

  // --- Confirmar consulta ---
  const consultaId = await page.locator('tr[data-consulta-id]').first().getAttribute('data-consulta-id');
  await page.click(`button[data-confirmar="${consultaId}"]`);
  await expect(page.locator(`tr[data-consulta-id="${consultaId}"] [data-status]`)).toContainText('Confirmada');

  // --- Cancelar consulta (abre diálogo #cancelar-confirmar, não window.confirm) ---
  await page.click(`button[data-cancelar="${consultaId}"]`);
  await expect(page.locator('#cancelar-confirmar')).toBeVisible();
  await page.click('#cancelar-confirmar button[data-confirma="sim"]');
  await expect(page.locator(`tr[data-consulta-id="${consultaId}"] [data-status]`)).toContainText('Cancelada');
});

test('login falho exibe erro inline e não autentica', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#login-email', 'ana@email.com');
  await page.fill('#login-senha', 'senhaerrada');
  await page.click('#login-entrar');
  await expect(page.locator('[role="alert"]')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('paciente não acessa rota de médico/recepção (RN30)', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#login-email', 'ana@email.com');
  await page.fill('#login-senha', 'Senha123');
  await page.click('#login-entrar');
  await page.goto('/recepcao/consultas');
  await expect(page).toHaveURL(/\/login|\/paciente/);
});
