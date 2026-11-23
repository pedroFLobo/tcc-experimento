# lote-046

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 15 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0756 | CT-E2E-027 | listagem inicial aparece vazia | passou |  |
| deepseek-0757 | CT-E2E-028 | recepção agenda para paciente | passou |  |
| deepseek-0758 | CT-E2E-029 | recepção aplica desconto de idoso | falhou | [31mTest timeout of 30000ms exceeded.[39m Error: locator.fill: Test timeout of 30000ms exceeded. Call log: [2m - waiting for locator('#login-email')[22m 5 \ |
| deepseek-0759 | CT-E2E-030 | recepção agenda para menor com responsável | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: getByText('3 consulta(s) encontrada(s).') Expected: visible T |
| deepseek-0760 | CT-E2E-031 | recepção confirma presença | passou |  |
| deepseek-0761 | CT-E2E-032 | recepção não confirma fora da janela de 48 horas | falhou | [31mTest timeout of 30000ms exceeded.[39m Error: locator.click: Test timeout of 30000ms exceeded. Call log: [2m - waiting for locator('#tabela-consultas tbod |
| deepseek-0762 | CT-E2E-033 | recepção cancela com motivo obrigatório | passou |  |
| deepseek-0763 | CT-E2E-034 | recepção filtra por status | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: getByText('1 consulta(s) encontrada(s).') Expected: visible T |
| deepseek-0764 | CT-E2E-035 | recepção filtra por médico | passou |  |
| deepseek-0765 | CT-E2E-036 | recepção filtra por período e status | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: getByText('1 consulta(s) encontrada(s).') Expected: visible T |
| deepseek-0766 | CT-E2E-037 | recepção filtra por paciente | passou |  |
| deepseek-0767 | CT-E2E-038 | recepção limpa os filtros | falhou | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: getByText('3 consulta(s) encontrada(s).') Expected: visible T |
| deepseek-0768 | CT-E2E-039 | recepção respeita o limite por especialidade | passou |  |
| deepseek-0769 | CT-E2E-040 | recepção respeita o conflito do paciente | passou |  |
| deepseek-0770 | CT-E2E-041 | recepção remarca consulta | passou |  |

## Arquivo: e2e/recepcao-operacoes.spec.js

```js
import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

async function entrar(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('recepcao@clinica.com');
  await page.locator('#login-senha').fill(SENHA);
  await page.locator('#login-entrar').click();
  await expect(page).toHaveURL(/\/recepcao$/);
}

async function agendar(page, { paciente, medico, data, hora }) {
  await page.locator('#menu-agendar').click();
  await expect(page).toHaveURL(/\/recepcao\/agendar$/);
  await page.locator('#agendar-paciente').selectOption(paciente);
  await page.locator('#agendar-medico').selectOption(medico);
  await page.locator('#agendar-data').fill(data);
  await page.locator(`#agendar-horarios [data-inicio="${data} ${hora}"]`).click();
  await page.locator('#agendar-confirmar').click();
}

test.describe('Operação da recepção', () => {
  /**
   * @caso CT-E2E-027
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo apreensibilidade
   * @requisito RF10.3
   * @objetivo Abrir a listagem de consultas com o banco recém-criado
   * @resultadoEsperado A tela mostra zero consultas encontradas
   */
  test('listagem inicial aparece vazia', async ({ page }) => {
    await entrar(page);
    await expect(page.getByText('0 consulta(s) encontrada(s).')).toBeVisible();
    await expect(page.locator('#tabela-consultas')).toContainText('Nenhuma consulta encontrada.');
  });

  /**
   * @caso CT-E2E-028
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF08.2
   * @objetivo Agendar uma consulta em nome de uma paciente
   * @resultadoEsperado A consulta fica na listagem com status Agendada e valor R$ 150,00
   */
  test('recepção agenda para paciente', async ({ page }) => {
    await entrar(page);
    await agendar(page, { paciente: '1', medico: '1', data: '2026-10-19', hora: '10:00' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta agendada' })).toBeVisible();
    await page.locator('#menu-consultas').click();
    await expect(page.getByText('1 consulta(s) encontrada(s).')).toBeVisible();
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'Ana Pereira' });
    await expect(linha).toContainText('R$ 150,00');
    await expect(linha.locator('[data-status="AGENDADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-029
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Agendar para paciente idoso pela recepção
   * @resultadoEsperado A consulta é gravada com desconto de R$ 270,00
   */
  test('recepção aplica desconto de idoso', async ({ page }) => {
    await entrar(page);
    await agendar(page, { paciente: '2', medico: '2', data: '2026-10-21', hora: '10:30' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'R$ 270,00' })).toBeVisible();
    await page.locator('#menu-consultas').click();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: 'João Santos' })).toContainText('R$ 270,00');
  });

  /**
   * @caso CT-E2E-030
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1
   * @objetivo Agendar consulta para paciente menor pela recepção
   * @resultadoEsperado A consulta aparece no total de consultas da clínica
   */
  test('recepção agenda para menor com responsável', async ({ page }) => {
    await entrar(page);
    await agendar(page, { paciente: '3', medico: '4', data: '2026-10-21', hora: '07:00' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta agendada' })).toBeVisible();
    await page.locator('#menu-consultas').click();
    await expect(page.getByText('3 consulta(s) encontrada(s).')).toBeVisible();
  });

  /**
   * @caso CT-E2E-031
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença pela recepção dentro da janela de 48 horas
   * @resultadoEsperado O status da consulta de Ana muda para Confirmada
   */
  test('recepção confirma presença', async ({ page }) => {
    await entrar(page);
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'Ana Pereira' });
    await linha.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Presença de Ana Pereira confirmada' })).toBeVisible();
    await expect(linha.locator('[data-status="CONFIRMADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-032
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN25
   * @objetivo Confirmar consulta a mais de 48 horas do início
   * @resultadoEsperado O sistema recusa e explica a janela de confirmação
   */
  test('recepção não confirma fora da janela de 48 horas', async ({ page }) => {
    await entrar(page);
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'João Santos' });
    await linha.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('alert')).toHaveText('A confirmação só é permitida nas 48 horas anteriores à consulta.');
    await expect(linha.locator('[data-status="AGENDADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-033
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09.2, RN26
   * @objetivo Cancelar consulta exigindo motivo obrigatório
   * @resultadoEsperado Sem motivo há erro; com motivo o status vira Cancelada
   */
  test('recepção cancela com motivo obrigatório', async ({ page }) => {
    await entrar(page);
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'Lucas Oliveira' });
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toContainText('Cancelar consulta');
    await page.locator('#texto-confirmar').click();
    await expect(page.getByRole('alert')).toHaveText('Informe o motivo do cancelamento.');
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('#texto-campo').fill('Paciente desmarcou por telefone');
    await page.locator('#texto-confirmar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta cancelada' })).toBeVisible();
    await expect(linha.locator('[data-status="CANCELADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-034
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar consultas por status
   * @resultadoEsperado O filtro Agendada mostra João e o filtro Confirmada mostra Ana
   */
  test('recepção filtra por status', async ({ page }) => {
    await entrar(page);
    await page.locator('#filtro-status').selectOption('AGENDADA');
    await page.locator('#filtro-aplicar').click();
    await expect(page.getByText('1 consulta(s) encontrada(s).')).toBeVisible();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: 'João Santos' })).toBeVisible();
    await page.locator('#filtro-status').selectOption('CONFIRMADA');
    await page.locator('#filtro-aplicar').click();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: 'Ana Pereira' })).toBeVisible();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: 'João Santos' })).toHaveCount(0);
  });

  /**
   * @caso CT-E2E-035
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar consultas por médico
   * @resultadoEsperado Apenas a consulta de Ana com Dr. Carlos é listada
   */
  test('recepção filtra por médico', async ({ page }) => {
    await entrar(page);
    await page.locator('#filtro-medico').selectOption('1');
    await page.locator('#filtro-aplicar').click();
    await expect(page.getByText('1 consulta(s) encontrada(s).')).toBeVisible();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: 'Ana Pereira' })).toBeVisible();
  });

  /**
   * @caso CT-E2E-036
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Combinar filtro de data e status
   * @resultadoEsperado Somente a consulta agendada do dia 21 aparece
   */
  test('recepção filtra por período e status', async ({ page }) => {
    await entrar(page);
    await page.locator('#filtro-inicio').fill('2026-10-21');
    await page.locator('#filtro-fim').fill('2026-10-21');
    await page.locator('#filtro-status').selectOption('AGENDADA');
    await page.locator('#filtro-aplicar').click();
    await expect(page.getByText('1 consulta(s) encontrada(s).')).toBeVisible();
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'João Santos' });
    await expect(linha).toBeVisible();
    await expect(linha).toContainText('21/10/2026 10:30');
  });

  /**
   * @caso CT-E2E-037
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar consultas por paciente
   * @resultadoEsperado Apenas a consulta de Ana é listada
   */
  test('recepção filtra por paciente', async ({ page }) => {
    await entrar(page);
    await page.locator('#filtro-paciente').selectOption('1');
    await page.locator('#filtro-aplicar').click();
    await expect(page.getByText('1 consulta(s) encontrada(s).')).toBeVisible();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: 'Ana Pereira' })).toBeVisible();
  });

  /**
   * @caso CT-E2E-038
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF10.3
   * @objetivo Limpar os filtros aplicados
   * @resultadoEsperado A listagem volta a mostrar as três consultas cadastradas
   */
  test('recepção limpa os filtros', async ({ page }) => {
    await entrar(page);
    await page.locator('#filtro-paciente').selectOption('1');
    await page.locator('#filtro-aplicar').click();
    await expect(page.getByText('1 consulta(s) encontrada(s).')).toBeVisible();
    await page.getByRole('button', { name: 'Limpar' }).click();
    await expect(page.getByText('3 consulta(s) encontrada(s).')).toBeVisible();
  });

  /**
   * @caso CT-E2E-039
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Respeitar o limite por especialidade no agendamento da recepção
   * @resultadoEsperado A segunda consulta de clínica geral da Ana é recusada
   */
  test('recepção respeita o limite por especialidade', async ({ page }) => {
    await entrar(page);
    await agendar(page, { paciente: '1', medico: '1', data: '2026-10-20', hora: '10:00' });
    await expect(page.getByRole('alert')).toHaveText('O paciente já possui uma consulta agendada nesta especialidade.');
  });

  /**
   * @caso CT-E2E-040
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN18
   * @objetivo Respeitar o conflito de horário no agendamento da recepção
   * @resultadoEsperado O agendamento no mesmo horário de outra consulta da Ana é recusado
   */
  test('recepção respeita o conflito do paciente', async ({ page }) => {
    await entrar(page);
    await agendar(page, { paciente: '1', medico: '4', data: '2026-10-19', hora: '10:00' });
    await expect(page.getByRole('alert')).toHaveText('O paciente já possui outra consulta neste horário.');
  });

  /**
   * @caso CT-E2E-041
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar consulta pela recepção
   * @resultadoEsperado A consulta de Lucas passa para o novo horário escolhido
   */
  test('recepção remarca consulta', async ({ page }) => {
    await entrar(page);
    await agendar(page, { paciente: '3', medico: '4', data: '2026-10-21', hora: '07:15' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta agendada' })).toBeVisible();
    await page.locator('#menu-consultas').click();
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: '21/10/2026 07:15' });
    await linha.getByRole('button', { name: 'Remarcar' }).click();
    await page.locator('#remarcar-data').fill('2026-10-21');
    await page.locator('#remarcar-horarios [data-inicio="2026-10-21 07:45"]').click();
    await page.locator('#remarcar-confirmar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta remarcada' })).toBeVisible();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: '21/10/2026 07:45' })).toBeVisible();
  });
});
```
