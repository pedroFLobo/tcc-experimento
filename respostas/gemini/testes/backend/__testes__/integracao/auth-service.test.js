const { abrirBanco } = require('../../src/db/connection');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');
const { somarMinutos } = require('../../src/utils/datas');

describe('Integração: AuthService', () => {
  let db;
  let servicos;
  const agoraFixo = new Date('2026-10-19T08:00:00');

  beforeEach(() => {
    clock.definirAgora(agoraFixo);
    db = abrirBanco(':memory:');
    servicos = criarServicos(db);

    // Cria usuário de teste com hash
    servicos.repos.usuarios.inserir({
      nome: 'Teste Auth',
      email: 'teste@auth.com',
      senhaHash: servicos.authService.gerarHash('SenhaValida123'),
      perfil: 'PACIENTE',
      criadoEm: '2026-10-19 08:00',
    });
  });

  afterEach(() => {
    clock.definirAgora(null);
    db.close();
  });

  /**
   * @caso CT-INT-001
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1, RNF02
   * @objetivo Autenticar usuário com e-mail e senha corretos e gerar JWT
   * @resultadoEsperado Retorna token JWT válido e perfil público do usuário
   */
  test('deve autenticar usuário com credenciais corretas', () => {
    const resposta = servicos.authService.login('teste@auth.com', 'SenhaValida123');
    expect(resposta).toHaveProperty('token');
    expect(resposta.usuario.email).toBe('teste@auth.com');
    expect(resposta.usuario.perfil).toBe('PACIENTE');
    expect(resposta.usuario).not.toHaveProperty('senhaHash');
  });

  /**
   * @caso CT-INT-002
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF01
   * @objetivo Garantir que a senha nunca é exposta no perfil público ou retorno
   * @resultadoEsperado Propriedades de senha ou hash estão ausentes no objeto do usuário
   */
  test('não deve expor hash da senha no retorno do login', () => {
    const { usuario } = servicos.authService.login('teste@auth.com', 'SenhaValida123');
    expect(usuario.senha).toBeUndefined();
    expect(usuario.senhaHash).toBeUndefined();
  });

  /**
   * @caso CT-INT-003
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Bloquear conta por 15 minutos após 5 tentativas de login consecutivas incorretas
   * @resultadoEsperado Lança erro CONTA_BLOQUEADA na 5ª tentativa e persiste bloqueadoAte
   */
  test('deve bloquear a conta por 15 minutos na 5ª tentativa de senha errada', () => {
    for (let i = 1; i <= 4; i++) {
      expect(() => servicos.authService.login('teste@auth.com', 'SenhaErrada')).toThrow(/E-mail ou senha inválidos/i);
    }

    // 5ª tentativa
    expect(() => servicos.authService.login('teste@auth.com', 'SenhaErrada')).toThrow(/Conta bloqueada por excesso de tentativas/i);

    const usuarioDb = servicos.repos.usuarios.buscarPorEmail('teste@auth.com');
    expect(usuarioDb.bloqueadoAte).toBeTruthy();
  });

  /**
   * @caso CT-INT-004
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Recusar até a senha correta enquanto a conta estiver dentro da janela de bloqueio
   * @resultadoEsperado Lança erro CONTA_BLOQUEADA mesmo informando a senha correta
   */
  test('deve recusar senha correta durante o período de bloqueio', () => {
    // Força 5 falhas
    for (let i = 1; i <= 5; i++) {
      try { servicos.authService.login('teste@auth.com', 'SenhaErrada'); } catch {}
    }

    // Tenta senha correta 5 minutos após o bloqueio
    clock.definirAgora(somarMinutos(agoraFixo, 5));
    expect(() => servicos.authService.login('teste@auth.com', 'SenhaValida123')).toThrow(/Conta bloqueada por excesso de tentativas/i);
  });

  /**
   * @caso CT-INT-005
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Permitir login após expirar o prazo de 15 minutos do bloqueio
   * @resultadoEsperado Login aceito após 16 minutos com senha correta
   */
  test('deve desbloquear a conta e permitir login após decorridos 15 minutos', () => {
    for (let i = 1; i <= 5; i++) {
      try { servicos.authService.login('teste@auth.com', 'SenhaErrada'); } catch {}
    }

    // Avança 16 minutos
    clock.definirAgora(somarMinutos(agoraFixo, 16));
    const resposta = servicos.authService.login('teste@auth.com', 'SenhaValida123');
    expect(resposta.token).toBeTruthy();
  });

  /**
   * @caso CT-INT-006
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Zerar o contador de falhas quando um login é realizado com sucesso
   * @resultadoEsperado tentativasFalhas é resetado para 0 no banco
   */
  test('deve zerar contador de falhas após login bem-sucedido', () => {
    // 2 tentativas falhas
    try { servicos.authService.login('teste@auth.com', 'SenhaErrada'); } catch {}
    try { servicos.authService.login('teste@auth.com', 'SenhaErrada'); } catch {}

    let usuarioDb = servicos.repos.usuarios.buscarPorEmail('teste@auth.com');
    expect(usuarioDb.tentativasFalhas).toBe(2);

    // Login correto
    servicos.authService.login('teste@auth.com', 'SenhaValida123');
    usuarioDb = servicos.repos.usuarios.buscarPorEmail('teste@auth.com');
    expect(usuarioDb.tentativasFalhas).toBe(0);
  });

  /**
   * @caso CT-INT-007
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN21
   * @objetivo Bloquear autenticação de usuário inativo
   * @resultadoEsperado Lança erro SEM_PERMISSAO informando conta inativa
   */
  test('deve rejeitar login de usuário marcado como inativo', () => {
    const u = servicos.repos.usuarios.buscarPorEmail('teste@auth.com');
    servicos.repos.usuarios.definirAtivo(u.id, false);

    expect(() => servicos.authService.login('teste@auth.com', 'SenhaValida123')).toThrow(/Conta inativa/i);
  });

  /**
   * @caso CT-INT-008
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Validar e decodificar token JWT assinado
   * @resultadoEsperado autenticar(token) retorna perfil do usuário correspondente
   */
  test('deve validar token JWT válido gerado pelo sistema', () => {
    const { token } = servicos.authService.login('teste@auth.com', 'SenhaValida123');
    const usuarioLogado = servicos.authService.autenticar(token);
    expect(usuarioLogado.email).toBe('teste@auth.com');
    expect(usuarioLogado.perfil).toBe('PACIENTE');
  });

  /**
   * @caso CT-INT-009
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RF01.2, RNF02
   * @objetivo Rejeitar token JWT adulterado ou com assinatura inválida
   * @resultadoEsperado Lança erro NAO_AUTENTICADO
   */
  test('deve rejeitar token com assinatura violada', () => {
    const tokenInvalido = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidPayload.invalidSignature';
    expect(() => servicos.authService.autenticar(tokenInvalido)).toThrow(/Token inválido ou expirado/i);
  });
});
