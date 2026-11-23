/**
 * API de agenda (RF03.2, RF04, RF05, RF06, RF07): listagem de médicos,
 * grade de disponibilidade, bloqueios e horários livres.
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const request = require('supertest');
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db;
let app;
let carlos;
let eduardo;
let ana;
let tokens;

function inserirConsulta({ pacienteId, medicoId, inicio, fim }) {
  app.locals.servicos.repos.consultas.inserir({
    pacienteId,
    medicoId,
    inicio,
    fim,
    valorCentavos: 15000,
    retornoDe: null,
    agora: '2026-10-19 08:00',
  });
}

beforeEach(async () => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  app = criarApp({ db });
  [carlos, , eduardo] = dados.medicos;
  [ana] = dados.pacientes;

  const logar = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return res.body.token;
  };
  tokens = {
    recepcao: await logar('recepcao@clinica.com'),
    paciente: await logar('ana@email.com'),
    medico: await logar('carlos@clinica.com'),
    outroMedico: await logar('eduardo@clinica.com'),
  };
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const comToken = (perfil) => `Bearer ${tokens[perfil]}`;

describe('RF03.2 e RF04 — listagem de médicos', () => {
  /**
   * @caso CT-API-062
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF03.2, RNF01
   * @objetivo Listar os médicos sem expor dados de conta
   * @resultadoEsperado a resposta 200 traz os quatro médicos e nenhuma senha
   */
  test('GET /api/medicos devolve os médicos sem hash de senha', async () => {
    const res = await request(app).get('/api/medicos').set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body[0]).toHaveProperty('nome');
    expect(res.body[0]).toHaveProperty('crm');
    expect(res.body[0]).toHaveProperty('duracaoConsultaMin');
    expect(JSON.stringify(res.body)).not.toContain('senhaHash');
  });

  /**
   * @caso CT-API-063
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.2
   * @objetivo Filtrar os médicos pela especialidade informada
   * @resultadoEsperado a resposta 200 traz só os médicos daquela especialidade
   */
  test('GET /api/medicos filtra por especialidade', async () => {
    const res = await request(app)
      .get(`/api/medicos?especialidadeId=${carlos.especialidadeId}`)
      .set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(carlos.id);
    expect(res.body[0].especialidadeNome).toBe('Clínica Geral');
  });

  /**
   * @caso CT-API-064
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF04
   * @objetivo Devolver a ficha completa de um médico
   * @resultadoEsperado a resposta 200 traz CRM, especialidade e duração da consulta
   */
  test('GET /api/medicos/:id devolve o médico', async () => {
    const res = await request(app).get(`/api/medicos/${carlos.id}`).set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(res.body.crm).toBe('123456/SP');
    expect(res.body.duracaoConsultaMin).toBe(30);
    expect(res.body.precoCentavos).toBe(15000);
  });

  /**
   * @caso CT-API-065
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30
   * @objetivo Devolver 404 para médico inexistente
   * @resultadoEsperado a resposta é 404 NAO_ENCONTRADO
   */
  test('GET /api/medicos inexistente responde 404', async () => {
    const res = await request(app).get('/api/medicos/99999').set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Médico não encontrado.' } });
  });
});

describe('RF05 — grade de disponibilidade pela API', () => {
  /**
   * @caso CT-API-066
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Ler a grade semanal do médico
   * @resultadoEsperado a resposta 200 traz os blocos com dia e horários
   */
  test('GET /api/medicos/:id/disponibilidades devolve a grade', async () => {
    const res = await request(app)
      .get(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('medico'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0]).toEqual({ id: expect.any(Number), diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' });
  });

  /**
   * @caso CT-API-067
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.2
   * @objetivo Substituir a grade inteira ao salvar
   * @resultadoEsperado a resposta 200 devolve só os blocos enviados
   */
  test('PUT da grade substitui a grade anterior', async () => {
    const res = await request(app)
      .put(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('recepcao'))
      .send({ blocos: [{ diaSemana: 6, horaInicio: '09:00', horaFim: '13:00' }] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ diaSemana: 6, horaInicio: '09:00', horaFim: '13:00' });
  });

  /**
   * @caso CT-API-068
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF05.1, RN10
   * @objetivo Recusar grade que não é lista de blocos
   * @resultadoEsperado a resposta é 400 VALIDACAO com a mensagem de lista de blocos
   */
  test('PUT da grade sem lista responde 400', async () => {
    const res = await request(app)
      .put(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('recepcao'))
      .send({ blocos: { diaSemana: 1 } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'A grade deve ser uma lista de blocos.' } });
  });

  /**
   * @caso CT-API-069
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Recusar bloco cujo horário inicial não é anterior ao final
   * @resultadoEsperado a resposta é 400 VALIDACAO com a mensagem de ordem dos horários
   */
  test('PUT da grade com início depois do fim responde 400', async () => {
    const res = await request(app)
      .put(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('recepcao'))
      .send({ blocos: [{ diaSemana: 1, horaInicio: '14:00', horaFim: '08:00' }] });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Hora de início deve ser anterior à hora de fim.');
  });

  /**
   * @caso CT-API-070
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN10
   * @objetivo Recusar horário que não é múltiplo de 15 minutos
   * @resultadoEsperado a resposta é 400 VALIDACAO com a mensagem dos múltiplos de 15
   */
  test('PUT da grade com hora fora do passo de 15 minutos responde 400', async () => {
    const res = await request(app)
      .put(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('recepcao'))
      .send({ blocos: [{ diaSemana: 1, horaInicio: '08:07', horaFim: '12:00' }] });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Horários devem ser múltiplos de 15 minutos.');
  });

  /**
   * @caso CT-API-071
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN11
   * @objetivo Recusar dois blocos do mesmo dia que se sobrepõem
   * @resultadoEsperado a resposta é 400 VALIDACAO apontando os blocos sobrepostos
   */
  test('PUT da grade com blocos sobrepostos responde 400', async () => {
    const res = await request(app)
      .put(`/api/medicos/${carlos.id}/disponibilidades`)
      .set('Authorization', comToken('recepcao'))
      .send({
        blocos: [
          { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
          { diaSemana: 1, horaInicio: '10:00', horaFim: '14:00' },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Blocos sobrepostos no dia 1: 08:00–12:00 e 10:00–14:00.');
  });
});

describe('RF07 — horários livres pela API', () => {
  /**
   * @caso CT-API-072
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF07.1, RN14
   * @objetivo Gerar os horários da grade do médico em passos da duração da consulta
   * @resultadoEsperado a resposta 200 traz 16 horários de 30 minutos entre 08:00 e 18:00
   */
  test('GET horários devolve os slots da grade', async () => {
    const res = await request(app)
      .get(`/api/medicos/${carlos.id}/horarios?data=2026-10-26`)
      .set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(res.body.data).toBe('2026-10-26');
    expect(res.body.horarios).toHaveLength(16);
    expect(res.body.horarios[0]).toBe('08:00');
    expect(res.body.horarios).toContain('14:00');
    expect(res.body.horarios).not.toContain('12:00');
  });

  /**
   * @caso CT-API-073
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1, RNF04
   * @objetivo Rejeitar a consulta de horários sem a data
   * @resultadoEsperado a resposta é 400 VALIDACAO com o formato AAAA-MM-DD
   */
  test('GET horários sem data responde 400', async () => {
    const res = await request(app)
      .get(`/api/medicos/${carlos.id}/horarios`)
      .set('Authorization', comToken('paciente'));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'Data inválida. Use o formato AAAA-MM-DD.' } });
  });

  /**
   * @caso CT-API-074
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF07.1, RNF04
   * @objetivo Rejeitar data fora do formato AAAA-MM-DD
   * @resultadoEsperado a resposta é 400 VALIDACAO com o formato esperado
   */
  test('GET horários com data malformada responde 400', async () => {
    const res = await request(app)
      .get(`/api/medicos/${carlos.id}/horarios?data=26/10/2026`)
      .set('Authorization', comToken('paciente'));
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Data inválida. Use o formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-API-075
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF07.1, RN15
   * @objetivo Esconder horários de data coberta por bloqueio
   * @resultadoEsperado a resposta 200 traz a lista de horários vazia
   */
  test('GET horários em data bloqueada devolve lista vazia', async () => {
    await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Congresso' });

    const res = await request(app)
      .get(`/api/medicos/${carlos.id}/horarios?data=2026-11-03`)
      .set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(res.body.horarios).toEqual([]);
  });
});

describe('RF06 — bloqueios de agenda pela API', () => {
  /**
   * @caso CT-API-076
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Criar bloqueio de período com motivo pela recepção
   * @resultadoEsperado a resposta é 201 com o bloqueio criado
   */
  test('POST bloqueio responde 201', async () => {
    const res = await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      medicoId: carlos.id,
      dataInicio: '2026-11-02',
      dataFim: '2026-11-06',
      motivo: 'Férias',
    });
  });

  /**
   * @caso CT-API-077
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN12
   * @objetivo Recusar bloqueio com data final anterior à inicial
   * @resultadoEsperado a resposta é 400 VALIDACAO com a mensagem da inversão
   */
  test('POST bloqueio invertido responde 400', async () => {
    const res = await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-11-10', dataFim: '2026-11-01', motivo: 'Congresso' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      erro: { codigo: 'VALIDACAO', mensagem: 'A data final do bloqueio não pode ser anterior à inicial.' },
    });
  });

  /**
   * @caso CT-API-078
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN12
   * @objetivo Recusar bloqueio que começa no passado
   * @resultadoEsperado a resposta é 422 REGRA_NEGOCIO com a mensagem do passado
   */
  test('POST bloqueio no passado responde 422', async () => {
    const res = await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-10-10', dataFim: '2026-10-12', motivo: 'Viagem' });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      erro: { codigo: 'REGRA_NEGOCIO', mensagem: 'O bloqueio não pode começar no passado.' },
    });
  });

  /**
   * @caso CT-API-079
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN13
   * @objetivo Recusar bloqueio em período com consulta ativa do médico
   * @resultadoEsperado a resposta é 422 REGRA_NEGOCIO indicando quantas consultas há
   */
  test('POST bloqueio com consulta ativa responde 422', async () => {
    inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const res = await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-10-26', dataFim: '2026-10-26', motivo: 'Plantão' });
    expect(res.status).toBe(422);
    expect(res.body.erro.mensagem).toBe(
      'Existem 1 consulta(s) agendada(s) no período. Cancele ou remarque antes de bloquear.',
    );
  });

  /**
   * @caso CT-API-080
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Listar os bloqueios do médico para o dono da agenda
   * @resultadoEsperado a resposta 200 traz os bloqueios criados em ordem de data
   */
  test('GET bloqueios devolve a lista do médico', async () => {
    await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });
    await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('medico'))
      .send({ dataInicio: '2026-12-21', dataFim: '2026-12-23', motivo: 'Natal' });

    const res = await request(app).get(`/api/medicos/${carlos.id}/bloqueios`).set('Authorization', comToken('medico'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].dataInicio).toBe('2026-11-02');
    expect(res.body[1].motivo).toBe('Natal');
  });

  /**
   * @caso CT-API-081
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.2
   * @objetivo Remover um bloqueio da agenda
   * @resultadoEsperado a resposta é 204 sem corpo e o bloqueio some da listagem
   */
  test('DELETE bloqueio responde 204', async () => {
    const criado = await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });

    const removido = await request(app)
      .delete(`/api/medicos/${carlos.id}/bloqueios/${criado.body.id}`)
      .set('Authorization', comToken('medico'));
    expect(removido.status).toBe(204);
    expect(removido.text).toBe('');

    const lista = await request(app)
      .get(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('medico'));
    expect(lista.body).toEqual([]);
  });

  /**
   * @caso CT-API-082
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30, RF06.2
   * @objetivo Bloquear a remoção de bloqueio que pertence a outro médico
   * @resultadoEsperado a resposta é 404 NAO_ENCONTRADO do próprio bloqueio
   */
  test('remover bloqueio de outro médico responde 404', async () => {
    const doCarlos = await request(app)
      .post(`/api/medicos/${carlos.id}/bloqueios`)
      .set('Authorization', comToken('recepcao'))
      .send({ dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });

    const res = await request(app)
      .delete(`/api/medicos/${eduardo.id}/bloqueios/${doCarlos.body.id}`)
      .set('Authorization', comToken('outroMedico'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Bloqueio não encontrado.' } });
  });
});
