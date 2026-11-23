// API: eficiência de desempenho com base grande (RNF05).
const { performance } = require('perf_hooks');
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

const LIMITE_MS = 500;
const TOTAL = 10000;

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

// Popula consultas encerradas em datas antigas, para não interferir na agenda de 2026.
function popularConsultas(total = TOTAL) {
  const inserir = db.prepare(`INSERT INTO consultas
    (paciente_id, medico_id, inicio, fim, status, valor_centavos, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  db.transaction(() => {
    for (let i = 0; i < total; i++) {
      const pacienteId = (i % 3) + 1;
      const medicoId = (i % 4) + 1;
      const dia = String((i % 28) + 1).padStart(2, '0');
      const hora = String(8 + (i % 10)).padStart(2, '0');
      const inicio = `2025-03-${dia} ${hora}:00`;
      const fim = `2025-03-${dia} ${hora}:30`;
      inserir.run(pacienteId, medicoId, inicio, fim, i % 5 === 0 ? 'REALIZADA' : 'CANCELADA', 15000, inicio, inicio);
    }
  })();
}

async function token(email = 'recepcao@clinica.com') {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
  return resposta.body.token;
}

async function medir(executar) {
  const inicio = performance.now();
  const resposta = await executar();
  return { resposta, ms: performance.now() - inicio };
}

describe('desempenho com 10 mil consultas', () => {
  /**
   * @caso CT-API-148
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-em-relacao-ao-tempo
   * @requisito RNF05
   * @objetivo Consultar horários livres com 10 mil consultas na base
   * @resultadoEsperado A resposta é 200 em menos de 500 ms
   */
  test('horários livres respondem em menos de 500 ms', async () => {
    popularConsultas();
    const t = await token('ana@email.com');
    const { resposta, ms } = await medir(() =>
      request(app).get(`/api/medicos/${dados.medicos[0].id}/horarios?data=2026-10-20`).set('Authorization', `Bearer ${t}`),
    );
    expect(resposta.status).toBe(200);
    expect(resposta.body.horarios).toHaveLength(16);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-149
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-em-relacao-ao-tempo
   * @requisito RNF05
   * @objetivo Agendar consulta com 10 mil consultas na base
   * @resultadoEsperado A resposta é 201 em menos de 500 ms
   */
  test('agendamento responde em menos de 500 ms', async () => {
    popularConsultas();
    const t = await token();
    const { resposta, ms } = await medir(() =>
      request(app)
        .post('/api/consultas')
        .set('Authorization', `Bearer ${t}`)
        .send({ pacienteId: dados.pacientes[0].id, medicoId: dados.medicos[0].id, inicio: '2026-10-20 09:00' }),
    );
    expect(resposta.status).toBe(201);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-150
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-em-relacao-ao-tempo
   * @requisito RNF05
   * @objetivo Listar 10 mil consultas pela recepção
   * @resultadoEsperado A resposta é 200 com 10 mil itens em menos de 500 ms
   */
  test('listagem responde em menos de 500 ms', async () => {
    popularConsultas();
    const t = await token();
    const { resposta, ms } = await medir(() => request(app).get('/api/consultas').set('Authorization', `Bearer ${t}`));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(TOTAL);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-151
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo utilizacao-de-recursos
   * @requisito RNF05
   * @objetivo Emitir o relatório com 10 mil consultas na base
   * @resultadoEsperado A resposta é 200 em menos de 500 ms
   */
  test('relatório responde em menos de 500 ms', async () => {
    popularConsultas();
    const t = await token();
    const { resposta, ms } = await medir(() =>
      request(app)
        .get('/api/admin/relatorios/resumo?dataInicio=2025-03-01&dataFim=2025-03-31')
        .set('Authorization', `Bearer ${t}`),
    );
    expect(resposta.status).toBe(200);
    expect(resposta.body.faturamentoCentavos).toBeGreaterThan(0);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-152
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-em-relacao-ao-tempo
   * @requisito RNF05
   * @objetivo Consultar horários de um dia sem relação com as 10 mil consultas
   * @resultadoEsperado O dia continua com os 16 horários da grade
   */
  test('consultas antigas não afetam a agenda futura', async () => {
    popularConsultas();
    const t = await token();
    const resposta = await request(app)
      .get(`/api/medicos/${dados.medicos[0].id}/horarios?data=2026-10-20`)
      .set('Authorization', `Bearer ${t}`);
    expect(resposta.body.horarios).toHaveLength(16);
  });
});
