/**
 * API de autenticação (RF01, RF02), bloqueio por tentativas (RN04)
 * e segurança de token/senha (RNF01, RNF02).
 * Relógio fixado em 2026-10-19 08:00 (segunda-feira).
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const clock = require('../../src/utils/clock');
const config = require('../../src/config');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarApp } = require('../../src/app');

let db;
let app;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
  semear(db);
  app = criarApp({ db });
});

afterEach(() => {
  clock.definirAgora(null);
  db.close();
});

function tokenDe(email, senha = 'Senha123') {
  return request(app)
    .post('/api/auth/login')
    .send({ email, senha })
    .then((res) => res.body.token);
}

function idDoUsuario(email) {
  return app.locals.servicos.repos.usuarios.buscarPorEmail(email).id;
}

describe('RF01 — login e sessão', () => {
  /**
   * @caso CT-API-001
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1
   * @objetivo Fazer login com e-mail e senha corretos
   * @resultadoEsperado a resposta é 200 com token e os dados públicos do usuário
   */
  test('login com credenciais válidas devolve token e usuário', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.usuario).toEqual({
      id: expect.any(Number),
      nome: 'Ana Pereira',
      email: 'ana@email.com',
      perfil: 'PACIENTE',
      pacienteId: expect.any(Number),
    });
  });

  /**
   * @caso CT-API-002
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Emitir token com validade de 8 horas
   * @resultadoEsperado a diferença entre exp e iat do token é 28800 segundos
   */
  test('token emitido expira em 8 horas', async () => {
    const token = await tokenDe('recepcao@clinica.com');
    const payload = jwt.decode(token);
    expect(payload.exp - payload.iat).toBe(8 * 3600);
  });

  /**
   * @caso CT-API-003
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.3
   * @objetivo Devolver os dados do usuário logado
   * @resultadoEsperado o GET /api/auth/me responde 200 com e-mail e perfil
   */
  test('GET /api/auth/me devolve o usuário do token', async () => {
    const token = await tokenDe('ana@email.com');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@email.com');
    expect(res.body.perfil).toBe('PACIENTE');
    expect(res.body).not.toHaveProperty('senhaHash');
  });

  /**
   * @caso CT-API-004
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Exigir token nas rotas protegidas
   * @resultadoEsperado a requisição sem cabeçalho responde 401 NAO_AUTENTICADO
   */
  test('rota protegida sem token responde 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Autenticação necessária.' } });
  });

  /**
   * @caso CT-API-005
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Recusar token que não foi assinado pelo servidor
   * @resultadoEsperado a resposta é 401 com a mensagem de token inválido ou expirado
   */
  test('token forjado responde 401', async () => {
    const forjado = jwt.sign({ sub: 1, perfil: 'RECEPCAO' }, 'outro-segredo');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forjado}`);
    expect(res.status).toBe(401);
    expect(res.body.erro.mensagem).toBe('Token inválido ou expirado.');
  });

  /**
   * @caso CT-API-006
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Recusar token cujo prazo de validade já venceu
   * @resultadoEsperado a resposta é 401 NAO_AUTENTICADO
   */
  test('token expirado responde 401', async () => {
    const expirado = jwt.sign({ sub: idDoUsuario('ana@email.com'), perfil: 'PACIENTE' }, config.jwtSegredo, {
      expiresIn: '-10s',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expirado}`);
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  /**
   * @caso CT-API-007
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Recusar cabeçalho Authorization com formato diferente de Bearer
   * @resultadoEsperado a resposta é 401 NAO_AUTENTICADO
   */
  test('cabeçalho sem Bearer responde 401', async () => {
    const token = await tokenDe('ana@email.com');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Token ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  /**
   * @caso CT-API-008
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF01.1
   * @objetivo Recusar login que não informou e-mail ou senha
   * @resultadoEsperado a resposta é 400 VALIDACAO pedindo e-mail e senha
   */
  test('login sem senha responde 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@email.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: { codigo: 'VALIDACAO', mensagem: 'Informe e-mail e senha.' } });
  });
});

describe('RN04 — bloqueio após tentativas erradas', () => {
  /**
   * @caso CT-API-009
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Recusar a senha correta depois de cinco falhas seguidas
   * @resultadoEsperado a resposta é 423 CONTA_BLOQUEADA com o horário do desbloqueio
   */
  test('quinta falha de login bloqueia a conta', async () => {
    for (let i = 0; i < 4; i += 1) {
      const falha = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada123' });
      expect(falha.status).toBe(401);
    }
    const quinta = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada123' });
    expect(quinta.status).toBe(423);
    expect(quinta.body.erro.codigo).toBe('CONTA_BLOQUEADA');

    const correta = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(correta.status).toBe(423);
    expect(correta.body.erro.mensagem).toContain('Conta bloqueada por excesso de tentativas.');
  });

  /**
   * @caso CT-API-010
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Liberar a conta 15 minutos após o bloqueio
   * @resultadoEsperado o login com a senha correta volta a responder 200
   */
  test('bloqueio termina após 15 minutos', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada123' });
    }
    const bloqueado = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(bloqueado.status).toBe(423);

    clock.definirAgora(new Date('2026-10-19T08:16:00'));
    const liberado = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(liberado.status).toBe(200);
  });

  /**
   * @caso CT-API-011
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Zerar o contador de falhas quando o login é correto
   * @resultadoEsperado após um sucesso, novas falhas voltam a responder 401 e não 423
   */
  test('login correto zera o contador de tentativas', async () => {
    for (let i = 0; i < 4; i += 1) {
      await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada123' });
    }
    const sucesso = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(sucesso.status).toBe(200);

    const novaFalha = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Errada123' });
    expect(novaFalha.status).toBe(401);
    expect(novaFalha.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });
});

describe('RF01 e RF02 — respostas públicas e cadastro', () => {
  /**
   * @caso CT-API-012
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Nunca devolver o hash da senha pela API
   * @resultadoEsperado a resposta do login e a do cadastro não contêm senha nem hash
   */
  test('respostas do login e do cadastro não expõem a senha', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    const textoLogin = JSON.stringify(login.body);
    expect(textoLogin).not.toContain('senhaHash');
    expect(textoLogin).not.toContain('senha');

    const registro = await request(app).post('/api/auth/registro').send({
      nome: 'Paula Nunes',
      email: 'paula@email.com',
      senha: 'Senha123',
      cpf: '12345678909',
      dataNascimento: '1992-03-10',
      telefone: '(11) 91234-5678',
    });
    expect(registro.status).toBe(201);
    const textoRegistro = JSON.stringify(registro.body);
    expect(textoRegistro).not.toContain('senhaHash');
    expect(textoRegistro).not.toContain('Senha123');
  });

  /**
   * @caso CT-API-013
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1
   * @objetivo Permitir auto-cadastro público de paciente
   * @resultadoEsperado a resposta é 201 com o paciente criado e perfil PACIENTE
   */
  test('auto-cadastro de paciente responde 201', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nome: 'Paula Nunes',
      email: 'paula@email.com',
      senha: 'Senha123',
      cpf: '12345678909',
      dataNascimento: '1992-03-10',
      telefone: '(11) 91234-5678',
    });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Paula Nunes');
    expect(res.body.email).toBe('paula@email.com');
    expect(res.body.ativo).toBe(true);
  });

  /**
   * @caso CT-API-014
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN01
   * @objetivo Recusar auto-cadastro com e-mail já usado
   * @resultadoEsperado a resposta é 409 CONFLITO de e-mail já cadastrado
   */
  test('auto-cadastro com e-mail duplicado responde 409', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nome: 'Paula Nunes',
      email: 'ana@email.com',
      senha: 'Senha123',
      cpf: '12345678909',
      dataNascimento: '1992-03-10',
    });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: { codigo: 'CONFLITO', mensagem: 'E-mail já cadastrado.' } });
  });

  /**
   * @caso CT-API-015
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN02
   * @objetivo Recusar auto-cadastro com senha fraca
   * @resultadoEsperado a resposta é 400 VALIDACAO com a regra de senha
   */
  test('auto-cadastro com senha fraca responde 400', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nome: 'Paula Nunes',
      email: 'paula@email.com',
      senha: '1234567',
      cpf: '12345678909',
      dataNascimento: '1992-03-10',
    });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Senha deve ter no mínimo 8 caracteres, com letras e números.');
  });

  /**
   * @caso CT-API-016
   * @nivel api
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN21
   * @objetivo Recusar login de conta desativada pela recepção
   * @resultadoEsperado a resposta é 403 SEM_PERMISSAO orientando procurar a recepção
   */
  test('login em conta inativa responde 403', async () => {
    app.locals.servicos.repos.usuarios.definirAtivo(idDoUsuario('ana@email.com'), false);
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@email.com', senha: 'Senha123' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Conta inativa. Procure a recepção.' } });
  });

  /**
   * @caso CT-API-017
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Invalidar o token de conta desativada depois do login
   * @resultadoEsperado o GET /api/auth/me responde 401 NAO_AUTENTICADO
   */
  test('token de conta desativada responde 401', async () => {
    const token = await tokenDe('ana@email.com');
    app.locals.servicos.repos.usuarios.definirAtivo(idDoUsuario('ana@email.com'), false);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.erro.mensagem).toBe('Usuário inexistente ou inativo.');
  });

  /**
   * @caso CT-API-018
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF01.1
   * @objetivo Responder 401 igual para senha errada e para e-mail inexistente
   * @resultadoEsperado os dois casos devolvem a mesma mensagem, sem revelar o campo
   */
  test('senha errada e e-mail inexistente têm a mesma resposta', async () => {
    const senhaErrada = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@email.com', senha: 'OutraSenha1' });
    const semConta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@email.com', senha: 'OutraSenha1' });

    expect(senhaErrada.status).toBe(401);
    expect(semConta.status).toBe(401);
    expect(senhaErrada.body).toEqual(semConta.body);
    expect(senhaErrada.body.erro.mensagem).toBe('E-mail ou senha inválidos.');
  });
});
