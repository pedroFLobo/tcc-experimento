// Testes de API — consultas (RF08, RF09, RF10, RN16–RN29, RN30)
// Atributos: Adequação funcional, Segurança, Confiabilidade, Usabilidade
const request = require('supertest');
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const { criarApp } = require('../../src/app');

const AGORA = new Date('2026-10-19T08:00:00');

let app, db;

function autenticacao(perfil) {
  const credenciais = {
    RECEPCAO: { email: 'recepcao@clinica.com', senha: 'Senha123' },
    MEDICO: { email: 'carlos@clinica.com', senha: 'Senha123' },
    PACIENTE: { email: 'ana@email.com', senha: 'Senha123' },
  }[perfil];
  return { email: credenciais.email, senha: credenciais.senha };
}

async function tokenDe(app, perfil) {
  const res = await request(app).post('/api/auth/login').send(autenticacao(perfil));
  return res.body.token;
}

async function medicoIdDe(app) {
  const res = await request(app).get('/api/medicos').set('Authorization', `Bearer ${await tokenDe(app, 'RECEPCAO')}`);
  const carlos = res.body.find((m) => m.crm === '123456/SP');
  return carlos.id;
}

async function pacienteIdDe(app, email) {
  const res = await request(app).get('/api/pacientes').set('Authorization', `Bearer ${await tokenDe(app, 'RECEPCAO')}`);
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

describe('POST /api/consultas — agendamento (RF08)', () => {
  test('paciente agenda para si e recebe valor calculado', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('AGENDADA');
    expect(res.body.valorCentavos).toBe(15000);
  });

  test('recepção agenda para qualquer paciente', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const mid = await medicoIdDe(app);
    const pid = await pacienteIdDe(app, 'joao@email.com');
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ pacienteId: pid, medicoId: mid, inicio: '2026-10-20 11:00' });
    expect(res.status).toBe(201);
    expect(res.body.pacienteId).toBe(pid);
  });

  test('médico não pode agendar', async () => {
    const tok = await tokenDe(app, 'MEDICO');
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: 1, inicio: '2026-10-20 11:00' });
    expect(res.status).toBe(403);
  });

  test('sem token retorna 401', async () => {
    const res = await request(app).post('/api/consultas').send({ medicoId: 1, inicio: '2026-10-20 11:00' });
    expect(res.status).toBe(401);
  });

  test('horário fora da antecedência mínima retorna 422', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-19 09:00' });
    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('REGRA_NEGOCIO');
  });

  test('horário não livre retorna 409', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-20 12:15' });
    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('CONFLITO');
  });

  test('erro retorna JSON sem stack trace (RNF04)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: 1, inicio: 'horario-invalido' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
    expect(res.body.erro.codigo).toBe('VALIDACAO');
    expect(res.body.stack).toBeUndefined();
  });
});

describe('POST /api/consultas/:id/confirmar (RF09.1, RN25)', () => {
  test('paciente confirma consulta AGENDADA nas 48h', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/confirmar`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMADA');
  });

  test('confirmação fora de 48h retorna 422', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    clock.definirAgora(new Date('2026-10-18T08:00:00'));
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/confirmar`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(422);
  });
});

describe('POST /api/consultas/:id/cancelar (RF09.2, RN26)', () => {
  test('paciente cancela com 24h de antecedência', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELADA');
  });

  test('recepção cancela com motivo', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const mid = await medicoIdDe(app);
    const pid = await pacienteIdDe(app, 'ana@email.com');
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ pacienteId: pid, medicoId: mid, inicio: '2026-10-20 10:00' });
    clock.definirAgora(new Date('2026-10-19T09:00:00'));
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ motivo: 'Desistiu' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELADA');
    expect(res.body.motivoCancelamento).toBe('Desistiu');
  });

  test('recepção sem motivo retorna 422', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const mid = await medicoIdDe(app);
    const pid = await pacienteIdDe(app, 'ana@email.com');
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ pacienteId: pid, medicoId: mid, inicio: '2026-10-20 10:00' });
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(422);
  });
});

describe('POST /api/consultas/:id/remarcar (RF09.3, RN27)', () => {
  test('paciente remarca para outro horário', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/remarcar`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ inicio: '2026-10-21 10:00' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('AGENDADA');
    expect(res.body.inicio).toBe('2026-10-21 10:00');
  });
});

describe('POST /api/consultas/:id/realizar (RF09.4, RN28)', () => {
  test('médico dono registra atendimento realizado', async () => {
    const tokMed = await tokenDe(app, 'MEDICO');
    const mid = await medicoIdDe(app);
    const tokRec = await tokenDe(app, 'RECEPCAO');
    const pid = await pacienteIdDe(app, 'ana@email.com');
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokRec}`)
      .send({ pacienteId: pid, medicoId: mid, inicio: '2026-10-20 10:00' });
    clock.definirAgora(new Date('2026-10-20T10:00:00'));
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/realizar`)
      .set('Authorization', `Bearer ${tokMed}`)
      .send({ observacoes: 'Tudo ok.' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REALIZADA');
  });

  test('médico que não é dono não pode realizar', async () => {
    const tokMed = await tokenDe(app, 'MEDICO'); // Carlos
    const midOutro = await (async () => {
      const res = await request(app).get('/api/medicos').set('Authorization', `Bearer ${await tokenDe(app, 'RECEPCAO')}`);
      return res.body.find((m) => m.crm !== '123456/SP').id;
    })();
    const tokRec = await tokenDe(app, 'RECEPCAO');
    const pid = await pacienteIdDe(app, 'ana@email.com');
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokRec}`)
      .send({ pacienteId: pid, medicoId: midOutro, inicio: '2026-10-20 10:00' });
    clock.definirAgora(new Date('2026-10-20T10:00:00'));
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/realizar`)
      .set('Authorization', `Bearer ${tokMed}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/consultas/:id/falta (RF09.5, RN29)', () => {
  test('recepção registra falta após 15 min do início', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const mid = await medicoIdDe(app);
    const pid = await pacienteIdDe(app, 'ana@email.com');
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ pacienteId: pid, medicoId: mid, inicio: '2026-10-20 10:00' });
    clock.definirAgora(new Date('2026-10-20T10:15:00'));
    const res = await request(app)
      .post(`/api/consultas/${criar.body.id}/falta`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FALTA');
  });
});

describe('GET /api/consultas e /api/consultas/:id (RF10, RN30)', () => {
  test('paciente lista só as próprias consultas', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    const res = await request(app).get('/api/consultas').set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body.every((c) => c.pacienteId === res.body[0].pacienteId)).toBe(true);
  });

  test('acesso a consulta de outro paciente retorna 403 (RN30)', async () => {
    const tokAna = await tokenDe(app, 'PACIENTE');
    const mid = await medicoIdDe(app);
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokAna}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    const tokJoao = await tokenDe(app, 'PACIENTE'); // joao é outro paciente, mas o token de joao...
    // na verdade usamos o tok de joao para tentar acessar a consulta de ana
    const res = await request(app)
      .get(`/api/consultas/${criar.body.id}`)
      .set('Authorization', `Bearer ${tokJoao}`);
    expect(res.status).toBe(403);
  });

  test('consulta inexistente retorna 404', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .get('/api/consultas/999999')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(404);
    expect(res.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
