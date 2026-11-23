# lote-011

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 10 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0154 | CT-API-001 | responde ok sem token | passou |  |
| deepseek-0155 | CT-API-002 | resposta é JSON | passou |  |
| deepseek-0156 | CT-API-003 | não expõe x-powered-by | passou |  |
| deepseek-0157 | CT-API-004 | libera a origem do frontend | passou |  |
| deepseek-0158 | CT-API-005 | responde ao preflight OPTIONS | passou |  |
| deepseek-0159 | CT-API-006 | rota desconhecida devolve 404 em JSON | passou |  |
| deepseek-0160 | CT-API-007 | caminho fora de /api devolve 404 em JSON | passou |  |
| deepseek-0161 | CT-API-008 | método não suportado devolve 404 | passou |  |
| deepseek-0162 | CT-API-009 | erro não expõe stack trace | passou |  |
| deepseek-0163 | CT-API-010 | mensagem de rota inexistente é legível | passou |  |

## Arquivo: backend/__testes__/api/saude-e-rotas.test.js

```js
// API: saúde, rotas inexistentes, formato de erro e cabeçalhos gerais (RNF02, RNF04, RNF08).
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

let db;
let app;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
});

afterEach(() => {
  db.close();
  clock.definirAgora(null);
});

describe('GET /api/saude', () => {
  /**
   * @caso CT-API-001
   * @nivel api
   * @atributo confiabilidade
   * @subatributo disponibilidade
   * @requisito RNF04
   * @objetivo Verificar o endpoint de saúde sem autenticação
   * @resultadoEsperado A resposta é 200 com { status: "ok" }
   */
  test('responde ok sem token', async () => {
    const resposta = await request(app).get('/api/saude');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  /**
   * @caso CT-API-002
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04
   * @objetivo Garantir resposta JSON no endpoint de saúde
   * @resultadoEsperado O content-type é application/json
   */
  test('resposta é JSON', async () => {
    const resposta = await request(app).get('/api/saude');
    expect(resposta.headers['content-type']).toMatch(/application\/json/);
  });

  /**
   * @caso CT-API-003
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF04
   * @objetivo Não revelar a tecnologia do servidor
   * @resultadoEsperado O cabeçalho x-powered-by não é enviado
   */
  test('não expõe x-powered-by', async () => {
    const resposta = await request(app).get('/api/saude');
    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });

  /**
   * @caso CT-API-004
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Autorizar a origem do frontend por CORS
   * @resultadoEsperado O cabeçalho Access-Control-Allow-Origin devolve a origem pedida
   */
  test('libera a origem do frontend', async () => {
    const resposta = await request(app).get('/api/saude').set('Origin', 'http://localhost:5173');
    expect(resposta.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  /**
   * @caso CT-API-005
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Responder ao preflight do navegador
   * @resultadoEsperado O OPTIONS devolve 204 com os métodos permitidos
   */
  test('responde ao preflight OPTIONS', async () => {
    const resposta = await request(app)
      .options('/api/consultas')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(resposta.status).toBe(204);
    expect(resposta.headers['access-control-allow-methods']).toMatch(/POST/);
  });
});

describe('rotas inexistentes', () => {
  /**
   * @caso CT-API-006
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver 404 em JSON para rota desconhecida
   * @resultadoEsperado A resposta é 404 com codigo NAO_ENCONTRADO
   */
  test('rota desconhecida devolve 404 em JSON', async () => {
    const resposta = await request(app).get('/api/inexistente');
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  /**
   * @caso CT-API-007
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver erro em JSON para caminho fora de /api
   * @resultadoEsperado A resposta é 404 com a estrutura { erro: { codigo, mensagem } }
   */
  test('caminho fora de /api devolve 404 em JSON', async () => {
    const resposta = await request(app).get('/qualquer-coisa');
    expect(resposta.status).toBe(404);
    expect(Object.keys(resposta.body)).toEqual(['erro']);
    expect(Object.keys(resposta.body.erro).sort()).toEqual(['codigo', 'mensagem']);
  });

  /**
   * @caso CT-API-008
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Tratar método HTTP não suportado como rota inexistente
   * @resultadoEsperado O POST em /api/saude devolve 404 NAO_ENCONTRADO
   */
  test('método não suportado devolve 404', async () => {
    const resposta = await request(app).post('/api/saude').send({});
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  /**
   * @caso CT-API-009
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF04
   * @objetivo Não expor stack trace nas respostas de erro
   * @resultadoEsperado O corpo do erro não contém "stack" nem "at Object"
   */
  test('erro não expõe stack trace', async () => {
    const resposta = await request(app).get('/api/inexistente');
    const corpo = JSON.stringify(resposta.body);
    expect(corpo).not.toMatch(/stack/i);
    expect(corpo).not.toMatch(/at Object/);
  });

  /**
   * @caso CT-API-010
   * @nivel api
   * @atributo usabilidade
   * @subatributo estetica-adequada
   * @requisito RNF06
   * @objetivo Devolver mensagem legível em português na rota inexistente
   * @resultadoEsperado A mensagem é "Rota não encontrada."
   */
  test('mensagem de rota inexistente é legível', async () => {
    const resposta = await request(app).get('/api/inexistente');
    expect(resposta.body.erro.mensagem).toBe('Rota não encontrada.');
  });
});
```
