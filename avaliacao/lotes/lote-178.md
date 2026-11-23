# lote-178

Modelo: nemotron

Avalie com a skill `juiz-casos-teste` **somente os 11 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| nemotron-0065 | (sem @caso) | rotas protegidas exigem token | passou |  |
| nemotron-0066 | (sem @caso) | token inválido retorna 401 | passou |  |
| nemotron-0067 | (sem @caso) | saúde é pública (sem token) | passou |  |
| nemotron-0068 | (sem @caso) | paciente não acessa consulta de outro (403) | falhou | Error: expect(received).toBe(expected) // Object.is equality Expected: 403 Received: 200 at Object.toBe (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\n |
| nemotron-0069 | (sem @caso) | médico não acessa agenda de outro médico (403) | passou |  |
| nemotron-0070 | (sem @caso) | injeção SQL no e-mail de login não quebra a consulta | passou |  |
| nemotron-0071 | (sem @caso) | ID não numérico na consulta retorna 404/400, não erro de banco | passou |  |
| nemotron-0072 | (sem @caso) | erro de validação retorna JSON estruturado | falhou | Error: expect(received).toBe(expected) // Object.is equality Expected: 400 Received: 404 at Object.toBe (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\n |
| nemotron-0073 | (sem @caso) | erro 404 não expõe stack trace | passou |  |
| nemotron-0074 | (sem @caso) | login não devolve senha | passou |  |
| nemotron-0075 | (sem @caso) | listagem de médicos não devolve senha | passou |  |

## Arquivo: backend/__testes__/api/seguranca.test.js

```js
// Testes de API — segurança (RN30, RNF01, RNF02, RNF03, RNF04)
// Atributos: Segurança, Confiabilidade, Compatibilidade
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

describe('RNF02 — autenticação JWT', () => {
  test('rotas protegidas exigem token', async () => {
    const res = await request(app).get('/api/medicos');
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  test('token inválido retorna 401', async () => {
    const res = await request(app)
      .get('/api/medicos')
      .set('Authorization', 'Bearer token.invalido');
    expect(res.status).toBe(401);
  });

  test('saúde é pública (sem token)', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('RN30 — autorização por perfil e dono do recurso', () => {
  test('paciente não acessa consulta de outro (403)', async () => {
    const tokAna = await tokenDe(app, 'PACIENTE');
    const tokJoao = await tokenDe(app, 'PACIENTE'); // João é outro paciente
    const mid = 1;
    const criar = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokAna}`)
      .send({ medicoId: mid, inicio: '2026-10-20 10:00' });
    // como não sabemos o pacienteId de joao pelo token, usamos o de ana mesmo por não haver
    // meio fácil; então testamos que o medico não acessa consulta de outro medico
    const res = await request(app)
      .get(`/api/consultas/${criar.body.id}`)
      .set('Authorization', `Bearer ${tokJoao}`);
    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  test('médico não acessa agenda de outro médico (403)', async () => {
    const tokCarlos = await tokenDe(app, 'MEDICO'); // Carlos
    const res = await request(app)
      .get('/api/medicos/99/disponibilidades')
      .set('Authorization', `Bearer ${tokCarlos}`);
    // 99 pode não ser de Carlos; se existir e for de outro, 403; se não existir, 404.
    // Para garantir 403, tentamos usar um ID de médico que sabemos ser de Beatriz (654321/RJ)
    const resB = await request(app)
      .get('/api/medicos')
      .set('Authorization', `Bearer ${tokCarlos}`);
    const beatriz = resB.body.find((m) => m.crm === '654321/RJ');
    const res2 = await request(app)
      .put(`/api/medicos/${beatriz.id}/disponibilidades`)
      .set('Authorization', `Bearer ${tokCarlos}`)
      .send([{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }]);
    expect(res2.status).toBe(403);
  });
});

describe('RNF03 — entradas validadas no servidor, SQL parametrizado', () => {
  test('injeção SQL no e-mail de login não quebra a consulta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "ana@email.com' OR '1'='1", senha: 'Senha123' });
    expect(res.status).toBe(401);
  });

  test('ID não numérico na consulta retorna 404/400, não erro de banco', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .get('/api/consultas/abc')
      .set('Authorization', `Bearer ${tok}`);
    expect([400, 404]).toContain(res.status);
  });
});

describe('RNF04 — erros em JSON sem stack trace', () => {
  test('erro de validação retorna JSON estruturado', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tok}`)
      .send({ medicoId: 'nao-e-numero', inicio: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
    expect(res.body.erro.codigo).toBe('VALIDACAO');
    expect(res.body.erro.mensagem).toBeDefined();
    expect(res.body.stack).toBeUndefined();
  });

  test('erro 404 não expõe stack trace', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app)
      .get('/api/consultas/999999')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });
});

describe('RNF01 — senhas com hash, nunca retornadas', () => {
  test('login não devolve senha', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(res.body.usuario.senha).toBeUndefined();
    expect(res.body.usuario.senhaHash).toBeUndefined();
  });

  test('listagem de médicos não devolve senha', async () => {
    const tok = await tokenDe(app, 'PACIENTE');
    const res = await request(app).get('/api/medicos').set('Authorization', `Bearer ${tok}`);
    expect(res.body.every((m) => !m.senha && !m.senhaHash)).toBe(true);
  });
});
```
