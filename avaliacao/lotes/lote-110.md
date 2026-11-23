# lote-110

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 11 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0280 | CT-UNI-001 | aceita e-mail simples válido | passou |  |
| glm-0281 | CT-UNI-002 | aceita e-mail com subdomínios | passou |  |
| glm-0282 | CT-UNI-003 | rejeita e-mail sem @ | passou |  |
| glm-0283 | CT-UNI-004 | rejeita e-mail sem ponto no domínio | passou |  |
| glm-0284 | CT-UNI-005 | rejeita e-mail com espaço interno | passou |  |
| glm-0285 | CT-UNI-006 | rejeita entradas vazias, nulas e não textuais | passou |  |
| glm-0286 | CT-UNI-007 | aceita senha de exatamente 8 caracteres com letra e número | passou |  |
| glm-0287 | CT-UNI-008 | rejeita senha com 7 caracteres | passou |  |
| glm-0288 | CT-UNI-009 | rejeita senha sem número | passou |  |
| glm-0289 | CT-UNI-010 | rejeita senha sem letra | passou |  |
| glm-0290 | CT-UNI-011 | rejeita senha nula, vazia e não textual | passou |  |

## Arquivo: backend/__testes__/unitario/validacoes-email-senha.test.js

```js
// Testes unitários das validações de e-mail e senha (RN01, RN02) — regras puras, sem banco nem HTTP.
const { emailValido, senhaValida } = require('../../src/domain/validacoes');

describe('emailValido (RN01)', () => {
  /**
   * @caso CT-UNI-001
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Aceitar um e-mail simples com formato válido
   * @resultadoEsperado emailValido retorna true para 'ana.pereira@email.com'
   */
  test('aceita e-mail simples válido', () => {
    expect(emailValido('ana.pereira@email.com')).toBe(true);
  });

  /**
   * @caso CT-UNI-002
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Aceitar e-mail com vários pontos e subdomínios
   * @resultadoEsperado emailValido retorna true para 'joao.santos@mail.sub.dominio.com.br'
   */
  test('aceita e-mail com subdomínios', () => {
    expect(emailValido('joao.santos@mail.sub.dominio.com.br')).toBe(true);
  });

  /**
   * @caso CT-UNI-003
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Rejeitar e-mail sem o símbolo @
   * @resultadoEsperado emailValido retorna false para 'ana.email.com'
   */
  test('rejeita e-mail sem @', () => {
    expect(emailValido('ana.email.com')).toBe(false);
  });

  /**
   * @caso CT-UNI-004
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Rejeitar e-mail sem ponto no domínio depois do @
   * @resultadoEsperado emailValido retorna false para 'ana@clinica'
   */
  test('rejeita e-mail sem ponto no domínio', () => {
    expect(emailValido('ana@clinica')).toBe(false);
  });

  /**
   * @caso CT-UNI-005
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01
   * @objetivo Rejeitar e-mail com espaço em branco interno
   * @resultadoEsperado emailValido retorna false para 'ana pereira@email.com'
   */
  test('rejeita e-mail com espaço interno', () => {
    expect(emailValido('ana pereira@email.com')).toBe(false);
  });

  /**
   * @caso CT-UNI-006
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN01, RNF04
   * @objetivo Tratar sem erro entradas não textuais e vazias no e-mail
   * @resultadoEsperado emailValido retorna false (e nunca lança exceção) para '', null, undefined e 42
   */
  test('rejeita entradas vazias, nulas e não textuais', () => {
    expect(emailValido('')).toBe(false);
    expect(emailValido(null)).toBe(false);
    expect(emailValido(undefined)).toBe(false);
    expect(emailValido(42)).toBe(false);
  });
});

describe('senhaValida (RN02)', () => {
  /**
   * @caso CT-UNI-007
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Aceitar senha com exatamente 8 caracteres contendo letras e números (valor-limite)
   * @resultadoEsperado senhaValida retorna true para 'Senha123'
   */
  test('aceita senha de exatamente 8 caracteres com letra e número', () => {
    expect(senhaValida('Senha123')).toBe(true);
  });

  /**
   * @caso CT-UNI-008
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Rejeitar senha com 7 caracteres, um a menos que o mínimo (valor-limite)
   * @resultadoEsperado senhaValida retorna false para 'Senha1' + um caractere a menos ('Senha1' tem 6; 'Senha12' tem 7)
   */
  test('rejeita senha com 7 caracteres', () => {
    expect(senhaValida('Senha12')).toBe(false);
  });

  /**
   * @caso CT-UNI-009
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Rejeitar senha longa sem nenhum número
   * @resultadoEsperado senhaValida retorna false para 'senhasemnumero'
   */
  test('rejeita senha sem número', () => {
    expect(senhaValida('senhasemnumero')).toBe(false);
  });

  /**
   * @caso CT-UNI-010
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN02
   * @objetivo Rejeitar senha longa sem nenhuma letra
   * @resultadoEsperado senhaValida retorna false para '123456789'
   */
  test('rejeita senha sem letra', () => {
    expect(senhaValida('123456789')).toBe(false);
  });

  /**
   * @caso CT-UNI-011
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN02
   * @objetivo Tratar sem erro senha nula, vazia ou não textual
   * @resultadoEsperado senhaValida retorna false para null, '' e 12345678 sem lançar exceção
   */
  test('rejeita senha nula, vazia e não textual', () => {
    expect(senhaValida(null)).toBe(false);
    expect(senhaValida('')).toBe(false);
    expect(senhaValida(12345678)).toBe(false);
  });
});
```
