# lote-171

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 5 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0001 | (sem @caso) | recepção inativa e reativa um usuário | falhou | Error: expect(received).toBe(expected) // Object.is equality Expected: true Received: undefined at Object.toBe (C:\Users\pedro\AppData\Local\Temp\clinica-experi |
| nemotron-0002 | (sem @caso) | paciente não pode alterar ativo (403) | passou |  |
| nemotron-0003 | (sem @caso) | ativo não booleano retorna 400 | passou |  |
| nemotron-0004 | (sem @caso) | recepção obtém resumo de consultas por período | falhou | Error: expect(received).toHaveProperty(path) Expected path: "totalPorStatus" Received path: [] Received value: {"faltasPorMedico": [{"encerradas": 1, "faltas":  |
| nemotron-0005 | (sem @caso) | paciente não acessa relatório (403) | passou |  |

## Arquivo: backend/__testes__/api/admin.test.js

```js
// Testes de API — admin (relatórios e ativo/inativo) (RF11, RF02.2)
// Atributos: Adequação funcional, Segurança, Confiabilidade
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
    MEDICO: { email: 'carlos@clinica.com', senha: 'Senha123' },
  }[perfil];
  const res = await request(app).post('/api/auth/login').send(credenciais);
  return res.body.token;
}

async function medicoIdDe(app) {
  const tok = await tokenDe(app, 'RECEPCAO');
  const res = await request(app).get('/api/medicos').set('Authorization', `Bearer ${tok}`);
  return res.body.find((m) => m.crm === '123456/SP').id;
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

describe('PATCH /api/admin/usuarios/:id/ativo', () => {
  test('recepção inativa e reativa um usuário', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const pid = await pacienteIdDe(app, 'ana@email.com');
    const desativa = await request(app)
      .patch(`/api/admin/usuarios/${pid}/ativo`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ ativo: false });
    expect(desativa.status).toBe(200);
    expect(desativa.body.ativo).toBe(false);
    const ativa = await request(app)
      .patch(`/api/admin/usuarios/${pid}/ativo`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ ativo: true });
    expect(ativa.body.ativo).toBe(true);
  });

  test('paciente não pode alterar ativo (403)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .patch('/api/admin/usuarios/1/ativo')
      .set('Authorization', `Bearer ${tok}`)
      .send({ ativo: false });
    expect(res.status).toBe(403);
  });

  test('ativo não booleano retorna 400', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const res = await request(app)
      .patch('/api/admin/usuarios/1/ativo')
      .set('Authorization', `Bearer ${tok}`)
      .send({ ativo: 'sim' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/relatorios/resumo (RF11)', () => {
  test('recepção obtém resumo de consultas por período', async () => {
    const tokRec = await tokenDe(app, 'RECEPCAO');
    const tokMed = await tokenDe(app, 'MEDICO');
    const mid = await medicoIdDe(app);
    const pidAna = await pacienteIdDe(app, 'ana@email.com');
    const pidJoao = await pacienteIdDe(app, 'joao@email.com');

    const c1 = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokRec}`)
      .send({ pacienteId: pidAna, medicoId: mid, inicio: '2026-10-20 10:00' });
    clock.definirAgora(new Date('2026-10-20T10:00:00'));
    await request(app)
      .post(`/api/consultas/${c1.body.id}/realizar`)
      .set('Authorization', `Bearer ${tokMed}`);

    const c2 = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokRec}`)
      .send({ pacienteId: pidJoao, medicoId: mid, inicio: '2026-10-21 10:00' });

    const res = await request(app)
      .get('/api/admin/relatorios/resumo?dataInicio=2026-10-01&dataFim=2026-10-31')
      .set('Authorization', `Bearer ${tokRec}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalPorStatus');
    expect(res.body).toHaveProperty('faturamento');
  });

  test('paciente não acessa relatório (403)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .get('/api/admin/relatorios/resumo?dataInicio=2026-10-01&dataFim=2026-10-31')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(403);
  });
});
```
