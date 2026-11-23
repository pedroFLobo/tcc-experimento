// API: grade de disponibilidade e bloqueios de agenda (RF05, RF06, RN10–RN13).
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
const urlGrade = () => `/api/medicos/${dados.medicos[0].id}/disponibilidades`;
const urlBloqueios = () => `/api/medicos/${dados.medicos[0].id}/bloqueios`;

describe('disponibilidades', () => {
  /**
   * @caso CT-API-071
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.1
   * @objetivo Ler a grade semanal do médico
   * @resultadoEsperado A resposta traz os 10 blocos do Carlos
   */
  test('lê a grade do médico', async () => {
    const t = await token('ana@email.com');
    const resposta = await request(app).get(urlGrade()).set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(10);
    expect(resposta.body[0]).toMatchObject({ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' });
  });

  /**
   * @caso CT-API-072
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.2
   * @objetivo Substituir a grade pelo médico dono
   * @resultadoEsperado O PUT devolve somente os novos blocos
   */
  test('médico salva a própria grade', async () => {
    const t = await token('carlos@clinica.com');
    const resposta = await request(app)
      .put(urlGrade())
      .set(auth(t))
      .send({ blocos: [{ diaSemana: 3, horaInicio: '08:00', horaFim: '10:00' }] });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([expect.objectContaining({ diaSemana: 3, horaInicio: '08:00', horaFim: '10:00' })]);
  });

  /**
   * @caso CT-API-073
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF05.2
   * @objetivo Substituir a grade pela recepção
   * @resultadoEsperado A grade do médico passa a ter 2 blocos
   */
  test('recepção salva grade de qualquer médico', async () => {
    const t = await token();
    const resposta = await request(app)
      .put(urlGrade())
      .set(auth(t))
      .send({
        blocos: [
          { diaSemana: 1, horaInicio: '07:00', horaFim: '09:00' },
          { diaSemana: 5, horaInicio: '18:00', horaFim: '20:00' },
        ],
      });
    expect(resposta.body).toHaveLength(2);
  });

  /**
   * @caso CT-API-074
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.2
   * @objetivo Apagar a grade com lista vazia
   * @resultadoEsperado O PUT com blocos vazios devolve lista vazia
   */
  test('grade vazia é aceita', async () => {
    const t = await token();
    const resposta = await request(app).put(urlGrade()).set(auth(t)).send({ blocos: [] });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  /**
   * @caso CT-API-075
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN10
   * @objetivo Recusar bloco fora do horário de funcionamento
   * @resultadoEsperado A resposta é 400 com mensagem sobre 07:00 e 20:00
   */
  test('bloco fora do expediente devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).put(urlGrade()).set(auth(t)).send({ blocos: [{ diaSemana: 1, horaInicio: '06:00', horaFim: '08:00' }] });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Horários devem estar entre 07:00 e 20:00.');
  });

  /**
   * @caso CT-API-076
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN11
   * @objetivo Recusar blocos sobrepostos no mesmo dia
   * @resultadoEsperado A resposta é 400 citando a sobreposição
   */
  test('blocos sobrepostos devolvem 400', async () => {
    const t = await token();
    const resposta = await request(app)
      .put(urlGrade())
      .set(auth(t))
      .send({
        blocos: [
          { diaSemana: 2, horaInicio: '08:00', horaFim: '12:00' },
          { diaSemana: 2, horaInicio: '11:00', horaFim: '13:00' },
        ],
      });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toMatch(/sobrepostos/);
  });

  /**
   * @caso CT-API-077
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN10, RNF04
   * @objetivo Recusar corpo sem a lista de blocos
   * @resultadoEsperado A resposta é 400 pedindo uma lista de blocos
   */
  test('corpo sem blocos devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).put(urlGrade()).set(auth(t)).send({});
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('A grade deve ser uma lista de blocos.');
  });

  /**
   * @caso CT-API-078
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver 404 ao ler a grade de médico inexistente
   * @resultadoEsperado A resposta é 404 NAO_ENCONTRADO
   */
  test('grade de médico inexistente devolve 404', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/medicos/9999/disponibilidades').set(auth(t));
    expect(resposta.status).toBe(404);
  });
});

describe('bloqueios', () => {
  const ferias = { dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' };

  /**
   * @caso CT-API-079
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1
   * @objetivo Criar bloqueio pela recepção
   * @resultadoEsperado A resposta é 201 com o período e o motivo
   */
  test('recepção cria bloqueio', async () => {
    const t = await token();
    const resposta = await request(app).post(urlBloqueios()).set(auth(t)).send(ferias);
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ medicoId: dados.medicos[0].id, dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Férias' });
  });

  /**
   * @caso CT-API-080
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.1, RN30
   * @objetivo Criar bloqueio na própria agenda como médico
   * @resultadoEsperado A resposta é 201
   */
  test('médico cria bloqueio na própria agenda', async () => {
    const t = await token('carlos@clinica.com');
    const resposta = await request(app).post(urlBloqueios()).set(auth(t)).send({ dataInicio: '2026-11-02', dataFim: '2026-11-02' });
    expect(resposta.status).toBe(201);
    expect(resposta.body.motivo).toBeNull();
  });

  /**
   * @caso CT-API-081
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN12
   * @objetivo Recusar bloqueio no passado
   * @resultadoEsperado A resposta é 422 REGRA_NEGOCIO
   */
  test('bloqueio no passado devolve 422', async () => {
    const t = await token();
    const resposta = await request(app).post(urlBloqueios()).set(auth(t)).send({ dataInicio: '2026-10-01', dataFim: '2026-10-02' });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro).toMatchObject({ codigo: 'REGRA_NEGOCIO', mensagem: 'O bloqueio não pode começar no passado.' });
  });

  /**
   * @caso CT-API-082
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN12, RNF04
   * @objetivo Recusar data de bloqueio malformada
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('data malformada devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).post(urlBloqueios()).set(auth(t)).send({ dataInicio: '02/11/2026', dataFim: '2026-11-06' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Datas do bloqueio devem estar no formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-API-083
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN13
   * @objetivo Recusar bloqueio em período com consulta ativa
   * @resultadoEsperado A resposta é 422 citando as consultas agendadas
   */
  test('bloqueio com consulta ativa devolve 422', async () => {
    const t = await token();
    await request(app)
      .post('/api/consultas')
      .set(auth(t))
      .send({ pacienteId: dados.pacientes[0].id, medicoId: dados.medicos[0].id, inicio: '2026-11-03 09:00' });
    const resposta = await request(app).post(urlBloqueios()).set(auth(t)).send({ dataInicio: '2026-11-02', dataFim: '2026-11-06' });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.mensagem).toMatch(/1 consulta\(s\) agendada\(s\)/);
  });

  /**
   * @caso CT-API-084
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.2
   * @objetivo Listar os bloqueios do médico
   * @resultadoEsperado A lista traz o bloqueio criado
   */
  test('lista bloqueios do médico', async () => {
    const t = await token();
    await request(app).post(urlBloqueios()).set(auth(t)).send(ferias);
    const resposta = await request(app).get(urlBloqueios()).set(auth(t));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].motivo).toBe('Férias');
  });

  /**
   * @caso CT-API-085
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF06.2
   * @objetivo Remover um bloqueio
   * @resultadoEsperado A resposta é 204 e a lista fica vazia
   */
  test('remove bloqueio com 204', async () => {
    const t = await token();
    const criado = await request(app).post(urlBloqueios()).set(auth(t)).send(ferias);
    const resposta = await request(app).delete(`${urlBloqueios()}/${criado.body.id}`).set(auth(t));
    expect(resposta.status).toBe(204);
    expect((await request(app).get(urlBloqueios()).set(auth(t))).body).toEqual([]);
  });

  /**
   * @caso CT-API-086
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF06.2, RNF04
   * @objetivo Devolver 404 ao remover bloqueio inexistente
   * @resultadoEsperado A resposta é 404 NAO_ENCONTRADO
   */
  test('bloqueio inexistente devolve 404', async () => {
    const t = await token();
    const resposta = await request(app).delete(`${urlBloqueios()}/9999`).set(auth(t));
    expect(resposta.status).toBe(404);
  });

  /**
   * @caso CT-API-087
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30
   * @objetivo Recusar remoção de bloqueio por outro médico
   * @resultadoEsperado A resposta é 404 NAO_ENCONTRADO
   */
  test('médico não remove bloqueio de outro', async () => {
    const t = await token();
    const criado = await request(app).post(urlBloqueios()).set(auth(t)).send(ferias);
    const tBeatriz = await token('beatriz@clinica.com');
    const resposta = await request(app)
      .delete(`/api/medicos/${dados.medicos[1].id}/bloqueios/${criado.body.id}`)
      .set(auth(tBeatriz));
    expect(resposta.status).toBe(404);
  });

  /**
   * @caso CT-API-088
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1, RN15
   * @objetivo Refletir o bloqueio na consulta de horários
   * @resultadoEsperado O dia bloqueado devolve lista vazia de horários
   */
  test('bloqueio zera os horários do dia', async () => {
    const t = await token();
    await request(app).post(urlBloqueios()).set(auth(t)).send({ dataInicio: '2026-10-20', dataFim: '2026-10-20', motivo: 'Congresso' });
    const resposta = await request(app).get(`/api/medicos/${dados.medicos[0].id}/horarios?data=2026-10-20`).set(auth(t));
    expect(resposta.body.horarios).toEqual([]);
  });
});
