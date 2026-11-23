# lote-146

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 4 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0408 | CT-E2E-007 | paciente agenda consulta do início ao fim e vê a consulta na lista | passou |  |
| mimo-0409 | CT-E2E-008 | botão de confirmação fica desabilitado até escolher o horário | passou |  |
| mimo-0410 | CT-E2E-009 | grade de Carlos em 26/10 oferece 08:00 e 17:30, e não 12:00 nem 18:00 | passou |  |
| mimo-0411 | CT-E2E-010 | Eduardo não tem horários na segunda e tem a partir das 13:00 na terça | passou |  |

## Arquivo: e2e/paciente-agendar.spec.js

```js
// Casos de teste E2E: agendamento de consulta pelo paciente.
// Cobrem CT-E2E-007 a CT-E2E-010.

import { test, expect } from '@playwright/test';

// Abre o login limpo, preenche as credenciais e espera o redirecionamento pós-entrada.
async function entrar(page, email, senha) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.fill('#login-email', email);
  await page.fill('#login-senha', senha);
  await page.click('#login-entrar');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

// Lê o value da opção de um <select> cujo rótulo contém o texto dado.
async function valorOpcao(page, seletor, texto) {
  const opcao = page.locator(`${seletor} option`, { hasText: texto }).first();
  await expect(opcao).toHaveCount(1);
  return opcao.getAttribute('value');
}

// Preenche os três passos do agendamento: especialidade, médico e data.
async function preencherAgendamento(page, { especialidade, medico, data }) {
  await page.selectOption('#agendar-especialidade', await valorOpcao(page, '#agendar-especialidade', especialidade));
  await page.selectOption('#agendar-medico', await valorOpcao(page, '#agendar-medico', medico));
  await page.fill('#agendar-data', data);
}

test.describe('Agendamento de consulta pelo paciente', () => {
  /**
   * @caso CT-E2E-007
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF07.1, RN17
   * @objetivo Percorrer o fluxo completo de agendamento: escolher especialidade, médico, data e horário e confirmar
   * @resultadoEsperado Aparece o aviso "Consulta agendada" e a consulta aparece em Minhas consultas com status AGENDADA
   */
  test('paciente agenda consulta do início ao fim e vê a consulta na lista', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    await page.click('#menu-agendar');

    await preencherAgendamento(page, { especialidade: 'Clínica Geral', medico: 'Carlos', data: '2026-10-20' });
    await page.click('#agendar-horarios button[data-inicio="2026-10-20 14:00"]');
    await expect(page.locator('#agendar-resumo')).toContainText('Dr. Carlos Almeida');
    await page.click('#agendar-confirmar');
    await expect(page.locator('.toast').filter({ hasText: 'Consulta agendada' }).first()).toBeVisible();

    await page.click('#menu-consultas');
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: '20/10/2026 14:00' });
    await expect(linha).toHaveCount(1);
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'AGENDADA');
  });

  /**
   * @caso CT-E2E-008
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN17, RNF06
   * @objetivo Verificar que a confirmação só é liberada depois que o paciente escolhe um horário
   * @resultadoEsperado #agendar-confirmar fica desabilitado após escolher a data e habilitado ao clicar em um horário livre
   */
  test('botão de confirmação fica desabilitado até escolher o horário', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    await page.goto('/paciente/agendar');

    await preencherAgendamento(page, { especialidade: 'Clínica Geral', medico: 'Carlos', data: '2026-10-26' });
    await expect(page.locator('#agendar-confirmar')).toBeDisabled();

    await page.click('#agendar-horarios button[data-inicio="2026-10-26 08:00"]');
    await expect(page.locator('#agendar-confirmar')).toBeEnabled();
  });

  /**
   * @caso CT-E2E-009
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1, RN14
   * @objetivo Verificar a grade de Carlos na segunda 26/10: blocos 08–12 e 14–18 geram 08:00 e 17:30, mas não 12:00 nem 18:00
   * @resultadoEsperado Os botões 08:00 e 17:30 existem em #agendar-horarios e os horários 12:00 e 18:00 não existem
   */
  test('grade de Carlos em 26/10 oferece 08:00 e 17:30, e não 12:00 nem 18:00', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    await page.goto('/paciente/agendar');

    await preencherAgendamento(page, { especialidade: 'Clínica Geral', medico: 'Carlos', data: '2026-10-26' });
    await expect(page.locator('#agendar-horarios button[data-inicio="2026-10-26 08:00"]')).toHaveCount(1);
    await expect(page.locator('#agendar-horarios button[data-inicio="2026-10-26 17:30"]')).toHaveCount(1);
    await expect(page.locator('#agendar-horarios button[data-inicio="2026-10-26 12:00"]')).toHaveCount(0);
    await expect(page.locator('#agendar-horarios button[data-inicio="2026-10-26 18:00"]')).toHaveCount(0);
  });

  /**
   * @caso CT-E2E-010
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF07.1, RN14
   * @objetivo Verificar que Eduardo (ter/qui) não oferece horários na segunda 26/10 e oferece a partir das 13:00 na terça 27/10
   * @resultadoEsperado A data 26/10 mostra o aviso de nenhum horário livre e a data 27/10 mostra o horário 13:00
   */
  test('Eduardo não tem horários na segunda e tem a partir das 13:00 na terça', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    await page.goto('/paciente/agendar');

    await preencherAgendamento(page, { especialidade: 'Dermatologia', medico: 'Eduardo', data: '2026-10-26' });
    await expect(page.locator('#agendar-horarios')).toContainText('Nenhum horário livre nesta data. Tente outro dia.');

    await page.fill('#agendar-data', '2026-10-27');
    await expect(page.locator('#agendar-horarios button[data-inicio="2026-10-27 13:00"]')).toHaveCount(1);
  });
});
```
