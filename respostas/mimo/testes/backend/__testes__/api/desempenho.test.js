/**
 * Eficiência de desempenho (RNF05): horários livres, agendamento, listagem
 * de consultas e relatório respondem em menos de 500 ms com 10 mil consultas.
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const request = require('supertest');
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

const TOTAL_CONSULTAS = 10000;
const LIMITE_MS = 500;

let db;
let app;
let carlos;
let ana;
let tokens;

const pad = (n) => String(n).padStart(2, '0');
const formatar = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Espalha 10 mil consultas em datas futuras, sem tocar na data usada pelos testes.
function popularBase() {
  const status = ['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA'];
  const minutos = [0, 15, 30, 45];
  const stmt = db.prepare(`
    INSERT INTO consultas (paciente_id, medico_id, inicio, fim, status, valor_centavos, retorno_de, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?, 15000, NULL, '2026-10-19 08:00', '2026-10-19 08:00')
  `);
  const inserir = db.transaction((total) => {
    for (let i = 0; i < total; i += 1) {
      const inicio = new Date(2026, 9, 49 + (i % 200), 8 + (i % 9), minutos[i % 4]);
      const fim = new Date(inicio.getTime() + 30 * 60000);
      stmt.run(2, 1 + (i % 4), formatar(inicio), formatar(fim), status[i % 5]);
    }
  });
  inserir(TOTAL_CONSULTAS);
}

async function medir(fn) {
  const inicio = Date.now();
  const res = await fn();
  return { ms: Date.now() - inicio, res };
}

beforeEach(async () => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  popularBase();
  app = criarApp({ db });
  [carlos] = dados.medicos;
  [ana] = dados.pacientes;

  const logar = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return res.body.token;
  };
  tokens = {
    recepcao: await logar('recepcao@clinica.com'),
    paciente: await logar('ana@email.com'),
  };
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const comToken = (perfil) => `Bearer ${tokens[perfil]}`;

describe('RNF05 — tempo de resposta com 10 mil consultas', () => {
  /**
   * @caso CT-API-121
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-no-tempo
   * @requisito RNF05, RF07.1
   * @objetivo Medir a listagem de horários livres sobre uma base de 10 mil consultas
   * @resultadoEsperado a resposta chega em menos de 500 ms com os 16 horários do dia
   */
  test('horários livres respondem em menos de 500 ms', async () => {
    const { ms, res } = await medir(() =>
      request(app)
        .get(`/api/medicos/${carlos.id}/horarios?data=2026-10-26`)
        .set('Authorization', comToken('paciente')),
    );
    expect(res.status).toBe(200);
    expect(res.body.horarios).toHaveLength(16);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-122
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-no-tempo
   * @requisito RNF05, RF08.1
   * @objetivo Medir o agendamento sobre uma base de 10 mil consultas
   * @resultadoEsperado a criação responde em menos de 500 ms com status 201
   */
  test('agendamento responde em menos de 500 ms', async () => {
    const { ms, res } = await medir(() =>
      request(app)
        .post('/api/consultas')
        .set('Authorization', comToken('paciente'))
        .send({ medicoId: carlos.id, inicio: '2026-10-26 10:00' }),
    );
    expect(res.status).toBe(201);
    expect(res.body.valorCentavos).toBe(15000);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-123
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-no-tempo
   * @requisito RNF05, RF10.3
   * @objetivo Medir a listagem completa de consultas da recepção
   * @resultadoEsperado a resposta traz as 10 mil consultas em menos de 500 ms
   */
  test('listagem de consultas responde em menos de 500 ms', async () => {
    const { ms, res } = await medir(() =>
      request(app).get('/api/consultas').set('Authorization', comToken('recepcao')),
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(TOTAL_CONSULTAS);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-124
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-no-tempo
   * @requisito RNF05, RF11.1
   * @objetivo Medir o relatório agregado sobre uma base de 10 mil consultas
   * @resultadoEsperado o relatório devolve 2 mil realizadas em menos de 500 ms
   */
  test('relatório responde em menos de 500 ms', async () => {
    const { ms, res } = await medir(() =>
      request(app)
        .get('/api/admin/relatorios/resumo?dataInicio=2026-11-01&dataFim=2027-12-31')
        .set('Authorization', comToken('recepcao')),
    );
    expect(res.status).toBe(200);
    expect(res.body.porStatus.REALIZADA).toBe(2000);
    expect(res.body.faturamentoCentavos).toBe(2000 * 15000);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  /**
   * @caso CT-API-125
   * @nivel api
   * @atributo eficiencia-de-desempenho
   * @subatributo utilizacao-de-recursos
   * @requisito RNF05, RNF03
   * @objetivo Manter o relatório consistente com a base populada
   * @resultadoEsperado a soma dos cinco status do relatório é igual ao total inserido
   */
  test('relatório soma exatamente as 10 mil consultas da base', async () => {
    const { res } = await medir(() =>
      request(app)
        .get('/api/admin/relatorios/resumo?dataInicio=2026-11-01&dataFim=2027-12-31')
        .set('Authorization', comToken('recepcao')),
    );
    const total = Object.values(res.body.porStatus).reduce((soma, n) => soma + n, 0);
    expect(total).toBe(TOTAL_CONSULTAS);
    expect(res.body.faltasPorMedico).toHaveLength(4);
  });
});
