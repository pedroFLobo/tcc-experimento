# lote-187

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 2 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0262 | (sem @caso) | médico faz login, define grade, cria bloqueio, registra atendimento e falta | falhou | [31mTest timeout of 30000ms exceeded.[39m Error: page.click: Test timeout of 30000ms exceeded. Call log: [2m - waiting for locator('text=Minha agenda')[22m  |
| nemotron-0263 | (sem @caso) | médico não acessa agenda de outro médico (RN30) | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: locator('[role="alert"], .toast[data-tipo="erro"]') Expected: |

## Arquivo: e2e/fluxo-medico.spec.js

```js
// Testes E2E — fluxo do médico (RF04, RF05, RF06, RF07, RF09, RF10.2)
// Atributos: Adequação funcional, Usabilidade
import { test, expect } from '@playwright/test';

test('médico faz login, define grade, cria bloqueio, registra atendimento e falta', async ({ page }) => {
  // --- Login ---
  await page.goto('/login');
  await page.fill('#login-email', 'carlos@clinica.com');
  await page.fill('#login-senha', 'Senha123');
  await page.click('#login-entrar');
  await expect(page).toHaveURL(/\/medico/);

  // --- Vê a própria agenda ---
  await page.click('text=Minha agenda');
  await expect(page).toHaveURL(/\/medico\/agenda/);

  // --- Define grade de disponibilidade ---
  await page.click('text=Grade');
  await expect(page).toHaveURL(/\/medico\/grade/);
  await page.check('input[name="diasSemana"][value="1"]'); // segunda
  await page.fill('input[name="horaInicio"]', '08:00');
  await page.fill('input[name="horaFim"]', '12:00');
  await page.click('button:has-text("Adicionar bloco")');
  await page.click('button:has-text("Salvar grade")');
  await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();

  // --- Cria bloqueio ---
  await page.click('text=Bloqueios');
  await expect(page).toHaveURL(/\/medico\/bloqueios/);
  await page.fill('input[name="dataInicio"]', '2026-10-25');
  await page.fill('input[name="dataFim"]', '2026-10-26');
  await page.fill('input[name="motivo"]', 'Congresso');
  await page.click('button:has-text("Criar bloqueio")');
  await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();

  // --- Registra atendimento realizado ---
  await page.click('text=Minha agenda');
  const primeiraConsulta = page.locator('tr[data-consulta-id]').first();
  if ((await primeiraConsulta.count()) > 0) {
    const id = await primeiraConsulta.getAttribute('data-consulta-id');
    await page.click(`button[data-realizar="${id}"]`);
    await page.fill('textarea[name="observacoes"]', 'Atendimento realizado.');
    await page.click('button:has-text("Confirmar atendimento")');
    await expect(page.locator(`tr[data-consulta-id="${id}"] [data-status]`)).toContainText('Realizada');
  }

  // --- Registra falta ---
  const segunda = page.locator('tr[data-consulta-id]').nth(1);
  if ((await segunda.count()) > 0) {
    const id = await segunda.getAttribute('data-consulta-id');
    await page.click(`button[data-falta="${id}"]`);
    await expect(page.locator(`tr[data-consulta-id="${id}"] [data-status]`)).toContainText('Falta');
  }
});

test('médico não acessa agenda de outro médico (RN30)', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#login-email', 'carlos@clinica.com');
  await page.fill('#login-senha', 'Senha123');
  await page.click('#login-entrar');
  await page.goto('/medico/agenda');
  // tenta acessar outro recurso médico via URL indevida
  await page.goto('/medico/medicos/99/disponibilidades');
  await expect(page.locator('[role="alert"], .toast[data-tipo="erro"]')).toBeVisible();
});
```
