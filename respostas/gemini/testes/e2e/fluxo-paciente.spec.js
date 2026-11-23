import { test, expect } from '@playwright/test';

test.describe('E2E: Fluxo do Paciente', () => {
  test.beforeEach(async ({ page }) => {
    // Login inicial como paciente Ana Pereira
    await page.goto('/login');
    await page.fill('#login-email', 'ana@email.com');
    await page.fill('#login-senha', 'Senha123');
    await page.click('#login-entrar');
    await expect(page).toHaveURL(/\/paciente/);
  });

  /**
   * @caso CT-E2E-005
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF07.1, RN16
   * @objetivo Agendar consulta selecionando especialidade, médico, data e horário livre
   * @resultadoEsperado Sucesso exibido e consulta agendada com valor registrado
   */
  test('deve agendar nova consulta com sucesso', async ({ page }) => {
    await page.click('a[href="/paciente/agendar"]');
    await expect(page).toHaveURL(/\/paciente\/agendar/);

    // Passo 1: Especialidade
    await page.selectOption('#agendar-especialidade', { label: /Clínica Geral/i });

    // Passo 2: Médico
    await page.selectOption('#agendar-medico', { label: /Dr\. Carlos Almeida/i });

    // Passo 3: Data (quarta-feira 2026-10-21)
    await page.fill('#agendar-data', '2026-10-21');

    // Passo 4: Horário
    const botaoHorario = page.locator('#agendar-horarios button').first();
    await expect(botaoHorario).toBeVisible();
    await botaoHorario.click();

    // Confirmar
    await expect(page.locator('#agendar-confirmar')).toBeEnabled();
    await page.click('#agendar-confirmar');

    await expect(page.locator('#agendar-mensagem [role="status"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-006
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1
   * @objetivo Visualizar consulta recém-agendada na listagem de consultas do paciente
   * @resultadoEsperado Tabela exibe a linha com o nome do médico e status Agendada
   */
  test('deve exibir consulta na tabela de histórico', async ({ page }) => {
    // Agenda primeiro uma consulta para 2026-10-22
    await page.goto('/paciente/agendar');
    await page.selectOption('#agendar-especialidade', { label: /Clínica Geral/i });
    await page.selectOption('#agendar-medico', { label: /Dr\. Carlos Almeida/i });
    await page.fill('#agendar-data', '2026-10-22');
    await page.locator('#agendar-horarios button').first().click();
    await page.click('#agendar-confirmar');

    // Volta para histórico
    await page.goto('/paciente');
    const tabela = page.locator('#tabela-consultas');
    await expect(tabela).toBeVisible();
    await expect(tabela.locator('tbody tr')).toHaveCount(expect.toBeGreaterThan(0));
    await expect(tabela).toContainText('Dr. Carlos Almeida');
    await expect(tabela).toContainText('Agendada');
  });

  /**
   * @caso CT-E2E-007
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença em consulta agendada dentro do prazo
   * @resultadoEsperado Status da consulta muda para Confirmada na interface
   */
  test('deve confirmar presença em consulta agendada', async ({ page }) => {
    // Agenda para data dentro de 48h (2026-10-20)
    await page.goto('/paciente/agendar');
    await page.selectOption('#agendar-especialidade', { label: /Clínica Geral/i });
    await page.selectOption('#agendar-medico', { label: /Dr\. Carlos Almeida/i });
    await page.fill('#agendar-data', '2026-10-20');
    await page.locator('#agendar-horarios button').first().click();
    await page.click('#agendar-confirmar');

    await page.goto('/paciente');
    const botaoConfirmar = page.locator('button[data-acao="confirmar"]').first();
    await expect(botaoConfirmar).toBeVisible();
    await botaoConfirmar.click();

    await expect(page.locator('#tabela-consultas')).toContainText('Confirmada');
  });

  /**
   * @caso CT-E2E-008
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09.2, RN26
   * @objetivo Cancelar consulta via diálogo de confirmação #cancelar-confirmar
   * @resultadoEsperado Diálogo modal abre, ao confirmar a consulta passa para Cancelada
   */
  test('deve cancelar consulta usando o diálogo modal de confirmação', async ({ page }) => {
    // Agenda para mais de 24h à frente (2026-10-23)
    await page.goto('/paciente/agendar');
    await page.selectOption('#agendar-especialidade', { label: /Clínica Geral/i });
    await page.selectOption('#agendar-medico', { label: /Dr\. Carlos Almeida/i });
    await page.fill('#agendar-data', '2026-10-23');
    await page.locator('#agendar-horarios button').first().click();
    await page.click('#agendar-confirmar');

    await page.goto('/paciente');
    const botaoCancelar = page.locator('button[data-acao="cancelar"]').first();
    await expect(botaoCancelar).toBeVisible();
    await botaoCancelar.click();

    // Diálogo modal
    const botaoConfirmarCancelamento = page.locator('#cancelar-confirmar');
    await expect(botaoConfirmarCancelamento).toBeVisible();
    await botaoConfirmarCancelamento.click();

    await expect(page.locator('#consultas-mensagem [role="status"]')).toContainText('Sua consulta foi cancelada');
  });
});
