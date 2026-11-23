# lote-147

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 6 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0412 | CT-E2E-014 | paciente agenda e confirma a presença da consulta | passou |  |
| mimo-0413 | CT-E2E-015 | paciente remarca a consulta para 22/10 às 08:00 | passou |  |
| mimo-0414 | CT-E2E-016 | botão manter consulta fecha o diálogo sem cancelar | passou |  |
| mimo-0415 | CT-E2E-017 | paciente cancela a consulta e ela fica cancelada | passou |  |
| mimo-0416 | CT-E2E-018 | contador mostra zero ativas de uma no total após o cancelamento | passou |  |
| mimo-0417 | CT-E2E-019 | valor da consulta aparece formatado como R$ 150,00 na lista | passou |  |

## Arquivo: e2e/paciente-consultas.spec.js

```js
// Casos de teste E2E: ciclo de vida da consulta pela área do paciente
// (confirmar, remarcar, cancelar, contador e valor). Cobrem CT-E2E-014 a CT-E2E-019.
// Os casos compartilham o banco do arquivo em sequência: o caso 014 cria a
// consulta que os demais utilizam.

import { test, expect } from '@playwright/test';

function toast(page, texto) {
  return page.locator('.toast').filter({ hasText: texto }).first();
}

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

async function valorOpcao(page, seletor, texto) {
  const opcao = page.locator(`${seletor} option`, { hasText: texto }).first();
  await expect(opcao).toHaveCount(1);
  return opcao.getAttribute('value');
}

test.describe('Ciclo de vida da consulta pelo paciente', () => {
  /**
   * @caso CT-E2E-014
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Verificar que o paciente agenda e depois confirma a presença dentro da janela de 48 horas
   * @resultadoEsperado Após confirmar aparece o aviso "Presença confirmada para 20/10/2026 14:00." e o status vira CONFIRMADA
   */
  test('paciente agenda e confirma a presença da consulta', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    await page.click('#menu-agendar');
    await page.selectOption('#agendar-especialidade', await valorOpcao(page, '#agendar-especialidade', 'Clínica Geral'));
    await page.selectOption('#agendar-medico', await valorOpcao(page, '#agendar-medico', 'Carlos'));
    await page.fill('#agendar-data', '2026-10-20');
    await page.click('#agendar-horarios button[data-inicio="2026-10-20 14:00"]');
    await page.click('#agendar-confirmar');
    await expect(toast(page, 'Consulta agendada')).toBeVisible();

    await page.click('#menu-consultas');
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: '20/10/2026 14:00' });
    await expect(linha).toHaveCount(1);
    await linha.locator('[data-acao="confirmar"]').click();

    await expect(toast(page, 'Presença confirmada para 20/10/2026 14:00.')).toBeVisible();
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'CONFIRMADA');
  });

  /**
   * @caso CT-E2E-015
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Verificar a remarcação para 22/10 08:00 com o mesmo médico, voltando a consulta para AGENDADA
   * @resultadoEsperado Aparece o aviso "Nova data: 22/10/2026 08:00." e a linha da tabela passa a exibir 22/10/2026 08:00 com status AGENDADA
   */
  test('paciente remarca a consulta para 22/10 às 08:00', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    const antiga = page.locator('tr[data-consulta-id]').filter({ hasText: '20/10/2026 14:00' });
    await expect(antiga).toHaveCount(1);
    await antiga.locator('[data-acao="remarcar"]').click();

    await page.fill('#remarcar-data', '2026-10-22');
    await page.click('#remarcar-horarios button[data-inicio="2026-10-22 08:00"]');
    await page.click('#remarcar-confirmar');

    await expect(toast(page, 'Nova data: 22/10/2026 08:00.')).toBeVisible();
    const nova = page.locator('tr[data-consulta-id]').filter({ hasText: '22/10/2026 08:00' });
    await expect(nova).toHaveCount(1);
    await expect(nova.locator('[data-status]')).toHaveAttribute('data-status', 'AGENDADA');
  });

  /**
   * @caso CT-E2E-016
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN26, RNF06
   * @objetivo Verificar que "Manter consulta" fecha o diálogo de cancelamento sem alterar a consulta
   * @resultadoEsperado O diálogo desaparece e a consulta continua com status AGENDADA
   */
  test('botão manter consulta fecha o diálogo sem cancelar', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: '22/10/2026 08:00' });
    await expect(linha).toHaveCount(1);
    await linha.locator('[data-acao="cancelar"]').click();

    await expect(page.locator('#cancelar-confirmar')).toBeVisible();
    await page.click('#cancelar-voltar');

    await expect(page.locator('#cancelar-confirmar')).toHaveCount(0);
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'AGENDADA');
  });

  /**
   * @caso CT-E2E-017
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Verificar que o paciente cancela a própria consulta com antecedência e ela vira CANCELADA
   * @resultadoEsperado Aparece o aviso "Sua consulta foi cancelada." e o status da linha vira CANCELADA
   */
  test('paciente cancela a consulta e ela fica cancelada', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: '22/10/2026 08:00' });
    await expect(linha).toHaveCount(1);
    await linha.locator('[data-acao="cancelar"]').click();
    await page.click('#cancelar-confirmar');

    await expect(toast(page, 'Sua consulta foi cancelada.')).toBeVisible();
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'CANCELADA');
  });

  /**
   * @caso CT-E2E-018
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.1
   * @objetivo Verificar o contador de consultas do paciente após o cancelamento
   * @resultadoEsperado A descrição mostra "0 consulta(s) ativa(s) de 1 no total."
   */
  test('contador mostra zero ativas de uma no total após o cancelamento', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    const contador = page.locator('.descricao').filter({ hasText: 'consulta(s) ativa(s)' });
    await expect(contador).toHaveText('0 consulta(s) ativa(s) de 1 no total.');
  });

  /**
   * @caso CT-E2E-019
   * @nivel e2e
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF08.2, RN22
   * @objetivo Verificar que o valor em centavos calculado pela API é exibido como moeda na interface
   * @resultadoEsperado A linha da consulta exibe o valor R$ 150,00
   */
  test('valor da consulta aparece formatado como R$ 150,00 na lista', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    const linha = page.locator('tr[data-consulta-id]').first();
    await expect(linha).toContainText(/R\$\s150,00/);
  });
});
```
