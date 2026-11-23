// Casos de teste E2E: listagem, filtros e ações da recepção sobre consultas.
// Cobrem CT-E2E-020 a CT-E2E-024. A base de 3 consultas é criada uma única vez,
// antes do primeiro caso, e os casos seguintes compartilham o mesmo banco.

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
  const lucas = await idPaciente(request, token, 'lucas@email.com');
  const carlos = await idMedico(request, 'Carlos');
  const beatriz = await idMedico(request, 'Beatriz');
  const fernanda = await idMedico(request, 'Fernanda');
  await criarConsulta(request, token, { pacienteId: ana, medicoId: carlos, inicio: '2026-10-20 14:00' });
  await criarConsulta(request, token, { pacienteId: joao, medicoId: beatriz, inicio: '2026-10-28 09:00' });
  await criarConsulta(request, token, { pacienteId: lucas, medicoId: fernanda, inicio: '2026-10-21 07:00' });
  basePronta = true;
});

test.describe('Consultas da recepção: listagem, filtros e ações', () => {
  /**
   * @caso CT-E2E-020
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Verificar que a recepção lista todas as consultas da clínica com as colunas de paciente e médico
   * @resultadoEsperado A tabela exibe 3 consultas, o total "3 consulta(s) encontrada(s)." e as colunas Paciente e Médico
   */
  test('listagem da recepção mostra as três consultas com paciente e médico', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');

    const total = page.locator('.descricao').filter({ hasText: 'consulta(s) encontrada(s)' });
    await expect(total).toHaveText('3 consulta(s) encontrada(s).');
    await expect(page.locator('#tabela-consultas tbody tr')).toHaveCount(3);
    await expect(page.locator('#tabela-consultas thead')).toContainText('Paciente');
    await expect(page.locator('#tabela-consultas thead')).toContainText('Médico');
    await expect(page.locator('#tabela-consultas')).toContainText('Ana Pereira');
    await expect(page.locator('#tabela-consultas')).toContainText('João Santos');
    await expect(page.locator('#tabela-consultas')).toContainText('Lucas Oliveira');
  });

  /**
   * @caso CT-E2E-021
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.3
   * @objetivo Verificar o filtro por status: CANCELADA não tem resultados e AGENDADA devolve as três consultas
   * @resultadoEsperado Com CANCELADA aparece "Nenhuma consulta encontrada." e com AGENDADA a tabela volta a ter 3 linhas
   */
  test('filtro por status mostra estado vazio e depois as três consultas', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');

    await page.selectOption('#filtro-status', 'CANCELADA');
    await page.click('#filtro-aplicar');
    await expect(page.locator('#tabela-consultas')).toContainText('Nenhuma consulta encontrada.');

    await page.selectOption('#filtro-status', 'AGENDADA');
    await page.click('#filtro-aplicar');
    await expect(page.locator('#tabela-consultas tbody tr')).toHaveCount(3);
  });

  /**
   * @caso CT-E2E-022
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Verificar o filtro por período (26/10 a 28/10) e o botão Limpar restaurando a listagem
   * @resultadoEsperado O período mantém apenas a consulta de João de 28/10 09:00 e Limpar devolve as 3 consultas
   */
  test('filtro por período reduz para a consulta de João e Limpar restaura as três', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');

    await page.fill('#filtro-inicio', '2026-10-26');
    await page.fill('#filtro-fim', '2026-10-28');
    await page.click('#filtro-aplicar');

    const linhas = page.locator('#tabela-consultas tbody tr');
    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText('João Santos');
    await expect(linhas.first()).toContainText('28/10/2026 09:00');

    await page.getByRole('button', { name: 'Limpar' }).click();
    await expect(linhas).toHaveCount(3);
  });

  /**
   * @caso CT-E2E-023
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Verificar que a recepção confirma a presença de um paciente dentro da janela de 48 horas
   * @resultadoEsperado Aparece o aviso "Presença de Ana Pereira confirmada." e o status da linha vira CONFIRMADA
   */
  test('recepção confirma a presença de Ana', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: 'Ana Pereira' });
    await expect(linha).toHaveCount(1);
    await linha.locator('[data-acao="confirmar"]').click();

    await expect(toast(page, 'Presença de Ana Pereira confirmada.')).toBeVisible();
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'CONFIRMADA');
  });

  /**
   * @caso CT-E2E-024
   * @nivel e2e
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Verificar que a recepção cancela a consulta de outro paciente informando o motivo obrigatório
   * @resultadoEsperado Após informar o motivo aparece o aviso "Consulta cancelada." e o status da linha vira CANCELADA
   */
  test('recepção cancela a consulta de João com motivo', async ({ page }) => {
    await entrar(page, 'recepcao@clinica.com', 'Senha123');
    const linha = page.locator('tr[data-consulta-id]').filter({ hasText: 'João Santos' });
    await expect(linha).toHaveCount(1);
    await linha.locator('[data-acao="cancelar"]').click();

    await page.fill('#texto-campo', 'Paciente não compareceu ao retorno.');
    await page.click('#texto-confirmar');

    await expect(toast(page, 'Consulta cancelada.')).toBeVisible();
    await expect(linha.locator('[data-status]')).toHaveAttribute('data-status', 'CANCELADA');
  });
});
