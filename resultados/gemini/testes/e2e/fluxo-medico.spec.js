import { test, expect } from '@playwright/test';

test.describe('E2E: Fluxo do Médico', () => {
  test.beforeEach(async ({ page }) => {
    // Login inicial como Dr. Carlos Almeida
    await page.goto('/login');
    await page.fill('#login-email', 'carlos@clinica.com');
    await page.fill('#login-senha', 'Senha123');
    await page.click('#login-entrar');
    await expect(page).toHaveURL(/\/medico/);
  });

  /**
   * @caso CT-E2E-009
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.2
   * @objetivo Visualizar a agenda do médico na tela inicial /medico
   * @resultadoEsperado Tabela de atendimentos visível com filtro de data
   */
  test('deve exibir a tela de agenda de atendimentos do médico', async ({ page }) => {
    await expect(page).toHaveURL(/\/medico/);
    await expect(page.locator('#agenda-data')).toBeVisible();
    await expect(page.locator('#tabela-agenda')).toBeVisible();
  });

  /**
   * @caso CT-E2E-010
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1, RF05.2
   * @objetivo Visualizar e salvar a grade semanal de atendimento
   * @resultadoEsperado Salvar grade com sucesso exibindo mensagem de confirmação
   */
  test('deve acessar a tela de grade e salvar alterações', async ({ page }) => {
    await page.click('#menu-grade');
    await expect(page).toHaveURL(/\/medico\/grade/);

    const tabelaGrade = page.locator('#tabela-grade');
    await expect(tabelaGrade).toBeVisible();

    const botaoSalvar = page.locator('#grade-salvar');
    await expect(botaoSalvar).toBeVisible();
    await botaoSalvar.click();

    await expect(page.locator('.mensagem[role="status"]')).toContainText(/Grade salva/i);
  });

  /**
   * @caso CT-E2E-011
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1, RN12
   * @objetivo Criar novo período de bloqueio na agenda médica
   * @resultadoEsperado Bloqueio inserido com sucesso e visível em #tabela-bloqueios
   */
  test('deve criar um bloqueio de período futuro na agenda', async ({ page }) => {
    await page.click('#menu-bloqueios');
    await expect(page).toHaveURL(/\/medico\/bloqueios/);

    await page.fill('#bloqueio-inicio', '2026-11-20');
    await page.fill('#bloqueio-fim', '2026-11-25');
    await page.fill('#bloqueio-motivo', 'Congresso de Medicina');
    await page.click('#bloqueio-criar');

    await expect(page.locator('#bloqueio-mensagem [role="status"]')).toContainText(/Agenda bloqueada/i);

    const tabela = page.locator('#tabela-bloqueios');
    await expect(tabela).toContainText('Congresso de Medicina');
  });

  /**
   * @caso CT-E2E-012
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN12, RNF06
   * @objetivo Exibir erro ao tentar bloquear período no passado
   * @resultadoEsperado Alerta com mensagem informando que bloqueio não pode começar no passado
   */
  test('deve exibir erro ao tentar criar bloqueio no passado', async ({ page }) => {
    await page.click('#menu-bloqueios');
    await expect(page).toHaveURL(/\/medico\/bloqueios/);

    await page.fill('#bloqueio-inicio', '2026-10-10'); // passado em relação a 2026-10-19
    await page.fill('#bloqueio-fim', '2026-10-15');
    await page.fill('#bloqueio-motivo', 'Folga passada');
    await page.click('#bloqueio-criar');

    const alerta = page.locator('#bloqueio-mensagem [role="alert"]');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText(/não pode começar no passado/i);
  });
});
