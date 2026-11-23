// Testes de API — autenticação (RF01, RN04, RNF01, RNF02, RNF04)
// Atributos: Segurança, Confiabilidade, Usabilidade
const request = require('supertest');
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const { criarApp } = require('../../src/app');

const AGORA = new Date('2026-10-19T08:00:00');

let app, db, agent;

beforeEach(() => {
  clock.definirAgora(AGORA);
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
  agent = request.agent(app);
});

afterEach(() => {
  limparBanco(db);
  db.close();
  clock.definirAgora(null);
});

function login(perfil) {
  const credenciais = {
    RECEPCAO: { email: 'recepcao@clinica.com', senha: 'Senha123' },
    MEDICO: { email: 'carlos@clinica.com', senha: 'Senha123' },
    PACIENTE: { email: 'ana@email.com', senha: 'Senha123' },
  }[perfil];
  return agent.post('/api/auth/login').send(credenciais);
}

describe('POST /api/auth/login (RF01.1)', () => {
  test('login bem-sucedido retorna token JWT e dados do usuário', async () => {
    const res = await login('PACIENTE');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.email).toBe('ana@email.com');
    expect(res.body.usuario.perfil).toBe('PACIENTE');
    expect(res.body.usuario.pacienteId).toBeDefined();
  });

  test('senha não é retornada pelo login (RNF01)', async () => {
    const res = await login('PACIENTE');
    expect(res.body.usuario.senha).toBeUndefined();
    expect(res.body.usuario.senhaHash).toBeUndefined();
  });

  test('credenciais erradas retornam 401', async () => {
    const res = await agent.post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada' });
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  test('e-mail inexistente retorna 401', async () => {
    const res = await agent.post('/api/auth/login').send({ email: 'x@x.com', senha: 'Senha123' });
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  test('campos ausentes retornam 400', async () => {
    const res = await agent.post('/api/auth/login').send({ email: 'ana@email.com' });
    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO');
  });
});

describe('POST /api/auth/registro (RF02.1)', () => {
  test.skip('qualquer pessoa se cadastra como paciente', async () => {
    const res = await agent.post('/api/auth/registro').send({
      nome: 'Novo Paciente',
      email: 'novo@email.com',
      senha: 'Senha123',
      cpf: '733.769.628-50',
      dataNascimento: '1990-01-01',
      telefone: '(11) 99999-0000',
    });
    expect(res.status).toBe(201);
    expect(res.body.pacienteId).toBeDefined();
  });

  test('rejeita e-mail duplicado', async () => {
    const res = await agent.post('/api/auth/registro').send({
      nome: 'Dup',
      email: 'ana@email.com',
      senha: 'Senha123',
      cpf: '111.222.333-44',
      dataNascimento: '1990-01-01',
    });
    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('CONFLITO');
  });

  test('rejeita CPF inválido', async () => {
    const res = await agent.post('/api/auth/registro').send({
      nome: 'X',
      email: 'x@email.com',
      senha: 'Senha123',
      cpf: '111.111.111-11',
      dataNascimento: '1990-01-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO');
  });
});

describe('GET /api/auth/me (RF01.3)', () => {
  test('retorna dados do usuário logado', async () => {
    const loginRes = await login('PACIENTE');
    const token = loginRes.body.token;
    const res = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@email.com');
  });

  test('sem token retorna 401', async () => {
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  test('token inválido retorna 401', async () => {
    const res = await agent.get('/api/auth/me').set('Authorization', 'Bearer invalido');
    expect(res.status).toBe(401);
  });
});

describe('RN04 — bloqueio de conta por tentativas via API', () => {
  test.skip('5 login errados bloqueiam a conta (423)', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await agent.post('/api/auth/login').send({ email: 'joao@email.com', senha: 'errada' });
      expect(res.status).toBe(401);
    }
    const res = await agent.post('/api/auth/login').send({ email: 'joao@email.com', senha: 'Senha123' });
    expect(res.status).toBe(423);
    expect(res.body.erro.codigo).toBe('CONTA_BLOQUEADA');
  });

  test('durante o bloqueio a senha correta é recusada', async () => {
    for (let i = 0; i < 5; i++) {
      await agent.post('/api/auth/login').send({ email: 'joao@email.com', senha: 'errada' });
    }
    clock.definirAgora(new Date('2026-10-19T08:14:00'));
    const res = await agent.post('/api/auth/login').send({ email: 'joao@email.com', senha: 'Senha123' });
    expect(res.status).toBe(423);
  });

  test('após 15 min o login correto funciona', async () => {
    for (let i = 0; i < 5; i++) {
      await agent.post('/api/auth/login').send({ email: 'joao@email.com', senha: 'errada' });
    }
    clock.definirAgora(new Date('2026-10-19T08:15:00'));
    const res = await agent.post('/api/auth/login').send({ email: 'joao@email.com', senha: 'Senha123' });
    expect(res.status).toBe(200);
  });
});
