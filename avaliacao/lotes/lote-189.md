# lote-189

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 2 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0267 | (sem @caso) | recepção cadastra especialidade, médico e paciente, agenda para outro e emite relatório | falhou | [31mTest timeout of 30000ms exceeded.[39m Error: page.fill: Test timeout of 30000ms exceeded. Call log: [2m - waiting for locator('input[name="nome"]')[22m  |
| nemotron-0268 | (sem @caso) | recepção tenta cadastrar e-mail duplicado e recebe erro (RN01) | falhou | [31mTest timeout of 30000ms exceeded.[39m Error: page.fill: Test timeout of 30000ms exceeded. Call log: [2m - waiting for locator('input[name="nome"]')[22m  |

## Arquivo: e2e/fluxo-recepcao.spec.js

```js
// Testes E2E — fluxo da recepção (RF02, RF03, RF04, RF08, RF10.3, RF11)
// Atributos: Adequação funcional, Segurança, Usabilidade
import { test, expect } from '@playwright/test';

test('recepção cadastra especialidade, médico e paciente, agenda para outro e emite relatório', async ({ page }) => {
  // --- Login ---
  await page.goto('/login');
  await page.fill('#login-email', 'recepcao@clinica.com');
  await page.fill('#login-senha', 'Senha123');
  await page.click('#login-entrar');
  await expect(page).toHaveURL(/\/recepcao/);

  // --- Cadastra especialidade ---
  await page.click('text=Especialidades');
  await expect(page).toHaveURL(/\/recepcao\/especialidades/);
  await page.fill('input[name="nome"]', 'Ortopedia');
  await page.fill('input[name="precoCentavos"]', '25000');
  await page.click('button:has-text("Cadastrar especialidade")');
  await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();
  await expect(page.locator('text=Ortopedia')).toBeVisible();

  // --- Cadastra médico ---
  await page.click('text=Médicos');
  await expect(page).toHaveURL(/\/recepcao\/medicos/);
  await page.fill('input[name="nome"]', 'Dra. Nova');
  await page.fill('input[name="email"]', 'nova@clinica.com');
  await page.fill('input[name="senha"]', 'Senha123');
  await page.fill('input[name="crm"]', '54321/SP');
  await page.selectOption('select[name="especialidadeId"]', { label: /Ortopedia/ });
  await page.fill('input[name="duracaoConsultaMin"]', '30');
  await page.click('button:has-text("Cadastrar médico")');
  await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();

  // --- Cadastra paciente ---
  await page.click('text=Pacientes');
  await expect(page).toHaveURL(/\/recepcao\/pacientes/);
  await page.fill('input[name="nome"]', 'Novo Paciente');
  await page.fill('input[name="email"]', 'novopac@email.com');
  await page.fill('input[name="senha"]', 'Senha123');
  await page.fill('input[name="cpf"]', '733.769.628-50');
  await page.fill('input[name="dataNascimento"]', '1985-01-01');
  await page.fill('input[name="telefone"]', '(11) 99999-0000');
  await page.click('button:has-text("Cadastrar paciente")');
  await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();

  // --- Agenda consulta para o paciente cadastrado ---
  await page.click('text=Agendar');
  await expect(page).toHaveURL(/\/recepcao\/agendar/);
  await page.selectOption('select[name="pacienteId"]', { label: /Novo Paciente/ });
  await page.selectOption('select[name="medicoId"]', { label: /Carlos/ });
  await page.fill('input[name="inicio"]', '2026-10-20 10:00');
  await page.click('#agendar-confirmar');
  await expect(page.locator('.toast[data-tipo="sucesso"]')).toBeVisible();

  // --- Lista todas as consultas com filtros (RF10.3) ---
  await page.click('text=Consultas');
  await expect(page).toHaveURL(/\/recepcao\/consultas/);
  await expect(page.locator('tr[data-consulta-id]')).toHaveCount(1);
  await page.fill('input[name="dataFiltro"]', '2026-10-20');
  await page.click('button:has-text("Filtrar")');
  await expect(page.locator('tr[data-consulta-id]')).toHaveCount(1);

  // --- Emite relatório (RF11) ---
  await page.click('text=Relatório');
  await expect(page).toHaveURL(/\/recepcao\/relatorio/);
  await page.fill('input[name="dataInicio"]', '2026-10-01');
  await page.fill('input[name="dataFim"]', '2026-10-31');
  await page.click('button:has-text("Gerar relatório")');
  await expect(page.locator('text=Faturamento')).toBeVisible();
});

test('recepção tenta cadastrar e-mail duplicado e recebe erro (RN01)', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#login-email', 'recepcao@clinica.com');
  await page.fill('#login-senha', 'Senha123');
  await page.click('#login-entrar');
  await page.click('text=Pacientes');
  await page.fill('input[name="nome"]', 'Dup');
  await page.fill('input[name="email"]', 'ana@email.com');
  await page.fill('input[name="senha"]', 'Senha123');
  await page.fill('input[name="cpf"]', '111.222.333-44');
  await page.fill('input[name="dataNascimento"]', '1990-01-01');
  await page.click('button:has-text("Cadastrar paciente")');
  await expect(page.locator('[role="alert"]')).toBeVisible();
});
```
