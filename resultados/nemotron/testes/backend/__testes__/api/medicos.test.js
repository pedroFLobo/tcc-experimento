// Testes de API — médicos, disponibilidades e bloqueios (RF04, RF05, RF06, RF07)
// Atributos: Adequação funcional, Segurança, Compatibilidade
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
    MEDICO: { email: 'carlos@clinica.com', senha: 'Senha123' },
    PACIENTE: { email: 'ana@email.com', senha: 'Senha123' },
  }[perfil];
  const res = await request(app).post('/api/auth/login').send(credenciais);
  return res.body.token;
}

async function medicoIdDe(app, crm) {
  const tok = await tokenDe(app, 'RECEPCAO');
  const res = await request(app).get('/api/medicos').set('Authorization', `Bearer ${tok}`);
  return res.body.find((m) => m.crm === crm).id;
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

describe('GET /api/medicos', () => {
  test('lista médicos (todos autenticados)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app).get('/api/medicos').set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4);
  });

  test('sem token retorna 401', async () => {
    const res = await request(app).get('/api/medicos');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/medicos — cadastro (RF04, só recepção)', () => {
  test('recepção cadastra médico', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', `Bearer ${tok}`)
      .send({
        nome: 'Dr. Novo',
        email: 'novo@clinica.com',
        senha: 'Senha123',
        crm: '54321/SP',
        especialidadeId: 1,
        duracaoConsultaMin: 30,
      });
    expect(res.status).toBe(201);
    expect(res.body.crm).toBe('54321/SP');
  });

  test('paciente não pode cadastrar médico (403)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'X', email: 'x@clinica.com', senha: 'Senha123', crm: '1/SP', especialidadeId: 1 });
    expect(res.status).toBe(403);
  });

  test('rejeita CRM duplicado', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    await request(app)
      .post('/api/medicos')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'A', email: 'a@clinica.com', senha: 'Senha123', crm: '123456/SP', especialidadeId: 1 });
    const res = await request(app)
      .post('/api/medicos')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'B', email: 'b@clinica.com', senha: 'Senha123', crm: '123456/SP', especialidadeId: 1 });
    expect(res.status).toBe(409);
  });
});

describe('GET/PUT /api/medicos/:id/disponibilidades (RF05)', () => {
  test('médico dono define sua grade', async () => {
    const tok = await tokenDe(app, 'MEDICO'); // Carlos
    const mid = await medicoIdDe(app, '123456/SP');
    const res = await request(app)
      .put(`/api/medicos/${mid}/disponibilidades`)
      .set('Authorization', `Bearer ${tok}`)
      .send([{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }]);
    expect(res.status).toBe(200);
  });

  test('recepção define grade de qualquer médico', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const mid = await medicoIdDe(app, '123456/SP');
    const res = await request(app)
      .put(`/api/medicos/${mid}/disponibilidades`)
      .set('Authorization', `Bearer ${tok}`)
      .send([{ diaSemana: 3, horaInicio: '09:00', horaFim: '11:00' }]);
    expect(res.status).toBe(200);
  });

  test('médico não pode definir grade de outro médico (403)', async () => {
    const tok = await tokenDe(app, 'MEDICO'); // Carlos
    const midOutro = await medicoIdDe(app, '654321/RJ'); // Beatriz
    const res = await request(app)
      .put(`/api/medicos/${midOutro}/disponibilidades`)
      .set('Authorization', `Bearer ${tok}`)
      .send([{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }]);
    expect(res.status).toBe(403);
  });

  test('rejeita blocos sobrepostos (409/422)', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const mid = await medicoIdDe(app, '123456/SP');
    const res = await request(app)
      .put(`/api/medicos/${mid}/disponibilidades`)
      .set('Authorization', `Bearer ${tok}`)
      .send([
        { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
        { diaSemana: 1, horaInicio: '10:00', horaFim: '14:00' },
      ]);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/medicos/:id/horarios?data= (RF07)', () => {
  test('lista horários livres de um médico em uma data', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app, '123456/SP');
    const res = await request(app)
      .get(`/api/medicos/${mid}/horarios?data=2026-10-19`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('POST/DELETE /api/medicos/:id/bloqueios (RF06)', () => {
  test('recepção cria e remove bloqueio', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const mid = await medicoIdDe(app, '123456/SP');
    const criar = await request(app)
      .post(`/api/medicos/${mid}/bloqueios`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ dataInicio: '2026-10-25', dataFim: '2026-10-26', motivo: 'Férias' });
    expect(criar.status).toBe(201);
    const remover = await request(app)
      .delete(`/api/medicos/${mid}/bloqueios/${criar.body.id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(remover.status).toBe(200);
  });

  test('médico dono cria bloqueio na própria agenda', async () => {
    const tok = await tokenDe(app, 'MEDICO');
    const mid = await medicoIdDe(app, '123456/SP');
    const res = await request(app)
      .post(`/api/medicos/${mid}/bloqueios`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ dataInicio: '2026-10-25', dataFim: '2026-10-26', motivo: 'Congresso' });
    expect(res.status).toBe(201);
  });

  test('médico não pode criar bloqueio de outro médico (403)', async () => {
    const tok = await tokenDe(app, 'MEDICO'); // Carlos
    const midOutro = await medicoIdDe(app, '654321/RJ');
    const res = await request(app)
      .post(`/api/medicos/${midOutro}/bloqueios`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ dataInicio: '2026-10-25', dataFim: '2026-10-26', motivo: 'X' });
    expect(res.status).toBe(403);
  });
});
