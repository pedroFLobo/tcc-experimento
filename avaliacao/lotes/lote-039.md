# lote-039

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 20 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0636 | CT-UNI-027 | aceita CRM de 6 dígitos | passou |  |
| deepseek-0637 | CT-UNI-028 | aceita CRM de 4 dígitos | passou |  |
| deepseek-0638 | CT-UNI-029 | aceita CRM de 5 dígitos | passou |  |
| deepseek-0639 | CT-UNI-030 | recusa CRM de 3 dígitos | passou |  |
| deepseek-0640 | CT-UNI-031 | recusa CRM de 7 dígitos | passou |  |
| deepseek-0641 | CT-UNI-032 | recusa UF inexistente | passou |  |
| deepseek-0642 | CT-UNI-033 | recusa UF em minúsculas | passou |  |
| deepseek-0643 | CT-UNI-034 | recusa CRM sem barra | passou |  |
| deepseek-0644 | CT-UNI-035 | recusa CRM vazio e nulo | passou |  |
| deepseek-0645 | CT-UNI-036 | lista as 27 UFs brasileiras | passou |  |
| deepseek-0646 | CT-UNI-037 | aceita 15 minutos | passou |  |
| deepseek-0647 | CT-UNI-038 | aceita 30 minutos | passou |  |
| deepseek-0648 | CT-UNI-039 | aceita 60 minutos | passou |  |
| deepseek-0649 | CT-UNI-040 | recusa 14 minutos | passou |  |
| deepseek-0650 | CT-UNI-041 | recusa 61 minutos | passou |  |
| deepseek-0651 | CT-UNI-042 | recusa duração não múltipla de 15 | passou |  |
| deepseek-0652 | CT-UNI-043 | recusa duração zero | passou |  |
| deepseek-0653 | CT-UNI-044 | recusa duração fracionária e em texto | passou |  |
| deepseek-0654 | CT-UNI-045 | recusa duração ausente | passou |  |
| deepseek-0655 | CT-UNI-046 | aceita todos os múltiplos de 15 no intervalo | passou |  |

## Arquivo: backend/__testes__/unitario/validacoes-crm-duracao.test.js

```js
// Regras puras de CRM (RN07) e duração da consulta (RN08).
const { crmValido, duracaoConsultaValida, UFS } = require('../../src/domain/validacoes');

describe('crmValido', () => {
  /**
   * @caso CT-UNI-027
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Aceitar CRM com 6 dígitos e UF válida
   * @resultadoEsperado crmValido retorna true para 123456/SP
   */
  test('aceita CRM de 6 dígitos', () => {
    expect(crmValido('123456/SP')).toBe(true);
  });

  /**
   * @caso CT-UNI-028
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Aceitar CRM com 4 dígitos, que é o limite inferior
   * @resultadoEsperado crmValido retorna true para 9876/PR
   */
  test('aceita CRM de 4 dígitos', () => {
    expect(crmValido('9876/PR')).toBe(true);
  });

  /**
   * @caso CT-UNI-029
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Aceitar CRM com 5 dígitos
   * @resultadoEsperado crmValido retorna true para 11223/MG
   */
  test('aceita CRM de 5 dígitos', () => {
    expect(crmValido('11223/MG')).toBe(true);
  });

  /**
   * @caso CT-UNI-030
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM com 3 dígitos, abaixo do limite inferior
   * @resultadoEsperado crmValido retorna false para 123/SP
   */
  test('recusa CRM de 3 dígitos', () => {
    expect(crmValido('123/SP')).toBe(false);
  });

  /**
   * @caso CT-UNI-031
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM com 7 dígitos, acima do limite superior
   * @resultadoEsperado crmValido retorna false para 1234567/SP
   */
  test('recusa CRM de 7 dígitos', () => {
    expect(crmValido('1234567/SP')).toBe(false);
  });

  /**
   * @caso CT-UNI-032
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM com UF inexistente
   * @resultadoEsperado crmValido retorna false para 123456/XX
   */
  test('recusa UF inexistente', () => {
    expect(crmValido('123456/XX')).toBe(false);
  });

  /**
   * @caso CT-UNI-033
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar UF escrita em minúsculas
   * @resultadoEsperado crmValido retorna false para 123456/sp
   */
  test('recusa UF em minúsculas', () => {
    expect(crmValido('123456/sp')).toBe(false);
  });

  /**
   * @caso CT-UNI-034
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN07
   * @objetivo Recusar CRM sem a barra separadora
   * @resultadoEsperado crmValido retorna false para 123456SP
   */
  test('recusa CRM sem barra', () => {
    expect(crmValido('123456SP')).toBe(false);
  });

  /**
   * @caso CT-UNI-035
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN07, RNF04
   * @objetivo Recusar CRM vazio ou ausente sem lançar exceção
   * @resultadoEsperado crmValido retorna false para '', null e undefined
   */
  test('recusa CRM vazio e nulo', () => {
    expect(crmValido('')).toBe(false);
    expect(crmValido(null)).toBe(false);
    expect(crmValido(undefined)).toBe(false);
  });

  /**
   * @caso CT-UNI-036
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN07
   * @objetivo Expor as 27 unidades federativas brasileiras aceitas
   * @resultadoEsperado UFS contém AC, SP, TO e tem exatamente 27 itens
   */
  test('lista as 27 UFs brasileiras', () => {
    expect(UFS).toContain('AC');
    expect(UFS).toContain('SP');
    expect(UFS).toContain('TO');
    expect(UFS).toHaveLength(27);
  });
});

describe('duracaoConsultaValida', () => {
  /**
   * @caso CT-UNI-037
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Aceitar a duração mínima de 15 minutos
   * @resultadoEsperado duracaoConsultaValida retorna true para 15
   */
  test('aceita 15 minutos', () => {
    expect(duracaoConsultaValida(15)).toBe(true);
  });

  /**
   * @caso CT-UNI-038
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Aceitar a duração padrão de 30 minutos
   * @resultadoEsperado duracaoConsultaValida retorna true para 30
   */
  test('aceita 30 minutos', () => {
    expect(duracaoConsultaValida(30)).toBe(true);
  });

  /**
   * @caso CT-UNI-039
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Aceitar a duração máxima de 60 minutos
   * @resultadoEsperado duracaoConsultaValida retorna true para 60
   */
  test('aceita 60 minutos', () => {
    expect(duracaoConsultaValida(60)).toBe(true);
  });

  /**
   * @caso CT-UNI-040
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Recusar duração abaixo do mínimo
   * @resultadoEsperado duracaoConsultaValida retorna false para 14
   */
  test('recusa 14 minutos', () => {
    expect(duracaoConsultaValida(14)).toBe(false);
  });

  /**
   * @caso CT-UNI-041
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Recusar duração acima do máximo
   * @resultadoEsperado duracaoConsultaValida retorna false para 61
   */
  test('recusa 61 minutos', () => {
    expect(duracaoConsultaValida(61)).toBe(false);
  });

  /**
   * @caso CT-UNI-042
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Recusar valor que não é múltiplo de 15
   * @resultadoEsperado duracaoConsultaValida retorna false para 20 e 35
   */
  test('recusa duração não múltipla de 15', () => {
    expect(duracaoConsultaValida(20)).toBe(false);
    expect(duracaoConsultaValida(35)).toBe(false);
  });

  /**
   * @caso CT-UNI-043
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN08
   * @objetivo Recusar duração igual a zero
   * @resultadoEsperado duracaoConsultaValida retorna false para 0
   */
  test('recusa duração zero', () => {
    expect(duracaoConsultaValida(0)).toBe(false);
  });

  /**
   * @caso CT-UNI-044
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN08, RNF04
   * @objetivo Recusar duração que não é número inteiro
   * @resultadoEsperado duracaoConsultaValida retorna false para 30.5 e para a string '30'
   */
  test('recusa duração fracionária e em texto', () => {
    expect(duracaoConsultaValida(30.5)).toBe(false);
    expect(duracaoConsultaValida('30')).toBe(false);
  });

  /**
   * @caso CT-UNI-045
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RN08, RNF04
   * @objetivo Recusar duração ausente
   * @resultadoEsperado duracaoConsultaValida retorna false para undefined e null
   */
  test('recusa duração ausente', () => {
    expect(duracaoConsultaValida(undefined)).toBe(false);
    expect(duracaoConsultaValida(null)).toBe(false);
  });

  /**
   * @caso CT-UNI-046
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN08
   * @objetivo Aceitar todas as durações múltiplas de 15 entre 15 e 60
   * @resultadoEsperado 15, 30, 45 e 60 são aceitas
   */
  test('aceita todos os múltiplos de 15 no intervalo', () => {
    expect([15, 30, 45, 60].every(duracaoConsultaValida)).toBe(true);
  });
});
```
