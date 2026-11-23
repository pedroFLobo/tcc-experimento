import { test, expect } from '@playwright/test';

const SENHA = 'Senha123';

async function entrar(page, email) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(SENHA);
  await page.locator('#login-entrar').click();
  await expect(page).toHaveURL(/\/paciente$/);
}

async function agendar(page, { especialidade, medico, data, hora }) {
  await page.locator('#menu-agendar').click();
  await expect(page).toHaveURL(/\/paciente\/agendar$/);
  await page.locator('#agendar-especialidade').selectOption(especialidade);
  await page.locator('#agendar-medico').selectOption(medico);
  await page.locator('#agendar-data').fill(data);
  await page.locator(`#agendar-horarios [data-inicio="${data} ${hora}"]`).click();
  await page.locator('#agendar-confirmar').click();
}

test.describe('Jornada do paciente', () => {
  /**
   * @caso CT-E2E-015
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF08.2
   * @objetivo Agendar uma consulta escolhendo especialidade, médico, data e horário
   * @resultadoEsperado A consulta aparece no histórico com status Agendada e valor R$ 150,00
   */
  test('paciente agenda consulta de clínica geral', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    await agendar(page, { especialidade: '1', medico: '1', data: '2026-10-19', hora: '10:00' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta agendada' })).toBeVisible();
    await page.locator('#menu-consultas').click();
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'Dr. Carlos Almeida' });
    await expect(linha).toContainText('19/10/2026 10:00');
    await expect(linha.locator('[data-status="AGENDADA"]')).toBeVisible();
    await expect(linha).toContainText('R$ 150,00');
  });

  /**
   * @caso CT-E2E-016
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF07.1, RN16
   * @objetivo Consultar os horários livres de um médico em uma data
   * @resultadoEsperado Horários com menos de 2 horas de antecedência não são oferecidos
   */
  test('lista de horários respeita a antecedência mínima', async ({ page }) => {
    await entrar(page, 'joao@email.com');
    await page.locator('#menu-agendar').click();
    await page.locator('#agendar-especialidade').selectOption('4');
    await page.locator('#agendar-medico').selectOption('4');
    await page.locator('#agendar-data').fill('2026-10-19');
    await expect(page.locator('#agendar-horarios [data-inicio="2026-10-19 10:00"]')).toBeVisible();
    await expect(page.locator('#agendar-horarios [data-inicio="2026-10-19 07:00"]')).toHaveCount(0);
    await expect(page.locator('#agendar-horarios [data-inicio="2026-10-19 09:45"]')).toHaveCount(0);
  });

  /**
   * @caso CT-E2E-017
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença em uma consulta agendada
   * @resultadoEsperado A consulta passa para Confirmada e o toast de sucesso é exibido
   */
  test('paciente confirma presença', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'Dr. Carlos Almeida' });
    await linha.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Presença confirmada' })).toBeVisible();
    await expect(linha.locator('[data-status="CONFIRMADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-018
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23, RF08.2
   * @objetivo Agendar para paciente idoso com desconto de 10%
   * @resultadoEsperado O valor gravado é R$ 135,00
   */
  test('paciente idoso recebe desconto no valor', async ({ page }) => {
    await entrar(page, 'joao@email.com');
    await agendar(page, { especialidade: '1', medico: '1', data: '2026-10-20', hora: '10:00' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'R$ 135,00' })).toBeVisible();
    await page.locator('#menu-consultas').click();
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'Dr. Carlos Almeida' });
    await expect(linha).toContainText('R$ 135,00');
  });

  /**
   * @caso CT-E2E-019
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF09.2, RN26
   * @objetivo Cancelar uma consulta pelo diálogo de confirmação
   * @resultadoEsperado Manter consulta não altera nada e confirmar muda o status para Cancelada
   */
  test('paciente cancela consulta com confirmação', async ({ page }) => {
    await entrar(page, 'lucas@email.com');
    await agendar(page, { especialidade: '4', medico: '4', data: '2026-10-21', hora: '07:00' });
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta agendada' })).toBeVisible();
    await page.locator('#menu-consultas').click();
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: 'Dra. Fernanda Rocha' });
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toContainText('Cancelar consulta?');
    await page.locator('#cancelar-voltar').click();
    await expect(linha.locator('[data-status="AGENDADA"]')).toBeVisible();
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('#cancelar-confirmar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Sua consulta foi cancelada' })).toBeVisible();
    await expect(linha.locator('[data-status="CANCELADA"]')).toBeVisible();
  });

  /**
   * @caso CT-E2E-020
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar uma consulta para outro horário com o mesmo médico
   * @resultadoEsperado O histórico passa a exibir a nova data e o toast de remarcação
   */
  test('paciente remarca consulta', async ({ page }) => {
    await entrar(page, 'joao@email.com');
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: '20/10/2026 10:00' });
    await linha.getByRole('button', { name: 'Remarcar' }).click();
    await expect(page.getByRole('dialog')).toContainText('Remarcar consulta');
    await page.locator('#remarcar-data').fill('2026-10-20');
    await page.locator('#remarcar-horarios [data-inicio="2026-10-20 10:30"]').click();
    await page.locator('#remarcar-confirmar').click();
    await expect(page.locator('.toast[data-tipo="sucesso"]', { hasText: 'Consulta remarcada' })).toBeVisible();
    await expect(page.locator('#tabela-consultas tbody tr', { hasText: '20/10/2026 10:30' })).toBeVisible();
  });

  /**
   * @caso CT-E2E-021
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Impedir duas consultas ativas na mesma especialidade
   * @resultadoEsperado O servidor recusa e mostra a mensagem do limite por especialidade
   */
  test('limite de uma consulta ativa por especialidade', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    await agendar(page, { especialidade: '1', medico: '1', data: '2026-10-19', hora: '10:30' });
    await expect(page.getByRole('alert')).toHaveText('O paciente já possui uma consulta agendada nesta especialidade.');
  });

  /**
   * @caso CT-E2E-022
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN18
   * @objetivo Impedir que o paciente tenha duas consultas no mesmo horário
   * @resultadoEsperado O servidor recusa com a mensagem de conflito de horário
   */
  test('paciente não pode ter consultas sobrepostas', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    await agendar(page, { especialidade: '4', medico: '4', data: '2026-10-19', hora: '10:00' });
    await expect(page.getByRole('alert')).toHaveText('O paciente já possui outra consulta neste horário.');
  });

  /**
   * @caso CT-E2E-023
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN16
   * @objetivo Consultar data acima do limite de 60 dias
   * @resultadoEsperado Nenhum horário é oferecido e o botão de confirmar fica desabilitado
   */
  test('agendamento acima de 60 dias não oferece horários', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    await page.locator('#menu-agendar').click();
    await page.locator('#agendar-especialidade').selectOption('1');
    await page.locator('#agendar-medico').selectOption('1');
    await page.locator('#agendar-data').fill('2026-12-21');
    await expect(page.locator('#agendar-horarios')).toContainText('Nenhum horário livre nesta data.');
    await expect(page.locator('#agendar-confirmar')).toBeDisabled();
  });

  /**
   * @caso CT-E2E-024
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RF08.1, RNF06
   * @objetivo Verificar o bloqueio do botão de confirmação antes da escolha do horário
   * @resultadoEsperado Confirmar só habilita depois de selecionar um horário livre
   */
  test('confirmar só habilita após escolher horário', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    await page.locator('#menu-agendar').click();
    await page.locator('#agendar-especialidade').selectOption('1');
    await page.locator('#agendar-medico').selectOption('1');
    await page.locator('#agendar-data').fill('2026-10-19');
    await expect(page.locator('#agendar-confirmar')).toBeDisabled();
    await page.locator('#agendar-horarios [data-inicio="2026-10-19 14:00"]').click();
    await expect(page.locator('#agendar-confirmar')).toBeEnabled();
  });

  /**
   * @caso CT-E2E-025
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo apreensibilidade
   * @requisito RF10.1
   * @objetivo Exibir estado vazio para paciente recém-cadastrado
   * @resultadoEsperado O histórico orienta a agendar a primeira consulta
   */
  test('paciente novo vê histórico vazio', async ({ page }) => {
    await page.goto('/cadastro');
    await page.locator('#cadastro-nome').fill('Sem Consultas E2E');
    await page.locator('#cadastro-email').fill('e2e.sem.consultas@email.com');
    await page.locator('#cadastro-senha').fill('Senha123');
    await page.locator('#cadastro-cpf').fill('987.654.321-00');
    await page.locator('#cadastro-nascimento').fill('1992-01-15');
    await page.locator('#cadastro-enviar').click();
    await expect(page).toHaveURL(/\/paciente$/);
    await expect(page.locator('#tabela-consultas')).toContainText('Você ainda não tem consultas.');
  });

  /**
   * @caso CT-E2E-026
   * @nivel e2e
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN26
   * @objetivo Tentar cancelar consulta com menos de 24 horas de antecedência
   * @resultadoEsperado O cancelamento é recusado e a consulta continua confirmada
   */
  test('paciente não cancela com menos de 24 horas', async ({ page }) => {
    await entrar(page, 'ana@email.com');
    const linha = page.locator('#tabela-consultas tbody tr', { hasText: '19/10/2026 10:00' });
    await linha.getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('#cancelar-confirmar').click();
    await expect(page.getByRole('alert')).toHaveText('O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.');
    await expect(linha.locator('[data-status="CONFIRMADA"]')).toBeVisible();
  });
});
