// API: rotas do ciclo de vida da consulta (RF09, RN25–RN29).
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

async function token(email) {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
  return resposta.body.token;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function criarConsulta(t, { paciente = 0, inicio = '2026-10-20 09:00', medico = 0 } = {}) {
  const resposta = await request(app)
    .post('/api/consultas')
    .set(auth(t))
    .send({ pacienteId: dados.pacientes[paciente].id, medicoId: dados.medicos[medico].id, inicio });
  return resposta.body;
}

function em(dataHora) {
  clock.definirAgora(new Date(dataHora.replace(' ', 'T')));
}

describe('POST /api/consultas/:id/confirmar', () => {
  /**
   * @caso CT-API-106
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença pela rota dedicada
   * @resultadoEsperado A resposta é 200 com status CONFIRMADA
   */
  test('confirma consulta', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/confirmar`).set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-API-107
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar confirmação fora da janela de 48 horas
   * @resultadoEsperado A resposta é 422 REGRA_NEGOCIO
   */
  test('confirmação fora da janela devolve 422', async () => {
    const t = await token();
    const consulta = await criarConsulta(t, { inicio: '2026-10-22 09:00' });
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/confirmar`).set(auth(t));
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.mensagem).toBe('A confirmação só é permitida nas 48 horas anteriores à consulta.');
  });

  /**
   * @caso CT-API-108
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver 404 ao confirmar consulta inexistente
   * @resultadoEsperado A resposta é 404 NAO_ENCONTRADO
   */
  test('confirmar consulta inexistente devolve 404', async () => {
    const t = await token();
    const resposta = await request(app).post('/api/consultas/9999/confirmar').set(auth(t));
    expect(resposta.status).toBe(404);
  });
});

describe('POST /api/consultas/:id/cancelar', () => {
  /**
   * @caso CT-API-109
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar a própria consulta como paciente
   * @resultadoEsperado A resposta é 200 com status CANCELADA e canceladoPor PACIENTE
   */
  test('paciente cancela a própria consulta', async () => {
    const tRecepcao = await token();
    const consulta = await criarConsulta(tRecepcao);
    const t = await token('ana@email.com');
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/cancelar`).set(auth(t)).send({});
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ status: 'CANCELADA', canceladoPor: 'PACIENTE' });
  });

  /**
   * @caso CT-API-110
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN26
   * @objetivo Exigir motivo no cancelamento pela recepção
   * @resultadoEsperado A resposta é 422 com "Informe o motivo do cancelamento."
   */
  test('recepção sem motivo devolve 422', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/cancelar`).set(auth(t)).send({});
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.mensagem).toBe('Informe o motivo do cancelamento.');
  });

  /**
   * @caso CT-API-111
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2
   * @objetivo Cancelar com motivo pela recepção
   * @resultadoEsperado O motivo é gravado na consulta
   */
  test('recepção cancela com motivo', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    const resposta = await request(app)
      .post(`/api/consultas/${consulta.id}/cancelar`)
      .set(auth(t))
      .send({ motivo: 'Médico de urgência' });
    expect(resposta.body).toMatchObject({ status: 'CANCELADA', motivoCancelamento: 'Médico de urgência' });
  });

  /**
   * @caso CT-API-112
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar segundo cancelamento
   * @resultadoEsperado A segunda resposta é 422
   */
  test('cancelar duas vezes devolve 422', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    await request(app).post(`/api/consultas/${consulta.id}/cancelar`).set(auth(t)).send({ motivo: 'Primeiro' });
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/cancelar`).set(auth(t)).send({ motivo: 'Segundo' });
    expect(resposta.status).toBe(422);
  });
});

describe('POST /api/consultas/:id/remarcar', () => {
  /**
   * @caso CT-API-113
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar a consulta para outro horário
   * @resultadoEsperado A resposta é 200 com o novo horário e 1 remarcação
   */
  test('remarca para outro horário', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/remarcar`).set(auth(t)).send({ inicio: '2026-10-20 10:00' });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ inicio: '2026-10-20 10:00', status: 'AGENDADA', remarcacoes: 1 });
  });

  /**
   * @caso CT-API-114
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Recusar remarcação em cima da hora
   * @resultadoEsperado A resposta é 422 REGRA_NEGOCIO
   */
  test('remarcação tardia devolve 422', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    em('2026-10-20 08:00');
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/remarcar`).set(auth(t)).send({ inicio: '2026-10-21 09:00' });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.mensagem).toBe('A remarcação só é permitida até 24 horas antes da consulta.');
  });

  /**
   * @caso CT-API-115
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver 400 para horário de remarcação malformado
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('horário malformado na remarcação devolve 400', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/remarcar`).set(auth(t)).send({ inicio: '2026/10/21 09:00' });
    expect(resposta.status).toBe(400);
  });
});

describe('POST /api/consultas/:id/realizar', () => {
  /**
   * @caso CT-API-116
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4, RN28
   * @objetivo Registrar atendimento pelo médico da consulta
   * @resultadoEsperado A resposta é 200 com status REALIZADA e observações
   */
  test('médico registra atendimento', async () => {
    const tRecepcao = await token();
    const consulta = await criarConsulta(tRecepcao);
    em('2026-10-20 09:00');
    const t = await token('carlos@clinica.com');
    const resposta = await request(app)
      .post(`/api/consultas/${consulta.id}/realizar`)
      .set(auth(t))
      .send({ observacoes: 'Paciente orientado' });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ status: 'REALIZADA', observacoes: 'Paciente orientado' });
  });

  /**
   * @caso CT-API-117
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN28, RN30
   * @objetivo Impedir registro de atendimento pela recepção
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('recepção não registra atendimento', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    em('2026-10-20 09:00');
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/realizar`).set(auth(t)).send({});
    expect(resposta.status).toBe(403);
  });

  /**
   * @caso CT-API-118
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar atendimento antes do início
   * @resultadoEsperado A resposta é 422 REGRA_NEGOCIO
   */
  test('atendimento antes do horário devolve 422', async () => {
    const tRecepcao = await token();
    const consulta = await criarConsulta(tRecepcao);
    const t = await token('carlos@clinica.com');
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/realizar`).set(auth(t)).send({});
    expect(resposta.status).toBe(422);
  });
});

describe('POST /api/consultas/:id/falta', () => {
  /**
   * @caso CT-API-119
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta após a tolerância
   * @resultadoEsperado A resposta é 200 com status FALTA
   */
  test('recepção registra falta', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    em('2026-10-20 09:20');
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/falta`).set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('FALTA');
  });

  /**
   * @caso CT-API-120
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar falta antes dos 15 minutos
   * @resultadoEsperado A resposta é 422 com a mensagem da tolerância
   */
  test('falta antes da tolerância devolve 422', async () => {
    const t = await token();
    const consulta = await criarConsulta(t);
    em('2026-10-20 09:10');
    const resposta = await request(app).post(`/api/consultas/${consulta.id}/falta`).set(auth(t));
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.mensagem).toBe('A falta só pode ser registrada 15 minutos após o início da consulta.');
  });

  /**
   * @caso CT-API-121
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN29, RN30
   * @objetivo Impedir que o paciente registre falta
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('paciente não registra falta', async () => {
    const tRecepcao = await token();
    const consulta = await criarConsulta(tRecepcao);
    em('2026-10-20 09:20');
    const t = await token('ana@email.com');
    expect((await request(app).post(`/api/consultas/${consulta.id}/falta`).set(auth(t))).status).toBe(403);
  });

  /**
   * @caso CT-API-122
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5
   * @objetivo Registrar falta pelo médico da consulta
   * @resultadoEsperado A resposta é 200 com status FALTA
   */
  test('médico registra falta', async () => {
    const tRecepcao = await token();
    const consulta = await criarConsulta(tRecepcao);
    em('2026-10-20 09:40');
    const t = await token('carlos@clinica.com');
    expect((await request(app).post(`/api/consultas/${consulta.id}/falta`).set(auth(t))).body.status).toBe('FALTA');
  });

  /**
   * @caso CT-API-123
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Impedir que outro médico registre falta
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO
   */
  test('outro médico não registra falta', async () => {
    const tRecepcao = await token();
    const consulta = await criarConsulta(tRecepcao);
    em('2026-10-20 09:40');
    const t = await token('beatriz@clinica.com');
    expect((await request(app).post(`/api/consultas/${consulta.id}/falta`).set(auth(t))).status).toBe(403);
  });
});
