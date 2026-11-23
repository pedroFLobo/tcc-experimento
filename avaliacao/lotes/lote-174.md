# lote-174

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 5 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0039 | (sem @caso) | qualquer autenticado lista especialidades (RF03.2) | passou |  |
| nemotron-0040 | (sem @caso) | recepção cadastra especialidade | passou |  |
| nemotron-0041 | (sem @caso) | paciente não pode cadastrar especialidade (403) | passou |  |
| nemotron-0042 | (sem @caso) | rejeita nome duplicado | passou |  |
| nemotron-0043 | (sem @caso) | rejeita preço <= 0 | passou |  |

## Arquivo: backend/__testes__/api/especialidades.test.js

```js
// Testes de API — especialidades (RF03, RN09)
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

describe('GET /api/especialidades', () => {
  test('qualquer autenticado lista especialidades (RF03.2)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app).get('/api/especialidades').set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4);
    expect(res.body.find((e) => e.nome === 'Clínica Geral').precoCentavos).toBe(15000);
  });
});

describe('POST /api/especialidades — cadastro (RF03.1, só recepção, RN09)', () => {
  test('recepção cadastra especialidade', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'Ortopedia', precoCentavos: 20000 });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Ortopedia');
  });

  test('paciente não pode cadastrar especialidade (403)', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'X', precoCentavos: 100 });
    expect(res.status).toBe(403);
  });

  test('rejeita nome duplicado', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'Nova', precoCentavos: 100 });
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'Nova', precoCentavos: 200 });
    expect(res.status).toBe(409);
  });

  test('rejeita preço <= 0', async () => {
    const tok = await tokenDe(app, 'RECEPCAO');
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tok}`)
      .send({ nome: 'X', precoCentavos: 0 });
    expect(res.status).toBe(400);
  });
});
```
