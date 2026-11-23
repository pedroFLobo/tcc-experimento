# lote-109

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 16 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0264 | CT-UNI-012 | normaliza o CPF para apenas dígitos | passou |  |
| glm-0265 | CT-UNI-013 | aceita CPF válido com pontuação | passou |  |
| glm-0266 | CT-UNI-014 | aceita CPF válido sem pontuação | passou |  |
| glm-0267 | CT-UNI-015 | rejeita CPF com dígito verificador incorreto | passou |  |
| glm-0268 | CT-UNI-016 | rejeita CPF com todos os dígitos iguais | passou |  |
| glm-0269 | CT-UNI-017 | rejeita CPF com 10 ou 12 dígitos | passou |  |
| glm-0270 | CT-UNI-018 | rejeita CPF vazio e nulo | passou |  |
| glm-0271 | CT-UNI-019 | aceita CRM com 4 dígitos e UF válida | passou |  |
| glm-0272 | CT-UNI-020 | aceita CRM com 6 dígitos e UF válida | passou |  |
| glm-0273 | CT-UNI-021 | rejeita CRM com 3 ou 7 dígitos | passou |  |
| glm-0274 | CT-UNI-022 | rejeita CRM com UF inexistente | passou |  |
| glm-0275 | CT-UNI-023 | rejeita CRM sem barra ou em minúsculas | passou |  |
| glm-0276 | CT-UNI-024 | aceita 15, 30, 45 e 60 minutos | passou |  |
| glm-0277 | CT-UNI-025 | rejeita durações abaixo de 15 ou acima de 60 minutos | passou |  |
| glm-0278 | CT-UNI-026 | rejeita duração que não é múltiplo de 15 | passou |  |
| glm-0279 | CT-UNI-027 | rejeita duração nula, zero e fracionária | passou |  |

## Arquivo: backend/__testes__/unitario/validacoes-cpf-crm.test.js

```js
// Testes unitários das validações de CPF, CRM e duração de consulta (RN03, RN07, RN08).
const { normalizarCpf, cpfValido, crmValido, duracaoConsultaValida } = require('../../src/domain/validacoes');

describe('CPF (RN03)', () => {
  /**
   * @caso CT-UNI-012
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Normalizar o CPF removendo pontuação e deixando apenas dígitos
   * @resultadoEsperado normalizarCpf('529.982.247-25') retorna '52998224725'
   */
  test('normaliza o CPF para apenas dígitos', () => {
    expect(normalizarCpf('529.982.247-25')).toBe('52998224725');
  });

  /**
   * @caso CT-UNI-013
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Aceitar CPF válido enviado com pontuação
   * @resultadoEsperado cpfValido retorna true para '529.982.247-25'
   */
  test('aceita CPF válido com pontuação', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  /**
   * @caso CT-UNI-014
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Aceitar CPF válido enviado sem pontuação
   * @resultadoEsperado cpfValido retorna true para '11144477735'
   */
  test('aceita CPF válido sem pontuação', () => {
    expect(cpfValido('11144477735')).toBe(true);
  });

  /**
   * @caso CT-UNI-015
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Rejeitar CPF com dígito verificador incorreto
   * @resultadoEsperado cpfValido retorna false para '529.982.247-24' (último dígito alterado)
   */
  test('rejeita CPF com dígito verificador incorreto', () => {
    expect(cpfValido('529.982.247-24')).toBe(false);
  });

  /**
   * @caso CT-UNI-016
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN03
   * @objetivo Rejeitar CPF com todos os dígitos iguais, mesmo que passe na fórmula
   * @resultadoEsperado cpfValido retorna false para '111.111.111-11'
   */
  test('rejeita CPF com todos os dígitos iguais', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
  });

  /**
   * @caso CT-UNI-017
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN03
   * @objetivo Rejeitar CPF com quantidade de dígitos diferente de 11
   * @resultadoEsperado cpfValido retorna false para CPF com 10 e com 12 dígitos
   */
  test('rejeita CPF com 10 ou 12 dígitos', () => {
    expect(cpfValido('5299822472')).toBe(false);
    expect(cpfValido('529982247256')).toBe(false);
  });

  /**
   * @caso CT-UNI-018
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN03
   * @objetivo Tratar sem erro CPF vazio ou nulo
   * @resultadoEsperado cpfValido retorna false para '' e null sem lançar exceção
   */
  test('rejeita CPF vazio e nulo', () => {
    expect(cpfValido('')).toBe(false);
    expect(cpfValido(null)).toBe(false);
  });
});

describe('CRM (RN07)', () => {
  /**
   * @caso CT-UNI-019
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Aceitar CRM na forma mínima de 4 dígitos com UF válida (valor-limite inferior)
   * @resultadoEsperado crmValido retorna true para '9876/PR'
   */
  test('aceita CRM com 4 dígitos e UF válida', () => {
    expect(crmValido('9876/PR')).toBe(true);
  });

  /**
   * @caso CT-UNI-020
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Aceitar CRM na forma máxima de 6 dígitos com UF válida (valor-limite superior)
   * @resultadoEsperado crmValido retorna true para '123456/SP'
   */
  test('aceita CRM com 6 dígitos e UF válida', () => {
    expect(crmValido('123456/SP')).toBe(true);
  });

  /**
   * @caso CT-UNI-021
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Rejeitar CRM com 3 ou com 7 dígitos, fora do intervalo permitido
   * @resultadoEsperado crmValido retorna false para '123/SP' e '1234567/SP'
   */
  test('rejeita CRM com 3 ou 7 dígitos', () => {
    expect(crmValido('123/SP')).toBe(false);
    expect(crmValido('1234567/SP')).toBe(false);
  });

  /**
   * @caso CT-UNI-022
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Rejeitar CRM com sigla de UF inexistente
   * @resultadoEsperado crmValido retorna false para '1234/XX'
   */
  test('rejeita CRM com UF inexistente', () => {
    expect(crmValido('1234/XX')).toBe(false);
  });

  /**
   * @caso CT-UNI-023
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Rejeitar CRM sem barra ou escrito em minúsculas
   * @resultadoEsperado crmValido retorna false para '1234SP' e '1234/sp'
   */
  test('rejeita CRM sem barra ou em minúsculas', () => {
    expect(crmValido('1234SP')).toBe(false);
    expect(crmValido('1234/sp')).toBe(false);
  });
});

describe('duração da consulta (RN08)', () => {
  /**
   * @caso CT-UNI-024
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Aceitar as quatro durações válidas em múltiplos de 15 minutos
   * @resultadoEsperado duracaoConsultaValida retorna true para 15, 30, 45 e 60
   */
  test('aceita 15, 30, 45 e 60 minutos', () => {
    expect(duracaoConsultaValida(15)).toBe(true);
    expect(duracaoConsultaValida(30)).toBe(true);
    expect(duracaoConsultaValida(45)).toBe(true);
    expect(duracaoConsultaValida(60)).toBe(true);
  });

  /**
   * @caso CT-UNI-025
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Rejeitar durações fora dos limites de 15 e 60 minutos (valor-limite)
   * @resultadoEsperado duracaoConsultaValida retorna false para 10 e 75
   */
  test('rejeita durações abaixo de 15 ou acima de 60 minutos', () => {
    expect(duracaoConsultaValida(10)).toBe(false);
    expect(duracaoConsultaValida(75)).toBe(false);
  });

  /**
   * @caso CT-UNI-026
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Rejeitar duração que não é múltiplo de 15 minutos
   * @resultadoEsperado duracaoConsultaValida retorna false para 20 e 50
   */
  test('rejeita duração que não é múltiplo de 15', () => {
    expect(duracaoConsultaValida(20)).toBe(false);
    expect(duracaoConsultaValida(50)).toBe(false);
  });

  /**
   * @caso CT-UNI-027
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN08
   * @objetivo Rejeitar duração nula, zero ou fracionária
   * @resultadoEsperado duracaoConsultaValida retorna false para null, 0 e 30.5
   */
  test('rejeita duração nula, zero e fracionária', () => {
    expect(duracaoConsultaValida(null)).toBe(false);
    expect(duracaoConsultaValida(0)).toBe(false);
    expect(duracaoConsultaValida(30.5)).toBe(false);
  });
});
```
