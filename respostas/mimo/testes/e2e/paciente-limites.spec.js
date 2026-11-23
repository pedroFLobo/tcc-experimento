// Casos de teste E2E: limites de agendamento do paciente (RN16 e RN19).
// Cobrem CT-E2E-011 a CT-E2E-013. Os dados de partida são criados pela API
// antes de cada caso, e os casos seguintes do arquivo reutilizam o que já existe
// no banco (compartilhado dentro do arquivo).

import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

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

async function preencherAgendamento(page, { especialidade, medico, data }) {
  await page.selectOption('#agendar-especialidade', await valorOpcao(page, '#agendar-especialidade', especialidade));
  await page.selectOption('#agendar-medico', await valorOpcao(page, '#agendar-medico', medico));
  await page.fill('#agendar-data', data);
}

async function tokenRecepcao(request) {
  const resposta = await request.post(`${API}/auth/login`, {
    data: { email: 'recepcao@clinica.com', senha: 'Senha123' },
  });
  expect(resposta.status()).toBe(200);
  const dados = await resposta.json();
  return dados.token;
}

async function idPaciente(request, token, email) {
  const resposta = await request.get(`${API}/pacientes?busca=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resposta.ok()).toBe(true);
  const lista = await resposta.json();
  const paciente = lista.find((p) => p.email === email);
  expect(paciente).toBeTruthy();
  return paciente.id;
}

async function idMedico(request, nome) {
  const resposta = await request.get(`${API}/medicos`);
  expect(resposta.ok()).toBe(true);
  const lista = await resposta.json();
  const medico = lista.find((m) => m.nome.includes(nome));
  expect(medico).toBeTruthy();
  return medico.id;
}

async function criarConsulta(request, token, dados) {
  const resposta = await request.post(`${API}/consultas`, {
    headers: { Authorization: `Bearer ${token}` },
    data: dados,
  });
  expect(resposta.status()).toBe(201);
}

test.describe('Limites de agendamento do paciente', () => {
  /**
   * @caso CT-E2E-011
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN19
   * @objetivo Verificar que o paciente com consulta ativa em uma especialidade não consegue agendar outra na mesma especialidade
   * @resultadoEsperado A tentativa é recusada com a mensagem "O paciente já possui uma consulta agendada nesta especialidade."
   */
  test('segunda consulta na mesma especialidade é recusada', async ({ page, request }) => {
    const token = await tokenRecepcao(request);
    const pacienteId = await idPaciente(request, token, 'ana@email.com');
    const medicoId = await idMedico(request, 'Carlos');
    await criarConsulta(request, token, { pacienteId, medicoId, inicio: '2026-10-20 14:00' });

    await entrar(page, 'ana@email.com', 'Senha123');
    await page.goto('/paciente/agendar');
    await preencherAgendamento(page, { especialidade: 'Clínica Geral', medico: 'Carlos', data: '2026-10-21' });
    await page.click('#agendar-horarios button[data-inicio="2026-10-21 08:00"]');
    await page.click('#agendar-confirmar');

    await expect(page.locator('#agendar-mensagem')).toContainText(
      'O paciente já possui uma consulta agendada nesta especialidade.',
    );
  });

  /**
   * @caso CT-E2E-012
   * @nivel e2e
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN19
   * @objetivo Verificar que a quarta consulta ativa é recusada sem quebrar o fluxo de agendamento
   * @resultadoEsperado Com 3 consultas ativas, a tentativa exibe "O paciente já possui 3 consultas agendadas, que é o limite." e a página segue utilizável
   */
  test('quarta consulta ativa é recusada pelo limite de três', async ({ page, request }) => {
    const token = await tokenRecepcao(request);
    const pacienteId = await idPaciente(request, token, 'ana@email.com');
    const beatrizId = await idMedico(request, 'Beatriz');
    const fernandaId = await idMedico(request, 'Fernanda');
    // Ana já tem a consulta de 20/10 criada no caso anterior; estas duas completam as 3 ativas.
    await criarConsulta(request, token, { pacienteId, medicoId: beatrizId, inicio: '2026-10-21 09:00' });
    await criarConsulta(request, token, { pacienteId, medicoId: fernandaId, inicio: '2026-10-22 07:00' });

    await entrar(page, 'ana@email.com', 'Senha123');
    await page.goto('/paciente/agendar');
    await preencherAgendamento(page, { especialidade: 'Dermatologia', medico: 'Eduardo', data: '2026-10-27' });
    await page.click('#agendar-horarios button[data-inicio="2026-10-27 13:00"]');
    await page.click('#agendar-confirmar');

    await expect(page.locator('#agendar-mensagem')).toContainText(
      'O paciente já possui 3 consultas agendadas, que é o limite.',
    );
  });

  /**
   * @caso CT-E2E-013
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16, RF07.1
   * @objetivo Verificar que datas além de 60 dias de antecedência não oferecem horários e que datas próximas voltam a oferecer
   * @resultadoEsperado A data 25/12 mostra o aviso de nenhum horário livre e a data 26/10 mostra o horário 08:00
   */
  test('data além de 60 dias não oferece horários e data próxima volta a oferecer', async ({ page }) => {
    await entrar(page, 'ana@email.com', 'Senha123');
    await page.goto('/paciente/agendar');

    await preencherAgendamento(page, { especialidade: 'Clínica Geral', medico: 'Carlos', data: '2026-12-25' });
    await expect(page.locator('#agendar-horarios')).toContainText('Nenhum horário livre nesta data. Tente outro dia.');

    await page.fill('#agendar-data', '2026-10-26');
    await expect(page.locator('#agendar-horarios button[data-inicio="2026-10-26 08:00"]')).toHaveCount(1);
  });
});
