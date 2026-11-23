// API: relatórios e administração de contas (RF11, RF10.3).
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

let db;
let app;
let dados;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  dados = semear(db);
  app = criarApp({ db });
});

afterEach(() => {
  db.close();
  clock.definirAgora(null);
});

async function token(email = 'recepcao@clinica.com') {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
  return resposta.body.token;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('GET /api/admin/relatorios/resumo', () => {
  /**
   * @caso CT-API-124
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF11.1
   * @objetivo Entregar o resumo com status, faltas e faturamento
   * @resultadoEsperado A resposta é 200 com periodo, porStatus, faltasPorMedico e faturamentoCentavos
   */
  test('resumo traz as seções esperadas', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/admin/relatorios/resumo?dataInicio=2026-10-19&dataFim=2026-10-25').set(auth(t));
    expect(resposta.status).toBe(200);
    expect(Object.keys(resposta.body).sort()).toEqual(['faltasPorMedico', 'faturamentoCentavos', 'periodo', 'porStatus']);
    expect(resposta.body.periodo).toEqual({ dataInicio: '2026-10-19', dataFim: '2026-10-25' });
  });

  /**
   * @caso CT-API-125
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Contar consultas canceladas no resumo
   * @resultadoEsperado O porStatus.CANCELADA vale 1 depois de um cancelamento
   */
  test('resumo reflete cancelamento', async () => {
    const t = await token();
    const criada = await request(app)
      .post('/api/consultas')
      .set(auth(t))
      .send({ pacienteId: dados.pacientes[0].id, medicoId: dados.medicos[0].id, inicio: '2026-10-20 09:00' });
    await request(app).post(`/api/consultas/${criada.body.id}/cancelar`).set(auth(t)).send({ motivo: 'Teste' });
    const resposta = await request(app).get('/api/admin/relatorios/resumo?dataInicio=2026-10-20&dataFim=2026-10-20').set(auth(t));
    expect(resposta.body.porStatus.CANCELADA).toBe(1);
  });

  /**
   * @caso CT-API-126
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF11.1
   * @objetivo Exigir o período no relatório
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('período ausente devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/admin/relatorios/resumo').set(auth(t));
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Informe dataInicio e dataFim no formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-API-127
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar período invertido no relatório
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('período invertido devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/admin/relatorios/resumo?dataInicio=2026-10-25&dataFim=2026-10-19').set(auth(t));
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('dataFim não pode ser anterior a dataInicio.');
  });

  /**
   * @caso CT-API-128
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF11.1
   * @objetivo Entregar o relatório em JSON
   * @resultadoEsperado O content-type é application/json
   */
  test('relatório é JSON', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/admin/relatorios/resumo?dataInicio=2026-10-19&dataFim=2026-10-19').set(auth(t));
    expect(resposta.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('PATCH /api/admin/usuarios/:id/ativo', () => {
  /**
   * @caso CT-API-129
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN21
   * @objetivo Desativar a conta de um paciente
   * @resultadoEsperado A resposta é 200 com ativo false e o login passa a devolver 403
   */
  test('recepção desativa conta', async () => {
    const t = await token();
    const usuarioId = dados.pacientes[2].usuarioId;
    const resposta = await request(app).patch(`/api/admin/usuarios/${usuarioId}/ativo`).set(auth(t)).send({ ativo: false });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id: usuarioId, ativo: false });
    const login = await request(app).post('/api/auth/login').send({ email: 'lucas@email.com', senha: 'Senha123' });
    expect(login.status).toBe(403);
  });

  /**
   * @caso CT-API-130
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN21
   * @objetivo Reativar a conta e permitir login
   * @resultadoEsperado Depois do PATCH com ativo true o login volta a devolver 200
   */
  test('recepção reativa conta', async () => {
    const t = await token();
    const usuarioId = dados.pacientes[2].usuarioId;
    await request(app).patch(`/api/admin/usuarios/${usuarioId}/ativo`).set(auth(t)).send({ ativo: false });
    await request(app).patch(`/api/admin/usuarios/${usuarioId}/ativo`).set(auth(t)).send({ ativo: true });
    expect((await request(app).post('/api/auth/login').send({ email: 'lucas@email.com', senha: 'Senha123' })).status).toBe(200);
  });

  /**
   * @caso CT-API-131
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF04
   * @objetivo Exigir booleano no campo ativo
   * @resultadoEsperado A resposta é 400 com a mensagem do campo
   */
  test('ativo não booleano devolve 400', async () => {
    const t = await token();
    const resposta = await request(app)
      .patch(`/api/admin/usuarios/${dados.pacientes[2].usuarioId}/ativo`)
      .set(auth(t))
      .send({ ativo: 'sim' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Informe "ativo" como true ou false.');
  });

  /**
   * @caso CT-API-132
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver 404 para usuário inexistente
   * @resultadoEsperado A resposta é 404 NAO_ENCONTRADO
   */
  test('usuário inexistente devolve 404', async () => {
    const t = await token();
    const resposta = await request(app).patch('/api/admin/usuarios/9999/ativo').set(auth(t)).send({ ativo: false });
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.mensagem).toBe('Usuário não encontrado.');
  });

  /**
   * @caso CT-API-133
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que o próprio paciente desative contas
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('paciente não altera contas', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app)
      .patch(`/api/admin/usuarios/${dados.pacientes[1].usuarioId}/ativo`)
      .set(auth(t))
      .send({ ativo: false });
    expect(resposta.status).toBe(403);
  });
});
