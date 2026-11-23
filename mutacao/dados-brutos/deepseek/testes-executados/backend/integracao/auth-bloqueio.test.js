// Integração: bloqueio temporário após tentativas de login erradas (RN04).
const bcrypt = require('bcryptjs');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
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

function tentarLogin(email, senha) {
  try {
    return { sucesso: ctx.authService.login(email, senha) };
  } catch (erro) {
    return { erro };
  }
}

function errarLogin(vezes, email = 'ana@email.com') {
  let ultimo;
  for (let i = 0; i < vezes; i++) ultimo = tentarLogin(email, 'SenhaErrada1').erro;
  return ultimo;
}

describe('bloqueio por tentativas', () => {
  /**
   * @caso CT-INT-044
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Manter a conta liberada nas quatro primeiras falhas
   * @resultadoEsperado As quatro primeiras respostas são 401 e o contador chega a 4
   */
  test('quatro falhas não bloqueiam a conta', () => {
    const erro = errarLogin(4);
    expect(erro.status).toBe(401);
    const usuario = ctx.repos.usuarios.buscarPorEmail('ana@email.com');
    expect(usuario.tentativasFalhas).toBe(4);
    expect(usuario.bloqueadoAte).toBeNull();
  });

  /**
   * @caso CT-INT-045
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Bloquear a conta na quinta falha seguida
   * @resultadoEsperado A quinta tentativa devolve 423 CONTA_BLOQUEADA
   */
  test('quinta falha bloqueia a conta', () => {
    const erro = errarLogin(5);
    expect([erro.status, erro.codigo]).toEqual([423, 'CONTA_BLOQUEADA']);
  });

  /**
   * @caso CT-INT-046
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Bloquear por exatamente 15 minutos
   * @resultadoEsperado bloqueadoAte fica em 19/10/2026 08:15 e a mensagem cita esse horário
   */
  test('bloqueio dura 15 minutos', () => {
    const erro = errarLogin(5);
    expect(ctx.repos.usuarios.buscarPorEmail('ana@email.com').bloqueadoAte).toBe('2026-10-19 08:15');
    expect(erro.message).toContain('2026-10-19 08:15');
  });

  /**
   * @caso CT-INT-047
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Recusar até a senha correta durante o bloqueio
   * @resultadoEsperado login com Senha123 devolve 423 CONTA_BLOQUEADA
   */
  test('senha correta é recusada durante o bloqueio', () => {
    errarLogin(5);
    const { erro } = tentarLogin('ana@email.com', 'Senha123');
    expect([erro.status, erro.codigo]).toEqual([423, 'CONTA_BLOQUEADA']);
  });

  /**
   * @caso CT-INT-048
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Manter o bloqueio 14 minutos depois
   * @resultadoEsperado Mesmo com a senha correta o login continua em 423
   */
  test('bloqueio permanece após 14 minutos', () => {
    errarLogin(5);
    clock.definirAgora(new Date('2026-10-19T08:14:00'));
    expect(tentarLogin('ana@email.com', 'Senha123').erro.status).toBe(423);
  });

  /**
   * @caso CT-INT-049
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Liberar o login exatamente no fim dos 15 minutos
   * @resultadoEsperado No instante 08:15 a autenticação com a senha correta funciona
   */
  test('libera o login ao completar 15 minutos', () => {
    errarLogin(5);
    clock.definirAgora(new Date('2026-10-19T08:15:00'));
    expect(tentarLogin('ana@email.com', 'Senha123').sucesso.token).toEqual(expect.any(String));
  });

  /**
   * @caso CT-INT-050
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Reiniciar a contagem de falhas após o fim do bloqueio
   * @resultadoEsperado Uma nova senha errada depois do bloqueio devolve 401, não 423
   */
  test('após o bloqueio a contagem recomeça', () => {
    errarLogin(5);
    clock.definirAgora(new Date('2026-10-19T08:16:00'));
    expect(tentarLogin('ana@email.com', 'SenhaErrada1').erro.status).toBe(401);
  });

  /**
   * @caso CT-INT-051
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Zerar o contador de falhas após login correto
   * @resultadoEsperado Depois de 3 falhas e um acerto o contador volta a zero
   */
  test('login correto zera o contador', () => {
    errarLogin(3);
    ctx.authService.login('ana@email.com', 'Senha123');
    const usuario = ctx.repos.usuarios.buscarPorEmail('ana@email.com');
    expect(usuario.tentativasFalhas).toBe(0);
    expect(usuario.bloqueadoAte).toBeNull();
  });

  /**
   * @caso CT-INT-052
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Não bloquear por falhas acumuladas antes de um login correto
   * @resultadoEsperado Depois de 3 falhas, um acerto e 4 novas falhas, o login continua em 401
   */
  test('acerto interrompe a sequência de falhas', () => {
    errarLogin(3);
    ctx.authService.login('ana@email.com', 'Senha123');
    expect(errarLogin(4).status).toBe(401);
  });

  /**
   * @caso CT-INT-053
   * @nivel integracao
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN04, RN30
   * @objetivo Bloquear apenas a conta que errou a senha
   * @resultadoEsperado A conta de João continua autenticando após o bloqueio de Ana
   */
  test('bloqueio é por conta', () => {
    errarLogin(5, 'ana@email.com');
    expect(tentarLogin('joao@email.com', 'Senha123').sucesso.usuario.nome).toBe('João Santos');
  });

  /**
   * @caso CT-INT-054
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RN04, RNF06
   * @objetivo Explicar em português que a conta está bloqueada
   * @resultadoEsperado A mensagem começa com "Conta bloqueada por excesso de tentativas"
   */
  test('mensagem de bloqueio é legível', () => {
    const erro = errarLogin(5);
    expect(erro.message).toMatch(/^Conta bloqueada por excesso de tentativas\. Tente novamente após /);
  });

  /**
   * @caso CT-INT-055
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN04, RNF01
   * @objetivo Não registrar a senha errada em texto no banco
   * @resultadoEsperado O hash permanece o mesmo depois das tentativas erradas
   */
  test('tentativas erradas não alteram o hash da senha', () => {
    const antes = ctx.repos.usuarios.buscarPorEmail('ana@email.com').senhaHash;
    errarLogin(5);
    const depois = ctx.repos.usuarios.buscarPorEmail('ana@email.com').senhaHash;
    expect(depois).toBe(antes);
    expect(bcrypt.compareSync('Senha123', depois)).toBe(true);
  });
});
