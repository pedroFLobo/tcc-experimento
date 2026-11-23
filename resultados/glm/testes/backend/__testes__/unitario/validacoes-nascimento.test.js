// Testes unitários das validações de data de nascimento e responsável (RN05, RN06).
const { calcularIdade, validarDataNascimento, exigeResponsavel } = require('../../src/domain/validacoes');

const HOJE = new Date(2026, 9, 19); // 2026-10-19, relógio fixo de referência

describe('calcularIdade (RN05, RN06)', () => {
  /**
   * @caso CT-UNI-028
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Calcular a idade quando o aniversário do ano já passou
   * @resultadoEsperado calcularIdade retorna 36 para nascimento em 1990-05-14 com referência em 2026-10-19
   */
  test('calcula idade quando o aniversário já passou', () => {
    expect(calcularIdade(new Date(1990, 4, 14), HOJE)).toBe(36);
  });

  /**
   * @caso CT-UNI-029
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Calcular a idade quando o aniversário do ano ainda não chegou
   * @resultadoEsperado calcularIdade retorna 35 para nascimento em 1990-12-01 com referência em 2026-10-19
   */
  test('calcula idade quando o aniversário ainda não chegou', () => {
    expect(calcularIdade(new Date(1990, 11, 1), HOJE)).toBe(35);
  });

  /**
   * @caso CT-UNI-030
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Exigir responsável para paciente com 17 anos (valor-limite inferior da maioridade)
   * @resultadoEsperado exigeResponsavel retorna true para nascimento em 2009-01-10
   */
  test('exige responsável para 17 anos', () => {
    expect(exigeResponsavel(new Date(2009, 0, 10), HOJE)).toBe(true);
  });

  /**
   * @caso CT-UNI-031
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Não exigir responsável no dia em que o paciente completa 18 anos (valor-limite)
   * @resultadoEsperado exigeResponsavel retorna false para nascimento em 2008-10-19
   */
  test('não exige responsável no aniversário de 18 anos', () => {
    expect(exigeResponsavel(new Date(2008, 9, 19), HOJE)).toBe(false);
  });
});

describe('validarDataNascimento (RN05)', () => {
  /**
   * @caso CT-UNI-032
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar data de nascimento passada e plausível
   * @resultadoEsperado validarDataNascimento retorna null para '1990-05-14'
   */
  test('aceita data de nascimento passada e plausível', () => {
    expect(validarDataNascimento('1990-05-14', HOJE)).toBeNull();
  });

  /**
   * @caso CT-UNI-033
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Rejeitar data de nascimento futura
   * @resultadoEsperado validarDataNascimento retorna mensagem sobre data futura para '2027-01-10'
   */
  test('rejeita data de nascimento futura', () => {
    const mensagem = validarDataNascimento('2027-01-10', HOJE);
    expect(mensagem).toBe('Data de nascimento não pode ser futura.');
  });

  /**
   * @caso CT-UNI-034
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Rejeitar nascimento que indicaria idade acima de 130 anos
   * @resultadoEsperado validarDataNascimento retorna mensagem de idade máxima para '1895-01-01' (131 anos)
   */
  test('rejeita idade acima de 130 anos', () => {
    const mensagem = validarDataNascimento('1895-01-01', HOJE);
    expect(mensagem).toBe('Idade não pode ser superior a 130 anos.');
  });

  /**
   * @caso CT-UNI-035
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar nascimento com exatamente 130 anos (valor-limite)
   * @resultadoEsperado validarDataNascimento retorna null para '1896-01-01' (130 anos em 2026)
   */
  test('aceita idade de exatamente 130 anos', () => {
    expect(validarDataNascimento('1896-01-01', HOJE)).toBeNull();
  });

  /**
   * @caso CT-UNI-036
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN05
   * @objetivo Rejeitar texto que não é uma data válida, incluindo 30 de fevereiro
   * @resultadoEsperado validarDataNascimento retorna mensagem orientando o formato para '31/02/2026' e '2026-02-30'
   */
  test('rejeita datas malformadas e inexistentes', () => {
    expect(validarDataNascimento('31/02/2026', HOJE)).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.');
    expect(validarDataNascimento('2026-02-30', HOJE)).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.');
  });
});
