# lote-128

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 19 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0087 | CT-API-043 | POST /api/consultas do paciente responde 201 | passou |  |
| mimo-0088 | CT-API-044 | POST /api/consultas sem médico responde 400 | passou |  |
| mimo-0089 | CT-API-045 | POST /api/consultas da recepção sem paciente responde 400 | passou |  |
| mimo-0090 | CT-API-046 | POST /api/consultas fora da grade responde 409 | passou |  |
| mimo-0091 | CT-API-047 | POST /api/consultas sem antecedência responde 422 | passou |  |
| mimo-0092 | CT-API-048 | POST /api/consultas com JSON inválido responde 400 | passou |  |
| mimo-0093 | CT-API-049 | GET /api/consultas com filtro de período responde 200 | passou |  |
| mimo-0094 | CT-API-050 | GET /api/consultas com data malformada responde 400 | passou |  |
| mimo-0095 | CT-API-051 | GET /api/consultas/:id responde 200 com a consulta | passou |  |
| mimo-0096 | CT-API-052 | POST /:id/confirmar responde 200 com CONFIRMADA | passou |  |
| mimo-0097 | CT-API-053 | POST /:id/confirmar fora da janela responde 422 | passou |  |
| mimo-0098 | CT-API-054 | POST /:id/cancelar da recepção sem motivo responde 422 | passou |  |
| mimo-0099 | CT-API-055 | POST /:id/cancelar do paciente responde 200 com CANCELADA | passou |  |
| mimo-0100 | CT-API-056 | POST /:id/remarcar responde 200 com o novo horário | passou |  |
| mimo-0101 | CT-API-057 | POST /:id/remarcar fora do prazo responde 422 | passou |  |
| mimo-0102 | CT-API-058 | POST /:id/realizar responde 200 com REALIZADA | passou |  |
| mimo-0103 | CT-API-059 | POST /:id/realizar de consulta cancelada responde 422 | passou |  |
| mimo-0104 | CT-API-060 | POST /:id/falta responde 200 com FALTA | passou |  |
| mimo-0105 | CT-API-061 | POST /:id/confirmar inexistente responde 404 | passou |  |

## Arquivo: backend/__testes__/api/consultas-api.test.js

```js
/**
 * API de consultas (RF08, RF09, RF10): agendamento, ações do ciclo de vida
 * e leitura, com os códigos HTTP da seção 5 de docs/REQUISITOS.md.
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
let ana;
let joao;
let tokens;

function inserirConsulta({ pacienteId, medicoId, inicio, fim, status, valorCentavos = 15000 }) {
  const id = app.locals.servicos.repos.consultas.inserir({
    pacienteId,
    medicoId,
    inicio,
    fim,
    valorCentavos,
    retornoDe: null,
    agora: '2026-10-19 08:00',
  });
  if (status) db.prepare('UPDATE consultas SET status = ? WHERE id = ?').run(status, id);
  return id;
}

beforeEach(async () => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  app = criarApp({ db });
  [carlos] = dados.medicos;
  [ana, joao] = dados.pacientes;

  const logar = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return res.body.token;
  };
  tokens = {
    recepcao: await logar('recepcao@clinica.com'),
    paciente: await logar('ana@email.com'),
    medico: await logar('carlos@clinica.com'),
  };
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const comToken = (perfil) => `Bearer ${tokens[perfil]}`;

describe('RF08 — agendamento pela API', () => {
  /**
   * @caso CT-API-043
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF08.1, RF08.2
   * @objetivo Criar consulta pelo paciente e devolver o corpo calculado
   * @resultadoEsperado a resposta é 201 com status AGENDADA, horário e valor em centavos
   */
  test('POST /api/consultas do paciente responde 201', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('paciente'))
      .send({ medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('AGENDADA');
    expect(res.body.inicio).toBe('2026-10-26 10:00');
    expect(res.body.fim).toBe('2026-10-26 10:30');
    expect(res.body.valorCentavos).toBe(15000);
    expect(res.body.pacienteId).toBe(ana.id);
  });

  /**
   * @caso CT-API-044
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF08.2
   * @objetivo Exigir o médico no corpo do agendamento
   * @resultadoEsperado a resposta é 400 VALIDACAO pedindo o médico
   */
  test('POST /api/consultas sem médico responde 400', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('paciente'))
      .send({ inicio: '2026-10-26 10:00' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'Informe o médico.' } });
  });

  /**
   * @caso CT-API-045
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF08.1
   * @objetivo Exigir o paciente quando quem agenda é a recepção
   * @resultadoEsperado a resposta é 400 VALIDACAO pedindo o paciente
   */
  test('POST /api/consultas da recepção sem paciente responde 400', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('recepcao'))
      .send({ medicoId: carlos.id, inicio: '2026-10-26 10:00' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'Informe o paciente.' } });
  });

  /**
   * @caso CT-API-046
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN17
   * @objetivo Recusar horário que não está na grade do médico
   * @resultadoEsperado a resposta é 409 CONFLITO de horário indisponível
   */
  test('POST /api/consultas fora da grade responde 409', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('paciente'))
      .send({ medicoId: carlos.id, inicio: '2026-10-19 13:00' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: { codigo: 'CONFLITO', mensagem: 'Horário indisponível para este médico.' } });
  });

  /**
   * @caso CT-API-047
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN16
   * @objetivo Recusar agendamento com menos de 2 horas de antecedência
   * @resultadoEsperado a resposta é 422 REGRA_NEGOCIO com a mensagem da antecedência
   */
  test('POST /api/consultas sem antecedência responde 422', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('paciente'))
      .send({ medicoId: carlos.id, inicio: '2026-10-19 09:00' });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      erro: {
        codigo: 'REGRA_NEGOCIO',
        mensagem: 'A consulta deve ser agendada com no mínimo 2 horas de antecedência.',
      },
    });
  });

  /**
   * @caso CT-API-048
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Responder JSON de erro quando o corpo não é JSON válido
   * @resultadoEsperado a resposta é 400 VALIDACAO com mensagem própria e sem stack trace
   */
  test('POST /api/consultas com JSON inválido responde 400', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', comToken('paciente'))
      .set('Content-Type', 'application/json')
      .send('{"inicio": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      erro: { codigo: 'VALIDACAO', mensagem: 'Corpo da requisição não é um JSON válido.' },
    });
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });
});

describe('RF10 — leitura de consultas pela API', () => {
  /**
   * @caso CT-API-049
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Filtrar a listagem da recepção por período na query string
   * @resultadoEsperado a resposta 200 traz só as consultas do período
   */
  test('GET /api/consultas com filtro de período responde 200', async () => {
    inserirConsulta({ pacienteId: ana.id, medicoId: carlos.id, inicio: '2026-10-26 10:00', fim: '2026-10-26 10:30' });
    inserirConsulta({ pacienteId: joao.id, medicoId: carlos.id, inicio: '2026-11-10 10:00', fim: '2026-11-10 10:30' });

    const res = await request(app)
      .get('/api/consultas?dataInicio=2026-11-01&dataFim=2026-11-30')
      .set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].inicio).toBe('2026-11-10 10:00');
  });

  /**
   * @caso CT-API-050
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF10.3, RNF04
   * @objetivo Recusar filtro de data fora do formato AAAA-MM-DD
   * @resultadoEsperado a resposta é 400 VALIDACAO com o formato esperado
   */
  test('GET /api/consultas com data malformada responde 400', async () => {
    const res = await request(app)
      .get('/api/consultas?dataInicio=26/10/2026')
      .set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      erro: { codigo: 'VALIDACAO', mensagem: 'Datas do filtro devem estar no formato AAAA-MM-DD.' },
    });
  });

  /**
   * @caso CT-API-051
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.1
   * @objetivo Devolver a consulta individual com os dados juntos
   * @resultadoEsperado a resposta 200 traz nomes de paciente, médico e especialidade
   */
  test('GET /api/consultas/:id responde 200 com a consulta', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
    });
    const res = await request(app).get(`/api/consultas/${id}`).set('Authorization', comToken('paciente'));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.pacienteNome).toBe('Ana Pereira');
    expect(res.body.medicoNome).toBe('Dr. Carlos Almeida');
    expect(res.body.especialidadeNome).toBe('Clínica Geral');
  });
});

describe('RF09 — ações do ciclo de vida pela API', () => {
  /**
   * @caso CT-API-052
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença pela rota HTTP
   * @resultadoEsperado a resposta é 200 com status CONFIRMADA
   */
  test('POST /:id/confirmar responde 200 com CONFIRMADA', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 10:00',
      fim: '2026-10-20 10:30',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/confirmar`)
      .set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-API-053
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN25
   * @objetivo Recusar confirmação fora da janela de 48 horas
   * @resultadoEsperado a resposta é 422 REGRA_NEGOCIO com a mensagem da janela
   */
  test('POST /:id/confirmar fora da janela responde 422', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-22 10:00',
      fim: '2026-10-22 10:30',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/confirmar`)
      .set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(422);
    expect(res.body.erro.mensagem).toBe('A confirmação só é permitida nas 48 horas anteriores à consulta.');
  });

  /**
   * @caso CT-API-054
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Exigir motivo no cancelamento feito pela recepção
   * @resultadoEsperado a resposta é 422 REGRA_NEGOCIO pedindo o motivo
   */
  test('POST /:id/cancelar da recepção sem motivo responde 422', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const res = await request(app).post(`/api/consultas/${id}/cancelar`).set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      erro: { codigo: 'REGRA_NEGOCIO', mensagem: 'Informe o motivo do cancelamento.' },
    });
  });

  /**
   * @caso CT-API-055
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.2, RN26
   * @objetivo Cancelar pelo paciente com motivo e devolver o responsável
   * @resultadoEsperado a resposta é 200 com status CANCELADA e canceladoPor PACIENTE
   */
  test('POST /:id/cancelar do paciente responde 200 com CANCELADA', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-21 10:00',
      fim: '2026-10-21 10:30',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/cancelar`)
      .set('Authorization', comToken('paciente'))
      .send({ motivo: 'Não poderei comparecer' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELADA');
    expect(res.body.canceladoPor).toBe('PACIENTE');
    expect(res.body.motivoCancelamento).toBe('Não poderei comparecer');
  });

  /**
   * @caso CT-API-056
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.3, RN27
   * @objetivo Remarcar pela rota HTTP mantendo o mesmo id
   * @resultadoEsperado a resposta é 200 com o novo horário e status AGENDADA
   */
  test('POST /:id/remarcar responde 200 com o novo horário', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-26 10:00',
      fim: '2026-10-26 10:30',
      status: 'CONFIRMADA',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/remarcar`)
      .set('Authorization', comToken('paciente'))
      .send({ inicio: '2026-10-27 10:00' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.inicio).toBe('2026-10-27 10:00');
    expect(res.body.status).toBe('AGENDADA');
    expect(res.body.remarcacoes).toBe(1);
  });

  /**
   * @caso CT-API-057
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN27
   * @objetivo Recusar remarcação com menos de 24 horas
   * @resultadoEsperado a resposta é 422 REGRA_NEGOCIO com o prazo de 24 horas
   */
  test('POST /:id/remarcar fora do prazo responde 422', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-20 07:00',
      fim: '2026-10-20 07:30',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/remarcar`)
      .set('Authorization', comToken('paciente'))
      .send({ inicio: '2026-10-27 10:00' });
    expect(res.status).toBe(422);
    expect(res.body.erro.mensagem).toBe('A remarcação só é permitida até 24 horas antes da consulta.');
  });

  /**
   * @caso CT-API-058
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.4, RN28
   * @objetivo Registrar atendimento com observações pela rota HTTP
   * @resultadoEsperado a resposta é 200 com status REALIZADA e as observações
   */
  test('POST /:id/realizar responde 200 com REALIZADA', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/realizar`)
      .set('Authorization', comToken('medico'))
      .send({ observacoes: 'Sem alterações.' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REALIZADA');
    expect(res.body.observacoes).toBe('Sem alterações.');
  });

  /**
   * @caso CT-API-059
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN28
   * @objetivo Recusar atendimento em consulta cancelada
   * @resultadoEsperado a resposta é 422 REGRA_NEGOCIO com a mensagem da transição
   */
  test('POST /:id/realizar de consulta cancelada responde 422', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
      status: 'CANCELADA',
    });
    const res = await request(app)
      .post(`/api/consultas/${id}/realizar`)
      .set('Authorization', comToken('medico'))
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.erro.mensagem).toBe('Esta consulta não pode ser marcada como realizada.');
  });

  /**
   * @caso CT-API-060
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta pela rota HTTP depois da tolerância
   * @resultadoEsperado a resposta é 200 com status FALTA
   */
  test('POST /:id/falta responde 200 com FALTA', async () => {
    const id = inserirConsulta({
      pacienteId: ana.id,
      medicoId: carlos.id,
      inicio: '2026-10-19 07:30',
      fim: '2026-10-19 08:00',
    });
    const res = await request(app).post(`/api/consultas/${id}/falta`).set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FALTA');
  });

  /**
   * @caso CT-API-061
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30
   * @objetivo Devolver 404 quando a ação aponta para consulta inexistente
   * @resultadoEsperado a resposta é 404 NAO_ENCONTRADO antes de qualquer regra
   */
  test('POST /:id/confirmar inexistente responde 404', async () => {
    const res = await request(app)
      .post('/api/consultas/99999/confirmar')
      .set('Authorization', comToken('recepcao'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Consulta não encontrada.' } });
  });
});
```
