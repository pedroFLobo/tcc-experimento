const {
  emailValido,
  senhaValida,
  normalizarCpf,
  cpfValido,
  crmValido,
  calcularIdade,
  validarDataNascimento,
  exigeResponsavel,
  duracaoConsultaValida,
  UFS,
} = require('../../src/domain/validacoes');

describe('Validações de Domínio (validacoes.js)', () => {
  // --- RN01: E-mail ---
  /**
   * @caso CT-UNI-001
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Aceitar e-mails com formato válido convencional
   * @resultadoEsperado emailValido retorna true para endereço válido
   */
  test('deve validar e-mail correto', () => {
    expect(emailValido('paciente@exemplo.com')).toBe(true);
    expect(emailValido('medico.clinica@sub.dominio.org')).toBe(true);
  });

  /**
   * @caso CT-UNI-002
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RN01
   * @objetivo Rejeitar e-mails sem arroba, sem domínio ou vazios
   * @resultadoEsperado emailValido retorna false para entradas malformadas
   */
  test('deve invalidar e-mail sem formato adequado', () => {
    expect(emailValido('')).toBe(false);
    expect(emailValido('semarroba.com')).toBe(false);
    expect(emailValido('usuario@')).toBe(false);
    expect(emailValido('@dominio.com')).toBe(false);
    expect(emailValido(null)).toBe(false);
  });

  // --- RN02: Senha ---
  /**
   * @caso CT-UNI-003
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN02
   * @objetivo Aceitar senha com 8 ou mais caracteres contendo letras e números
   * @resultadoEsperado senhaValida retorna true
   */
  test('deve validar senha forte com letras e números e 8 caracteres', () => {
    expect(senhaValida('Senha123')).toBe(true);
    expect(senhaValida('abc12345')).toBe(true);
  });

  /**
   * @caso CT-UNI-004
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN02
   * @objetivo Rejeitar senha com menos de 8 caracteres
   * @resultadoEsperado senhaValida retorna false para senha de 7 caracteres
   */
  test('deve rejeitar senha curta no valor-limite inferior', () => {
    expect(senhaValida('Abc1234')).toBe(false);
  });

  /**
   * @caso CT-UNI-005
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN02
   * @objetivo Rejeitar senha que contenha apenas letras ou apenas números
   * @resultadoEsperado senhaValida retorna false se faltar letra ou dígito
   */
  test('deve rejeitar senha sem dígitos ou sem letras', () => {
    expect(senhaValida('SomenteLetras')).toBe(false);
    expect(senhaValida('1234567890')).toBe(false);
  });

  // --- RN03: CPF ---
  /**
   * @caso CT-UNI-006
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Normalizar CPF removendo caracteres não numéricos
   * @resultadoEsperado Retornar apenas os 11 dígitos numéricos
   */
  test('deve normalizar CPF formatado com pontos e traço', () => {
    expect(normalizarCpf('529.982.247-25')).toBe('52998224725');
    expect(normalizarCpf(null)).toBe('');
  });

  /**
   * @caso CT-UNI-007
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Validar CPF autêntico com dígitos verificadores corretos
   * @resultadoEsperado cpfValido retorna true
   */
  test('deve validar CPF com dígitos verificadores corretos', () => {
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('11144477735')).toBe(true);
  });

  /**
   * @caso CT-UNI-008
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN03
   * @objetivo Rejeitar CPF com todos os dígitos iguais
   * @resultadoEsperado cpfValido retorna false mesmo que matematicamente a soma batesse
   */
  test('deve rejeitar CPF composto por dígitos repetidos', () => {
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('00000000000')).toBe(false);
  });

  /**
   * @caso CT-UNI-009
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN03
   * @objetivo Rejeitar CPF com dígito verificador incorreto ou tamanho inválido
   * @resultadoEsperado cpfValido retorna false
   */
  test('deve rejeitar CPF com DV incorreto ou tamanho diferente de 11', () => {
    expect(cpfValido('52998224726')).toBe(false);
    expect(cpfValido('123456789')).toBe(false);
  });

  // --- RN05: Idade e Data de Nascimento ---
  /**
   * @caso CT-UNI-010
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Calcular a idade exata com base na data de nascimento e data de referência
   * @resultadoEsperado Retornar a idade completa considerando se o aniversário já ocorreu no ano
   */
  test('deve calcular idade considerando mês e dia do aniversário', () => {
    const ref = new Date(2026, 9, 19); // 19/10/2026
    const jaFez = new Date(1990, 4, 14); // 14/05/1990 -> 36 anos
    const aindaNaoFez = new Date(1990, 11, 25); // 25/12/1990 -> 35 anos
    expect(calcularIdade(jaFez, ref)).toBe(36);
    expect(calcularIdade(aindaNaoFez, ref)).toBe(35);
  });

  /**
   * @caso CT-UNI-011
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar data de nascimento válida e passada dentro do limite de 130 anos
   * @resultadoEsperado validarDataNascimento retorna null
   */
  test('deve aceitar data de nascimento válida e recente', () => {
    const hoje = new Date(2026, 9, 19);
    expect(validarDataNascimento('1990-05-14', hoje)).toBeNull();
  });

  /**
   * @caso CT-UNI-012
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN05
   * @objetivo Rejeitar data de nascimento futura
   * @resultadoEsperado Retornar mensagem de que data de nascimento não pode ser futura
   */
  test('deve rejeitar data de nascimento posterior à data de hoje', () => {
    const hoje = new Date(2026, 9, 19);
    const erro = validarDataNascimento('2026-10-20', hoje);
    expect(erro).toMatch(/não pode ser futura/i);
  });

  /**
   * @caso CT-UNI-013
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN05
   * @objetivo Rejeitar data de nascimento indicando idade superior a 130 anos
   * @resultadoEsperado Retornar erro informando o limite de 130 anos
   */
  test('deve rejeitar data de nascimento para mais de 130 anos', () => {
    const hoje = new Date(2026, 9, 19);
    const erro = validarDataNascimento('1895-01-01', hoje);
    expect(erro).toMatch(/não pode ser superior a 130 anos/i);
  });

  /**
   * @caso CT-UNI-014
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN05
   * @objetivo Rejeitar formato de data inexistente ou inválido
   * @resultadoEsperado Retornar mensagem de data inválida
   */
  test('deve rejeitar formato de data incorreto', () => {
    const hoje = new Date(2026, 9, 19);
    expect(validarDataNascimento('data-invalida', hoje)).toMatch(/Data de nascimento inválida/i);
    expect(validarDataNascimento('2026-02-30', hoje)).toMatch(/Data de nascimento inválida/i);
  });

  // --- RN06: Responsável para menores de 18 anos ---
  /**
   * @caso CT-UNI-015
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN06
   * @objetivo Exigir responsável legal para menor de 18 anos
   * @resultadoEsperado exigeResponsavel retorna true para menor de 18 anos
   */
  test('deve indicar exigência de responsável para menor de 18 anos', () => {
    const hoje = new Date(2026, 9, 19);
    const menor = new Date(2016, 9, 19); // 10 anos
    expect(exigeResponsavel(menor, hoje)).toBe(true);
  });

  /**
   * @caso CT-UNI-016
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN06
   * @objetivo Não exigir responsável legal para maior de 18 anos
   * @resultadoEsperado exigeResponsavel retorna false para quem tem 18 anos ou mais
   */
  test('não deve exigir responsável para quem tem exatamente 18 anos ou mais', () => {
    const hoje = new Date(2026, 9, 19);
    const exatamente18 = new Date(2008, 9, 19); // exatamente 18 anos
    const maior = new Date(2000, 1, 1);
    expect(exigeResponsavel(exatamente18, hoje)).toBe(false);
    expect(exigeResponsavel(maior, hoje)).toBe(false);
  });

  // --- RN07: CRM ---
  /**
   * @caso CT-UNI-017
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Validar CRM no formato de 4 a 6 dígitos com barra e UF válida
   * @resultadoEsperado crmValido retorna true
   */
  test('deve validar CRM com formato e UF brasileira válida', () => {
    expect(crmValido('1234/SP')).toBe(true);
    expect(crmValido('12345/MG')).toBe(true);
    expect(crmValido('123456/RJ')).toBe(true);
  });

  /**
   * @caso CT-UNI-018
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN07
   * @objetivo Rejeitar CRM com dígitos insuficientes ou excessivos
   * @resultadoEsperado crmValido retorna false para menos de 4 ou mais de 6 dígitos
   */
  test('deve rejeitar CRM com quantidade de dígitos fora do intervalo 4-6', () => {
    expect(crmValido('123/SP')).toBe(false);
    expect(crmValido('1234567/SP')).toBe(false);
  });

  /**
   * @caso CT-UNI-019
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN07
   * @objetivo Rejeitar CRM com sigla de estado inexistente ou sem barra
   * @resultadoEsperado crmValido retorna false
   */
  test('deve rejeitar CRM com UF inválida ou sem separador', () => {
    expect(crmValido('123456/XX')).toBe(false);
    expect(crmValido('123456-SP')).toBe(false);
    expect(crmValido('123456')).toBe(false);
  });

  // --- RN08: Duração de Consulta ---
  /**
   * @caso CT-UNI-020
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Aceitar durações válidas (15, 30, 45, 60 minutos)
   * @resultadoEsperado duracaoConsultaValida retorna true
   */
  test('deve aceitar durações de consulta válidas múltiplas de 15 entre 15 e 60', () => {
    expect(duracaoConsultaValida(15)).toBe(true);
    expect(duracaoConsultaValida(30)).toBe(true);
    expect(duracaoConsultaValida(45)).toBe(true);
    expect(duracaoConsultaValida(60)).toBe(true);
  });

  /**
   * @caso CT-UNI-021
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN08
   * @objetivo Rejeitar durações menores que 15, maiores que 60 ou não múltiplas de 15
   * @resultadoEsperado duracaoConsultaValida retorna false
   */
  test('deve rejeitar durações fora dos limites ou não múltiplas de 15', () => {
    expect(duracaoConsultaValida(0)).toBe(false);
    expect(duracaoConsultaValida(10)).toBe(false);
    expect(duracaoConsultaValida(20)).toBe(false);
    expect(duracaoConsultaValida(75)).toBe(false);
    expect(duracaoConsultaValida(null)).toBe(false);
  });

  // --- RNF07: Manutenibilidade e Isolamento ---
  /**
   * @caso CT-UNI-022
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Garantir que UFS contém todas as 27 unidades federativas brasileiras
   * @resultadoEsperado UFS possui 27 elementos incluindo estados e DF
   */
  test('deve conter as 27 UFs válidas brasileiras', () => {
    expect(UFS).toHaveLength(27);
    expect(UFS).toContain('SP');
    expect(UFS).toContain('DF');
    expect(UFS).toContain('AM');
  });
});
