# lote-099

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 19 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0119 | CT-INT-080 | login válido do paciente retorna token e perfil | passou |  |
| glm-0120 | CT-INT-081 | token expira em 8 horas | passou |  |
| glm-0121 | CT-INT-082 | senha errada retorna 401 e conta a tentativa | passou |  |
| glm-0122 | CT-INT-083 | quinta tentativa errada bloqueia a conta por 15 minutos | falhou | Error: expect(received).toBe(expected) // Object.is equality Expected: 401 Received: 423 at Object.toBe (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\g |
| glm-0123 | CT-INT-084 | senha correta durante o bloqueio é recusada | passou |  |
| glm-0124 | CT-INT-085 | acerto zera o contador de tentativas | passou |  |
| glm-0125 | CT-INT-086 | e-mail inexistente retorna 401 genérico | passou |  |
| glm-0126 | CT-INT-087 | login sem e-mail ou senha recebe 400 | passou |  |
| glm-0127 | CT-INT-088 | conta inativa não faz login | passou |  |
| glm-0128 | CT-INT-089 | autenticar devolve o perfil do token válido | passou |  |
| glm-0129 | CT-INT-090 | token inválido recebe 401 | passou |  |
| glm-0130 | CT-INT-091 | token de usuário inexistente recebe 401 | passou |  |
| glm-0131 | CT-INT-092 | senha é guardada apenas como hash bcrypt | passou |  |
| glm-0132 | CT-INT-093 | resumo agrupa consultas por status | passou |  |
| glm-0133 | CT-INT-094 | taxa de faltas do médico é calculada sobre as encerradas | passou |  |
| glm-0134 | CT-INT-095 | faturamento soma só as realizadas | passou |  |
| glm-0135 | CT-INT-096 | médico só com faltas tem taxa de 100% | passou |  |
| glm-0136 | CT-INT-097 | recusa período invertido | passou |  |
| glm-0137 | CT-INT-098 | recusa período sem datas informadas | passou |  |

## Arquivo: backend/__testes__/integracao/auth-relatorios-servicos.test.js

```js
// Testes de integração de autenticação e relatórios (RF01, RF11, RN01, RN04).
const clock = require('../../src/utils/clock');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const config = require('../../src/config');

let db, servicos, pacientes, ana;
const capturar = (acao) => { try { return acao(); } catch (erro) { return erro; } };

beforeAll(() => {
  clock.definirAgora(new Date(2026, 9, 19, 8, 0)); // 2026-10-19 08:00, segunda-feira
  db = abrirBanco(':memory:');
  ({ pacientes } = semear(db));
  servicos = criarServicos(db);
  ana = pacientes[0];
});

afterAll(() => {
  clock.definirAgora(null);
  db.close();
});

describe('login (RF01.1, RN01, RN04)', () => {
  /**
   * @caso CT-INT-080
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1, RN01
   * @objetivo Autenticar paciente com credenciais válidas e devolver o perfil público
   * @resultadoEsperado login retorna token e perfil com pacienteId, sem expor o hash da senha
   */
  test('login válido do paciente retorna token e perfil', () => {
    const { token, usuario } = servicos.authService.login('ana@email.com', 'Senha123');
    expect(typeof token).toBe('string');
    expect(usuario.nome).toBe('Ana Pereira');
    expect(usuario.perfil).toBe('PACIENTE');
    expect(usuario.pacienteId).toBe(ana.id);
    expect(usuario.senhaHash).toBeUndefined();
  });

  /**
   * @caso CT-INT-081
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Emitir token com validade de 8 horas
   * @resultadoEsperado diferença entre exp e iat do token é exatamente 28800 segundos
   */
  test('token expira em 8 horas', () => {
    const { token } = servicos.authService.login('ana@email.com', 'Senha123');
    const payload = jwt.decode(token);
    expect(payload.exp - payload.iat).toBe(28800);
  });

  /**
   * @caso CT-INT-082
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1, RN04
   * @objetivo Recusar senha errada com mensagem genérica e contar a tentativa
   * @resultadoEsperado login lança NAO_AUTENTICADO (401) e tentativasFalhas vai a 1
   */
  test('senha errada retorna 401 e conta a tentativa', () => {
    const erro = capturar(() => servicos.authService.login('ana@email.com', 'Errada123'));
    expect(erro.status).toBe(401);
    expect(erro.message).toBe('E-mail ou senha inválidos.');
    const usuario = servicos.repos.usuarios.buscarPorEmail('ana@email.com');
    expect(usuario.tentativasFalhas).toBe(1);
  });

  /**
   * @caso CT-INT-083
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Bloquear a conta por 15 minutos na quinta tentativa errada
   * @resultadoEsperado 5º erro lança CONTA_BLOQUEADA (423) e grava bloqueadoAte 2026-10-19 08:15
   */
  test('quinta tentativa errada bloqueia a conta por 15 minutos', () => {
    let erro;
    for (let i = 0; i < 4; i += 1) {
      erro = capturar(() => servicos.authService.login('ana@email.com', 'Errada123'));
      expect(erro.status).toBe(401);
    }
    erro = capturar(() => servicos.authService.login('ana@email.com', 'Errada123'));
    expect(erro.status).toBe(423);
    expect(erro.message).toBe('Conta bloqueada por excesso de tentativas. Tente novamente após 2026-10-19 08:15.');
    expect(servicos.repos.usuarios.buscarPorEmail('ana@email.com').bloqueadoAte).toBe('2026-10-19 08:15');
  });

  /**
   * @caso CT-INT-084
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Manter o bloqueio mesmo com a senha correta dentro do período
   * @resultadoEsperado login correto durante o bloqueio lança CONTA_BLOQUEADA (423)
   */
  test('senha correta durante o bloqueio é recusada', () => {
    const erro = capturar(() => servicos.authService.login('ana@email.com', 'Senha123'));
    expect(erro.status).toBe(423);
    expect(erro.message).toContain('Conta bloqueada');
  });

  /**
   * @caso CT-INT-085
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN04
   * @objetivo Zerar o contador de falhas quando o login é bem-sucedido
   * @resultadoEsperado após 2 erros e um acerto, tentativasFalhas volta a 0 e bloqueadoAte fica nulo
   */
  test('acerto zera o contador de tentativas', () => {
    const joao = pacientes[1].id;
    expect(joao).toBeGreaterThan(0);
    capturar(() => servicos.authService.login('joao@email.com', 'Errada123'));
    capturar(() => servicos.authService.login('joao@email.com', 'Errada123'));
    expect(servicos.repos.usuarios.buscarPorEmail('joao@email.com').tentativasFalhas).toBe(2);
    servicos.authService.login('joao@email.com', 'Senha123');
    const usuario = servicos.repos.usuarios.buscarPorEmail('joao@email.com');
    expect(usuario.tentativasFalhas).toBe(0);
    expect(usuario.bloqueadoAte).toBeNull();
  });

  /**
   * @caso CT-INT-086
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF01.1
   * @objetivo Responder com mensagem genérica para e-mail inexistente
   * @resultadoEsperado login com e-mail desconhecido lança NAO_AUTENTICADO (401) sem revelar existência
   */
  test('e-mail inexistente retorna 401 genérico', () => {
    const erro = capturar(() => servicos.authService.login('fantasma@email.com', 'Senha123'));
    expect(erro.status).toBe(401);
    expect(erro.message).toBe('E-mail ou senha inválidos.');
  });

  /**
   * @caso CT-INT-087
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF01.1
   * @objetivo Tratar login sem e-mail ou sem senha
   * @resultadoEsperado login lança VALIDACAO (400) pedindo e-mail e senha
   */
  test('login sem e-mail ou senha recebe 400', () => {
    const erro = capturar(() => servicos.authService.login('ana@email.com', ''));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Informe e-mail e senha.');
  });
});

describe('sessão e token (RF01.3)', () => {
  /**
   * @caso CT-INT-088
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1
   * @objetivo Recusar login de conta desativada mesmo com a senha correta
   * @resultadoEsperado login lança SEM_PERMISSAO (403) orientando a procurar a recepção
   */
  test('conta inativa não faz login', () => {
    const usuarioLucas = servicos.repos.usuarios.buscarPorEmail('lucas@email.com');
    servicos.cadastroService.definirUsuarioAtivo(usuarioLucas.id, false);
    const erro = capturar(() => servicos.authService.login('lucas@email.com', 'Senha123'));
    expect(erro.status).toBe(403);
    expect(erro.message).toBe('Conta inativa. Procure a recepção.');
    servicos.cadastroService.definirUsuarioAtivo(usuarioLucas.id, true);
  });

  /**
   * @caso CT-INT-089
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.3
   * @objetivo Recuperar o usuário autenticado a partir de um token válido
   * @resultadoEsperado autenticar devolve o perfil público do paciente dono do token
   */
  test('autenticar devolve o perfil do token válido', () => {
    const { token } = servicos.authService.login('recepcao@clinica.com', 'Senha123');
    const usuario = servicos.authService.autenticar(token);
    expect(usuario.email).toBe('recepcao@clinica.com');
    expect(usuario.perfil).toBe('RECEPCAO');
    expect(usuario.senhaHash).toBeUndefined();
  });

  /**
   * @caso CT-INT-090
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.3
   * @objetivo Recusar token inválido ou adulterado
   * @resultadoEsperado autenticar lança NAO_AUTENTICADO (401) com 'Token inválido ou expirado.'
   */
  test('token inválido recebe 401', () => {
    const erro = capturar(() => servicos.authService.autenticar('token-falsificado'));
    expect(erro.status).toBe(401);
    expect(erro.message).toBe('Token inválido ou expirado.');
  });

  /**
   * @caso CT-INT-091
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.3, RNF02
   * @objetivo Recusar token cujo usuário não existe mais ou está inativo
   * @resultadoEsperado autenticar lança NAO_AUTENTICADO (401) de usuário inexistente ou inativo
   */
  test('token de usuário inexistente recebe 401', () => {
    const token = jwt.sign({ sub: 9999, perfil: 'PACIENTE' }, config.jwtSegredo, { expiresIn: '8h' });
    const erro = capturar(() => servicos.authService.autenticar(token));
    expect(erro.status).toBe(401);
    expect(erro.message).toBe('Usuário inexistente ou inativo.');
  });

  /**
   * @caso CT-INT-092
   * @nivel integracao
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RN01
   * @objetivo Garantir que a senha nunca é gravada em texto puro
   * @resultadoEsperado senhaHash é um hash bcrypt válido para 'Senha123' e diferente dela
   */
  test('senha é guardada apenas como hash bcrypt', () => {
    const usuario = servicos.repos.usuarios.buscarPorEmail('ana@email.com');
    expect(usuario.senhaHash).not.toBe('Senha123');
    expect(usuario.senhaHash.startsWith('$2')).toBe(true);
    expect(bcrypt.compareSync('Senha123', usuario.senhaHash)).toBe(true);
  });
});

describe('relatórios (RF11)', () => {
  let anaId, joaoId;
  const recepcionar = (pacienteId, medicoId, inicio) =>
    servicos.consultasService.agendar({ perfil: 'RECEPCAO' }, { pacienteId, medicoId, inicio });

  beforeAll(() => {
    anaId = pacientes[0].id;
    joaoId = pacientes[1].id;
    // AGENDADA
    recepcionar(anaId, 1, '2026-10-20 08:00');
    // CONFIRMADA
    const confirmavel = recepcionar(anaId, 2, '2026-10-19 10:30');
    servicos.consultasService.confirmar({ perfil: 'PACIENTE', pacienteId: anaId }, confirmavel.id);
    // REALIZADA
    const realizada = servicos.repos.consultas.inserir({
      pacienteId: anaId, medicoId: 1, inicio: '2026-10-14 08:00', fim: '2026-10-14 08:30',
      valorCentavos: 15000, retornoDe: null, agora: '2026-10-19 08:00',
    });
    servicos.repos.consultas.atualizarStatus(realizada, 'REALIZADA', '2026-10-19 08:00');
    // FALTA
    const falta = servicos.repos.consultas.inserir({
      pacienteId: anaId, medicoId: 1, inicio: '2026-10-15 08:00', fim: '2026-10-15 08:30',
      valorCentavos: 15000, retornoDe: null, agora: '2026-10-19 08:00',
    });
    servicos.repos.consultas.atualizarStatus(falta, 'FALTA', '2026-10-19 08:00');
    // CANCELADA
    const cancelada = servicos.repos.consultas.inserir({
      pacienteId: anaId, medicoId: 1, inicio: '2026-10-16 08:00', fim: '2026-10-16 08:30',
      valorCentavos: 15000, retornoDe: null, agora: '2026-10-19 08:00',
    });
    servicos.repos.consultas.atualizarStatus(cancelada, 'CANCELADA', '2026-10-19 08:00', { canceladoPor: 'RECEPCAO' });
  });

  /**
   * @caso CT-INT-093
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Consolidar as consultas do período agrupadas por status
   * @resultadoEsperado porStatus traz exatamente 1 consulta em cada um dos 5 status
   */
  test('resumo agrupa consultas por status', () => {
    const resumo = servicos.relatoriosService.resumo({ dataInicio: '2026-10-14', dataFim: '2026-10-20' });
    expect(resumo.porStatus).toEqual({
      AGENDADA: 1, CONFIRMADA: 1, REALIZADA: 1, FALTA: 1, CANCELADA: 1,
    });
    expect(resumo.periodo).toEqual({ dataInicio: '2026-10-14', dataFim: '2026-10-20' });
  });

  /**
   * @caso CT-INT-094
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Calcular a taxa de faltas por médico no período
   * @resultadoEsperado Carlos aparece com 1 falta em 2 consultas encerradas, taxa de 50%
   */
  test('taxa de faltas do médico é calculada sobre as encerradas', () => {
    const resumo = servicos.relatoriosService.resumo({ dataInicio: '2026-10-14', dataFim: '2026-10-20' });
    const carlos = resumo.faltasPorMedico.find((l) => l.medicoId === 1);
    expect(carlos.faltas).toBe(1);
    expect(carlos.encerradas).toBe(2);
    expect(carlos.taxaFaltas).toBe(50);
  });

  /**
   * @caso CT-INT-095
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Somar no faturamento apenas consultas realizadas
   * @resultadoEsperado faturamentoCentavos do período é 15000, ignorando status não realizados
   */
  test('faturamento soma só as realizadas', () => {
    const resumo = servicos.relatoriosService.resumo({ dataInicio: '2026-10-14', dataFim: '2026-10-20' });
    expect(resumo.faturamentoCentavos).toBe(15000);
  });

  /**
   * @caso CT-INT-096
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Reportar taxa de 100% para médico cujas encerradas são todas faltas
   * @resultadoEsperado Eduardo aparece com 1 falta, 0 realizações e taxaFaltas 100
   */
  test('médico só com faltas tem taxa de 100%', () => {
    const id = servicos.repos.consultas.inserir({
      pacienteId: joaoId, medicoId: 3, inicio: '2026-10-16 13:00', fim: '2026-10-16 13:30',
      valorCentavos: 25000, retornoDe: null, agora: '2026-10-19 08:00',
    });
    servicos.repos.consultas.atualizarStatus(id, 'FALTA', '2026-10-19 08:00');
    const resumo = servicos.relatoriosService.resumo({ dataInicio: '2026-10-14', dataFim: '2026-10-20' });
    const eduardo = resumo.faltasPorMedico.find((l) => l.medicoId === 3);
    expect(eduardo.faltas).toBe(1);
    expect(eduardo.encerradas).toBe(1);
    expect(eduardo.taxaFaltas).toBe(100);
  });

  /**
   * @caso CT-INT-097
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11
   * @objetivo Recusar período com data final anterior à inicial
   * @resultadoEsperado resumo lança VALIDACAO (400) com mensagem de coerência das datas
   */
  test('recusa período invertido', () => {
    const erro = capturar(() => servicos.relatoriosService.resumo({ dataInicio: '2026-10-20', dataFim: '2026-10-14' }));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('dataFim não pode ser anterior a dataInicio.');
  });

  /**
   * @caso CT-INT-098
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF11
   * @objetivo Exigir as duas datas do período no formato correto
   * @resultadoEsperado resumo sem datas lança VALIDACAO (400) pedindo AAAA-MM-DD
   */
  test('recusa período sem datas informadas', () => {
    const erro = capturar(() => servicos.relatoriosService.resumo({}));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Informe dataInicio e dataFim no formato AAAA-MM-DD.');
  });
});
```
