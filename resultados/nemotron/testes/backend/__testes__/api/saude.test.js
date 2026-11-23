// Testes de API — saúde e compatibilidade (RNF08)
// Atributos: Compatibilidade
const request = require('supertest');
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const { criarApp } = require('../../src/app');

const AGORA = new Date('2026-10-19T08:00:00');

let app, db;

beforeEach(() => {
  clock.definirAgora(AGORA);
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
});

afterEach(() => {
  limparBanco(db);
  db.close();
  clock.definirAgora(null);
});

describe('GET /api/saúde (compatibilidade e contrato)', () => {
  test('retorna status ok sem autenticação', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('content-type JSON', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.headers['content-type']).toContain('application/json');
  });
});
