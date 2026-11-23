# lote-075

Modelo: gemini

Avalie com a skill `juiz-casos-teste` **somente os 3 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| gemini-0046 | CT-API-046 | GET /api/saude - retorna status ok sem autenticação | passou |  |
| gemini-0047 | CT-API-047 | GET /api/rota-inexistente - retorna 404 com corpo JSON padronizado | passou |  |
| gemini-0048 | CT-API-048 | cabeçalho x-powered-by deve estar desabilitado | passou |  |

## Arquivo: backend/__testes__/api/saude-api.test.js

```js
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { criarApp } = require('../../src/app');

describe('API: Saúde e Rotas Gerais (/api/saude)', () => {
  let db;
  let app;

  beforeEach(() => {
    db = abrirBanco(':memory:');
    app = criarApp({ db });
  });

  afterEach(() => {
    db.close();
  });

  /**
   * @caso CT-API-046
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Endpoint de saúde deve responder publicamente sem exigir token
   * @resultadoEsperado Status 200 com { status: "ok" }
   */
  test('GET /api/saude - retorna status ok sem autenticação', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  /**
   * @caso CT-API-047
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Retornar 404 padronizado em JSON ao acessar rota inexistente
   * @resultadoEsperado Status 404 com erro.codigo = NAO_ENCONTRADO
   */
  test('GET /api/rota-inexistente - retorna 404 com corpo JSON padronizado', async () => {
    const res = await request(app).get('/api/rota-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.erro.codigo).toBe('NAO_ENCONTRADO');
    expect(res.body.erro.mensagem).toMatch(/Rota não encontrada/i);
  });

  /**
   * @caso CT-API-048
   * @nivel api
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF01, RNF04
   * @objetivo Ocultar cabeçalho X-Powered-By para mitigar reconhecimento de stack tecnológica
   * @resultadoEsperado Cabeçalho x-powered-by ausente na resposta HTTP
   */
  test('cabeçalho x-powered-by deve estar desabilitado', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
```
