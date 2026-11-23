# lote-008

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 14 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0111 | CT-API-134 | JSON malformado devolve 400 | passou |  |
| deepseek-0112 | CT-API-135 | corpo vazio devolve 400 | passou |  |
| deepseek-0113 | CT-API-136 | corpo em lista devolve 400 | passou |  |
| deepseek-0114 | CT-API-137 | nome curto devolve mensagem clara | passou |  |
| deepseek-0115 | CT-API-138 | e-mail inválido devolve 400 | passou |  |
| deepseek-0116 | CT-API-139 | campos extras são ignorados | passou |  |
| deepseek-0117 | CT-API-140 | nome acentuado é preservado | passou |  |
| deepseek-0118 | CT-API-141 | status numérico devolve 400 | passou |  |
| deepseek-0119 | CT-API-142 | data com mês inexistente devolve 400 | passou |  |
| deepseek-0120 | CT-API-143 | dia inexistente devolve 400 | passou |  |
| deepseek-0121 | CT-API-144 | id fora do intervalo devolve 404 | passou |  |
| deepseek-0122 | CT-API-145 | servidor continua saudável após erros | passou |  |
| deepseek-0123 | CT-API-146 | formato de erro é consistente | passou |  |
| deepseek-0124 | CT-API-147 | cadastro inválido não grava registro | passou |  |

## Arquivo: backend/__testes__/api/erros-e-robustez.test.js

```js
// API: robustez a entradas malformadas e formato de erros (RNF04, RNF06).
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

let db;
let app;
let dados;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  dados = semear(db);
  app = criarApp({ db });
});

afterEach(() => {
  db.close();
  clock.definirAgora(null);
});

async function token(email = 'recepcao@clinica.com') {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha: 'Senha123' });
  return resposta.body.token;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('corpo da requisição', () => {
  /**
   * @caso CT-API-134
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Tratar JSON malformado com 400 em JSON
   * @resultadoEsperado A resposta é 400 VALIDACAO com mensagem sobre JSON
   */
  test('JSON malformado devolve 400', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "ana@email.com", ');
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('VALIDACAO');
    expect(resposta.body.erro.mensagem).toBe('Corpo da requisição não é um JSON válido.');
  });

  /**
   * @caso CT-API-135
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar corpo ausente no login
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('corpo vazio devolve 400', async () => {
    const resposta = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('');
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('VALIDACAO');
  });

  /**
   * @caso CT-API-136
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar lista no lugar do objeto de cadastro
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('corpo em lista devolve 400', async () => {
    const resposta = await request(app).post('/api/auth/registro').send([]);
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('VALIDACAO');
  });

  /**
   * @caso CT-API-137
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Recusar nome muito curto com mensagem clara
   * @resultadoEsperado A resposta é 400 com mensagem sobre 3 caracteres
   */
  test('nome curto devolve mensagem clara', async () => {
    const resposta = await request(app).post('/api/auth/registro').send({
      nome: 'Al',
      email: 'al@email.com',
      senha: 'Senha123',
      cpf: '12345678909',
      dataNascimento: '1990-01-01',
    });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Nome deve ter pelo menos 3 caracteres.');
  });

  /**
   * @caso CT-API-138
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar e-mail com formato inválido
   * @resultadoEsperado A resposta é 400 com mensagem sobre e-mail
   */
  test('e-mail inválido devolve 400', async () => {
    const resposta = await request(app).post('/api/auth/registro').send({
      nome: 'Paciente Teste',
      email: 'sem-arroba',
      senha: 'Senha123',
      cpf: '12345678909',
      dataNascimento: '1990-01-01',
    });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('E-mail inválido.');
  });

  /**
   * @caso CT-API-139
   * @nivel api
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF04
   * @objetivo Ignorar campos desconhecidos no corpo
   * @resultadoEsperado O login com campos extras devolve 200
   */
  test('campos extras são ignorados', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@email.com', senha: 'Senha123', perfil: 'RECEPCAO', admin: true });
    expect(resposta.status).toBe(200);
    expect(resposta.body.usuario.perfil).toBe('PACIENTE');
  });

  /**
   * @caso CT-API-140
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Aceitar nome com acentuação no cadastro
   * @resultadoEsperado A resposta é 201 com o nome acentuado preservado
   */
  test('nome acentuado é preservado', async () => {
    const resposta = await request(app).post('/api/auth/registro').send({
      nome: 'José Conceição',
      email: 'jose.conceicao@email.com',
      senha: 'Senha123',
      cpf: '98765432100',
      dataNascimento: '1985-03-08',
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body.nome).toBe('José Conceição');
  });
});

describe('parâmetros de consulta', () => {
  /**
   * @caso CT-API-141
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar status numérico no filtro de consultas
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('status numérico devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/consultas?status=123').set(auth(t));
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Status inválido.');
  });

  /**
   * @caso CT-API-142
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar data com mês inexistente no filtro
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('data com mês inexistente devolve 400', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/consultas?dataInicio=2026-13-01').set(auth(t));
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Datas do filtro devem estar no formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-API-143
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Recusar dia inexistente no filtro de consultas
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('dia inexistente devolve 400', async () => {
    const t = await token();
    expect((await request(app).get('/api/consultas?dataFim=2026-02-30').set(auth(t))).status).toBe(400);
  });

  /**
   * @caso CT-API-144
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Devolver 404 em id numérico inexistente fora do intervalo
   * @resultadoEsperado A resposta é 404 NAO_ENCONTRADO
   */
  test('id fora do intervalo devolve 404', async () => {
    const t = await token();
    const resposta = await request(app).get('/api/medicos/999999999999999999999').set(auth(t));
    expect(resposta.status).toBe(404);
  });
});

describe('recuperação após erro', () => {
  /**
   * @caso CT-API-145
   * @nivel api
   * @atributo confiabilidade
   * @subatributo disponibilidade
   * @requisito RNF04
   * @objetivo Continuar atendendo depois de uma sequência de erros
   * @resultadoEsperado O endpoint de saúde responde 200 após três requisições inválidas
   */
  test('servidor continua saudável após erros', async () => {
    await request(app).post('/api/auth/login').send({});
    await request(app).get('/api/inexistente');
    await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{');
    const resposta = await request(app).get('/api/saude');
    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('ok');
  });

  /**
   * @caso CT-API-146
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF04
   * @objetivo Manter o formato de erro em todas as falhas
   * @resultadoEsperado Cada erro traz apenas a chave "erro" com codigo e mensagem
   */
  test('formato de erro é consistente', async () => {
    const respostas = [
      await request(app).get('/api/consultas'),
      await request(app).get('/api/inexistente'),
      await request(app).post('/api/auth/login').send({}),
    ];
    for (const resposta of respostas) {
      expect(Object.keys(resposta.body)).toEqual(['erro']);
      expect(typeof resposta.body.erro.codigo).toBe('string');
      expect(typeof resposta.body.erro.mensagem).toBe('string');
    }
  });

  /**
   * @caso CT-API-147
   * @nivel api
   * @atributo confiabilidade
   * @subatributo integridade
   * @requisito RNF04
   * @objetivo Não gravar dados quando o cadastro falha na validação
   * @resultadoEsperado A lista de pacientes continua com 3 registros
   */
  test('cadastro inválido não grava registro', async () => {
    const t = await token();
    await request(app).post('/api/auth/registro').send({
      nome: 'Paciente Inválido',
      email: 'invalido@email.com',
      senha: 'Senha123',
      cpf: '000.000.000-00',
      dataNascimento: '1990-01-01',
    });
    const resposta = await request(app).get('/api/pacientes').set(auth(t));
    expect(resposta.body).toHaveLength(3);
  });
});
```
