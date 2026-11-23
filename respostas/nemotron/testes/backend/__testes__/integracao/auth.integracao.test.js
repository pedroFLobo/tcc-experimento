// Testes de integração — serviço de autenticação (RF01, RN04, RNF01, RNF02)
// Atributos: Segurança, Confiabilidade
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const semear = require('../../src/db/seed').semear;
const clock = require('../../src/utils/clock');
const bcrypt = require('bcryptjs');
const { criarServicos } = require('../../src/services');

const AGORA = new Date('2026-10-19T08:00:00');

let db, servicos;

beforeEach(() => {
  clock.definirAgora(AGORA);
  db = abrirBanco(':memory:');
  semear(db);
  servicos = criarServicos(db);
});

afterEach(() => {
  limparBanco(db);
  db.close();
  clock.definirAgora(null);
});

describe('authService.login (RF01.1, RN04)', () => {
  test('login com sucesso retorna token JWT', () => {
    const r = servicos.authService.login('ana@email.com', 'Senha123');
    expect(r.token).toBeDefined();
    expect(r.usuario.email).toBe('ana@email.com');
    expect(r.usuario.perfil).toBe('PACIENTE');
    expect(r.usuario.pacienteId).toBeDefined();
  });

  test('rejeita senha errada', () => {
    expect(() => servicos.authService.login('ana@email.com', 'SenhaErrada')).toThrow(/E-mail ou senha inválidos/);
  });

  test('rejeita e-mail inexistente', () => {
    expect(() => servicos.authService.login('naoexiste@email.com', 'Senha123')).toThrow(/E-mail ou senha inválidos/);
  });

  test('senha não é retornada (RNF01)', () => {
    const r = servicos.authService.login('ana@email.com', 'Senha123');
    expect(r.usuario.senha).toBeUndefined();
    expect(r.usuario.senhaHash).toBeUndefined();
  });

  test('5 tentativas erradas bloqueiam a conta por 15 min (RN04)', () => {
    const email = 'joao@email.com';
    for (let i = 0; i < 5; i++) {
      expect(() => servicos.authService.login(email, 'senhaerrada1')).toThrow();
    }
    expect(() => servicos.authService.login(email, 'Senha123')).toThrow(/bloqueada/);
  });

  test('durante o bloqueio, até a senha correta é recusada (RN04)', () => {
    const email = 'joao@email.com';
    for (let i = 0; i < 5; i++) {
      expect(() => servicos.authService.login(email, 'senhaerrada1')).toThrow();
    }
    // avança o relógio 14 minutos (ainda bloqueado)
    clock.definirAgora(new Date('2026-10-19T08:14:00'));
    expect(() => servicos.authService.login(email, 'Senha123')).toThrow(/bloqueada/);
  });

  test('após 15 minutos o bloqueio expira e login correto entra (RN04)', () => {
    const email = 'joao@email.com';
    for (let i = 0; i < 5; i++) {
      expect(() => servicos.authService.login(email, 'senhaerrada1')).toThrow();
    }
    clock.definirAgora(new Date('2026-10-19T08:15:00'));
    const r = servicos.authService.login(email, 'Senha123');
    expect(r.token).toBeDefined();
  });

  test('login correto zera o contador de falhas (RN04)', () => {
    const email = 'joao@email.com';
    expect(() => servicos.authService.login(email, 'senhaerrada1')).toThrow();
    expect(() => servicos.authService.login(email, 'senhaerrada1')).toThrow();
    const r = servicos.authService.login(email, 'Senha123');
    expect(r.token).toBeDefined();
    // agora 4 erradas não devem bloquear
    for (let i = 0; i < 4; i++) {
      expect(() => servicos.authService.login(email, 'senhaerrada1')).toThrow();
    }
    expect(() => servicos.authService.login(email, 'senhaerrada1')).toThrow(/bloqueada/);
  });

  test('rejeita conta inativa', () => {
    servicos.cadastroService.definirUsuarioAtivo(
      servicos.usuarios.buscarPorEmail('ana@email.com').id,
      false
    );
    expect(() => servicos.authService.login('ana@email.com', 'Senha123')).toThrow(/inativa/);
  });
});

describe('authService.autenticar (RF01.2, RNF02)', () => {
  test('retorna o usuário a partir de um token válido', () => {
    const { token } = servicos.authService.login('ana@email.com', 'Senha123');
    const usuario = servicos.authService.autenticar(token);
    expect(usuario.email).toBe('ana@email.com');
  });

  test('rejeita token inválido', () => {
    expect(() => servicos.authService.autenticar('token.invalido')).toThrow(/Token inválido/);
  });

  test('rejeita token de usuário inativo', () => {
    const { token } = servicos.authService.login('ana@email.com', 'Senha123');
    servicos.cadastroService.definirUsuarioAtivo(
      servicos.usuarios.buscarPorEmail('ana@email.com').id,
      false
    );
    expect(() => servicos.authService.autenticar(token)).toThrow(/inativo/);
  });
});

describe('authService.gerarHash (RNF01)', () => {
  test('gera hash diferente para a mesma senha em chamadas diferentes (bcrypt salt)', () => {
    const h1 = servicos.authService.gerarHash('Senha123');
    const h2 = servicos.authService.gerarHash('Senha123');
    expect(h1).not.toBe(h2);
    expect(bcrypt.compareSync('Senha123', h1)).toBe(true);
    expect(bcrypt.compareSync('Senha123', h2)).toBe(true);
  });
});
