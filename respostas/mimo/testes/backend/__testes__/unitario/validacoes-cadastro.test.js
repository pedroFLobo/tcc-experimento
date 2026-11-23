/**
 * Regras puras de validação de cadastro (RN01, RN02, RN03, RN05, RN06, RN07, RN08).
 * Nenhum banco, HTTP ou sistema de arquivos: apenas funções puras de src/domain.
 */
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
} = require('../../src/domain/validacoes');

const HOJE = new Date(2026, 9, 19); // 2026-10-19 (segunda-feira)

describe('RN01 — formato de e-mail', () => {
  /**
   * @caso CT-UNI-001
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Aceitar e-mail com nome, arroba e domínio com ponto
   * @resultadoEsperado emailValido devolve true para um endereço bem formado
   */
  test('e-mail bem formado é aceito', () => {
    expect(emailValido('ana@email.com')).toBe(true);
  });

  /**
   * @caso CT-UNI-002
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Rejeitar e-mail sem o separador de domínio com ponto
   * @resultadoEsperado emailValido devolve false quando falta o domínio com ponto
   */
  test('e-mail sem ponto no domínio é rejeitado', () => {
    expect(emailValido('ana@email')).toBe(false);
  });

  /**
   * @caso CT-UNI-003
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN01
   * @objetivo Rejeitar e-mail vazio ou que não seja texto
   * @resultadoEsperado emailValido devolve false para entrada vazia e para valor não textual
   */
  test('e-mail vazio e valor não textual são rejeitados', () => {
    expect(emailValido('')).toBe(false);
    expect(emailValido(null)).toBe(false);
    expect(emailValido(12345)).toBe(false);
  });

  /**
   * @caso CT-UNI-004
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Aceitar e-mail com espaços nas pontas após a normalização
   * @resultadoEsperado emailValido devolve true quando só há espaços ao redor
   */
  test('e-mail com espaços nas pontas é aceito após o trim', () => {
    expect(emailValido('  joao.santos@email.com.br ')).toBe(true);
  });

  /**
   * @caso CT-UNI-005
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Rejeitar e-mail com espaço no meio do endereço
   * @resultadoEsperado emailValido devolve false quando há espaço no nome ou no domínio
   */
  test('e-mail com espaço no meio é rejeitado', () => {
    expect(emailValido('ana pereira@email.com')).toBe(false);
    expect(emailValido('ana@meu email.com')).toBe(false);
  });
});

describe('RN02 — regras de senha', () => {
  /**
   * @caso CT-UNI-006
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Aceitar senha com 8 caracteres, letra e número
   * @resultadoEsperado senhaValida devolve true para 'Senha123'
   */
  test('senha com 8 caracteres, letras e números é aceita', () => {
    expect(senhaValida('Senha123')).toBe(true);
  });

  /**
   * @caso CT-UNI-007
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN02
   * @objetivo Rejeitar senha de 7 caracteres mesmo com letra e número
   * @resultadoEsperado senhaValida devolve false no valor-limite inferior de comprimento
   */
  test('senha com 7 caracteres é rejeitada', () => {
    expect(senhaValida('Senha12')).toBe(false);
  });

  /**
   * @caso CT-UNI-008
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN02
   * @objetivo Exigir número na senha
   * @resultadoEsperado senhaValida devolve false para senha só com letras
   */
  test('senha sem dígito numérico é rejeitada', () => {
    expect(senhaValida('senhaapenasletras')).toBe(false);
  });

  /**
   * @caso CT-UNI-009
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN02
   * @objetivo Exigir letra na senha
   * @resultadoEsperado senhaValida devolve false para senha só com números
   */
  test('senha sem letra é rejeitada', () => {
    expect(senhaValida('12345678')).toBe(false);
  });

  /**
   * @caso CT-UNI-010
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN02
   * @objetivo Tratar entrada vazia e não textual como senha inválida
   * @resultadoEsperado senhaValida devolve false para '' e para null
   */
  test('senha vazia e não textual são rejeitadas', () => {
    expect(senhaValida('')).toBe(false);
    expect(senhaValida(null)).toBe(false);
  });
});

describe('RN03 — CPF', () => {
  /**
   * @caso CT-UNI-011
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Aceitar CPF com dígitos verificadores corretos
   * @resultadoEsperado cpfValido devolve true para 529.982.247-25
   */
  test('CPF com dígitos verificadores corretos é aceito', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  /**
   * @caso CT-UNI-012
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Normalizar CPF enviado com pontuação antes de validar
   * @resultadoEsperado normalizarCpf remove ponto e hífen e cpfValido aceita a forma só com dígitos
   */
  test('CPF sem pontuação passa pela mesma validação', () => {
    expect(normalizarCpf('529.982.247-25')).toBe('52998224725');
    expect(cpfValido('52998224725')).toBe(true);
  });

  /**
   * @caso CT-UNI-013
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Rejeitar CPF cujo dígito verificador não bate
   * @resultadoEsperado cpfValido devolve false para 529.982.247-26
   */
  test('CPF com dígito verificador errado é rejeitado', () => {
    expect(cpfValido('529.982.247-26')).toBe(false);
  });

  /**
   * @caso CT-UNI-014
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Rejeitar CPF com todos os dígitos iguais
   * @resultadoEsperado cpfValido devolve false para 111.111.111-11
   */
  test('CPF com todos os dígitos iguais é rejeitado', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('000.000.000-00')).toBe(false);
  });

  /**
   * @caso CT-UNI-015
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Rejeitar CPF com quantidade de dígitos diferente de 11
   * @resultadoEsperado cpfValido devolve false para 10 e 12 dígitos
   */
  test('CPF com 10 ou 12 dígitos é rejeitado', () => {
    expect(cpfValido('5299822472')).toBe(false);
    expect(cpfValido('529982247255')).toBe(false);
  });

  /**
   * @caso CT-UNI-016
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN03
   * @objetivo Normalizar entrada não textual para CPF vazio
   * @resultadoEsperado normalizarCpf devolve string vazia para null
   */
  test('normalizarCpf lida com valor nulo', () => {
    expect(normalizarCpf(null)).toBe('');
    expect(normalizarCpf('')).toBe('');
  });
});

describe('RN05 e RN06 — nascimento e responsável', () => {
  /**
   * @caso CT-UNI-017
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Rejeitar data de nascimento no futuro
   * @resultadoEsperado validarDataNascimento devolve mensagem de data futura
   */
  test('nascimento futuro é rejeitado', () => {
    expect(validarDataNascimento('2026-10-20', HOJE)).toBe('Data de nascimento não pode ser futura.');
  });

  /**
   * @caso CT-UNI-018
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN05
   * @objetivo Rejeitar idade acima de 130 anos
   * @resultadoEsperado validarDataNascimento devolve mensagem de idade superior a 130 anos
   */
  test('nascimento que resulta em mais de 130 anos é rejeitado', () => {
    expect(validarDataNascimento('1895-01-01', HOJE)).toBe('Idade não pode ser superior a 130 anos.');
  });

  /**
   * @caso CT-UNI-019
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar nascimento que resulta exatamente em 130 anos (valor-limite)
   * @resultadoEsperado validarDataNascimento devolve null para 1896-10-19 em relação a 2026-10-19
   */
  test('nascimento de exatamente 130 anos é aceito', () => {
    expect(validarDataNascimento('1896-10-19', HOJE)).toBe(null);
  });

  /**
   * @caso CT-UNI-020
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN05
   * @objetivo Rejeitar nascimento em data inexistente ou com formato errado
   * @resultadoEsperado validarDataNascimento devolve mensagem de formato inválido
   */
  test('nascimento com data inexistente ou formato errado é rejeitado', () => {
    expect(validarDataNascimento('2026-02-30', HOJE)).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.');
    expect(validarDataNascimento('19/05/1990', HOJE)).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.');
  });

  /**
   * @caso CT-UNI-021
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05
   * @objetivo Aceitar data de nascimento válida no passado
   * @resultadoEsperado validarDataNascimento devolve null
   */
  test('nascimento válido no passado é aceito', () => {
    expect(validarDataNascimento('1990-05-14', HOJE)).toBe(null);
  });

  /**
   * @caso CT-UNI-022
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN05, RN06
   * @objetivo Calcular idade considerando se o aniversário já ocorreu no ano corrente
   * @resultadoEsperado calcularIdade devolve 36, 36 e 35 conforme a data de referência
   */
  test('calcularIdade respeita o aniversário do ano', () => {
    const nascimento = new Date(1990, 4, 14); // 1990-05-14
    expect(calcularIdade(nascimento, new Date(2026, 9, 19))).toBe(36);
    expect(calcularIdade(nascimento, new Date(2026, 4, 14))).toBe(36);
    expect(calcularIdade(nascimento, new Date(2026, 4, 13))).toBe(35);
  });

  /**
   * @caso CT-UNI-023
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Exigir responsável para quem ainda não completou 18 anos
   * @resultadoEsperado exigeResponsavel devolve true para paciente de 16 anos
   */
  test('menor de 18 anos exige responsável', () => {
    expect(exigeResponsavel(new Date(2010, 0, 1), HOJE)).toBe(true);
  });

  /**
   * @caso CT-UNI-024
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN06
   * @objetivo Não exigir responsável para quem completou 18 anos exatamente hoje
   * @resultadoEsperado exigeResponsavel devolve false na fronteira dos 18 anos
   */
  test('paciente de exatamente 18 anos não exige responsável', () => {
    expect(exigeResponsavel(new Date(2008, 9, 19), HOJE)).toBe(false);
  });

  /**
   * @caso CT-UNI-025
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN06
   * @objetivo Exigir responsável um dia antes do aniversário de 18 anos
   * @resultadoEsperado exigeResponsavel devolve true para quem tem 17 anos e 11 meses
   */
  test('paciente de 17 anos e 11 meses ainda exige responsável', () => {
    expect(exigeResponsavel(new Date(2008, 9, 20), HOJE)).toBe(true);
  });
});

describe('RN07 e RN08 — CRM e duração da consulta', () => {
  /**
   * @caso CT-UNI-026
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Aceitar CRM com 4 a 6 dígitos, barra e UF válida
   * @resultadoEsperado crmValido devolve true para os cinco formatos de exemplo
   */
  test('CRM nos formatos aceitos é validado', () => {
    expect(crmValido('1234/PR')).toBe(true);
    expect(crmValido('11223/MG')).toBe(true);
    expect(crmValido('123456/SP')).toBe(true);
    expect(crmValido('654321/RJ')).toBe(true);
    expect(crmValido('9876/SP')).toBe(true);
  });

  /**
   * @caso CT-UNI-027
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN07
   * @objetivo Rejeitar CRM com menos de 4 ou mais de 6 dígitos
   * @resultadoEsperado crmValido devolve false nos extremos fora da faixa
   */
  test('CRM com 3 ou 7 dígitos é rejeitado', () => {
    expect(crmValido('123/SP')).toBe(false);
    expect(crmValido('1234567/SP')).toBe(false);
  });

  /**
   * @caso CT-UNI-028
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN07
   * @objetivo Rejeitar CRM com UF inexistente ou letra minúscula
   * @resultadoEsperado crmValido devolve false para 'XX' e para 'sp'
   */
  test('CRM com UF inválida é rejeitado', () => {
    expect(crmValido('123456/XX')).toBe(false);
    expect(crmValido('123456/sp')).toBe(false);
  });

  /**
   * @caso CT-UNI-029
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN07
   * @objetivo Rejeitar CRM sem barra ou enviado como número
   * @resultadoEsperado crmValido devolve false para '123456SP' e para 123456
   */
  test('CRM sem barra ou não textual é rejeitado', () => {
    expect(crmValido('123456SP')).toBe(false);
    expect(crmValido(123456)).toBe(false);
  });

  /**
   * @caso CT-UNI-030
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Aceitar durações múltiplas de 15 entre 15 e 60 minutos
   * @resultadoEsperado duracaoConsultaValida devolve true para 15, 30, 45 e 60
   */
  test('durações válidas são aceitas', () => {
    [15, 30, 45, 60].forEach((min) => expect(duracaoConsultaValida(min)).toBe(true));
  });

  /**
   * @caso CT-UNI-031
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN08
   * @objetivo Rejeitar duração que não é múltipla de 15
   * @resultadoEsperado duracaoConsultaValida devolve false para 20 e 75
   */
  test('duração fora dos múltiplos de 15 é rejeitada', () => {
    expect(duracaoConsultaValida(20)).toBe(false);
    expect(duracaoConsultaValida(75)).toBe(false);
  });

  /**
   * @caso CT-UNI-032
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN08
   * @objetivo Rejeitar duração fora da faixa de 15 a 60 minutos
   * @resultadoEsperado duracaoConsultaValida devolve false para 10 e 61
   */
  test('duração fora da faixa é rejeitada', () => {
    expect(duracaoConsultaValida(10)).toBe(false);
    expect(duracaoConsultaValida(61)).toBe(false);
  });

  /**
   * @caso CT-UNI-033
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RN08
   * @objetivo Rejeitar duração fracionária ou enviada como texto
   * @resultadoEsperado duracaoConsultaValida devolve false para 30.5 e para '30'
   */
  test('duração não inteira ou textual é rejeitada', () => {
    expect(duracaoConsultaValida(30.5)).toBe(false);
    expect(duracaoConsultaValida('30')).toBe(false);
  });
});
