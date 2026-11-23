// Regras puras de idade e data de nascimento (RN05, RN06).
const {
  calcularIdade,
  validarDataNascimento,
  exigeResponsavel,
} = require('../../src/domain/validacoes');

const HOJE = new Date(2026, 9, 19); // 19/10/2026

describe('calcularIdade', () => {
  /**
   * @caso CT-UNI-047
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05, RN23
   * @objetivo Calcular a idade de quem já fez aniversário no ano
   * @resultadoEsperado Pessoa nascida em 14/05/1990 tem 36 anos em 19/10/2026
   */
  test('calcula idade após o aniversário', () => {
    expect(calcularIdade(new Date(1990, 4, 14), HOJE)).toBe(36);
  });

  /**
   * @caso CT-UNI-048
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Calcular a idade no próprio dia do aniversário
   * @resultadoEsperado Pessoa nascida em 19/10/1990 tem 36 anos em 19/10/2026
   */
  test('calcula idade no dia do aniversário', () => {
    expect(calcularIdade(new Date(1990, 9, 19), HOJE)).toBe(36);
  });

  /**
   * @caso CT-UNI-049
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05, RN06
   * @objetivo Não contar o ano quando o aniversário ainda não chegou
   * @resultadoEsperado Pessoa nascida em 20/10/1990 tem 35 anos em 19/10/2026
   */
  test('não conta o ano antes do aniversário', () => {
    expect(calcularIdade(new Date(1990, 9, 20), HOJE)).toBe(35);
  });

  /**
   * @caso CT-UNI-050
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05, RN06
   * @objetivo Tratar quem nasceu em 29 de fevereiro em ano não bissexto
   * @resultadoEsperado Em 28/02/2026 a idade ainda é 25 e em 01/03/2026 passa a 26
   */
  test('trata aniversário em 29 de fevereiro', () => {
    const nascimento = new Date(2000, 1, 29);
    expect(calcularIdade(nascimento, new Date(2026, 1, 28))).toBe(25);
    expect(calcularIdade(nascimento, new Date(2026, 2, 1))).toBe(26);
  });
});

describe('validarDataNascimento', () => {
  /**
   * @caso CT-UNI-051
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar data de nascimento no passado
   * @resultadoEsperado validarDataNascimento devolve null para 14/05/1990
   */
  test('aceita data no passado', () => {
    expect(validarDataNascimento('1990-05-14', HOJE)).toBeNull();
  });

  /**
   * @caso CT-UNI-052
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Recusar data de nascimento futura
   * @resultadoEsperado validarDataNascimento devolve mensagem de data futura
   */
  test('recusa data futura', () => {
    expect(validarDataNascimento('2026-10-20', HOJE)).toBe('Data de nascimento não pode ser futura.');
  });

  /**
   * @caso CT-UNI-053
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar recém-nascido com data igual a hoje
   * @resultadoEsperado validarDataNascimento devolve null para a data de hoje
   */
  test('aceita data igual a hoje', () => {
    expect(validarDataNascimento('2026-10-19', HOJE)).toBeNull();
  });

  /**
   * @caso CT-UNI-054
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar idade exatamente igual a 130 anos
   * @resultadoEsperado validarDataNascimento devolve null para 19/10/1896
   */
  test('aceita idade de 130 anos', () => {
    expect(validarDataNascimento('1896-10-19', HOJE)).toBeNull();
  });

  /**
   * @caso CT-UNI-055
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Recusar idade acima de 130 anos
   * @resultadoEsperado validarDataNascimento devolve mensagem de idade máxima
   */
  test('recusa idade de 131 anos', () => {
    expect(validarDataNascimento('1895-10-18', HOJE)).toBe('Idade não pode ser superior a 130 anos.');
  });

  /**
   * @caso CT-UNI-056
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN05, RNF06
   * @objetivo Explicar o formato esperado quando a data vem em formato brasileiro
   * @resultadoEsperado validarDataNascimento devolve a mensagem de formato AAAA-MM-DD
   */
  test('recusa data no formato DD/MM/AAAA com mensagem de formato', () => {
    expect(validarDataNascimento('14/05/1990', HOJE)).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-UNI-057
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN05, RNF04
   * @objetivo Recusar data inexistente no calendário
   * @resultadoEsperado validarDataNascimento devolve a mensagem de data inválida para 2026-02-30
   */
  test('recusa data inexistente', () => {
    expect(validarDataNascimento('2026-02-30', HOJE)).toContain('Data de nascimento inválida');
  });

  /**
   * @caso CT-UNI-058
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN05, RNF04
   * @objetivo Recusar data ausente sem lançar exceção
   * @resultadoEsperado validarDataNascimento devolve a mensagem de data inválida para null
   */
  test('recusa data ausente', () => {
    expect(validarDataNascimento(null, HOJE)).toContain('Data de nascimento inválida');
    expect(validarDataNascimento('', HOJE)).toContain('Data de nascimento inválida');
  });
});

describe('exigeResponsavel', () => {
  /**
   * @caso CT-UNI-059
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Exigir responsável para quem tem 17 anos
   * @resultadoEsperado exigeResponsavel retorna true para nascido em 20/10/2008
   */
  test('exige responsável para 17 anos', () => {
    expect(exigeResponsavel(new Date(2008, 9, 20), HOJE)).toBe(true);
  });

  /**
   * @caso CT-UNI-060
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Não exigir responsável para quem completou 18 anos
   * @resultadoEsperado exigeResponsavel retorna false para nascido em 19/10/2008
   */
  test('não exige responsável ao completar 18 anos', () => {
    expect(exigeResponsavel(new Date(2008, 9, 19), HOJE)).toBe(false);
  });

  /**
   * @caso CT-UNI-061
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Exigir responsável no dia anterior ao 18º aniversário
   * @resultadoEsperado exigeResponsavel retorna true para nascido em 20/10/2008
   */
  test('exige responsável um dia antes da maioridade', () => {
    expect(exigeResponsavel(new Date(2008, 9, 20), HOJE)).toBe(true);
  });

  /**
   * @caso CT-UNI-062
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Não exigir responsável para paciente adulto
   * @resultadoEsperado exigeResponsavel retorna false para 36 anos
   */
  test('não exige responsável para adulto', () => {
    expect(exigeResponsavel(new Date(1990, 4, 14), HOJE)).toBe(false);
  });

  /**
   * @caso CT-UNI-063
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Exigir responsável para bebê recém-nascido
   * @resultadoEsperado exigeResponsavel retorna true para data de hoje
   */
  test('exige responsável para recém-nascido', () => {
    expect(exigeResponsavel(new Date(2026, 9, 19), HOJE)).toBe(true);
  });
});
