// Casos de teste E2E: agenda do médico (visão restrita, filtros, atendimento e
// cancelamento). Cobrem CT-E2E-028 a CT-E2E-031. A base de 2 consultas é criada
// uma única vez, antes do primeiro caso, e os casos seguintes compartilham o
// mesmo banco.

import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

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

let basePronta = false;

test.beforeEach(async ({ request }) => {
  if (basePronta) return;
  const token = await tokenRecepcao(request);
  const ana = await idPaciente(request, token, 'ana@email.com');
  const joao = await idPaciente(request, token, 'joao@email.com');
  const carlos = await idMedico(request, 'Carlos');
  const eduardo = await idMedico(request, 'Eduardo');
  // 20/10 é terça: Carlos atende de manhã e à tarde; Eduardo atende à tarde (13–19).
  await criarConsulta(request, token, { pacienteId: ana, medicoId: carlos, inicio: '2026-10-20 14:00' });
  await criarConsulta(request, token, { pacienteId: joao, medicoId: eduardo, inicio: '2026-10-20 13:00' });
  basePronta = true;
});

// Abre a agenda do Carlos já no dia 20/10, com as duas consultas da base.
async function abrirAgendaDoDia(page) {
  await entrar(page, 'carlos@clinica.com', 'Senha123');
  await page.fill('#agenda-data', '2026-10-20');
}

test.describe('Agenda do médico', () => {
  /**
   * @caso CT-E2E-028
   * @nivel e2e
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.2, RN30
   * @objetivo Verificar que o médico Carlos vê na data 20/10 apenas as consultas da própria agenda
   * @resultadoEsperado A tabela de agenda tem 1 linha, a de Ana Pereira, e não menciona João Santos
   */
  test('agenda de Carlos no dia 20/10 mostra apenas a própria consulta', async ({ page }) => {
    await abrirAgendaDoDia(page);

    const linhas = page.locator('#tabela-agenda tbody tr');
    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText('Ana Pereira');
    await expect(page.locator('#tabela-agenda')).not.toContainText('João Santos');
  });

  /**
   * @caso CT-E2E-029
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.3
   * @objetivo Verificar o filtro de status da agenda do dia: CANCELADA não tem resultados
   * @resultadoEsperado Com o status CANCELADA a tabela exibe "Nenhuma consulta para os filtros escolhidos."
   */
  test('filtro de status CANCELADA na agenda exibe estado vazio', async ({ page }) => {
    await abrirAgendaDoDia(page);
    await expect(page.locator('#tabela-agenda tbody tr')).toHaveCount(1);

    await page.selectOption('#agenda-status', 'CANCELADA');
    await expect(page.locator('#tabela-agenda')).toContainText('Nenhuma consulta para os filtros escolhidos.');
  });

  /**
   * @caso CT-E2E-030
   * @nivel e2e
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF09.4, RN28
   * @objetivo Verificar a tentativa de registrar atendimento antes do horário da consulta
   * @resultadoEsperado O alerta "O atendimento só pode ser registrado a partir do horário da consulta." aparece e o status permanece AGENDADA
   */
  test('registrar atendimento antes do horário é recusado e mantém AGENDADA', async ({ page }) => {
    await abrirAgendaDoDia(page);
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: 'Ana Pereira' });
    await expect(linha).toHaveCount(1);
    await linha.locator('[data-acao="realizar"]').click();

    await page.fill('#texto-campo', 'Paciente atendido.');
    await page.click('#texto-confirmar');

    await expect(page.locator('#agenda-mensagem')).toContainText(
      'O atendimento só pode ser registrado a partir do horário da consulta.',
    );
    await expect(page.locator('#texto-campo')).toHaveCount(0);
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'AGENDADA');
  });

  /**
   * @caso CT-E2E-031
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Verificar que o médico cancela consulta da própria agenda informando o motivo
   * @resultadoEsperado Aparece o aviso "Consulta cancelada." e o status da linha vira CANCELADA
   */
  test('médico cancela consulta com motivo e ela fica cancelada', async ({ page }) => {
    await abrirAgendaDoDia(page);
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: 'Ana Pereira' });
    await expect(linha).toHaveCount(1);
    await linha.locator('[data-acao="cancelar"]').click();

    await page.fill('#texto-campo', 'Consulta desmarcada pela clínica.');
    await page.click('#texto-confirmar');

    await expect(toast(page, 'Consulta cancelada.')).toBeVisible();
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'CANCELADA');
  });
});
