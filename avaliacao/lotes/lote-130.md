# lote-130

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 15 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0111 | CT-API-106 | rota inexistente devolve o contrato de erro | passou |  |
| mimo-0112 | CT-API-107 | erro de validação não expõe stack trace | passou |  |
| mimo-0113 | CT-API-108 | erro de autenticação usa o mesmo envelope | passou |  |
| mimo-0114 | CT-API-109 | método não suportado responde com o contrato de erro | passou |  |
| mimo-0115 | CT-API-110 | erros 401, 403, 404 e 422 têm mensagens em português | passou |  |
| mimo-0116 | CT-API-111 | nenhuma listagem expõe o hash da senha | passou |  |
| mimo-0117 | CT-API-112 | injeção SQL na busca de pacientes não retorna dados | passou |  |
| mimo-0118 | CT-API-113 | tentativa de injeção não altera a base | passou |  |
| mimo-0119 | CT-API-114 | injeção SQL no e-mail do login é recusada | passou |  |
| mimo-0120 | CT-API-115 | injeção no filtro de status responde 400 | passou |  |
| mimo-0121 | CT-API-116 | GET /api/saude responde 200 público | passou |  |
| mimo-0122 | CT-API-117 | resposta libera CORS para a origem do frontend | passou |  |
| mimo-0123 | CT-API-118 | resposta não libera CORS para origem não autorizada | passou |  |
| mimo-0124 | CT-API-119 | preflight OPTIONS devolve os cabeçalhos CORS | passou |  |
| mimo-0125 | CT-API-120 | respostas de sucesso são JSON | passou |  |

## Arquivo: backend/__testes__/api/erros-e-compatibilidade.test.js

```js
/**
 * Contrato de erros da API (RNF04, RNF06), segurança de entrada (RNF01, RNF03)
 * e compatibilidade HTTP: JSON, CORS e cabeçalhos.
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const request = require('supertest');
const clock = require('../../src/utils/clock');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

const ORIGEM = 'http://localhost:5173';

let db;
let app;
let carlos;
let ana;
let tokenPaciente;

beforeEach(async () => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  const dados = semear(db);
  app = criarApp({ db });
  [carlos] = dados.medicos;
  [ana] = dados.pacientes;

  const res = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
  tokenPaciente = res.body.token;
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

const autenticado = (req) => req.set('Authorization', `Bearer ${tokenPaciente}`);

describe('RNF04 — contrato de erro em JSON', () => {
  /**
   * @caso CT-API-106
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04
   * @objetivo Devolver o contrato de erro para rota inexistente
   * @resultadoEsperado a resposta é 404 com { erro: { codigo, mensagem } } e nada além disso
   */
  test('rota inexistente devolve o contrato de erro', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' } });
    expect(Object.keys(res.body)).toEqual(['erro']);
  });

  /**
   * @caso CT-API-107
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04
   * @objetivo Não expor stack trace em nenhuma resposta de erro
   * @resultadoEsperado o corpo de erro só tem as chaves codigo e mensagem
   */
  test('erro de validação não expõe stack trace', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@email.com' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.erro).sort()).toEqual(['codigo', 'mensagem']);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at \w+\.|node_modules/i);
  });

  /**
   * @caso CT-API-108
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04
   * @objetivo Manter o mesmo formato de erro nas rotas protegidas
   * @resultadoEsperado o 401 usa o mesmo envelope de erro das demais rotas
   */
  test('erro de autenticação usa o mesmo envelope', async () => {
    const res = await request(app).get('/api/consultas');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Autenticação necessária.' } });
    expect(Object.keys(res.body.erro).sort()).toEqual(['codigo', 'mensagem']);
  });

  /**
   * @caso CT-API-109
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04, RNF06
   * @objetivo Responder com falha esperada quando o método da rota não existe
   * @resultadoEsperado o método não suportado cai na rota 404 com o contrato de erro
   */
  test('método não suportado responde com o contrato de erro', async () => {
    const res = await request(app).delete('/api/saude');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' } });
  });
});

describe('RNF06 — mensagens de erro em português', () => {
  /**
   * @caso CT-API-110
   * @nivel api
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Entregar mensagens de erro legíveis em português nos quatro códigos principais
   * @resultadoEsperado os erros 401, 403, 404 e 422 trazem mensagens em português
   */
  test('erros 401, 403, 404 e 422 têm mensagens em português', async () => {
    const semToken = await request(app).get('/api/consultas');
    expect(semToken.status).toBe(401);
    expect(semToken.body.erro.mensagem).toBe('Autenticação necessária.');

    const semPermissao = await autenticado(request(app).get('/api/pacientes'));
    expect(semPermissao.status).toBe(403);
    expect(semPermissao.body.erro.mensagem).toBe('Você não tem permissão para esta operação.');

    const recepcao = await request(app)
      .post('/api/auth/login')
      .send({ email: 'recepcao@clinica.com', senha: 'Senha123' });
    const inexistente = await request(app)
      .get('/api/consultas/99999')
      .set('Authorization', `Bearer ${recepcao.body.token}`);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.erro.mensagem).toBe('Consulta não encontrada.');

    const regra = await autenticado(
      request(app).post('/api/consultas').send({ medicoId: carlos.id, inicio: '2026-10-19 09:00' }),
    );
    expect(regra.status).toBe(422);
    expect(regra.body.erro.mensagem).toBe(
      'A consulta deve ser agendada com no mínimo 2 horas de antecedência.',
    );
  });
});

describe('RNF01 e RNF03 — segurança das entradas e saídas', () => {
  /**
   * @caso CT-API-111
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Conferir que nenhuma listagem devolve o hash da senha
   * @resultadoEsperado as rotas de usuário, médicos, pacientes e consultas não trazem senhaHash
   */
  test('nenhuma listagem expõe o hash da senha', async () => {
    const recepcao = await request(app)
      .post('/api/auth/login')
      .send({ email: 'recepcao@clinica.com', senha: 'Senha123' });
    const autorizacao = `Bearer ${recepcao.body.token}`;

    const rotas = ['/api/auth/me', '/api/medicos', '/api/pacientes', '/api/consultas', '/api/especialidades'];
    for (const rota of rotas) {
      const res = await request(app).get(rota).set('Authorization', autorizacao);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('senhaHash');
      expect(JSON.stringify(res.body)).not.toContain('senha_hash');
    }
    expect(JSON.stringify(ana)).not.toContain('senhaHash');
    expect(JSON.stringify(carlos)).not.toContain('senhaHash');
  });

  /**
   * @caso CT-API-112
   * @nivel api
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Neutralizar tentativa de injeção SQL na busca de pacientes
   * @resultadoEsperado a resposta é 200 com lista vazia, sem executar o trecho malicioso
   */
  test('injeção SQL na busca de pacientes não retorna dados', async () => {
    const recepcao = await request(app)
      .post('/api/auth/login')
      .send({ email: 'recepcao@clinica.com', senha: 'Senha123' });
    const res = await request(app)
      .get('/api/pacientes?busca=' + encodeURIComponent("' OR 1=1 --"))
      .set('Authorization', `Bearer ${recepcao.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  /**
   * @caso CT-API-113
   * @nivel api
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Manter a base intacta depois da tentativa de injeção
   * @resultadoEsperado a listagem normal continua devolvendo os três pacientes do seed
   */
  test('tentativa de injeção não altera a base', async () => {
    const recepcao = await request(app)
      .post('/api/auth/login')
      .send({ email: 'recepcao@clinica.com', senha: 'Senha123' });
    const autorizacao = `Bearer ${recepcao.body.token}`;

    await request(app)
      .get('/api/pacientes?busca=' + encodeURIComponent("'; DROP TABLE pacientes; --"))
      .set('Authorization', autorizacao);

    const res = await request(app).get('/api/pacientes').set('Authorization', autorizacao);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  /**
   * @caso CT-API-114
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF03, RF01.1
   * @objetivo Neutralizar injeção no e-mail do login
   * @resultadoEsperado a resposta é 401 e nenhum usuário é autenticado
   */
  test('injeção SQL no e-mail do login é recusada', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "' OR 1=1 --", senha: 'Senha123' });
    expect(res.status).toBe(401);
    expect(res.body.erro.mensagem).toBe('E-mail ou senha inválidos.');
    expect(res.body.token).toBeUndefined();
  });

  /**
   * @caso CT-API-115
   * @nivel api
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03, RF10.3
   * @objetivo Validar o filtro de status no servidor antes de consultar
   * @resultadoEsperado a resposta é 400 VALIDACAO com a mensagem de status inválido
   */
  test('injeção no filtro de status responde 400', async () => {
    const recepcao = await request(app)
      .post('/api/auth/login')
      .send({ email: 'recepcao@clinica.com', senha: 'Senha123' });
    const res = await request(app)
      .get('/api/consultas?status=' + encodeURIComponent("' OR '1'='1"))
      .set('Authorization', `Bearer ${recepcao.body.token}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'Status inválido.' } });
  });
});

describe('Compatibilidade — JSON, CORS e cabeçalhos HTTP', () => {
  /**
   * @caso CT-API-116
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Manter a rota pública de saúde respondendo JSON simples
   * @resultadoEsperado a resposta é 200 com { status: 'ok' } sem autenticação
   */
  test('GET /api/saude responde 200 público', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['content-type']).toContain('application/json');
  });

  /**
   * @caso CT-API-117
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Devolver o cabeçalho CORS para a origem do frontend
   * @resultadoEsperado a resposta traz access-control-allow-origin igual à origem autorizada
   */
  test('resposta libera CORS para a origem do frontend', async () => {
    const res = await request(app).get('/api/saude').set('Origin', ORIGEM);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGEM);
    expect(res.headers['content-type']).toContain('application/json');
  });

  /**
   * @caso CT-API-118
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF08
   * @objetivo Não liberar CORS para origem fora da lista autorizada
   * @resultadoEsperado a resposta não traz o cabeçalho de origem permitida
   */
  test('resposta não libera CORS para origem não autorizada', async () => {
    const res = await request(app).get('/api/saude').set('Origin', 'http://localhost:9999');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  /**
   * @caso CT-API-119
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Responder ao preflight OPTIONS do navegador
   * @resultadoEsperado a resposta é de sucesso e informa método e cabeçalhos permitidos
   */
  test('preflight OPTIONS devolve os cabeçalhos CORS', async () => {
    const res = await request(app)
      .options('/api/consultas')
      .set('Origin', ORIGEM)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGEM);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('authorization');
  });

  /**
   * @caso CT-API-120
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar JSON no cabeçalho content-type das respostas de sucesso
   * @resultadoEsperado as respostas 200 e 201 trazem content-type application/json
   */
  test('respostas de sucesso são JSON', async () => {
    const listagem = await autenticado(request(app).get('/api/consultas'));
    expect(listagem.status).toBe(200);
    expect(listagem.headers['content-type']).toContain('application/json');

    const criacao = await request(app).post('/api/auth/registro').send({
      nome: 'Paula Nunes',
      email: 'paula@email.com',
      senha: 'Senha123',
      cpf: '12345678909',
      dataNascimento: '1992-03-10',
    });
    expect(criacao.status).toBe(201);
    expect(criacao.headers['content-type']).toContain('application/json');
  });
});
```
