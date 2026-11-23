// Integração: consultas SQL parametrizadas e integridade sob entradas maliciosas (RNF03, RN30).
const { abrirBanco } = require('../../src/db/connection');
const { semear } = require('../../src/db/seed');
const { criarServicos } = require('../../src/services');
const clock = require('../../src/utils/clock');

let ctx;
let recepcao;
let ana;

beforeEach(() => {
  clock.definirAgora(new Date('2026-10-19T08:00:00'));
  const db = abrirBanco(':memory:');
  const dados = semear(db);
  ctx = { db, ...dados, ...criarServicos(db) };
  recepcao = { perfil: 'RECEPCAO' };
  ana = ctx.pacientes[0];
});

afterEach(() => {
  ctx.db.close();
  clock.definirAgora(null);
});

const contar = (tabela) => ctx.db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get().n;

describe('busca de pacientes', () => {
  /**
   * @caso CT-INT-279
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Tratar aspas simples na busca como texto, não como SQL
   * @resultadoEsperado A busca devolve lista vazia sem lançar erro
   */
  test('aspas simples na busca não quebram a consulta', () => {
    expect(ctx.repos.pacientes.listar("'")).toEqual([]);
  });

  /**
   * @caso CT-INT-280
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03, RN30
   * @objetivo Impedir tautologia SQL de vazar todos os pacientes
   * @resultadoEsperado A busca "OR 1=1" não devolve os pacientes cadastrados
   */
  test('tentativa de tautologia não vaza pacientes', () => {
    expect(ctx.repos.pacientes.listar("' OR '1'='1")).toEqual([]);
  });

  /**
   * @caso CT-INT-281
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Impedir que uma busca execute DROP TABLE
   * @resultadoEsperado A tabela de pacientes continua com os 3 registros
   */
  test('busca com DROP TABLE não apaga dados', () => {
    expect(() => ctx.repos.pacientes.listar("'; DROP TABLE pacientes; --")).not.toThrow();
    expect(contar('pacientes')).toBe(3);
  });

  /**
   * @caso CT-INT-282
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Encontrar paciente pelo nome
   * @resultadoEsperado A busca "Ana" devolve Ana Pereira
   */
  test('busca por nome funciona', () => {
    expect(ctx.repos.pacientes.listar('Ana').map((p) => p.nome)).toEqual(['Ana Pereira']);
  });

  /**
   * @caso CT-INT-283
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Encontrar paciente por parte do CPF
   * @resultadoEsperado A busca "529" devolve Ana Pereira
   */
  test('busca por CPF parcial funciona', () => {
    expect(ctx.repos.pacientes.listar('529').map((p) => p.nome)).toEqual(['Ana Pereira']);
  });

  /**
   * @caso CT-INT-284
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Encontrar paciente pelo e-mail
   * @resultadoEsperado A busca "joao@email.com" devolve João Santos
   */
  test('busca por e-mail funciona', () => {
    expect(ctx.repos.pacientes.listar('joao@email.com').map((p) => p.nome)).toEqual(['João Santos']);
  });

  /**
   * @caso CT-INT-285
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3, RNF06
   * @objetivo Ignorar diferença de maiúsculas na busca por nome
   * @resultadoEsperado "ana" encontra "Ana Pereira"
   */
  test('busca não diferencia maiúsculas', () => {
    expect(ctx.repos.pacientes.listar('ana')).toHaveLength(1);
  });

  /**
   * @caso CT-INT-286
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RF10.3
   * @objetivo Devolver lista vazia quando a busca não encontra ninguém
   * @resultadoEsperado A busca "Zélia" devolve lista vazia
   */
  test('busca sem resultado devolve lista vazia', () => {
    expect(ctx.repos.pacientes.listar('Zélia')).toEqual([]);
  });

  /**
   * @caso CT-INT-287
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF10.3
   * @objetivo Listar todos os pacientes quando a busca é vazia
   * @resultadoEsperado Sem busca são devolvidos os 3 pacientes
   */
  test('busca vazia devolve todos', () => {
    expect(ctx.repos.pacientes.listar()).toHaveLength(3);
  });
});

describe('autenticação sob entrada maliciosa', () => {
  /**
   * @caso CT-INT-288
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02, RNF03
   * @objetivo Impedir login por e-mail com tautologia SQL
   * @resultadoEsperado login lança 401 NAO_AUTENTICADO
   */
  test('e-mail com tautologia não autentica', () => {
    expect(() => ctx.authService.login("' OR '1'='1", 'Senha123')).toThrow(
      expect.objectContaining({ status: 401, codigo: 'NAO_AUTENTICADO', message: 'E-mail ou senha inválidos.' }),
    );
  });

  /**
   * @caso CT-INT-289
   * @nivel integracao
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02, RNF03
   * @objetivo Impedir login com e-mail e senha de injeção
   * @resultadoEsperado login lança 401 NAO_AUTENTICADO
   */
  test('senha de injeção não autentica', () => {
    expect(() => ctx.authService.login('ana@email.com', "' OR '1'='1")).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });

  /**
   * @caso CT-INT-290
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Impedir que a tentativa de login apague usuários
   * @resultadoEsperado A contagem de usuários permanece 8
   */
  test('tentativa de injeção não altera usuários', () => {
    expect(() => ctx.authService.login("x'; DELETE FROM usuarios; --", 'Senha123')).toThrow();
    expect(contar('usuarios')).toBe(8);
  });

  /**
   * @caso CT-INT-291
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF03, RNF04
   * @objetivo Continuar autenticando após tentativas maliciosas
   * @resultadoEsperado O login válido da Ana devolve token
   */
  test('login válido continua funcionando após tentativas maliciosas', () => {
    expect(() => ctx.authService.login("' OR 1=1 --", 'x')).toThrow();
    const sessao = ctx.authService.login('ana@email.com', 'Senha123');
    expect(sessao.token).toEqual(expect.any(String));
    expect(sessao.usuario.perfil).toBe('PACIENTE');
  });
});

describe('dados com caracteres especiais', () => {
  /**
   * @caso CT-INT-292
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF03
   * @objetivo Gravar e recuperar nome com apóstrofo
   * @resultadoEsperado O nome "O'Brien Silva" é devolvido intacto e encontrado na busca
   */
  test('nome com apóstrofo é preservado', () => {
    const paciente = ctx.cadastroService.registrarPaciente({
      nome: "O'Brien Silva",
      email: 'obrien@email.com',
      senha: 'Senha123',
      cpf: '24681357928',
      dataNascimento: '1990-01-10',
    });
    expect(paciente.nome).toBe("O'Brien Silva");
    expect(ctx.repos.pacientes.listar("O'Brien").map((p) => p.id)).toEqual([paciente.id]);
  });

  /**
   * @caso CT-INT-293
   * @nivel integracao
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF03, RN09
   * @objetivo Gravar especialidade com aspas no nome
   * @resultadoEsperado A especialidade é listada com o nome exato
   */
  test('especialidade com caracteres especiais é preservada', () => {
    const especialidade = ctx.cadastroService.criarEspecialidade({ nome: 'Cardio "Especial"', precoCentavos: 12345 });
    expect(ctx.repos.especialidades.listar().map((e) => e.nome)).toContain('Cardio "Especial"');
    expect(especialidade.precoCentavos).toBe(12345);
  });

  /**
   * @caso CT-INT-294
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Manter a integridade referencial após buscas maliciosas
   * @resultadoEsperado As consultas e especialidades continuam acessíveis
   */
  test('buscas maliciosas não afetam outras tabelas', () => {
    ctx.repos.pacientes.listar("'; DELETE FROM especialidades; --");
    expect(contar('especialidades')).toBe(4);
    expect(ctx.repos.especialidades.listar()).toHaveLength(4);
  });

  /**
   * @caso CT-INT-295
   * @nivel integracao
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RNF03
   * @objetivo Impedir injeção ao filtrar consultas por id de médico inexistente
   * @resultadoEsperado listar devolve lista vazia sem erro
   */
  test('filtro por médico inexistente devolve lista vazia', () => {
    ctx.consultasService.agendar(recepcao, { pacienteId: ana.id, medicoId: 1, inicio: '2026-10-20 09:00' });
    expect(ctx.consultasService.listar(recepcao, { medicoId: 99999 })).toEqual([]);
  });
});
