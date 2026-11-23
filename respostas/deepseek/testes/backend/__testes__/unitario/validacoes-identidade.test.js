// Regras puras de identificação: CPF (RN03), e-mail (RN01) e senha (RN02).
const {
  normalizarCpf,
  cpfValido,
  emailValido,
  senhaValida,
} = require('../../src/domain/validacoes');

describe('normalizarCpf', () => {
  /**
   * @caso CT-UNI-001
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Remover a pontuação do CPF mantendo apenas os dígitos
   * @resultadoEsperado normalizarCpf devolve a string com 11 dígitos
   */
  test('remove pontos e traço do CPF', () => {
    expect(normalizarCpf('529.982.247-25')).toBe('52998224725');
  });

  /**
   * @caso CT-UNI-002
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN03, RNF04
   * @objetivo Tratar entradas ausentes sem lançar exceção
   * @resultadoEsperado normalizarCpf devolve string vazia para null e undefined
   */
  test('devolve string vazia para valores ausentes', () => {
    expect(normalizarCpf(null)).toBe('');
    expect(normalizarCpf(undefined)).toBe('');
  });

  /**
   * @caso CT-UNI-003
   * @nivel unitario
   * @atributo seguranca
   * @subatributo integridade
   * @requisito RN03, RNF03
   * @objetivo Descartar caracteres não numéricos antes da validação
   * @resultadoEsperado normalizarCpf mantém somente os dígitos de uma string mista
   */
  test('descarta caracteres não numéricos', () => {
    expect(normalizarCpf('abc 123 def 456')).toBe('123456');
  });
});

describe('cpfValido', () => {
  /**
   * @caso CT-UNI-004
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Aceitar CPF com pontuação e dígitos verificadores corretos
   * @resultadoEsperado cpfValido retorna true para 529.982.247-25
   */
  test('aceita CPF válido com pontuação', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  /**
   * @caso CT-UNI-005
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Aceitar CPF enviado somente com dígitos
   * @resultadoEsperado cpfValido retorna true para 11144477735
   */
  test('aceita CPF válido sem pontuação', () => {
    expect(cpfValido('11144477735')).toBe(true);
  });

  /**
   * @caso CT-UNI-006
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF com dígito verificador incorreto
   * @resultadoEsperado cpfValido retorna false quando o último dígito não confere
   */
  test('recusa CPF com dígito verificador errado', () => {
    expect(cpfValido('529.982.247-24')).toBe(false);
  });

  /**
   * @caso CT-UNI-007
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF formado por 11 dígitos iguais
   * @resultadoEsperado cpfValido retorna false para 111.111.111-11
   */
  test('recusa CPF com todos os dígitos iguais', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('00000000000')).toBe(false);
  });

  /**
   * @caso CT-UNI-008
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF com menos de 11 dígitos
   * @resultadoEsperado cpfValido retorna false para um CPF de 10 dígitos
   */
  test('recusa CPF com 10 dígitos', () => {
    expect(cpfValido('5299822472')).toBe(false);
  });

  /**
   * @caso CT-UNI-009
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF com mais de 11 dígitos
   * @resultadoEsperado cpfValido retorna false para um CPF de 12 dígitos
   */
  test('recusa CPF com 12 dígitos', () => {
    expect(cpfValido('529982247250')).toBe(false);
  });

  /**
   * @caso CT-UNI-010
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN03, RNF04
   * @objetivo Recusar CPF vazio ou ausente sem lançar exceção
   * @resultadoEsperado cpfValido retorna false para '' e null
   */
  test('recusa CPF vazio e nulo', () => {
    expect(cpfValido('')).toBe(false);
    expect(cpfValido(null)).toBe(false);
  });

  /**
   * @caso CT-UNI-011
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Aceitar CPF com espaços ao redor
   * @resultadoEsperado cpfValido retorna true após a normalização
   */
  test('aceita CPF cercado por espaços', () => {
    expect(cpfValido('  529.982.247-25  ')).toBe(true);
  });

  /**
   * @caso CT-UNI-012
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Recusar CPF que perde um dígito por conter letra no lugar do número
   * @resultadoEsperado cpfValido retorna false quando restam apenas 10 dígitos
   */
  test('recusa CPF com letra no lugar de dígito', () => {
    expect(cpfValido('529.982.247-2X')).toBe(false);
  });
});

describe('emailValido', () => {
  /**
   * @caso CT-UNI-013
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Aceitar e-mail em formato simples
   * @resultadoEsperado emailValido retorna true para ana@email.com
   */
  test('aceita e-mail simples', () => {
    expect(emailValido('ana@email.com')).toBe(true);
  });

  /**
   * @caso CT-UNI-014
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Aceitar e-mail com subdomínio, ponto e sinal de mais
   * @resultadoEsperado emailValido retorna true para joao.santos+clinica@mail.hospital.com.br
   */
  test('aceita e-mail com subdomínio e sinal de mais', () => {
    expect(emailValido('joao.santos+clinica@mail.hospital.com.br')).toBe(true);
  });

  /**
   * @caso CT-UNI-015
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail sem arroba
   * @resultadoEsperado emailValido retorna false para anaemail.com
   */
  test('recusa e-mail sem arroba', () => {
    expect(emailValido('anaemail.com')).toBe(false);
  });

  /**
   * @caso CT-UNI-016
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail sem domínio de topo
   * @resultadoEsperado emailValido retorna false para ana@email
   */
  test('recusa e-mail sem ponto no domínio', () => {
    expect(emailValido('ana@email')).toBe(false);
  });

  /**
   * @caso CT-UNI-017
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail com espaço no meio
   * @resultadoEsperado emailValido retorna false para "ana pereira@email.com"
   */
  test('recusa e-mail com espaço interno', () => {
    expect(emailValido('ana pereira@email.com')).toBe(false);
  });

  /**
   * @caso CT-UNI-018
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Recusar e-mail com duas arrobas
   * @resultadoEsperado emailValido retorna false para ana@@email.com
   */
  test('recusa e-mail com duas arrobas', () => {
    expect(emailValido('ana@@email.com')).toBe(false);
  });

  /**
   * @caso CT-UNI-019
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN01, RNF04
   * @objetivo Tratar entradas que não são string
   * @resultadoEsperado emailValido retorna false para null e para número
   */
  test('recusa e-mail que não é string', () => {
    expect(emailValido(null)).toBe(false);
    expect(emailValido(12345)).toBe(false);
  });

  /**
   * @caso CT-UNI-020
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN01
   * @objetivo Aceitar e-mail digitado com espaços acidentais ao redor
   * @resultadoEsperado emailValido retorna true após remover os espaços
   */
  test('aceita e-mail com espaços ao redor', () => {
    expect(emailValido('  ana@email.com  ')).toBe(true);
  });
});

describe('senhaValida', () => {
  /**
   * @caso CT-UNI-021
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Aceitar senha com 8 caracteres, letras e números
   * @resultadoEsperado senhaValida retorna true para Senha123
   */
  test('aceita senha com 8 caracteres', () => {
    expect(senhaValida('Senha123')).toBe(true);
  });

  /**
   * @caso CT-UNI-022
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Recusar senha com 7 caracteres
   * @resultadoEsperado senhaValida retorna false para Senha12
   */
  test('recusa senha com 7 caracteres', () => {
    expect(senhaValida('Senha12')).toBe(false);
  });

  /**
   * @caso CT-UNI-023
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Recusar senha com 8 caracteres apenas alfabéticos
   * @resultadoEsperado senhaValida retorna false para abcdefgh
   */
  test('recusa senha sem números', () => {
    expect(senhaValida('abcdefgh')).toBe(false);
  });

  /**
   * @caso CT-UNI-024
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Recusar senha com 8 caracteres apenas numéricos
   * @resultadoEsperado senhaValida retorna false para 12345678
   */
  test('recusa senha sem letras', () => {
    expect(senhaValida('12345678')).toBe(false);
  });

  /**
   * @caso CT-UNI-025
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Aceitar senha de 9 caracteres com letra, número e símbolo
   * @resultadoEsperado senhaValida retorna true para Senha123!
   */
  test('aceita senha longa com símbolo', () => {
    expect(senhaValida('Senha123!')).toBe(true);
  });

  /**
   * @caso CT-UNI-026
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN02, RNF04
   * @objetivo Recusar senha vazia ou de tipo diferente de string
   * @resultadoEsperado senhaValida retorna false para '', null e 12345678 numérico
   */
  test('recusa senha vazia, nula e não string', () => {
    expect(senhaValida('')).toBe(false);
    expect(senhaValida(null)).toBe(false);
    expect(senhaValida(12345678)).toBe(false);
  });
});
