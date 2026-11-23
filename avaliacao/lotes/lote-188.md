# lote-188

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 3 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0264 | (sem @caso) | paciente faz login, agenda, confirma, cancela e vê suas consultas | falhou | Error: page.selectOption: options[0].label: expected string, got object 16 \| await page.click('text=Agendar consulta'); 17 \| await expect(page).toHaveURL(/\/p |
| nemotron-0265 | (sem @caso) | login falho exibe erro inline e não autentica | passou |  |
| nemotron-0266 | (sem @caso) | paciente não acessa rota de médico/recepção (RN30) | falhou | Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed Expected pattern: [32m/\/login\|\/paciente/[39m Receive |

## Arquivo: e2e/fluxo-paciente.spec.js

```js
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
```
