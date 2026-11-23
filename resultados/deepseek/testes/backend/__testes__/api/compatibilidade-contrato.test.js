// API: contrato JSON consumido pelo frontend (RNF08, RNF04).
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

const DATA_HORA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const STATUS = ['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA'];

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

async function criarConsulta(t) {
  const resposta = await request(app)
    .post('/api/consultas')
    .set(auth(t))
    .send({ pacienteId: dados.pacientes[0].id, medicoId: dados.medicos[0].id, inicio: '2026-10-20 09:00' });
  return resposta.body;
}

describe('contrato com o frontend', () => {
  /**
   * @caso CT-API-153
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar todos os campos de consulta usados pela interface
   * @resultadoEsperado O JSON traz id, nomes, especialidade, horários, status e valor
   */
  test('consulta traz os campos da interface', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    expect(consulta).toMatchObject({
      id: expect.any(Number),
      pacienteId: dados.pacientes[0].id,
      pacienteNome: 'Ana Pereira',
      medicoId: dados.medicos[0].id,
      medicoNome: 'Dr. Carlos Almeida',
      especialidadeId: dados.medicos[0].especialidadeId,
      especialidadeNome: 'Clínica Geral',
      inicio: expect.any(String),
      fim: expect.any(String),
      status: 'AGENDADA',
      valorCentavos: expect.any(Number),
      remarcacoes: 0,
    });
  });

  /**
   * @caso CT-API-154
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar todos os campos de paciente usados pela interface
   * @resultadoEsperado O JSON traz id, nome, e-mail, CPF, nascimento e telefone
   */
  test('paciente traz os campos da interface', async () => {
    const t = await token();
    const resposta = await request(app).get(`/api/pacientes/${dados.pacientes[0].id}`).set(auth(t));
    expect(resposta.body).toMatchObject({
      id: dados.pacientes[0].id,
      nome: 'Ana Pereira',
      email: 'ana@email.com',
      cpf: '52998224725',
      dataNascimento: '1990-05-14',
      telefone: '(11) 98888-1111',
      ativo: true,
    });
  });

  /**
   * @caso CT-API-155
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar todos os campos de médico usados pela interface
   * @resultadoEsperado O JSON traz id, nome, CRM, especialidade, preço e duração
   */
  test('médico traz os campos da interface', async () => {
    const t = await token();
    const resposta = await request(app).get(`/api/medicos/${dados.medicos[0].id}`).set(auth(t));
    expect(resposta.body).toMatchObject({
      id: dados.medicos[0].id,
      nome: 'Dr. Carlos Almeida',
      email: 'carlos@clinica.com',
      crm: '123456/SP',
      especialidadeId: 1,
      especialidadeNome: 'Clínica Geral',
      precoCentavos: 15000,
      duracaoConsultaMin: 30,
      ativo: true,
    });
  });

  /**
   * @caso CT-API-156
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar id, nome e preço das especialidades
   * @resultadoEsperado Toda especialidade tem id numérico, nome e precoCentavos
   */
  test('especialidade traz id, nome e preço', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/especialidades').set(auth(t));
    expect(resposta.body.every((e) => Number.isInteger(e.id) && typeof e.nome === 'string' && Number.isInteger(e.precoCentavos))).toBe(true);
  });

  /**
   * @caso CT-API-157
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar o usuário no formato usado pelo AuthContext
   * @resultadoEsperado O login traz id, nome, e-mail, perfil e pacienteId
   */
  test('login traz os campos do contexto de sessão', async () => {
    const resposta = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(resposta.body.usuario).toEqual({
      id: expect.any(Number),
      nome: 'Ana Pereira',
      email: 'ana@email.com',
      perfil: 'PACIENTE',
      pacienteId: dados.pacientes[0].id,
    });
  });

  /**
   * @caso CT-API-158
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar horários no formato { data, horarios }
   * @resultadoEsperado data é AAAA-MM-DD e horarios é uma lista de strings
   */
  test('horários seguem o formato esperado', async () => {
    const t = await token();
    const resposta = await request(app).get(`/api/medicos/${dados.medicos[0].id}/horarios?data=2026-10-20`).set(auth(t));
    expect(resposta.body.data).toBe('2026-10-20');
    expect(Array.isArray(resposta.body.horarios)).toBe(true);
    expect(resposta.body.horarios.every((h) => DATA_HORA.test(h))).toBe(true);
  });

  /**
   * @caso CT-API-159
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar o relatório no formato usado pela tela
   * @resultadoEsperado O JSON traz periodo, porStatus com 5 chaves, faltasPorMedico e faturamento
   */
  test('relatório segue o formato esperado', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/admin/relatorios/resumo?dataInicio=2026-10-19&dataFim=2026-10-25').set(auth(t));
    expect(Object.keys(resposta.body.porStatus).sort()).toEqual([...STATUS].sort());
    expect(Array.isArray(resposta.body.faltasPorMedico)).toBe(true);
    expect(Number.isInteger(resposta.body.faturamentoCentavos)).toBe(true);
  });

  /**
   * @caso CT-API-160
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Responder 204 sem corpo na remoção de bloqueio
   * @resultadoEsperado O corpo da resposta é vazio, como o cliente espera
   */
  test('DELETE de bloqueio devolve 204 vazio', async () => {
    const t = await token();
    const criado = await request(app)
      .post(`/api/medicos/${dados.medicos[0].id}/bloqueios`)
      .set(auth(t))
      .send({ dataInicio: '2026-11-02', dataFim: '2026-11-02' });
    const resposta = await request(app).delete(`/api/medicos/${dados.medicos[0].id}/bloqueios/${criado.body.id}`).set(auth(t));
    expect(resposta.status).toBe(204);
    expect(resposta.text).toBe('');
  });

  /**
   * @caso CT-API-161
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Manter datas e horas no formato AAAA-MM-DD HH:mm
   * @resultadoEsperado inicio, fim, criadoEm e atualizadoEm seguem o padrão
   */
  test('datas e horas seguem o padrão do sistema', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    for (const campo of ['inicio', 'fim', 'criadoEm', 'atualizadoEm']) {
      expect(consulta[campo]).toMatch(DATA_HORA);
    }
  });

  /**
   * @caso CT-API-162
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Manter status da consulta dentro do enum conhecido
   * @resultadoEsperado O status inicial é um dos cinco valores do domínio
   */
  test('status pertence ao enum do domínio', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    expect(STATUS).toContain(consulta.status);
  });

  /**
   * @caso CT-API-163
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08, RNF04
   * @objetivo Entregar conflito no formato que o cliente converte em ApiError
   * @resultadoEsperado A resposta 409 traz erro.codigo e erro.mensagem
   */
  test('conflito traz codigo e mensagem', async () => {
    const t = await token();
    await criarConsulta(t);
    const resposta = await request(app)
      .post('/api/consultas')
      .set(auth(t))
      .send({ pacienteId: dados.pacientes[1].id, medicoId: dados.medicos[0].id, inicio: '2026-10-20 09:00' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONFLITO');
    expect(typeof resposta.body.erro.mensagem).toBe('string');
  });
});
