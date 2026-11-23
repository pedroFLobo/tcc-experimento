import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

async function entrar(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('recepcao@clinica.com');
  await page.locator('#login-senha').fill(SENHA);
  await page.locator('#login-entrar').click();
  await expect(page).toHaveURL(/\/recepcao$/);
}

async function gerarRelatorio(page, inicio, fim) {
  await page.locator('#menu-relatorio').click();
  if (inicio) await page.locator('#relatorio-inicio').fill(inicio);
  if (fim) await page.locator('#relatorio-fim').fill(fim);
  await page.locator('#relatorio-gerar').click();
}

test.describe('Relatório da recepção', () => {
  /**
   * @caso CT-E2E-073
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo apreensibilidade
   * @requisito RF11.1
   * @objetivo Abrir o relatório antes de escolher o período
   * @resultadoEsperado A tela orienta a escolher um período
   */
  test('relatório começa com orientação de período', async ({ page }) => {
    await entrar(page);
    await page.locator('#menu-relatorio').click();
    await expect(page.getByText('Escolha um período para ver os indicadores.')).toBeVisible();
    await expect(page.locator('#relatorio-gerar')).toHaveText('Gerar relatório');
  });

  /**
   * @caso CT-E2E-074
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Gerar relatório de um período sem consultas
   * @resultadoEsperado Total zerado, faturamento R$ 0,00 e lista de faltas vazia
   */
  test('relatório de período vazio mostra zeros', async ({ page }) => {
    await entrar(page);
    await gerarRelatorio(page, '2026-10-19', '2026-10-19');
    await expect(page.locator('#relatorio-status .indicador.destaque strong')).toHaveText('0');
    await expect(page.locator('#relatorio-faturamento')).toHaveText('R$ 0,00');
    await expect(page.locator('#relatorio-faltas')).toContainText('Sem consultas no período.');
  });

  /**
   * @caso CT-E2E-075
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Contar uma consulta agendada no período
   * @resultadoEsperado O total é 1 e o indicador Agendada mostra 1
   */
  test('relatório conta consulta agendada', async ({ page }) => {
    await entrar(page);
    await page.locator('#menu-agendar').click();
    await page.locator('#agendar-paciente').selectOption('1');
    await page.locator('#agendar-medico').selectOption('1');
    await page.locator('#agendar-data').fill('2026-10-19');
    await page.locator('#agendar-horarios [data-inicio="2026-10-19 10:00"]').click();
    await page.locator('#agendar-confirmar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta agendada' })).toBeVisible();
    await gerarRelatorio(page, '2026-10-19', '2026-10-19');
    await expect(page.locator('#relatorio-status .indicador.destaque strong')).toHaveText('1');
    await expect(page.locator('#relatorio-status .indicador', { hasText: 'Agendada' }).locator('strong')).toHaveText('1');
  });

  /**
   * @caso CT-E2E-076
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Conferir o faturamento quando só há consulta agendada
   * @resultadoEsperado O faturamento permanece R$ 0,00 porque só realizadas somam
   */
  test('faturamento ignora consultas não realizadas', async ({ page }) => {
    await entrar(page);
    await gerarRelatorio(page, '2026-10-19', '2026-10-19');
    await expect(page.locator('#relatorio-status .indicador.destaque strong')).toHaveText('1');
    await expect(page.locator('#relatorio-faturamento')).toHaveText('R$ 0,00');
  });

  /**
   * @caso CT-E2E-077
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF11.1, RNF04
   * @objetivo Gerar relatório com data final anterior à inicial
   * @resultadoEsperado O sistema recusa e explica o período inválido
   */
  test('relatório recusa período invertido', async ({ page }) => {
    await entrar(page);
    await gerarRelatorio(page, '2026-10-21', '2026-10-19');
    await expect(page.getByRole('alert')).toHaveText('dataFim não pode ser anterior a dataInicio.');
    await expect(page.locator('#relatorio-resultado')).toHaveCount(0);
  });

  /**
   * @caso CT-E2E-078
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF11.1
   * @objetivo Gerar relatório sem informar as datas
   * @resultadoEsperado O sistema pede dataInicio e dataFim no formato correto
   */
  test('relatório exige as duas datas', async ({ page }) => {
    await entrar(page);
    await gerarRelatorio(page, null, null);
    await expect(page.getByRole('alert')).toHaveText('Informe dataInicio e dataFim no formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-E2E-079
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Gerar relatório de período que não inclui a consulta existente
   * @resultadoEsperado O total é zero e não há faltas no período
   */
  test('relatório limita ao período consultado', async ({ page }) => {
    await entrar(page);
    await gerarRelatorio(page, '2026-10-21', '2026-10-22');
    await expect(page.locator('#relatorio-status .indicador.destaque strong')).toHaveText('0');
    await expect(page.locator('#relatorio-faltas')).toContainText('Sem consultas no período.');
  });
});
