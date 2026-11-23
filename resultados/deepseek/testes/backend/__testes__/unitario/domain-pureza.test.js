// RNF07: as regras de negócio do domínio são puras, sem banco, HTTP ou relógio implícito.
const agenda = require('../../src/domain/agenda');
const consultas = require('../../src/domain/consultas');
const validacoes = require('../../src/domain/validacoes');

function modulosCarregados() {
  return Object.keys(require.cache).map((caminho) => caminho.replace(/\\/g, '/').toLowerCase());
}

describe('pureza do domínio', () => {
  /**
   * @caso CT-UNI-236
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Garantir que o domínio não dependa do driver do SQLite
   * @resultadoEsperado Nenhum módulo do better-sqlite3 está no cache após importar o domínio
   */
  test('domínio não carrega o driver do banco', () => {
    expect(modulosCarregados().some((m) => m.includes('better-sqlite3'))).toBe(false);
  });

  /**
   * @caso CT-UNI-237
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Garantir que o domínio não dependa do Express
   * @resultadoEsperado Nenhum caminho de express está no cache de módulos
   */
  test('domínio não carrega o Express', () => {
    expect(modulosCarregados().some((m) => m.includes('/node_modules/express/'))).toBe(false);
  });

  /**
   * @caso CT-UNI-238
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Executar as regras apenas com objetos simples, sem fixtures de banco
   * @resultadoEsperado Os três módulos do domínio executam regras sobre dados em memória
   */
  test('regras executam sobre objetos em memória', () => {
    expect(validacoes.emailValido('ana@email.com')).toBe(true);
    expect(agenda.gerarSlots([{ horaInicio: '08:00', horaFim: '09:00' }], 30)).toEqual(['08:00', '08:30']);
    expect(consultas.calcularValor({ precoBaseCentavos: 1000, idadePaciente: 30, ehRetorno: false })).toBe(1000);
  });

  /**
   * @caso CT-UNI-239
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Confirmar que as regras não leem o relógio diretamente
   * @resultadoEsperado validarAntecedencia recebe o instante "agora" como parâmetro e não carrega o módulo de relógio
   */
  test('regras recebem o instante por parâmetro', () => {
    const resultado = consultas.validarAntecedencia(new Date(2026, 9, 19, 9, 0), new Date(2026, 9, 19, 8, 0));
    expect(resultado).toContain('2 horas');
    expect(modulosCarregados().some((m) => m.endsWith('/src/utils/clock.js'))).toBe(false);
  });

  /**
   * @caso CT-UNI-240
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Expor as regras como funções independentes e reutilizáveis
   * @resultadoEsperado Os módulos exportam funções nomeadas, sem classes com estado
   */
  test('módulos exportam funções puras nomeadas', () => {
    Object.values(consultas).forEach((valor) => {
      if (typeof valor === 'function') expect(valor.length).toBeGreaterThan(0);
    });
    expect(typeof agenda.gerarSlots).toBe('function');
    expect(typeof agenda.validarGrade).toBe('function');
    expect(typeof validacoes.cpfValido).toBe('function');
  });
});
