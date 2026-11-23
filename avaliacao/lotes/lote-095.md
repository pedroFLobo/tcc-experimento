# lote-095

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 23 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0056 | CT-API-056 | paciente agenda consulta para si | passou |  |
| glm-0057 | CT-API-057 | agendamento sem token retorna 401 | passou |  |
| glm-0058 | CT-API-058 | paciente não agenda para outro | passou |  |
| glm-0059 | CT-API-059 | horário já ocupado retorna 409 | passou |  |
| glm-0060 | CT-API-060 | horário em formato inválido retorna 400 | passou |  |
| glm-0061 | CT-API-061 | antecedência menor que 2 horas retorna 422 | passou |  |
| glm-0062 | CT-API-062 | paciente lista só as próprias consultas | passou |  |
| glm-0063 | CT-API-063 | recepção filtra por status | passou |  |
| glm-0064 | CT-API-064 | dono consulta a própria consulta | passou |  |
| glm-0065 | CT-API-065 | paciente não acessa consulta alheia | passou |  |
| glm-0066 | CT-API-066 | consulta inexistente retorna 404 | passou |  |
| glm-0067 | CT-API-067 | paciente confirma a própria consulta | passou |  |
| glm-0068 | CT-API-068 | segunda confirmação retorna 422 | passou |  |
| glm-0069 | CT-API-069 | médico não confirma consultas | passou |  |
| glm-0070 | CT-API-070 | cancelamento da recepção sem motivo retorna 422 | passou |  |
| glm-0071 | CT-API-071 | recepção cancela com motivo | passou |  |
| glm-0072 | CT-API-072 | paciente não cancela com menos de 24 horas | passou |  |
| glm-0073 | CT-API-073 | recepção remarca consulta | passou |  |
| glm-0074 | CT-API-074 | remarcar consulta cancelada retorna 422 | passou |  |
| glm-0075 | CT-API-075 | médico registra atendimento via API | passou |  |
| glm-0076 | CT-API-076 | realizar consulta futura retorna 422 | passou |  |
| glm-0077 | CT-API-077 | recepção registra falta via API | passou |  |
| glm-0078 | CT-API-078 | falta antes da tolerância retorna 422 | passou |  |

## Arquivo: backend/__testes__/api/consultas-api.test.js

```js
// Testes de API do agendamento e ciclo de vida das consultas (RF08–RF10, RN16–RN30, RNF04).
const clock = require('../../src/utils/clock');
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db, app, repos, tokenRecepcao, tokenPaciente, tokenMedico, tokenJoao;

beforeAll(async () => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
  repos = app.locals.servicos.repos;
  const entrar = async (email) => {
    const r = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return r.body.token;
  };
  tokenRecepcao = await entrar('recepcao@clinica.com');
  tokenPaciente = await entrar('ana@email.com');
  tokenMedico = await entrar('carlos@clinica.com');
  tokenJoao = await entrar('joao@email.com');
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

function inserirDireta({ pacienteId, medicoId, inicio, fim, status }) {
  const id = repos.consultas.inserir({
    pacienteId, medicoId, inicio, fim, valorCentavos: 15000, retornoDe: null, agora: '2026-10-19 08:00',
  });
  if (status && status !== 'AGENDADA') repos.consultas.atualizarStatus(id, status, '2026-10-19 08:00');
  return id;
}

describe('POST /api/consultas (RF08, RN16, RN17, RN30)', () => {
  /**
   * @caso CT-API-056
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1, RF08.2
   * @objetivo Agendar consulta pelo próprio paciente via API
   * @resultadoEsperado resposta 201 com status AGENDADA e valor gravado da especialidade
   */
  test('paciente agenda consulta para si', async () => {
    const r = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ medicoId: 2, inicio: '2026-10-19 10:30' });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('AGENDADA');
    expect(r.body.pacienteId).toBe(1);
    expect(r.body.valorCentavos).toBe(30000); // preço base da Cardiologia, sem descontos para Ana
  });

  /**
   * @caso CT-API-057
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2
   * @objetivo Exigir token para agendar
   * @resultadoEsperado POST sem Authorization devolve 401 NAO_AUTENTICADO
   */
  test('agendamento sem token retorna 401', async () => {
    const r = await request(app).post('/api/consultas').send({ medicoId: 1, inicio: '2026-10-20 08:00' });
    expect(r.status).toBe(401);
    expect(r.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  /**
   * @caso CT-API-058
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que o paciente agende informando outro paciente
   * @resultadoEsperado resposta 403 SEM_PERMISSAO 'Você só pode agendar consultas para si mesmo.'
   */
  test('paciente não agenda para outro', async () => {
    const r = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenJoao}`)
      .send({ pacienteId: 1, medicoId: 1, inicio: '2026-10-20 08:00' });
    expect(r.status).toBe(403);
    expect(r.body.erro.mensagem).toBe('Você só pode agendar consultas para si mesmo.');
  });

  /**
   * @caso CT-API-059
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN17
   * @objetivo Recusar horário que não está entre os livres do médico
   * @resultadoEsperado slot já ocupado de Beatriz devolve 409 CONFLITO 'Horário indisponível para este médico.'
   */
  test('horário já ocupado retorna 409', async () => {
    const r = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenJoao}`)
      .send({ medicoId: 2, inicio: '2026-10-19 10:30' });
    expect(r.status).toBe(409);
    expect(r.body.erro.mensagem).toBe('Horário indisponível para este médico.');
  });

  /**
   * @caso CT-API-060
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF08.1, RNF04
   * @objetivo Tratar horário fora do formato AAAA-MM-DD HH:mm
   * @resultadoEsperado resposta 400 VALIDACAO com a orientação de formato
   */
  test('horário em formato inválido retorna 400', async () => {
    const r = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenJoao}`)
      .send({ medicoId: 1, inicio: '20/10/2026 08:00' });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Horário inválido. Use o formato AAAA-MM-DD HH:mm.');
  });

  /**
   * @caso CT-API-061
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16
   * @objetivo Recusar agendamento com menos de 2 horas de antecedência via API
   * @resultadoEsperado resposta 422 REGRA_NEGOCIO com a mensagem da antecedência mínima
   */
  test('antecedência menor que 2 horas retorna 422', async () => {
    const r = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenJoao}`)
      .send({ medicoId: 1, inicio: '2026-10-19 09:30' });
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toBe('A consulta deve ser agendada com no mínimo 2 horas de antecedência.');
  });
});

describe('GET /api/consultas e GET /:id (RF10, RN30)', () => {
  /**
   * @caso CT-API-062
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF10.1
   * @objetivo Restringir a listagem via API às consultas do próprio paciente
   * @resultadoEsperado GET /api/consultas do paciente só traz consultas com o seu pacienteId
   */
  test('paciente lista só as próprias consultas', async () => {
    const r = await request(app).get('/api/consultas').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThanOrEqual(1);
    expect(r.body.every((c) => c.pacienteId === 1)).toBe(true);
  });

  /**
   * @caso CT-API-063
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.3
   * @objetivo Filtrar consultas por status na visão da recepção
   * @resultadoEsperado GET /api/consultas?status=AGENDADA devolve apenas agendadas
   */
  test('recepção filtra por status', async () => {
    const r = await request(app)
      .get('/api/consultas?status=AGENDADA')
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThanOrEqual(1);
    expect(r.body.every((c) => c.status === 'AGENDADA')).toBe(true);
  });
});

describe('acesso individual, confirmação e cancelamento (RF09, RN25, RN26, RN30)', () => {
  let idAna;

  beforeAll(async () => {
    // Consulta de Ana criada em CT-API-056 é a primeira da listagem dela no período atual.
    const r = await request(app).get('/api/consultas').set('Authorization', `Bearer ${tokenPaciente}`);
    idAna = r.body[0].id;
  });

  /**
   * @caso CT-API-064
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.1
   * @objetivo Consultar uma consulta própria pelo id
   * @resultadoEsperado GET /api/consultas/:id do dono devolve 200 com os dados completos
   */
  test('dono consulta a própria consulta', async () => {
    const r = await request(app).get(`/api/consultas/${idAna}`).set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(idAna);
    expect(r.body.medicoNome).toBe('Dra. Beatriz Souza');
  });

  /**
   * @caso CT-API-065
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30
   * @objetivo Impedir que outro paciente acesse a consulta alheia
   * @resultadoEsperado GET de João sobre consulta de Ana devolve 403 SEM_PERMISSAO
   */
  test('paciente não acessa consulta alheia', async () => {
    const r = await request(app).get(`/api/consultas/${idAna}`).set('Authorization', `Bearer ${tokenJoao}`);
    expect(r.status).toBe(403);
    expect(r.body.erro.mensagem).toBe('Você não tem acesso a esta consulta.');
  });

  /**
   * @caso CT-API-066
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN30, RNF04
   * @objetivo Retornar 404 para consulta inexistente
   * @resultadoEsperado GET /api/consultas/9999 devolve 404 NAO_ENCONTRADO
   */
  test('consulta inexistente retorna 404', async () => {
    const r = await request(app).get('/api/consultas/9999').set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(404);
    expect(r.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  /**
   * @caso CT-API-067
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar a própria consulta dentro das 48 horas via API
   * @resultadoEsperado resposta 200 com status CONFIRMADA
   */
  test('paciente confirma a própria consulta', async () => {
    const r = await request(app).post(`/api/consultas/${idAna}/confirmar`)
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('CONFIRMADA');
  });

  /**
   * @caso CT-API-068
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN25
   * @objetivo Recusar segunda confirmação da mesma consulta
   * @resultadoEsperado resposta 422 'Somente consultas agendadas podem ser confirmadas.'
   */
  test('segunda confirmação retorna 422', async () => {
    const r = await request(app).post(`/api/consultas/${idAna}/confirmar`)
      .set('Authorization', `Bearer ${tokenPaciente}`);
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toBe('Somente consultas agendadas podem ser confirmadas.');
  });

  /**
   * @caso CT-API-069
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN25, RN30
   * @objetivo Impedir que médico confirme consultas via API
   * @resultadoEsperado resposta 403 SEM_PERMISSAO com a mensagem de papel
   */
  test('médico não confirma consultas', async () => {
    const r = await request(app).post(`/api/consultas/${idAna}/confirmar`)
      .set('Authorization', `Bearer ${tokenMedico}`);
    expect(r.status).toBe(403);
    expect(r.body.erro.mensagem).toBe('Somente o paciente da consulta ou a recepção podem confirmar.');
  });

  /**
   * @caso CT-API-070
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN26, RNF04
   * @objetivo Exigir motivo no cancelamento pela recepção
   * @resultadoEsperado POST /:id/cancelar sem motivo devolve 422 'Informe o motivo do cancelamento.'
   */
  test('cancelamento da recepção sem motivo retorna 422', async () => {
    const r = await request(app).post(`/api/consultas/${idAna}/cancelar`)
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({});
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toBe('Informe o motivo do cancelamento.');
  });

  /**
   * @caso CT-API-071
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Cancelar pela recepção com motivo e registrar o autor
   * @resultadoEsperado resposta 200 com status CANCELADA, canceladoPor 'RECEPCAO' e motivo gravado
   */
  test('recepção cancela com motivo', async () => {
    const r = await request(app).post(`/api/consultas/${idAna}/cancelar`)
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ motivo: 'Bloqueio da agenda' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('CANCELADA');
    expect(r.body.canceladoPor).toBe('RECEPCAO');
    expect(r.body.motivoCancelamento).toBe('Bloqueio da agenda');
  });
});

describe('remarcação, realização e falta (RF09, RN26–RN29)', () => {
  let idRemarcada;

  /**
   * @caso CT-API-072
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN26
   * @objetivo Recusar cancelamento do paciente com menos de 24 horas via API
   * @resultadoEsperado consulta a 3 horas do início devolve 422 com a mensagem do prazo de 24 horas
   */
  test('paciente não cancela com menos de 24 horas', async () => {
    const agendar = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenJoao}`)
      .send({ medicoId: 2, inicio: '2026-10-19 11:15' });
    expect(agendar.status).toBe(201);
    const r = await request(app).post(`/api/consultas/${agendar.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenJoao}`)
      .send({});
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toBe('O paciente só pode cancelar com no mínimo 24 horas de antecedência. Procure a recepção.');
  });

  /**
   * @caso CT-API-073
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar pela recepção com novo horário válido
   * @resultadoEsperado resposta 200 com status AGENDADA, remarcacoes 1 e a nova data gravada
   */
  test('recepção remarca consulta', async () => {
    const agendar = await request(app).post('/api/consultas')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ pacienteId: 1, medicoId: 1, inicio: '2026-10-20 09:00' });
    expect(agendar.status).toBe(201);
    idRemarcada = agendar.body.id;
    const r = await request(app).post(`/api/consultas/${idRemarcada}/remarcar`)
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ inicio: '2026-10-21 08:00' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('AGENDADA');
    expect(r.body.inicio).toBe('2026-10-21 08:00');
    expect(r.body.remarcacoes).toBe(1);
  });

  /**
   * @caso CT-API-074
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN27
   * @objetivo Impedir remarcação de consulta cancelada via API
   * @resultadoEsperado resposta 422 'Somente consultas agendadas ou confirmadas podem ser remarcadas.'
   */
  test('remarcar consulta cancelada retorna 422', async () => {
    const r = await request(app).post('/api/consultas/1/remarcar')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ inicio: '2026-10-22 08:00' });
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toBe('Somente consultas agendadas ou confirmadas podem ser remarcadas.');
  });

  /**
   * @caso CT-API-075
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4, RN28
   * @objetivo Registrar atendimento pelo médico dono em consulta já iniciada
   * @resultadoEsperado resposta 200 com status REALIZADA e observações gravadas
   */
  test('médico registra atendimento via API', async () => {
    const id = inserirDireta({
      pacienteId: 2, medicoId: 1, inicio: '2026-10-16 08:00', fim: '2026-10-16 08:30',
    });
    const r = await request(app).post(`/api/consultas/${id}/realizar`)
      .set('Authorization', `Bearer ${tokenMedico}`)
      .send({ observacoes: 'Paciente saudável.' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('REALIZADA');
    expect(r.body.observacoes).toBe('Paciente saudável.');
  });

  /**
   * @caso CT-API-076
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN28
   * @objetivo Recusar registro de atendimento em consulta futura
   * @resultadoEsperado resposta 422 'O atendimento só pode ser registrado a partir do horário da consulta.'
   */
  test('realizar consulta futura retorna 422', async () => {
    const r = await request(app).post(`/api/consultas/${idRemarcada}/realizar`)
      .set('Authorization', `Bearer ${tokenMedico}`)
      .send({});
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toBe('O atendimento só pode ser registrado a partir do horário da consulta.');
  });

  /**
   * @caso CT-API-077
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta do paciente após a tolerância de 15 minutos
   * @resultadoEsperado resposta 200 com status FALTA
   */
  test('recepção registra falta via API', async () => {
    const id = inserirDireta({
      pacienteId: 3, medicoId: 4, inicio: '2026-10-16 07:00', fim: '2026-10-16 07:15',
    });
    const r = await request(app).post(`/api/consultas/${id}/falta`)
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('FALTA');
  });

  /**
   * @caso CT-API-078
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN29
   * @objetivo Recusar registro de falta antes de 15 minutos do início
   * @resultadoEsperado resposta 422 'A falta só pode ser registrada 15 minutos após o início da consulta.'
   */
  test('falta antes da tolerância retorna 422', async () => {
    const r = await request(app).post(`/api/consultas/${idRemarcada}/falta`)
      .set('Authorization', `Bearer ${tokenRecepcao}`);
    expect(r.status).toBe(422);
    expect(r.body.erro.mensagem).toBe('A falta só pode ser registrada 15 minutos após o início da consulta.');
  });
});
```
