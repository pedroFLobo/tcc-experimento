# lote-002

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 25 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0019 | CT-API-011 | login válido devolve token e usuário | passou |  |
| deepseek-0020 | CT-API-012 | token é um JWT | passou |  |
| deepseek-0021 | CT-API-013 | login do paciente devolve pacienteId | passou |  |
| deepseek-0022 | CT-API-014 | login do médico devolve medicoId | passou |  |
| deepseek-0023 | CT-API-015 | login não devolve hash de senha | passou |  |
| deepseek-0024 | CT-API-016 | senha errada devolve 401 | passou |  |
| deepseek-0025 | CT-API-017 | e-mail inexistente devolve 401 genérico | passou |  |
| deepseek-0026 | CT-API-018 | login sem credenciais devolve 400 | passou |  |
| deepseek-0027 | CT-API-019 | quinta tentativa errada bloqueia a conta | passou |  |
| deepseek-0028 | CT-API-020 | bloqueio recusa senha correta | passou |  |
| deepseek-0029 | CT-API-021 | login correto zera o contador de falhas | passou |  |
| deepseek-0030 | CT-API-022 | e-mail é comparado sem diferenciar maiúsculas | passou |  |
| deepseek-0031 | CT-API-023 | me devolve o usuário logado | passou |  |
| deepseek-0032 | CT-API-024 | me sem token devolve 401 | passou |  |
| deepseek-0033 | CT-API-025 | token adulterado devolve 401 | passou |  |
| deepseek-0034 | CT-API-026 | esquema de autorização inválido devolve 401 | passou |  |
| deepseek-0035 | CT-API-027 | token de usuário inativo devolve 401 | passou |  |
| deepseek-0036 | CT-API-028 | login de conta inativa devolve 403 | passou |  |
| deepseek-0037 | CT-API-029 | registro cria paciente | passou |  |
| deepseek-0038 | CT-API-030 | registro não devolve senha | passou |  |
| deepseek-0039 | CT-API-031 | e-mail duplicado devolve 409 | passou |  |
| deepseek-0040 | CT-API-032 | CPF duplicado devolve 409 | passou |  |
| deepseek-0041 | CT-API-033 | CPF inválido devolve 400 | passou |  |
| deepseek-0042 | CT-API-034 | senha fraca devolve 400 | passou |  |
| deepseek-0043 | CT-API-035 | menor sem responsável devolve 400 | passou |  |

## Arquivo: backend/__testes__/api/autenticacao.test.js

```js
// API: autenticação, token JWT e registro público (RF01, RF02, RN01, RN04, RNF01, RNF02).
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

function login(email = 'recepcao@clinica.com', senha = 'Senha123') {
  return request(app).post('/api/auth/login').send({ email, senha });
}

async function obterToken(email = 'recepcao@clinica.com') {
  const resposta = await login(email);
  return resposta.body.token;
}

describe('POST /api/auth/login', () => {
  /**
   * @caso CT-API-011
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Autenticar a recepção com credenciais válidas
   * @resultadoEsperado A resposta é 200 com token e usuário de perfil RECEPCAO
   */
  test('login válido devolve token e usuário', async () => {
    const resposta = await login();
    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toEqual(expect.any(String));
    expect(resposta.body.usuario).toMatchObject({ email: 'recepcao@clinica.com', perfil: 'RECEPCAO' });
  });

  /**
   * @caso CT-API-012
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Emitir um token JWT de três partes
   * @resultadoEsperado O token tem header, payload e assinatura
   */
  test('token é um JWT', async () => {
    const resposta = await login();
    expect(resposta.body.token.split('.')).toHaveLength(3);
  });

  /**
   * @caso CT-API-013
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1
   * @objetivo Devolver o pacienteId no login do paciente
   * @resultadoEsperado O usuário logado traz pacienteId igual ao da Ana
   */
  test('login do paciente devolve pacienteId', async () => {
    const resposta = await login('ana@email.com');
    expect(resposta.body.usuario).toMatchObject({ perfil: 'PACIENTE', pacienteId: dados.pacientes[0].id });
  });

  /**
   * @caso CT-API-014
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.1
   * @objetivo Devolver o medicoId no login do médico
   * @resultadoEsperado O usuário logado traz medicoId igual ao do Carlos
   */
  test('login do médico devolve medicoId', async () => {
    const resposta = await login('carlos@clinica.com');
    expect(resposta.body.usuario).toMatchObject({ perfil: 'MEDICO', medicoId: dados.medicos[0].id });
  });

  /**
   * @caso CT-API-015
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Não devolver o hash da senha no login
   * @resultadoEsperado O corpo não contém senhaHash nem senha
   */
  test('login não devolve hash de senha', async () => {
    const resposta = await login();
    expect(resposta.body.usuario.senhaHash).toBeUndefined();
    expect(JSON.stringify(resposta.body)).not.toMatch(/\$2[aby]\$/);
  });

  /**
   * @caso CT-API-016
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04, RNF02
   * @objetivo Recusar senha incorreta
   * @resultadoEsperado A resposta é 401 NAO_AUTENTICADO
   */
  test('senha errada devolve 401', async () => {
    const resposta = await login('recepcao@clinica.com', 'SenhaErrada1');
    expect(resposta.status).toBe(401);
    expect(resposta.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  /**
   * @caso CT-API-017
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Recusar e-mail inexistente com o mesmo erro de senha
   * @resultadoEsperado A resposta é 401 com mensagem genérica
   */
  test('e-mail inexistente devolve 401 genérico', async () => {
    const resposta = await login('ninguem@clinica.com', 'Senha123');
    expect(resposta.status).toBe(401);
    expect(resposta.body.erro.mensagem).toBe('E-mail ou senha inválidos.');
  });

  /**
   * @caso CT-API-018
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF01.1
   * @objetivo Exigir e-mail e senha no corpo
   * @resultadoEsperado O login sem corpo devolve 400 VALIDACAO
   */
  test('login sem credenciais devolve 400', async () => {
    const resposta = await request(app).post('/api/auth/login').send({});
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatchObject({ codigo: 'VALIDACAO', mensagem: 'Informe e-mail e senha.' });
  });

  /**
   * @caso CT-API-019
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Bloquear a conta na quinta tentativa errada
   * @resultadoEsperado A quinta resposta é 423 CONTA_BLOQUEADA
   */
  test('quinta tentativa errada bloqueia a conta', async () => {
    for (let i = 0; i < 4; i++) await login('recepcao@clinica.com', 'Errada123');
    const resposta = await login('recepcao@clinica.com', 'Errada123');
    expect(resposta.status).toBe(423);
    expect(resposta.body.erro.codigo).toBe('CONTA_BLOQUEADA');
  });

  /**
   * @caso CT-API-020
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Recusar até a senha correta durante o bloqueio
   * @resultadoEsperado O login correto devolve 423
   */
  test('bloqueio recusa senha correta', async () => {
    for (let i = 0; i < 5; i++) await login('recepcao@clinica.com', 'Errada123');
    const resposta = await login();
    expect(resposta.status).toBe(423);
  });

  /**
   * @caso CT-API-021
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Zerar o contador após um login correto
   * @resultadoEsperado Quatro novas falhas ainda devolvem 401, sem bloqueio
   */
  test('login correto zera o contador de falhas', async () => {
    await login('recepcao@clinica.com', 'Errada123');
    await login('recepcao@clinica.com', 'Errada123');
    await login('recepcao@clinica.com', 'Errada123');
    await login('recepcao@clinica.com', 'Errada123');
    expect((await login()).status).toBe(200);
    for (let i = 0; i < 4; i++) {
      expect((await login('recepcao@clinica.com', 'Errada123')).status).toBe(401);
    }
  });

  /**
   * @caso CT-API-022
   * @nivel api
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RN01
   * @objetivo Aceitar o e-mail em caixa alta no login
   * @resultadoEsperado O login de ANA@EMAIL.COM é aceito
   */
  test('e-mail é comparado sem diferenciar maiúsculas', async () => {
    expect((await login('ANA@EMAIL.COM')).status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  /**
   * @caso CT-API-023
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01.3
   * @objetivo Devolver o usuário do token
   * @resultadoEsperado A resposta é 200 com o e-mail autenticado
   */
  test('me devolve o usuário logado', async () => {
    const token = await obterToken('ana@email.com');
    const resposta = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ email: 'ana@email.com', perfil: 'PACIENTE' });
  });

  /**
   * @caso CT-API-024
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar requisição sem token
   * @resultadoEsperado A resposta é 401 NAO_AUTENTICADO
   */
  test('me sem token devolve 401', async () => {
    const resposta = await request(app).get('/api/auth/me');
    expect(resposta.status).toBe(401);
    expect(resposta.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  /**
   * @caso CT-API-025
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar token adulterado
   * @resultadoEsperado A resposta é 401 NAO_AUTENTICADO
   */
  test('token adulterado devolve 401', async () => {
    const token = await obterToken();
    const resposta = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}x`);
    expect(resposta.status).toBe(401);
  });

  /**
   * @caso CT-API-026
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar cabeçalho Authorization sem o esquema Bearer
   * @resultadoEsperado A resposta é 401
   */
  test('esquema de autorização inválido devolve 401', async () => {
    const token = await obterToken();
    const resposta = await request(app).get('/api/auth/me').set('Authorization', `Token ${token}`);
    expect(resposta.status).toBe(401);
  });

  /**
   * @caso CT-API-027
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar token de usuário desativado
   * @resultadoEsperado A resposta é 401
   */
  test('token de usuário inativo devolve 401', async () => {
    const token = await obterToken('ana@email.com');
    app.locals.servicos.cadastroService.definirUsuarioAtivo(dados.pacientes[0].usuarioId, false);
    const resposta = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(401);
  });

  /**
   * @caso CT-API-028
   * @nivel api
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Recusar login de conta inativa com 403
   * @resultadoEsperado A resposta é 403 SEM_PERMISSAO com mensagem sobre conta inativa
   */
  test('login de conta inativa devolve 403', async () => {
    app.locals.servicos.cadastroService.definirUsuarioAtivo(dados.pacientes[0].usuarioId, false);
    const resposta = await login('ana@email.com');
    expect(resposta.status).toBe(403);
    expect(resposta.body.erro.mensagem).toBe('Conta inativa. Procure a recepção.');
  });
});

describe('POST /api/auth/registro', () => {
  const novo = {
    nome: 'Paciente Novo',
    email: 'novo@email.com',
    senha: 'Senha123',
    cpf: '123.456.789-09',
    dataNascimento: '1995-04-12',
  };

  /**
   * @caso CT-API-029
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1
   * @objetivo Cadastrar um paciente pela rota pública
   * @resultadoEsperado A resposta é 201 com os dados do paciente e CPF normalizado
   */
  test('registro cria paciente', async () => {
    const resposta = await request(app).post('/api/auth/registro').send(novo);
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ nome: 'Paciente Novo', cpf: '12345678909' });
  });

  /**
   * @caso CT-API-030
   * @nivel api
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Não devolver a senha após o registro
   * @resultadoEsperado O corpo não contém senha nem senhaHash
   */
  test('registro não devolve senha', async () => {
    const resposta = await request(app).post('/api/auth/registro').send(novo);
    expect(JSON.stringify(resposta.body)).not.toMatch(/Senha123/);
    expect(resposta.body.senhaHash).toBeUndefined();
  });

  /**
   * @caso CT-API-031
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail já cadastrado
   * @resultadoEsperado A resposta é 409 CONFLITO
   */
  test('e-mail duplicado devolve 409', async () => {
    const resposta = await request(app).post('/api/auth/registro').send({ ...novo, email: 'ana@email.com' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatchObject({ codigo: 'CONFLITO', mensagem: 'E-mail já cadastrado.' });
  });

  /**
   * @caso CT-API-032
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF já cadastrado
   * @resultadoEsperado A resposta é 409 CONFLITO
   */
  test('CPF duplicado devolve 409', async () => {
    const resposta = await request(app).post('/api/auth/registro').send({ ...novo, cpf: '529.982.247-25' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.mensagem).toBe('CPF já cadastrado.');
  });

  /**
   * @caso CT-API-033
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF com dígitos verificadores inválidos
   * @resultadoEsperado A resposta é 400 VALIDACAO
   */
  test('CPF inválido devolve 400', async () => {
    const resposta = await request(app).post('/api/auth/registro').send({ ...novo, cpf: '111.111.111-11' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatchObject({ codigo: 'VALIDACAO', mensagem: 'CPF inválido.' });
  });

  /**
   * @caso CT-API-034
   * @nivel api
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN02
   * @objetivo Recusar senha fraca
   * @resultadoEsperado A resposta é 400 com mensagem sobre a senha
   */
  test('senha fraca devolve 400', async () => {
    const resposta = await request(app).post('/api/auth/registro').send({ ...novo, senha: 'abcdefgh' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Senha deve ter no mínimo 8 caracteres, com letras e números.');
  });

  /**
   * @caso CT-API-035
   * @nivel api
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Exigir responsável para menor de 18 anos
   * @resultadoEsperado A resposta é 400 com mensagem sobre o responsável
   */
  test('menor sem responsável devolve 400', async () => {
    const resposta = await request(app)
      .post('/api/auth/registro')
      .send({ ...novo, dataNascimento: '2015-06-01' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('Paciente menor de 18 anos deve informar o nome do responsável.');
  });
});
```
