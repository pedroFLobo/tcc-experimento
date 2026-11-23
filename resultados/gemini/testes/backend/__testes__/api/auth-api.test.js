const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear, SENHA_PADRAO } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');
const clock = require('../../src/utils/clock');

describe('API: Autenticação (/api/auth)', () => {
  let db;
  let app;
  const agoraFixo = new Date('2026-10-19T08:00:00');

  beforeEach(() => {
    clock.definirAgora(agoraFixo);
    db = abrirBanco(':memory:');
    semear(db);
    app = criarApp({ db });
  });

  afterEach(() => {
    clock.definirAgora(null);
    db.close();
  });

  /**
   * @caso CT-API-001
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Fazer login com credenciais válidas e receber token JWT
   * @resultadoEsperado Status 200 com token JWT e dados públicos do usuário
   */
  test('POST /api/auth/login - deve realizar login com sucesso', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@email.com', senha: SENHA_PADRAO });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario.email).toBe('ana@email.com');
    expect(res.body.usuario.perfil).toBe('PACIENTE');
    expect(res.body.usuario.pacienteId).toBeDefined();
  });

  /**
   * @caso CT-API-002
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF04
   * @objetivo Recusar credenciais inválidas com status 401 e código de erro
   * @resultadoEsperado Status 401 com erro.codigo = NAO_AUTENTICADO
   */
  test('POST /api/auth/login - deve retornar 401 para senha incorreta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@email.com', senha: 'SenhaIncorreta' });

    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
    expect(res.body.erro.mensagem).toBeDefined();
  });

  /**
   * @caso CT-API-003
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04, RNF04
   * @objetivo Bloquear requisições com 423 após 5 falhas seguidas de login
   * @resultadoEsperado Status 423 com erro.codigo = CONTA_BLOQUEADA
   */
  test('POST /api/auth/login - deve responder 423 CONTA_BLOQUEADA na 5ª falha consecutiva', async () => {
    for (let i = 1; i <= 4; i++) {
      await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada' });
    }

    const res5 = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada' });
    expect(res5.status).toBe(423);
    expect(res5.body.erro.codigo).toBe('CONTA_BLOQUEADA');
  });

  /**
   * @caso CT-API-004
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF01.1, RNF04
   * @objetivo Rejeitar requisição com campos obrigatórios ausentes
   * @resultadoEsperado Status 400 com erro.codigo = VALIDACAO
   */
  test('POST /api/auth/login - deve responder 400 se e-mail ou senha não forem enviados', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO');
  });

  /**
   * @caso CT-API-005
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1, RF02.3
   * @objetivo Registrar paciente por rota pública com sucesso
   * @resultadoEsperado Status 201 com dados do paciente cadastrado
   */
  test('POST /api/auth/registro - auto-cadastro de paciente retorna 201', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({
        nome: 'Juliana Paes',
        email: 'juliana@email.com',
        senha: 'Senha123',
        cpf: '730.825.290-77',
        dataNascimento: '1985-06-20',
        telefone: '(11) 99999-8888',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nome).toBe('Juliana Paes');
    expect(res.body.cpf).toBe('73082529077');
  });

  /**
   * @caso CT-API-006
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN01, RNF04
   * @objetivo Retornar 409 CONFLITO em caso de duplicidade de e-mail no registro
   * @resultadoEsperado Status 409 com erro.codigo = CONFLITO
   */
  test('POST /api/auth/registro - retorna 409 ao registrar e-mail já existente', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({
        nome: 'Outra Ana',
        email: 'ana@email.com', // já existe no seed
        senha: 'Senha123',
        cpf: '730.825.290-77',
        dataNascimento: '1985-06-20',
      });

    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('CONFLITO');
  });

  /**
   * @caso CT-API-007
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.3
   * @objetivo Obter dados do usuário logado via GET /api/auth/me com token Bearer
   * @resultadoEsperado Status 200 com informações do usuário autenticado
   */
  test('GET /api/auth/me - deve retornar dados do perfil do usuário autenticado', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carlos@clinica.com', senha: SENHA_PADRAO });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('carlos@clinica.com');
    expect(res.body.perfil).toBe('MEDICO');
    expect(res.body.medicoId).toBeDefined();
  });

  /**
   * @caso CT-API-008
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Rejeitar requisição para GET /api/auth/me sem token Bearer
   * @resultadoEsperado Status 401 com erro.codigo = NAO_AUTENTICADO
   */
  test('GET /api/auth/me - deve retornar 401 quando cabeçalho Authorization estiver ausente', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  /**
   * @caso CT-API-009
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Garantir que payload JSON inválido responde 400 sem vazar stack trace
   * @resultadoEsperado Status 400 com mensagem clara em JSON
   */
  test('POST /api/auth/login - deve tratar JSON malformado retornando 400 sem stack trace', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ "email": "incompleto');

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO');
    expect(res.body.stack).toBeUndefined();
  });
});
