// Testes de API de autenticação e registro público (RF01, RF02, RN01–RN04, RNF02, RNF04).
const clock = require('../../src/utils/clock');
const request = require('supertest');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db, app;

beforeAll(async () => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

describe('POST /api/auth/login (RF01.1, RN04)', () => {
  /**
   * @caso CT-API-001
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Autenticar via POST /api/auth/login com credenciais válidas
   * @resultadoEsperado resposta 200 com body.token e body.usuario.perfil 'PACIENTE'
   */
  test('login válido retorna 200 com token e usuário', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(r.status).toBe(200);
    expect(typeof r.body.token).toBe('string');
    expect(r.body.usuario.perfil).toBe('PACIENTE');
    expect(r.body.usuario.email).toBe('ana@email.com');
  });

  /**
   * @caso CT-API-002
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1, RNF04
   * @objetivo Recusar credenciais erradas com o contrato de erro da API
   * @resultadoEsperado resposta 401 com body.erro.codigo 'NAO_AUTENTICADO' e mensagem genérica
   */
  test('senha errada retorna 401 no formato de erro padronizado', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada123' });
    expect(r.status).toBe(401);
    expect(r.body.erro.codigo).toBe('NAO_AUTENTICADO');
    expect(r.body.erro.mensagem).toBe('E-mail ou senha inválidos.');
  });

  /**
   * @caso CT-API-003
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF01.1, RNF04
   * @objetivo Tratar login sem e-mail ou senha no corpo
   * @resultadoEsperado resposta 400 com codigo 'VALIDACAO' pedindo e-mail e senha
   */
  test('login sem campos retorna 400', async () => {
    const r = await request(app).post('/api/auth/login').send({});
    expect(r.status).toBe(400);
    expect(r.body.erro.codigo).toBe('VALIDACAO');
    expect(r.body.erro.mensagem).toBe('Informe e-mail e senha.');
  });

  /**
   * @caso CT-API-004
   * @nivel api
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Tratar corpo com JSON malformado sem derrubar o serviço
   * @resultadoEsperado resposta 400 com codigo 'VALIDACAO' e mensagem de JSON inválido
   */
  test('JSON malformado retorna 400 tratado', async () => {
    const r = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(r.status).toBe(400);
    expect(r.body.erro.codigo).toBe('VALIDACAO');
    expect(r.body.erro.mensagem).toBe('Corpo da requisição não é um JSON válido.');
  });

  /**
   * @caso CT-API-005
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Bloquear a conta na quinta tentativa errada consecutiva pela API
   * @resultadoEsperado 4 erros devolvem 401 e o 5º devolve 423 com codigo 'CONTA_BLOQUEADA'
   */
  test('quinta tentativa errada retorna 423', async () => {
    for (let i = 0; i < 4; i += 1) {
      const r = await request(app).post('/api/auth/login').send({ email: 'joao@email.com', senha: 'Errada123' });
      expect(r.status).toBe(401);
    }
    const r = await request(app).post('/api/auth/login').send({ email: 'joao@email.com', senha: 'Errada123' });
    expect(r.status).toBe(423);
    expect(r.body.erro.codigo).toBe('CONTA_BLOQUEADA');
    expect(r.body.erro.mensagem).toContain('2026-10-19 08:15');
  });

  /**
   * @caso CT-API-006
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Recusar até a senha correta enquanto a conta estiver bloqueada
   * @resultadoEsperado login correto durante o bloqueio devolve 423 CONTA_BLOQUEADA
   */
  test('senha correta durante bloqueio retorna 423', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'joao@email.com', senha: 'Senha123' });
    expect(r.status).toBe(423);
    expect(r.body.erro.codigo).toBe('CONTA_BLOQUEADA');
  });
});

describe('GET /api/auth/me (RF01.2, RF01.3, RNF02)', () => {
  /**
   * @caso CT-API-007
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Exigir token Bearer na rota autenticada
   * @resultadoEsperado requisição sem Authorization devolve 401 'Autenticação necessária.'
   */
  test('requisição sem token retorna 401', async () => {
    const r = await request(app).get('/api/auth/me');
    expect(r.status).toBe(401);
    expect(r.body.erro.codigo).toBe('NAO_AUTENTICADO');
    expect(r.body.erro.mensagem).toBe('Autenticação necessária.');
  });

  /**
   * @caso CT-API-008
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar token inválido na rota autenticada
   * @resultadoEsperado Authorization com token falsificado devolve 401 'Token inválido ou expirado.'
   */
  test('token inválido retorna 401', async () => {
    const r = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(r.status).toBe(401);
    expect(r.body.erro.mensagem).toBe('Token inválido ou expirado.');
  });

  /**
   * @caso CT-API-009
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.3
   * @objetivo Retornar os dados do usuário logado pelo token
   * @resultadoEsperado GET /api/auth/me devolve 200 com e-mail e perfil do usuário do token
   */
  test('token válido retorna o usuário logado', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'recepcao@clinica.com', senha: 'Senha123' });
    const r = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(r.status).toBe(200);
    expect(r.body.email).toBe('recepcao@clinica.com');
    expect(r.body.perfil).toBe('RECEPCAO');
  });
});

describe('POST /api/auth/registro (RF02, RN01–RN03, RN06, RNF01)', () => {
  /**
   * @caso CT-API-010
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.1, RN03
   * @objetivo Permitir auto-cadastro público sem token, gravando CPF só com dígitos
   * @resultadoEsperado resposta 201 com o paciente criado, cpf '12345678906' e sem senhaHash
   */
  test('auto-cadastro cria paciente sem token', async () => {
    const r = await request(app).post('/api/auth/registro').send({
      nome: 'Mariana Costa', email: 'mariana@email.com', senha: 'Senha123',
      cpf: '123.456.789-06', dataNascimento: '1992-08-15', telefone: '(11) 94444-1010',
    });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeGreaterThan(0);
    expect(r.body.nome).toBe('Mariana Costa');
    expect(r.body.cpf).toBe('12345678906');
    expect(r.body.senhaHash).toBeUndefined();
  });

  /**
   * @caso CT-API-011
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Recusar cadastro de menor de 18 anos sem responsável
   * @resultadoEsperado resposta 400 VALIDACAO com a mensagem da RN06
   */
  test('menor sem responsável recebe 400', async () => {
    const r = await request(app).post('/api/auth/registro').send({
      nome: 'Enzo Silva', email: 'enzo@email.com', senha: 'Senha123',
      cpf: '168.995.350-09', dataNascimento: '2015-01-01',
    });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Paciente menor de 18 anos deve informar o nome do responsável.');
  });

  /**
   * @caso CT-API-012
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Aceitar cadastro de menor com o responsável informado
   * @resultadoEsperado resposta 201 gravando responsavelNome 'Marta Oliveira'
   */
  test('menor com responsável é aceito', async () => {
    const r = await request(app).post('/api/auth/registro').send({
      nome: 'Enzo Silva', email: 'enzo@email.com', senha: 'Senha123',
      cpf: '168.995.350-09', dataNascimento: '2015-01-01', responsavelNome: 'Marta Oliveira',
    });
    expect(r.status).toBe(201);
    expect(r.body.responsavelNome).toBe('Marta Oliveira');
  });

  /**
   * @caso CT-API-013
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar cadastro com e-mail já existente
   * @resultadoEsperado resposta 409 CONFLITO com 'E-mail já cadastrado.'
   */
  test('e-mail duplicado retorna 409', async () => {
    const r = await request(app).post('/api/auth/registro').send({
      nome: 'Cópia Ana', email: 'ana@email.com', senha: 'Senha123',
      cpf: '123.456.789-06', dataNascimento: '1992-08-15',
    });
    expect(r.status).toBe(409);
    expect(r.body.erro.codigo).toBe('CONFLITO');
    expect(r.body.erro.mensagem).toBe('E-mail já cadastrado.');
  });

  /**
   * @caso CT-API-014
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar cadastro com CPF de dígito verificador inválido
   * @resultadoEsperado resposta 400 VALIDACAO com 'CPF inválido.'
   */
  test('CPF inválido retorna 400', async () => {
    const r = await request(app).post('/api/auth/registro').send({
      nome: 'CPF Ruim', email: 'cpfruim@email.com', senha: 'Senha123',
      cpf: '123.456.789-00', dataNascimento: '1992-08-15',
    });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('CPF inválido.');
  });

  /**
   * @caso CT-API-015
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Recusar cadastro com senha sem 8 caracteres ou sem número
   * @resultadoEsperado resposta 400 VALIDACAO com a mensagem da política de senha
   */
  test('senha fraca retorna 400', async () => {
    const r = await request(app).post('/api/auth/registro').send({
      nome: 'Senha Fraca', email: 'senhafraca@email.com', senha: 'abc',
      cpf: '987.654.321-00', dataNascimento: '1992-08-15',
    });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Senha deve ter no mínimo 8 caracteres, com letras e números.');
  });
});
