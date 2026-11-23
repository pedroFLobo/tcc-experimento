// Testes de API — pacientes (RF02.2, RF10.1, RN30)
// Atributos: Adequação funcional, Segurança
const request = require('supertest');
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const { criarApp } = require('../../src/app');

const AGORA = new Date('2026-10-19T08:00:00');

let app, db;

async function tokenDe(app, perfil) {
  const credenciais = {
    RECEPCAO: { email: 'recepcao@clinica.com', senha: 'Senha123' },
    PACIENTE: { email: 'ana@email.com', senha: 'Senha123' },
  }[perfil];
  const res = await request(app).post('/api/auth/login').send(credenciais);
  return res.body.token;
}

async function pacienteIdDe(app, email) {
  const tok = await tokenDe(app, 'RECEPCAO');
  const res = await request(app).get('/api/pacientes').set('Authorization', `Bearer ${tok}`);
  return res.body.find((p) => p.email === email).id;
}

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

describe('GET /api/pacientes — recepção lista', () => {
  test('recepção lista pacientes', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const res = await request(app).get('/api/pacientes').set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  test('paciente não pode listar pacientes (403)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app).get('/api/pacientes').set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/pacientes/:id', () => {
  test('paciente vê seus próprios dados', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const pid = await pacienteIdDe(app, 'ana@email.com');
    const res = await request(app).get(`/api/pacientes/${pid}`).set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@email.com');
  });

  test('recepção vê dados de qualquer paciente', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const pid = await pacienteIdDe(app, 'joao@email.com');
    const res = await request(app).get(`/api/pacientes/${pid}`).set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
  });

  test('paciente não vê dados de outro paciente (403, RN30)', async () => {
    const tokAna = await tokenDe(app, 'PACIENTE');
    const pidJoao = await pacienteIdDe(app, 'joao@email.com');
    const res = await request(app).get(`/api/pacientes/${pidJoao}`).set('Authorization', `Bearer ${tokAna}`);
    expect(res.status).toBe(403);
  });

  test('paciente inexistente retorna 404', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app).get('/api/pacientes/999999').set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(404);
  });
});
