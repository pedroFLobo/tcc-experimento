const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

describe('API: Especialidades (/api/especialidades)', () => {
  let db;
  let app;
  let tokenRecepcao;
  let tokenPaciente;

  beforeEach(async () => {
    db = abrirBanco(':memory:');
    semear(db);
    app = criarApp({ db });

    const loginRec = await request(app).post('/api/auth/login').send({ email: 'recepcao@clinica.com', senha: SENHA_PADRAO });
    tokenRecepcao = loginRec.body.token;

    const loginPac = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: SENHA_PADRAO });
    tokenPaciente = loginPac.body.token;
  });

  afterEach(() => {
    db.close();
  });

  /**
   * @caso CT-API-010
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.2
   * @objetivo Listar especialidades para qualquer usuário autenticado
   * @resultadoEsperado Status 200 com array de especialidades cadastradas
   */
  test('GET /api/especialidades - lista especialidades cadastradas', async () => {
    const res = await request(app)
      .get('/api/especialidades')
      .set('Authorization', `Bearer ${tokenPaciente}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    expect(res.body[0]).toHaveProperty('precoCentavos');
  });

  /**
   * @caso CT-API-011
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF03.1, RN09
   * @objetivo Cadastrar nova especialidade quando autenticado como recepção
   * @resultadoEsperado Status 201 com dados da especialidade cadastrada
   */
  test('POST /api/especialidades - recepção cria nova especialidade', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ nome: 'Psiquiatria', precoCentavos: 32000 });

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Psiquiatria');
    expect(res.body.precoCentavos).toBe(32000);
  });

  /**
   * @caso CT-API-012
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN30, RF03.1
   * @objetivo Impedir paciente ou médico de criar especialidade
   * @resultadoEsperado Status 403 com erro.codigo = SEM_PERMISSAO
   */
  test('POST /api/especialidades - paciente recebe 403 ao tentar criar especialidade', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ nome: 'Urologia', precoCentavos: 25000 });

    expect(res.status).toBe(403);
    expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
  });

  /**
   * @caso CT-API-013
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN09, RNF04
   * @objetivo Retornar 409 CONFLITO ao tentar cadastrar especialidade com nome já existente
   * @resultadoEsperado Status 409 com erro.codigo = CONFLITO
   */
  test('POST /api/especialidades - retorna 409 para nome duplicado', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ nome: 'Clínica Geral', precoCentavos: 18000 }); // já existe

    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('CONFLITO');
  });

  /**
   * @caso CT-API-014
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN09, RNF04
   * @objetivo Retornar 400 VALIDACAO quando preço base for inválido ou negativo
   * @resultadoEsperado Status 400 com erro.codigo = VALIDACAO
   */
  test('POST /api/especialidades - retorna 400 para preço inválido', async () => {
    const res = await request(app)
      .post('/api/especialidades')
      .set('Authorization', `Bearer ${tokenRecepcao}`)
      .send({ nome: 'Geriatria', precoCentavos: -500 });

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO');
  });
});
