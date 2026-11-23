// Integração: conexão SQLite, schema e limpeza do banco.
const { abrirBanco, limparBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const clock = require('../../src/utils/clock');

let db;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  db = abrirBanco(':memory:');
});

afterEach(() => {
  db.close();
  clock.definirAgora(null);
});

describe('abrirBanco', () => {
  /**
   * @caso CT-INT-001
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF01, RF02, RF03, RF04, RF05, RF06, RF07, RF08, RF09, RF10, RF11
   * @objetivo Criar todas as tabelas do schema em um banco em memória
   * @resultadoEsperado Existem as 7 tabelas de usuários a consultas
   */
  test('cria todas as tabelas do schema', () => {
    const tabelas = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((l) => l.name);
    expect(tabelas).toEqual(
      expect.arrayContaining(['usuarios', 'pacientes', 'especialidades', 'medicos', 'disponibilidades', 'bloqueios', 'consultas']),
    );
  });

  /**
   * @caso CT-INT-002
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Ativar a verificação de chaves estrangeiras
   * @resultadoEsperado PRAGMA foreign_keys devolve 1
   */
  test('ativa chaves estrangeiras', () => {
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  /**
   * @caso CT-INT-003
   * @nivel integracao
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento-no-tempo
   * @requisito RNF05
   * @objetivo Criar os índices de busca por médico e por paciente
   * @resultadoEsperado Os índices idx_consultas_medico_inicio e idx_consultas_paciente_inicio existem
   */
  test('cria índices de consultas por médico e paciente', () => {
    const indices = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((l) => l.name);
    expect(indices).toContain('idx_consultas_medico_inicio');
    expect(indices).toContain('idx_consultas_paciente_inicio');
  });

  /**
   * @caso CT-INT-004
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RN01
   * @objetivo Garantir e-mail único sem diferenciar maiúsculas
   * @resultadoEsperado Inserir o mesmo e-mail em caixa alta viola a restrição UNIQUE
   */
  test('e-mail é único sem diferenciar maiúsculas', () => {
    db.prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, criado_em) VALUES ('Ana', 'ana@email.com', 'x', 'PACIENTE', '2026-10-19 08:00')").run();
    expect(() =>
      db.prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, criado_em) VALUES ('Outra', 'ANA@EMAIL.COM', 'x', 'PACIENTE', '2026-10-19 08:00')").run(),
    ).toThrow(/UNIQUE/);
  });

  /**
   * @caso CT-INT-005
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RN03
   * @objetivo Garantir CPF único na tabela de pacientes
   * @resultadoEsperado Inserir o mesmo CPF duas vezes viola a restrição UNIQUE
   */
  test('CPF é único no banco', () => {
    db.prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, criado_em) VALUES ('Ana', 'a@e.com', 'x', 'PACIENTE', '2026-10-19 08:00')").run();
    db.prepare("INSERT INTO pacientes (usuario_id, cpf, data_nascimento) VALUES (1, '52998224725', '1990-05-14')").run();
    expect(() => db.prepare("INSERT INTO pacientes (usuario_id, cpf, data_nascimento) VALUES (1, '52998224725', '1990-05-14')").run()).toThrow(/UNIQUE/);
  });

  /**
   * @caso CT-INT-006
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RF09
   * @objetivo Restringir os status de consulta previstos na máquina de estados
   * @resultadoEsperado Inserir status 'PENDENTE' viola a restrição CHECK
   */
  test('status de consulta é restrito pela máquina de estados', () => {
    db.prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, criado_em) VALUES ('Ana', 'a@e.com', 'x', 'PACIENTE', '2026-10-19 08:00')").run();
    db.prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, criado_em) VALUES ('Dr', 'd@e.com', 'x', 'MEDICO', '2026-10-19 08:00')").run();
    db.prepare("INSERT INTO especialidades (nome, preco_centavos) VALUES ('Geral', 10000)").run();
    db.prepare("INSERT INTO pacientes (usuario_id, cpf, data_nascimento) VALUES (1, '52998224725', '1990-05-14')").run();
    db.prepare("INSERT INTO medicos (usuario_id, crm, especialidade_id) VALUES (2, '12345/SP', 1)").run();
    expect(() =>
      db
        .prepare("INSERT INTO consultas (paciente_id, medico_id, inicio, fim, status, valor_centavos, criado_em, atualizado_em) VALUES (1, 1, '2026-10-20 09:00', '2026-10-20 09:30', 'PENDENTE', 10000, '2026-10-19 08:00', '2026-10-19 08:00')")
        .run(),
    ).toThrow(/CHECK/);
  });

  /**
   * @caso CT-INT-007
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RN09
   * @objetivo Recusar preço base não positivo no banco
   * @resultadoEsperado Inserir preço 0 viola a restrição CHECK
   */
  test('preço da especialidade deve ser maior que zero', () => {
    expect(() => db.prepare("INSERT INTO especialidades (nome, preco_centavos) VALUES ('Grátis', 0)").run()).toThrow(/CHECK/);
  });
});

describe('limparBanco', () => {
  /**
   * @caso CT-INT-008
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RNF07
   * @objetivo Esvaziar todas as tabelas de dados
   * @resultadoEsperado As contagens de usuários, médicos, pacientes e consultas ficam em zero
   */
  test('remove todos os registros', () => {
    semear(db);
    limparBanco(db);
    const contar = (tabela) => db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get().n;
    expect(contar('usuarios')).toBe(0);
    expect(contar('medicos')).toBe(0);
    expect(contar('pacientes')).toBe(0);
    expect(contar('especialidades')).toBe(0);
    expect(contar('consultas')).toBe(0);
    expect(contar('disponibilidades')).toBe(0);
    expect(contar('bloqueios')).toBe(0);
  });

  /**
   * @caso CT-INT-009
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RNF07
   * @objetivo Reiniciar a numeração de ids após a limpeza
   * @resultadoEsperado O próximo usuário inserido depois de limpar recebe id 1
   */
  test('reinicia a sequência de ids', () => {
    semear(db);
    limparBanco(db);
    const id = db
      .prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil, criado_em) VALUES ('Novo', 'novo@email.com', 'x', 'RECEPCAO', '2026-10-19 08:00')")
      .run().lastInsertRowid;
    expect(Number(id)).toBe(1);
  });

  /**
   * @caso CT-INT-010
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RNF07
   * @objetivo Permitir semear novamente depois de limpar, sem violar unicidade
   * @resultadoEsperado O segundo semear devolve os mesmos médicos de exemplo e 8 usuários
   */
  test('permite semear novamente após limpar', () => {
    semear(db);
    limparBanco(db);
    const dados = semear(db);
    expect(dados.medicos).toHaveLength(4);
    expect(db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n).toBe(8);
  });
});
