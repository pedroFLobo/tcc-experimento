# lote-096

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 2 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0079 | CT-API-079 | horários livres respondem em menos de 500 ms | passou |  |
| glm-0080 | CT-API-080 | agendamento responde em menos de 500 ms | passou |  |

## Arquivo: backend/__testes__/api/desempenho-api.test.js

```js
// Testes de desempenho da API com volume de dados (RNF05).
const clock = require('../../src/utils/clock');
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db, app, tokenRecepcao, tokenPaciente;
const LIMITE_MS = 500;

beforeAll(async () => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
  const entrar = async (email) => {
    const r = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
    return r.body.token;
  };
  tokenRecepcao = await entrar('recepcao@clinica.com');
  tokenPaciente = await entrar('ana@email.com');
  popularDezMilConsultas();
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

// 10 mil consultas encerradas no passado (setembro/2026), fora dos dias usados nos testes.
function popularDezMilConsultas() {
  const inserir = db.prepare(`INSERT INTO consultas
    (paciente_id, medico_id, inicio, fim, status, valor_centavos, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, 'REALIZADA', 15000, '2026-10-19 08:00', '2026-10-19 08:00')`);
  db.transaction(() => {
    for (let i = 0; i < 10000; i += 1) {
      const dia = String(1 + (i % 18)).padStart(2, '0');
      const hora = String(8 + (i % 10)).padStart(2, '0');
      inserir.run(1, 1, `2026-09-${dia} ${hora}:00`, `2026-09-${dia} ${hora}:30`);
    }
  })();
}

/**
 * @caso CT-API-079
 * @nivel api
 * @atributo eficiencia-de-desempenho
 * @subatributo comportamento-no-tempo
 * @requisito RNF05
 * @objetivo Responder à listagem de horários livres em menos de 500 ms com 10 mil consultas na base
 * @resultadoEsperado GET /api/medicos/1/horarios devolve 200 com os 16 slots em menos de 500 ms
 */
test('horários livres respondem em menos de 500 ms', async () => {
  const comeco = Date.now();
  const r = await request(app)
    .get('/api/medicos/1/horarios?data=2026-10-20')
    .set('Authorization', `Bearer ${tokenPaciente}`);
  const duracao = Date.now() - comeco;
  expect(r.status).toBe(200);
  expect(r.body.horarios).toHaveLength(16);
  expect(duracao).toBeLessThan(LIMITE_MS);
});

/**
 * @caso CT-API-080
 * @nivel api
 * @atributo eficiencia-de-desempenho
 * @subatributo comportamento-no-tempo
 * @requisito RNF05, RN22
 * @objetivo Concluir o agendamento em menos de 500 ms com 10 mil consultas na base
 * @resultadoEsperado POST /api/consultas devolve 201 em menos de 500 ms com o valor correto
 */
test('agendamento responde em menos de 500 ms', async () => {
  const comeco = Date.now();
  const r = await request(app)
    .post('/api/consultas')
    .set('Authorization', `Bearer ${tokenRecepcao}`)
    .send({ pacienteId: 2, medicoId: 1, inicio: '2026-10-20 08:00' });
  const duracao = Date.now() - comeco;
  expect(r.status).toBe(201);
  expect(r.body.valorCentavos).toBe(13500); // João (68 anos): 10% de desconto na Clínica Geral
  expect(duracao).toBeLessThan(LIMITE_MS);
});
```
