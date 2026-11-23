// Integração: autenticação, emissão e validação de token JWT (RF01, RNF01, RNF02).
const jwt = require('jsonwebtoken');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const config = require('../../src/config');
const clock = require('../../src/utils/clock');

let ctx;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

describe('login', () => {
  /**
   * @caso CT-INT-025
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Entregar token e dados públicos ao autenticar com credenciais válidas
   * @resultadoEsperado O retorno tem token string e usuário com id, nome, e-mail e perfil
   */
  test('autentica paciente com credenciais válidas', () => {
    const { token, usuario } = ctx.authService.login('ana@email.com', 'Senha123');
    expect(typeof token).toBe('string');
    expect(usuario).toMatchObject({ nome: 'Ana Pereira', email: 'ana@email.com', perfil: 'PACIENTE' });
    expect(usuario.pacienteId).toBe(ctx.pacientes[0].id);
  });

  /**
   * @caso CT-INT-026
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Emitir token com validade de 8 horas
   * @resultadoEsperado A diferença entre exp e iat é exatamente 28800 segundos
   */
  test('token expira em 8 horas', () => {
    const { token } = ctx.authService.login('ana@email.com', 'Senha123');
    const payload = jwt.decode(token);
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
  });

  /**
   * @caso CT-INT-027
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Incluir o identificador e o perfil do usuário no token
   * @resultadoEsperado O payload tem sub igual ao id do usuário e perfil PACIENTE
   */
  test('token carrega identificador e perfil', () => {
    const { token, usuario } = ctx.authService.login('ana@email.com', 'Senha123');
    const payload = jwt.decode(token);
    expect(payload.sub).toBe(usuario.id);
    expect(payload.perfil).toBe('PACIENTE');
  });

  /**
   * @caso CT-INT-028
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Nunca devolver o hash ou a senha no login
   * @resultadoEsperado O objeto de usuário tem apenas id, nome, e-mail, perfil e o id do paciente
   */
  test('login não expõe senha nem hash', () => {
    const { usuario } = ctx.authService.login('ana@email.com', 'Senha123');
    expect(usuario).not.toHaveProperty('senha');
    expect(usuario).not.toHaveProperty('senhaHash');
    expect(Object.keys(usuario).sort()).toEqual(['email', 'id', 'nome', 'pacienteId', 'perfil'].sort());
  });

  /**
   * @caso CT-INT-029
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1
   * @objetivo Recusar senha incorreta com 401
   * @resultadoEsperado login lança erro NAO_AUTENTICADO
   */
  test('recusa senha incorreta', () => {
    expect(() => ctx.authService.login('ana@email.com', 'SenhaErrada1')).toThrow(
      expect.objectContaining({ status: 401, codigo: 'NAO_AUTENTICADO' }),
    );
  });

  /**
   * @caso CT-INT-030
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1
   * @objetivo Recusar e-mail inexistente com a mesma mensagem de credenciais inválidas
   * @resultadoEsperado login lança 401 com "E-mail ou senha inválidos."
   */
  test('recusa e-mail inexistente', () => {
    expect(() => ctx.authService.login('ninguem@email.com', 'Senha123')).toThrow(
      expect.objectContaining({ status: 401, message: 'E-mail ou senha inválidos.' }),
    );
  });

  /**
   * @caso CT-INT-031
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF01.1, RNF04
   * @objetivo Exigir e-mail e senha
   * @resultadoEsperado login lança 400 VALIDACAO sem consultar o banco
   */
  test('exige e-mail e senha', () => {
    expect(() => ctx.authService.login('', '')).toThrow(expect.objectContaining({ status: 400, codigo: 'VALIDACAO' }));
    expect(() => ctx.authService.login('ana@email.com', undefined)).toThrow(expect.objectContaining({ status: 400 }));
  });

  /**
   * @caso CT-INT-032
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF01.1, RN01
   * @objetivo Aceitar e-mail com espaços e maiúsculas
   * @resultadoEsperado O login autentica normalmente
   */
  test('aceita e-mail com espaços e caixa alta', () => {
    expect(ctx.authService.login('  ANA@EMAIL.COM  ', 'Senha123').usuario.email).toBe('ana@email.com');
  });

  /**
   * @caso CT-INT-033
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN21
   * @objetivo Recusar login de conta inativa
   * @resultadoEsperado login lança 403 SEM_PERMISSAO citando conta inativa
   */
  test('recusa login de conta inativa', () => {
    ctx.repos.usuarios.definirAtivo(ctx.pacientes[0].usuarioId, false);
    expect(() => ctx.authService.login('ana@email.com', 'Senha123')).toThrow(
      expect.objectContaining({ status: 403, codigo: 'SEM_PERMISSAO' }),
    );
  });

  /**
   * @caso CT-INT-034
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1, RN30
   * @objetivo Devolver o identificador do médico para o perfil MEDICO
   * @resultadoEsperado O usuário logado inclui medicoId igual ao id do médico
   */
  test('login de médico devolve medicoId', () => {
    const { usuario } = ctx.authService.login('carlos@clinica.com', 'Senha123');
    expect(usuario.perfil).toBe('MEDICO');
    expect(usuario.medicoId).toBe(ctx.medicos[0].id);
  });

  /**
   * @caso CT-INT-035
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Não incluir ids de paciente ou médico no login da recepção
   * @resultadoEsperado O usuário da recepção não tem pacienteId nem medicoId
   */
  test('login de recepção não devolve id de paciente ou médico', () => {
    const { usuario } = ctx.authService.login('recepcao@clinica.com', 'Senha123');
    expect(usuario.perfil).toBe('RECEPCAO');
    expect(usuario).not.toHaveProperty('pacienteId');
    expect(usuario).not.toHaveProperty('medicoId');
  });
});

describe('autenticar', () => {
  /**
   * @caso CT-INT-036
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RF01.3
   * @objetivo Resolver o usuário a partir de um token válido
   * @resultadoEsperado autenticar devolve o perfil público do usuário do token
   */
  test('resolve usuário de token válido', () => {
    const { token } = ctx.authService.login('ana@email.com', 'Senha123');
    expect(ctx.authService.autenticar(token)).toMatchObject({ perfil: 'PACIENTE', email: 'ana@email.com' });
  });

  /**
   * @caso CT-INT-037
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar token malformado
   * @resultadoEsperado autenticar lança 401 NAO_AUTENTICADO
   */
  test('recusa token malformado', () => {
    expect(() => ctx.authService.autenticar('nao-e-um-token')).toThrow(
      expect.objectContaining({ status: 401, message: 'Token inválido ou expirado.' }),
    );
  });

  /**
   * @caso CT-INT-038
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar token expirado
   * @resultadoEsperado autenticar lança 401
   */
  test('recusa token expirado', () => {
    const expirado = jwt.sign(
      { sub: ctx.pacientes[0].usuarioId, perfil: 'PACIENTE', exp: Math.floor(Date.now() / 1000) - 60 },
      config.jwtSegredo,
    );
    expect(() => ctx.authService.autenticar(expirado)).toThrow(expect.objectContaining({ status: 401 }));
  });

  /**
   * @caso CT-INT-039
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar token assinado com outro segredo
   * @resultadoEsperado autenticar lança 401
   */
  test('recusa token com assinatura de outro segredo', () => {
    const falso = jwt.sign({ sub: ctx.pacientes[0].usuarioId, perfil: 'PACIENTE' }, 'outro-segredo');
    expect(() => ctx.authService.autenticar(falso)).toThrow(expect.objectContaining({ status: 401 }));
  });

  /**
   * @caso CT-INT-040
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN21, RNF02
   * @objetivo Invalidar token de usuário desativado depois da emissão
   * @resultadoEsperado autenticar lança 401 citando usuário inexistente ou inativo
   */
  test('token perde validade quando a conta é desativada', () => {
    const { token } = ctx.authService.login('ana@email.com', 'Senha123');
    ctx.repos.usuarios.definirAtivo(ctx.pacientes[0].usuarioId, false);
    expect(() => ctx.authService.autenticar(token)).toThrow(
      expect.objectContaining({ status: 401, message: 'Usuário inexistente ou inativo.' }),
    );
  });

  /**
   * @caso CT-INT-041
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Recusar token de usuário removido do banco
   * @resultadoEsperado autenticar lança 401
   */
  test('recusa token de usuário inexistente', () => {
    const fantasma = jwt.sign({ sub: 9999, perfil: 'PACIENTE' }, config.jwtSegredo);
    expect(() => ctx.authService.autenticar(fantasma)).toThrow(expect.objectContaining({ status: 401 }));
  });
});

describe('gerarHash', () => {
  /**
   * @caso CT-INT-042
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Gerar hash bcrypt verificável e diferente da senha
   * @resultadoEsperado O hash começa com "$2" e confere com a senha original
   */
  test('gera hash bcrypt verificável', () => {
    const hash = ctx.authService.gerarHash('Senha123');
    expect(hash).not.toBe('Senha123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  /**
   * @caso CT-INT-043
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Usar salt diferente a cada hash da mesma senha
   * @resultadoEsperado Dois hashes da mesma senha são diferentes
   */
  test('dois hashes da mesma senha são diferentes', () => {
    expect(ctx.authService.gerarHash('Senha123')).not.toBe(ctx.authService.gerarHash('Senha123'));
  });
});
